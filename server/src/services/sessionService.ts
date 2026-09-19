import { OCCUPYING_SESSION_STATUSES } from '@pscenter/shared';
import { prisma } from '../db.js';
import { AppError, notFound } from '../errors.js';
import {
  freezeCheckoutTotals,
  extendPlannedDuration,
  liveSessionMetrics,
  parseBlocks,
  type SessionWithRelations,
} from './sessionEngine.js';

const sessionInclude = {
  pauses: true,
  extras: true,
  payments: true,
  screen: true,
} as const;

export async function getOccupyingSession(screenId: string) {
  return prisma.session.findFirst({
    where: { screenId, status: { in: [...OCCUPYING_SESSION_STATUSES] } },
    include: sessionInclude,
  });
}

export async function requireSession(id: string): Promise<SessionWithRelations> {
  const session = await prisma.session.findUnique({
    where: { id },
    include: sessionInclude,
  });
  if (!session) throw notFound('Session');
  return session;
}

async function logEvent(
  tx: { activityEvent: { create: (args: unknown) => Promise<unknown> } },
  sessionId: string | null,
  type: string,
  payload: Record<string, unknown> = {},
) {
  await tx.activityEvent.create({
    data: { sessionId, type, payloadJson: JSON.stringify(payload) },
  } as never);
}

export async function startSession(input: {
  screenId: string;
  billingMode: 'OPEN' | 'FIXED';
  plannedDurationSeconds?: number;
  notes?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const screen = await tx.screen.findUnique({
      where: { id: input.screenId },
      include: { pricingRule: true },
    });
    if (!screen) throw notFound('Screen');
    if (!screen.active) throw new AppError('This screen is disabled');
    if (screen.maintenance) throw new AppError('This screen is in maintenance');
    if (!screen.pricingRule.active) throw new AppError('This screen uses an inactive pricing rule');
    if (screen.pricingRule.hourlyRateFils < 0) throw new AppError('This screen has invalid pricing');
    if (
      screen.pricingRule.billingMethod === 'FIXED_BLOCKS' &&
      parseBlocks(screen.pricingRule.blocksJson).length === 0
    ) {
      throw new AppError('This screen has no fixed pricing blocks configured');
    }

    const occupying = await tx.session.findFirst({
      where: { screenId: screen.id, status: { in: [...OCCUPYING_SESSION_STATUSES] } },
    });
    if (occupying) {
      throw new AppError('This screen already has an active session', 409, 'SCREEN_BUSY');
    }

    if (input.billingMode === 'FIXED') {
      if (!input.plannedDurationSeconds || input.plannedDurationSeconds <= 0) {
        throw new AppError('Fixed sessions need a duration greater than zero');
      }
    }

    const session = await tx.session.create({
      data: {
        screenId: screen.id,
        pricingRuleId: screen.pricingRuleId,
        status: 'RUNNING',
        billingMode: input.billingMode,
        startTime: new Date(),
        plannedDurationSeconds: input.billingMode === 'FIXED' ? input.plannedDurationSeconds : null,
        pricingRuleName: screen.pricingRule.name,
        billingMethod: screen.pricingRule.billingMethod,
        hourlyRateFils: screen.pricingRule.hourlyRateFils,
        blocksJson: screen.pricingRule.blocksJson,
        notes: input.notes,
        paymentStatus: 'UNPAID',
      },
      include: sessionInclude,
    });

    await logEvent(tx as never, session.id, 'SESSION_STARTED', {
      screenId: screen.id,
      billingMode: input.billingMode,
    });
    return session;
  });
}

export async function pauseSession(id: string) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id }, include: sessionInclude });
    if (!session) throw notFound('Session');
    if (session.status !== 'RUNNING') throw new AppError('Only a running session can be paused');
    await tx.sessionPause.create({ data: { sessionId: id, pausedAt: new Date() } });
    const updated = await tx.session.update({
      where: { id },
      data: { status: 'PAUSED' },
      include: sessionInclude,
    });
    await logEvent(tx as never, id, 'SESSION_PAUSED');
    return updated;
  });
}

export async function resumeSession(id: string) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id }, include: sessionInclude });
    if (!session) throw notFound('Session');
    if (session.status !== 'PAUSED') throw new AppError('Only a paused session can be resumed');
    const openPause = session.pauses.find((p) => !p.resumedAt);
    if (openPause) {
      await tx.sessionPause.update({
        where: { id: openPause.id },
        data: { resumedAt: new Date() },
      });
    }
    const updated = await tx.session.update({
      where: { id },
      data: { status: 'RUNNING' },
      include: sessionInclude,
    });
    await logEvent(tx as never, id, 'SESSION_RESUMED');
    return updated;
  });
}

export async function addTime(id: string, extraSeconds: number) {
  if (!Number.isInteger(extraSeconds) || extraSeconds <= 0) {
    throw new AppError('Added time must be a positive number of seconds');
  }
  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id }, include: sessionInclude });
    if (!session) throw notFound('Session');
    if (!['RUNNING', 'PAUSED'].includes(session.status)) {
      throw new AppError('Time can only be added to an active session');
    }
    const live = liveSessionMetrics(session);
    const updated = await tx.session.update({
      where: { id },
      data: {
        billingMode: 'FIXED',
        plannedDurationSeconds: extendPlannedDuration(
          session.plannedDurationSeconds,
          live.billableSeconds,
          extraSeconds,
        ),
      },
      include: sessionInclude,
    });
    await logEvent(tx as never, id, 'TIME_ADDED', { extraSeconds });
    return updated;
  });
}

export async function beginCheckout(id: string) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id }, include: sessionInclude });
    if (!session) throw notFound('Session');
    if (!['RUNNING', 'PAUSED'].includes(session.status)) {
      throw new AppError('This session cannot go to checkout');
    }
    const now = new Date();
    const frozen = freezeCheckoutTotals(session, now);
    const pausedSeconds = liveSessionMetrics(session, now).billableSeconds;
    const openPause = session.pauses.find((pause) => pause.resumedAt == null);
    if (openPause) {
      await tx.sessionPause.update({
        where: { id: openPause.id },
        data: { resumedAt: now },
      });
    }
    const updated = await tx.session.update({
      where: { id },
      data: {
        status: 'CHECKOUT',
        endTime: frozen.endTime,
        actualDurationSeconds: frozen.actualDurationSeconds,
        pausedDurationSeconds: Math.max(0, Math.floor((now.getTime() - session.startTime.getTime()) / 1000) - pausedSeconds),
        gamingCostFils: frozen.gamingCostFils,
        extrasCostFils: frozen.extrasCostFils,
        totalFils: frozen.totalFils,
      },
      include: sessionInclude,
    });
    await logEvent(tx as never, id, 'SESSION_STOPPED');
    return updated;
  });
}

export async function completePayment(input: {
  sessionId: string;
  amountReceivedFils: number;
  paymentMethod: string;
}) {
  if (!Number.isInteger(input.amountReceivedFils) || input.amountReceivedFils < 0) {
    throw new AppError('Received amount must be a non-negative fils integer');
  }

  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({
      where: { id: input.sessionId },
      include: sessionInclude,
    });
    if (!session) throw notFound('Session');
    if (session.status === 'COMPLETED' || session.paymentStatus === 'PAID') {
      throw new AppError('This session is already paid', 409, 'ALREADY_PAID');
    }
    if (session.status !== 'CHECKOUT') {
      throw new AppError('Stop the session and open checkout before taking payment');
    }
    const configuredMethod = await tx.paymentMethodConfig.findUnique({
      where: { code: input.paymentMethod },
    });
    if (!configuredMethod?.enabled) {
      throw new AppError('Select an enabled payment method');
    }

    const existingPayment = await tx.payment.findFirst({
      where: { sessionId: session.id, status: 'COMPLETED' },
    });
    if (existingPayment) {
      throw new AppError('This session is already paid', 409, 'ALREADY_PAID');
    }

    const totalFils = session.totalFils;
    if (input.amountReceivedFils < totalFils) {
      throw new AppError('Received amount is less than the total. Remaining balance must be collected.');
    }

    const changeFils = input.amountReceivedFils - totalFils;
    await tx.payment.create({
      data: {
        sessionId: session.id,
        amountFils: input.amountReceivedFils,
        paymentMethod: input.paymentMethod,
        status: 'COMPLETED',
        changeFils,
      },
    });

    const updated = await tx.session.update({
      where: { id: session.id },
      data: {
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        closedAt: new Date(),
      },
      include: { ...sessionInclude, payments: true },
    });
    await logEvent(tx as never, session.id, 'PAYMENT_COMPLETED', {
      amountReceivedFils: input.amountReceivedFils,
      paymentMethod: input.paymentMethod,
    });
    return updated;
  });
}

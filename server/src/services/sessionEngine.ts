import {
  computeBillableSeconds,
  computeGamingCostFils,
  computeSessionTotalFils,
  extraLineTotalFils,
  type BillingMethod,
  type PauseInterval,
  type PriceBlock,
  type SessionStatus,
} from '@pscenter/shared';
import type { Payment, Session, SessionExtra, SessionPause } from '@prisma/client';

export type SessionWithRelations = Session & {
  pauses: SessionPause[];
  extras: SessionExtra[];
  payments?: Payment[];
};

export function parseBlocks(json: string): PriceBlock[] {
  try {
    const parsed = JSON.parse(json) as PriceBlock[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toPauseIntervals(pauses: SessionPause[]): PauseInterval[] {
  return pauses.map((p) => ({
    pausedAtMs: p.pausedAt.getTime(),
    resumedAtMs: p.resumedAt ? p.resumedAt.getTime() : null,
  }));
}

export function liveSessionMetrics(session: SessionWithRelations, now = new Date()) {
  const occupying: SessionStatus[] = ['RUNNING', 'PAUSED', 'CHECKOUT'];
  const freezeAt =
    session.endTime ??
    (session.status === 'CHECKOUT' || session.status === 'COMPLETED' ? now : undefined);

  const billableSeconds = computeBillableSeconds({
    startTimeMs: session.startTime.getTime(),
    nowMs: now.getTime(),
    pauses: toPauseIntervals(session.pauses),
    endTimeMs: freezeAt ? freezeAt.getTime() : null,
  });

  const gamingCostFils =
    occupying.includes(session.status as SessionStatus) && session.status !== 'CHECKOUT'
      ? computeGamingCostFils({
          method: session.billingMethod as BillingMethod,
          hourlyRateFils: session.hourlyRateFils,
          billableSeconds,
          blocks: parseBlocks(session.blocksJson),
        })
      : session.status === 'CHECKOUT' || session.status === 'COMPLETED'
        ? session.gamingCostFils
        : computeGamingCostFils({
            method: session.billingMethod as BillingMethod,
            hourlyRateFils: session.hourlyRateFils,
            billableSeconds,
            blocks: parseBlocks(session.blocksJson),
          });

  const extrasCostFils = session.extras.reduce((sum, line) => sum + line.totalFils, 0);
  const totalFils = computeSessionTotalFils({
    gamingCostFils,
    extrasCostFils,
    discountFils: session.discountFils,
  });

  const planned = session.plannedDurationSeconds;
  const remainingSeconds =
    session.billingMode === 'FIXED' && planned != null ? planned - billableSeconds : null;
  const timeExpired =
    session.billingMode === 'FIXED' && remainingSeconds != null && remainingSeconds <= 0;

  return {
    billableSeconds,
    gamingCostFils,
    extrasCostFils,
    discountFils: session.discountFils,
    totalFils,
    remainingSeconds,
    timeExpired,
  };
}

export function freezeCheckoutTotals(session: SessionWithRelations, now = new Date()) {
  const live = liveSessionMetrics(
    {
      ...session,
      status: 'RUNNING',
      endTime: now,
    },
    now,
  );
  return {
    ...live,
    actualDurationSeconds: live.billableSeconds,
    endTime: now,
  };
}

export function lineTotal(unitPriceFils: number, quantity: number): number {
  return extraLineTotalFils(unitPriceFils, quantity);
}

export function extendPlannedDuration(
  currentPlannedSeconds: number | null,
  billableSeconds: number,
  extraSeconds: number,
): number {
  if (!Number.isInteger(extraSeconds) || extraSeconds <= 0) {
    throw new Error('Added time must be a positive integer number of seconds');
  }
  return (currentPlannedSeconds ?? billableSeconds) + extraSeconds;
}

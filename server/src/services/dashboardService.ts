import type { ScreenOperationalStatus } from '@pscenter/shared';
import { prisma } from '../db.js';
import { liveSessionMetrics, type SessionWithRelations } from './sessionEngine.js';
import { buildReport, resolveRange } from './reportService.js';
import { getSettingsMap } from './settingsService.js';

export function operationalStatus(params: {
  active: boolean;
  maintenance: boolean;
  sessionStatus?: string | null;
}): ScreenOperationalStatus {
  if (params.sessionStatus === 'RUNNING') return 'RUNNING';
  if (params.sessionStatus === 'PAUSED') return 'PAUSED';
  if (params.sessionStatus === 'CHECKOUT') return 'CHECKOUT';
  if (params.maintenance || !params.active) return 'MAINTENANCE';
  return 'AVAILABLE';
}

export function serializeSession(session: SessionWithRelations, now = new Date()) {
  const live = liveSessionMetrics(session, now);
  const payment = session.payments?.[0];
  return {
    id: session.id,
    screenId: session.screenId,
    status: session.status,
    billingMode: session.billingMode,
    startTime: session.startTime.toISOString(),
    endTime: session.endTime?.toISOString() ?? null,
    plannedDurationSeconds: session.plannedDurationSeconds,
    actualDurationSeconds: live.billableSeconds,
    pricingRuleName: session.pricingRuleName,
    billingMethod: session.billingMethod,
    blocksJson: session.blocksJson,
    hourlyRateFils: session.hourlyRateFils,
    gamingCostFils: live.gamingCostFils,
    extrasCostFils: live.extrasCostFils,
    discountFils: live.discountFils,
    totalFils: live.totalFils,
    paymentStatus: session.paymentStatus,
    notes: session.notes,
    remainingSeconds: live.remainingSeconds,
    timeExpired: live.timeExpired,
    closedAt: session.closedAt?.toISOString() ?? null,
    paymentMethod: payment?.paymentMethod ?? null,
    amountReceivedFils: payment?.amountFils ?? null,
    changeFils: payment?.changeFils ?? null,
    extras: session.extras.map((e) => ({
      id: e.id,
      productId: e.productId,
      name: e.productNameSnapshot,
      unitPriceFils: e.unitPriceFils,
      quantity: e.quantity,
      totalFils: e.totalFils,
    })),
  };
}

export async function buildDashboard() {
  const screens = await prisma.screen.findMany({
    include: { pricingRule: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  const occupying = await prisma.session.findMany({
    where: { status: { in: ['RUNNING', 'PAUSED', 'CHECKOUT'] } },
    include: { pauses: true, extras: true },
  });
  const byScreen = new Map(occupying.map((s) => [s.screenId, s]));
  const now = new Date();
  const todayRange = await resolveRange('today');
  const today = await buildReport(todayRange.start, todayRange.end);
  const settings = await getSettingsMap();

  const cards = screens.map((screen) => {
    const session = byScreen.get(screen.id);
    const status = operationalStatus({
      active: screen.active,
      maintenance: screen.maintenance,
      sessionStatus: session?.status,
    });
    return {
      id: screen.id,
      name: screen.name,
      consoleType: screen.consoleType,
      active: screen.active,
      maintenance: screen.maintenance,
      status,
      hourlyRateFils: screen.pricingRule.hourlyRateFils,
      billingMethod: screen.pricingRule.billingMethod,
      blocksJson: screen.pricingRule.blocksJson,
      pricingRuleName: screen.pricingRule.name,
      session: session ? serializeSession(session, now) : null,
    };
  });

  return {
    today,
    activeSessions: occupying.filter((s) => s.status !== 'CHECKOUT').length,
    availableScreens: cards.filter((c) => c.status === 'AVAILABLE').length,
    settings: {
      businessName: settings.businessName ?? 'PlayStation Center',
      soundNotifications: settings.soundNotifications ?? 'true',
      lowTimeWarningMinutes: settings.lowTimeWarningMinutes ?? '10,5',
    },
    screens: cards,
  };
}

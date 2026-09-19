import { DateTime } from './datetime.js';
import { prisma } from '../db.js';
import { getSettingsMap } from './settingsService.js';

export type ReportPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export async function resolveRange(
  period: ReportPeriod,
  from?: string,
  to?: string,
): Promise<{ start: Date; end: Date }> {
  const settings = await getSettingsMap();
  const tz = settings.timezone || 'Asia/Amman';
  return DateTime.range(period, tz, from, to);
}

export async function buildReport(start: Date, end: Date) {
  const sessions = await prisma.session.findMany({
    where: {
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      closedAt: { gte: start, lt: end },
    },
    include: { extras: true, screen: true, payments: true },
  });

  const gamingRevenueFils = sessions.reduce((s, x) => s + x.gamingCostFils, 0);
  const extrasRevenueFils = sessions.reduce((s, x) => s + x.extrasCostFils, 0);
  const totalRevenueFils = sessions.reduce((s, x) => s + x.totalFils, 0);
  const sessionCount = sessions.length;
  const totalGamingSeconds = sessions.reduce((s, x) => s + (x.actualDurationSeconds ?? 0), 0);
  const averageSessionSeconds = sessionCount ? Math.round(totalGamingSeconds / sessionCount) : 0;
  const averageTransactionFils = sessionCount ? Math.round(totalRevenueFils / sessionCount) : 0;

  const byScreenMap = new Map<
    string,
    { screenId: string; name: string; revenueFils: number; sessions: number; seconds: number }
  >();
  for (const session of sessions) {
    const current = byScreenMap.get(session.screenId) ?? {
      screenId: session.screenId,
      name: session.screen.name,
      revenueFils: 0,
      sessions: 0,
      seconds: 0,
    };
    current.revenueFils += session.totalFils;
    current.sessions += 1;
    current.seconds += session.actualDurationSeconds ?? 0;
    byScreenMap.set(session.screenId, current);
  }

  const productMap = new Map<string, { name: string; quantity: number; revenueFils: number }>();
  for (const session of sessions) {
    for (const extra of session.extras) {
      const key = extra.productNameSnapshot;
      const current = productMap.get(key) ?? { name: key, quantity: 0, revenueFils: 0 };
      current.quantity += extra.quantity;
      current.revenueFils += extra.totalFils;
      productMap.set(key, current);
    }
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    gamingRevenueFils,
    extrasRevenueFils,
    totalRevenueFils,
    sessionCount,
    totalGamingSeconds,
    averageSessionSeconds,
    averageTransactionFils,
    screens: [...byScreenMap.values()].map((row) => ({
      ...row,
      averageRevenueFils: row.sessions ? Math.round(row.revenueFils / row.sessions) : 0,
    })),
    products: [...productMap.values()].sort((a, b) => b.revenueFils - a.revenueFils),
  };
}

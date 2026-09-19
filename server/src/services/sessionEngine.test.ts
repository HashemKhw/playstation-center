import { describe, expect, it } from 'vitest';
import {
  extendPlannedDuration,
  freezeCheckoutTotals,
  liveSessionMetrics,
} from './sessionEngine.js';
import type { SessionWithRelations } from './sessionEngine.js';

function session(overrides: Partial<SessionWithRelations> = {}): SessionWithRelations {
  const start = new Date('2026-08-24T14:00:00.000Z');
  return {
    id: 's1',
    screenId: 'sc1',
    pricingRuleId: 'p1',
    status: 'RUNNING',
    billingMode: 'OPEN',
    startTime: start,
    endTime: null,
    plannedDurationSeconds: null,
    pausedDurationSeconds: 0,
    actualDurationSeconds: null,
    pricingRuleName: 'Standard',
    billingMethod: 'PER_MINUTE',
    hourlyRateFils: 200,
    blocksJson: '[]',
    gamingCostFils: 0,
    extrasCostFils: 0,
    discountFils: 0,
    totalFils: 0,
    paymentStatus: 'UNPAID',
    notes: null,
    createdAt: start,
    updatedAt: start,
    closedAt: null,
    pauses: [],
    extras: [],
    ...overrides,
  } as SessionWithRelations;
}

describe('session engine', () => {
  it('bills 45 minutes at 2 JD/hour as 1.50 JD', () => {
    const now = new Date('2026-08-24T14:45:00.000Z');
    expect(liveSessionMetrics(session(), now).gamingCostFils).toBe(150);
  });

  it('bills 90 minutes at 2 JD/hour as 3.00 JD', () => {
    const now = new Date('2026-08-24T15:30:00.000Z');
    expect(liveSessionMetrics(session(), now).gamingCostFils).toBe(300);
  });

  it('fixed duration remaining and expiry', () => {
    const now = new Date('2026-08-24T15:00:00.000Z');
    const live = liveSessionMetrics(
      session({ billingMode: 'FIXED', plannedDurationSeconds: 60 * 60 }),
      now,
    );
    expect(live.remainingSeconds).toBe(0);
    expect(live.timeExpired).toBe(true);
  });

  it('added extras do not change historical unit prices in totals', () => {
    const now = new Date('2026-08-24T14:30:00.000Z');
    const live = liveSessionMetrics(
      session({
        extras: [
          {
            id: 'e1',
            sessionId: 's1',
            productId: 'p',
            productNameSnapshot: 'Chocolate',
            unitPriceFils: 50,
            quantity: 2,
            totalFils: 100,
            createdAt: now,
          },
        ],
      }),
      now,
    );
    expect(live.extrasCostFils).toBe(100);
    expect(live.totalFils).toBe(200);
  });

  it('checkout freeze uses end time', () => {
    const end = new Date('2026-08-24T15:00:00.000Z');
    const frozen = freezeCheckoutTotals(session(), end);
    expect(frozen.gamingCostFils).toBe(200);
    expect(frozen.actualDurationSeconds).toBe(3600);
  });

  it('adds time to an existing fixed session without creating a new session', () => {
    expect(extendPlannedDuration(3600, 1200, 1800)).toBe(5400);
  });

  it('turns an open session into a fixed window from its current elapsed time', () => {
    expect(extendPlannedDuration(null, 1200, 1800)).toBe(3000);
  });
});

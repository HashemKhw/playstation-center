import { describe, expect, it } from 'vitest';
import { addFils, formatJod, parseJodToFils } from '../src/money.js';
import { computeGamingCostFils } from '../src/billing.js';
import { extraLineTotalFils, computeChangeFils, computeSessionTotalFils } from '../src/totals.js';
import { computeBillableSeconds } from '../src/duration.js';

describe('money', () => {
  it('0.10 + 0.20 = 0.30', () => {
    expect(addFils(parseJodToFils('0.10'), parseJodToFils('0.20'))).toBe(parseJodToFils('0.30'));
  });

  it('formats JOD', () => {
    expect(formatJod(200)).toBe('2.00 JD');
    expect(formatJod(50)).toBe('0.50 JD');
    expect(formatJod(125)).toBe('1.25 JD');
  });
});

describe('billing', () => {
  it('2 JD/hour × 30 minutes = 1 JD (per minute)', () => {
    expect(
      computeGamingCostFils({
        method: 'PER_MINUTE',
        hourlyRateFils: 200,
        billableSeconds: 30 * 60,
        blocks: [],
      }),
    ).toBe(100);
  });

  it('35 minutes at 2 JD/hour rounds to 1.17 JD', () => {
    expect(
      computeGamingCostFils({
        method: 'PER_MINUTE',
        hourlyRateFils: 200,
        billableSeconds: 35 * 60,
        blocks: [],
      }),
    ).toBe(117);
  });

  it('per started hour: 1 minute = full hour', () => {
    expect(
      computeGamingCostFils({
        method: 'PER_STARTED_HOUR',
        hourlyRateFils: 200,
        billableSeconds: 60,
        blocks: [],
      }),
    ).toBe(200);
  });

  it('per started hour: 1h 10m = two hours', () => {
    expect(
      computeGamingCostFils({
        method: 'PER_STARTED_HOUR',
        hourlyRateFils: 200,
        billableSeconds: 70 * 60,
        blocks: [],
      }),
    ).toBe(400);
  });

  it('does not bill while paused', () => {
    const start = Date.parse('2026-08-24T14:00:00.000Z');
    const now = Date.parse('2026-08-24T15:00:00.000Z');
    const billable = computeBillableSeconds({
      startTimeMs: start,
      nowMs: now,
      pauses: [{ pausedAtMs: Date.parse('2026-08-24T14:20:00.000Z'), resumedAtMs: now }],
    });
    expect(billable).toBe(20 * 60);
    expect(
      computeGamingCostFils({
        method: 'PER_MINUTE',
        hourlyRateFils: 200,
        billableSeconds: billable,
        blocks: [],
      }),
    ).toBe(67);
  });
});

describe('extras and totals', () => {
  it('0.50 × 2 = 1.00', () => {
    expect(extraLineTotalFils(50, 2)).toBe(100);
  });

  it('3.00 + 1.50 = 4.50', () => {
    expect(computeSessionTotalFils({ gamingCostFils: 300, extrasCostFils: 150 })).toBe(450);
  });

  it('5.00 - 4.50 = 0.50 change', () => {
    const result = computeChangeFils({ totalFils: 450, amountReceivedFils: 500 });
    expect(result.changeFils).toBe(50);
    expect(result.remainingFils).toBe(0);
    expect(result.isPaidInFull).toBe(true);
  });
});

describe('duration recovery', () => {
  it('reconstructs elapsed time from timestamps after restart', () => {
    const start = Date.parse('2026-08-24T14:00:00.000Z');
    const reopen = Date.parse('2026-08-24T14:30:00.000Z');
    expect(
      computeBillableSeconds({
        startTimeMs: start,
        nowMs: reopen,
        pauses: [],
      }),
    ).toBe(30 * 60);
  });
});

import { divideFils, multiplyFils } from './money.js';
import type { BillingMethod, PriceBlock } from './types.js';

export interface GamingCostInput {
  method: BillingMethod;
  hourlyRateFils: number;
  billableSeconds: number;
  blocks: PriceBlock[];
}

function costPerMinute(hourlyRateFils: number, billableSeconds: number): number {
  if (billableSeconds <= 0) return 0;
  return divideFils(hourlyRateFils * billableSeconds, 3600);
}

function costPerStartedHour(hourlyRateFils: number, billableSeconds: number): number {
  if (billableSeconds <= 0) return 0;
  const hoursStarted = Math.ceil(billableSeconds / 3600);
  return multiplyFils(hourlyRateFils, hoursStarted);
}

function sortedBlocks(blocks: PriceBlock[]): PriceBlock[] {
  return [...blocks].filter((b) => b.durationSeconds > 0).sort((a, b) => a.durationSeconds - b.durationSeconds);
}

function costFixedBlocks(blocks: PriceBlock[], billableSeconds: number): number {
  if (billableSeconds <= 0) return 0;
  const sorted = sortedBlocks(blocks);
  if (sorted.length === 0) {
    throw new Error('FIXED_BLOCKS pricing requires at least one duration block');
  }

  let remaining = billableSeconds;
  let cost = 0;
  while (remaining > 0) {
    const covering = sorted.find((b) => b.durationSeconds >= remaining);
    if (covering) {
      cost += covering.priceFils;
      break;
    }
    const largest = sorted[sorted.length - 1]!;
    cost += largest.priceFils;
    remaining -= largest.durationSeconds;
  }
  return cost;
}

export function computeGamingCostFils(input: GamingCostInput): number {
  const seconds = Math.max(0, Math.floor(input.billableSeconds));
  switch (input.method) {
    case 'PER_MINUTE':
      return costPerMinute(input.hourlyRateFils, seconds);
    case 'PER_STARTED_HOUR':
      return costPerStartedHour(input.hourlyRateFils, seconds);
    case 'FIXED_BLOCKS':
      return costFixedBlocks(input.blocks, seconds);
    default: {
      const exhaustive: never = input.method;
      throw new Error(`Unsupported billing method: ${String(exhaustive)}`);
    }
  }
}

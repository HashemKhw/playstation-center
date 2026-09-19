import type { BillingMethod, PriceBlock } from '@pscenter/shared';
import { prisma } from '../db.js';
import { AppError, notFound } from '../errors.js';

export async function listPricingRules() {
  return prisma.pricingRule.findMany({ orderBy: { name: 'asc' } });
}

export async function createPricingRule(data: {
  name: string;
  billingMethod: BillingMethod;
  hourlyRateFils: number;
  blocks?: PriceBlock[];
}) {
  if (!data.name.trim()) throw new AppError('Pricing name is required');
  if (!Number.isInteger(data.hourlyRateFils) || data.hourlyRateFils < 0) {
    throw new AppError('Hourly rate cannot be negative');
  }
  validateBlocks(data.billingMethod, data.blocks);
  return prisma.pricingRule.create({
    data: {
      name: data.name.trim(),
      billingMethod: data.billingMethod,
      hourlyRateFils: data.hourlyRateFils,
      blocksJson: JSON.stringify(data.blocks ?? []),
    },
  });
}

export async function updatePricingRule(
  id: string,
  data: Partial<{
    name: string;
    billingMethod: BillingMethod;
    hourlyRateFils: number;
    blocks: PriceBlock[];
    active: boolean;
  }>,
) {
  const rule = await prisma.pricingRule.findUnique({ where: { id } });
  if (!rule) throw notFound('Pricing rule');
  const nextMethod = data.billingMethod ?? (rule.billingMethod as BillingMethod);
  const nextBlocks = data.blocks ?? (JSON.parse(rule.blocksJson) as PriceBlock[]);
  validateBlocks(nextMethod, nextBlocks);
  return prisma.pricingRule.update({
    where: { id },
    data: {
      name: data.name?.trim(),
      billingMethod: data.billingMethod,
      hourlyRateFils: data.hourlyRateFils,
      blocksJson: data.blocks ? JSON.stringify(data.blocks) : undefined,
      active: data.active,
    },
  });
}

function validateBlocks(method: BillingMethod, blocks?: PriceBlock[]) {
  if (method !== 'FIXED_BLOCKS') return;
  if (!blocks?.length) {
    throw new AppError('Fixed-block pricing requires at least one block');
  }
  for (const block of blocks) {
    if (
      !Number.isInteger(block.durationSeconds) ||
      block.durationSeconds <= 0 ||
      !Number.isInteger(block.priceFils) ||
      block.priceFils < 0
    ) {
      throw new AppError('Each pricing block needs a positive duration and non-negative price');
    }
  }
}

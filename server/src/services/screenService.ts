import { prisma } from '../db.js';
import { AppError, notFound } from '../errors.js';

export async function listScreens() {
  return prisma.screen.findMany({
    include: { pricingRule: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function createScreen(data: {
  name: string;
  consoleType?: string;
  pricingRuleId: string;
  maintenance?: boolean;
}) {
  const name = data.name.trim();
  if (!name) throw new AppError('Screen name is required');
  const rule = await prisma.pricingRule.findUnique({ where: { id: data.pricingRuleId } });
  if (!rule) throw notFound('Pricing rule');
  const count = await prisma.screen.count();
  return prisma.screen.create({
    data: {
      name,
      consoleType: data.consoleType?.trim() || 'PS5',
      pricingRuleId: data.pricingRuleId,
      maintenance: data.maintenance ?? false,
      sortOrder: count,
    },
    include: { pricingRule: true },
  });
}

export async function updateScreen(
  id: string,
  data: Partial<{
    name: string;
    consoleType: string;
    pricingRuleId: string;
    active: boolean;
    maintenance: boolean;
  }>,
) {
  const screen = await prisma.screen.findUnique({ where: { id } });
  if (!screen) throw notFound('Screen');
  if (data.name !== undefined && !data.name.trim()) throw new AppError('Screen name is required');
  return prisma.screen.update({
    where: { id },
    data: {
      name: data.name?.trim(),
      consoleType: data.consoleType,
      pricingRuleId: data.pricingRuleId,
      active: data.active,
      maintenance: data.maintenance,
    },
    include: { pricingRule: true },
  });
}

export async function deleteScreen(id: string) {
  const sessionCount = await prisma.session.count({ where: { screenId: id } });
  if (sessionCount > 0) {
    throw new AppError('This screen has history and cannot be deleted. Disable it instead.');
  }
  await prisma.screen.delete({ where: { id } });
}

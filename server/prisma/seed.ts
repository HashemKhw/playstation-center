import { PrismaClient } from '@prisma/client';
import { parseJodToFils } from '@pscenter/shared';

const prisma = new PrismaClient();

async function main() {
  const defaultRate = parseJodToFils('2.00');

  const pricing =
    (await prisma.pricingRule.findFirst({ where: { name: 'Standard hourly' } })) ??
    (await prisma.pricingRule.create({
      data: {
        name: 'Standard hourly',
        billingMethod: 'PER_MINUTE',
        hourlyRateFils: defaultRate,
        blocksJson: JSON.stringify([
          { durationSeconds: 30 * 60, priceFils: parseJodToFils('1.00') },
          { durationSeconds: 60 * 60, priceFils: parseJodToFils('2.00') },
          { durationSeconds: 120 * 60, priceFils: parseJodToFils('3.50') },
        ]),
      },
    }));

  const screenNames = ['PS1', 'PS2', 'PS3', 'PS4'];
  for (const [index, name] of screenNames.entries()) {
    const existing = await prisma.screen.findFirst({ where: { name } });
    if (!existing) {
      await prisma.screen.create({
        data: {
          name,
          consoleType: 'PS5',
          pricingRuleId: pricing.id,
          sortOrder: index,
        },
      });
    }
  }

  const products = [
    { name: 'Water', price: '0.50', category: 'Drinks' },
    { name: 'Pepsi', price: '0.75', category: 'Drinks' },
    { name: 'Chocolate', price: '0.50', category: 'Snacks' },
    { name: 'Chips', price: '0.35', category: 'Snacks' },
    { name: 'Energy Drink', price: '1.00', category: 'Drinks' },
    { name: 'Coffee', price: '0.50', category: 'Drinks' },
  ];
  for (const product of products) {
    const existing = await prisma.product.findFirst({ where: { name: product.name } });
    if (!existing) {
      await prisma.product.create({
        data: {
          name: product.name,
          category: product.category,
          priceFils: parseJodToFils(product.price),
        },
      });
    }
  }

  const methods = [
    { code: 'CASH', name: 'Cash', sortOrder: 0 },
    { code: 'CARD', name: 'Card', sortOrder: 1 },
    { code: 'OTHER', name: 'Other', sortOrder: 2 },
  ];
  for (const method of methods) {
    await prisma.paymentMethodConfig.upsert({
      where: { code: method.code },
      update: { name: method.name },
      create: method,
    });
  }

  const settings: Record<string, string> = {
    businessName: 'PlayStation Center',
    currencyCode: 'JOD',
    currencyDisplay: 'JD',
    timezone: 'Asia/Amman',
    defaultPricingRuleId: pricing.id,
    defaultBillingMethod: 'PER_MINUTE',
    defaultPaymentMethod: 'CASH',
    receiptFooter: 'Thank you!',
    soundNotifications: 'true',
    lowTimeWarningMinutes: '10,5',
    theme: 'dark',
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

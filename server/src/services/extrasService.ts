import { extraLineTotalFils } from '@pscenter/shared';
import { prisma } from '../db.js';
import { AppError, notFound } from '../errors.js';

export async function addCatalogExtra(sessionId: string, productId: string, quantity = 1) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new AppError('Quantity must be an integer of at least 1');
  }
  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id: sessionId }, include: { extras: true } });
    if (!session) throw notFound('Session');
    if (!['RUNNING', 'PAUSED'].includes(session.status)) {
      throw new AppError('Extras can only be added to an open session');
    }
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product || !product.active) throw notFound('Product');
    if (product.priceFils < 0) throw new AppError('Invalid product price');
    if (product.stockQuantity != null) {
      if (product.stockQuantity < quantity) throw new AppError('Not enough stock');
      await tx.product.update({
        where: { id: product.id },
        data: { stockQuantity: product.stockQuantity - quantity },
      });
    }

    const existing = session.extras.find((e) => e.productId === product.id);
    let extra;
    if (existing) {
      const nextQty = existing.quantity + quantity;
      extra = await tx.sessionExtra.update({
        where: { id: existing.id },
        data: {
          quantity: nextQty,
          totalFils: extraLineTotalFils(existing.unitPriceFils, nextQty),
        },
      });
    } else {
      extra = await tx.sessionExtra.create({
        data: {
          sessionId,
          productId: product.id,
          productNameSnapshot: product.name,
          unitPriceFils: product.priceFils,
          quantity,
          totalFils: extraLineTotalFils(product.priceFils, quantity),
        },
      });
    }

    const extras = await tx.sessionExtra.findMany({ where: { sessionId } });
    const extrasCostFils = extras.reduce((s, e) => s + e.totalFils, 0);
    await tx.session.update({
      where: { id: sessionId },
      data: { extrasCostFils, totalFils: session.gamingCostFils + extrasCostFils - session.discountFils },
    });
    await tx.activityEvent.create({
      data: {
        sessionId,
        type: 'PRODUCT_ADDED',
        payloadJson: JSON.stringify({ productId, quantity, name: product.name }),
      },
    });
    return extra;
  });
}

export async function addCustomExtra(sessionId: string, input: { name?: string; unitPriceFils: number; quantity: number }) {
  if (!Number.isInteger(input.unitPriceFils) || input.unitPriceFils < 0) {
    throw new AppError('Price cannot be negative');
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new AppError('Quantity must be an integer of at least 1');
  }
  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id: sessionId } });
    if (!session) throw notFound('Session');
    if (!['RUNNING', 'PAUSED'].includes(session.status)) {
      throw new AppError('Extras can only be added to an open session');
    }
    const extra = await tx.sessionExtra.create({
      data: {
        sessionId,
        productNameSnapshot: input.name?.trim() || 'Custom extra',
        unitPriceFils: input.unitPriceFils,
        quantity: input.quantity,
        totalFils: extraLineTotalFils(input.unitPriceFils, input.quantity),
      },
    });
    const extras = await tx.sessionExtra.findMany({ where: { sessionId } });
    const extrasCostFils = extras.reduce((s, e) => s + e.totalFils, 0);
    await tx.session.update({
      where: { id: sessionId },
      data: { extrasCostFils, totalFils: session.gamingCostFils + extrasCostFils - session.discountFils },
    });
    await tx.activityEvent.create({
      data: {
        sessionId,
        type: 'PRODUCT_ADDED',
        payloadJson: JSON.stringify({ custom: true, quantity: input.quantity }),
      },
    });
    return extra;
  });
}

export async function updateExtraQuantity(extraId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new AppError('Quantity must be a non-negative integer');
  }
  return prisma.$transaction(async (tx) => {
    const extra = await tx.sessionExtra.findUnique({ where: { id: extraId } });
    if (!extra) throw notFound('Extra');
    const session = await tx.session.findUnique({ where: { id: extra.sessionId } });
    if (!session) throw notFound('Session');
    if (['COMPLETED', 'CANCELLED'].includes(session.status)) {
      throw new AppError('Historical transactions cannot be edited');
    }
    if (quantity === 0) {
      await tx.sessionExtra.delete({ where: { id: extraId } });
      if (extra.productId) {
        const product = await tx.product.findUnique({ where: { id: extra.productId } });
        if (product?.stockQuantity != null) {
          await tx.product.update({
            where: { id: product.id },
            data: { stockQuantity: product.stockQuantity + extra.quantity },
          });
        }
      }
      await tx.activityEvent.create({
        data: { sessionId: session.id, type: 'PRODUCT_REMOVED', payloadJson: JSON.stringify({ extraId }) },
      });
    } else {
      if (extra.productId && quantity !== extra.quantity) {
        const product = await tx.product.findUnique({ where: { id: extra.productId } });
        if (product?.stockQuantity != null) {
          const stockDelta = extra.quantity - quantity;
          const nextStock = product.stockQuantity + stockDelta;
          if (nextStock < 0) throw new AppError('Not enough stock');
          await tx.product.update({
            where: { id: product.id },
            data: { stockQuantity: nextStock },
          });
        }
      }
      await tx.sessionExtra.update({
        where: { id: extraId },
        data: { quantity, totalFils: extraLineTotalFils(extra.unitPriceFils, quantity) },
      });
    }
    const extras = await tx.sessionExtra.findMany({ where: { sessionId: session.id } });
    const extrasCostFils = extras.reduce((s, e) => s + e.totalFils, 0);
    await tx.session.update({
      where: { id: session.id },
      data: { extrasCostFils, totalFils: session.gamingCostFils + extrasCostFils - session.discountFils },
    });
    return tx.session.findUnique({ where: { id: session.id }, include: { extras: true } });
  });
}

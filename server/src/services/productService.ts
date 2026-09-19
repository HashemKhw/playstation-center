import { prisma } from '../db.js';
import { AppError, notFound } from '../errors.js';

export async function listProducts(includeInactive = false) {
  return prisma.product.findMany({
    where: includeInactive ? undefined : { active: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
}

export async function createProduct(data: {
  name: string;
  category?: string;
  priceFils: number;
  stockQuantity?: number | null;
}) {
  if (!data.name.trim()) throw new AppError('Product name is required');
  if (!Number.isInteger(data.priceFils) || data.priceFils < 0) {
    throw new AppError('Price cannot be negative');
  }
  return prisma.product.create({
    data: {
      name: data.name.trim(),
      category: data.category?.trim() || 'General',
      priceFils: data.priceFils,
      stockQuantity: data.stockQuantity ?? null,
    },
  });
}

export async function updateProduct(
  id: string,
  data: Partial<{ name: string; category: string; priceFils: number; active: boolean; stockQuantity: number | null }>,
) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw notFound('Product');
  if (data.priceFils != null && (!Number.isInteger(data.priceFils) || data.priceFils < 0)) {
    throw new AppError('Price cannot be negative');
  }
  return prisma.product.update({
    where: { id },
    data: {
      name: data.name?.trim(),
      category: data.category,
      priceFils: data.priceFils,
      active: data.active,
      stockQuantity: data.stockQuantity,
    },
  });
}

export async function deleteProduct(id: string) {
  const used = await prisma.sessionExtra.count({ where: { productId: id } });
  if (used > 0) {
    await prisma.product.update({ where: { id }, data: { active: false } });
    return { deactivated: true };
  }
  await prisma.product.delete({ where: { id } });
  return { deleted: true };
}

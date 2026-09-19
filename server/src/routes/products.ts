import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as products from '../services/productService.js';

export const productsRouter = Router();

productsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.all === '1';
    res.json({ products: await products.listProducts(includeInactive) });
  }),
);

productsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1),
        category: z.string().optional(),
        priceFils: z.number().int().nonnegative(),
        stockQuantity: z.number().int().nullable().optional(),
      })
      .parse(req.body);
    res.status(201).json({ product: await products.createProduct(body) });
  }),
);

productsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1).optional(),
        category: z.string().optional(),
        priceFils: z.number().int().nonnegative().optional(),
        active: z.boolean().optional(),
        stockQuantity: z.number().int().nullable().optional(),
      })
      .parse(req.body);
    res.json({ product: await products.updateProduct(req.params.id, body) });
  }),
);

productsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await products.deleteProduct(req.params.id));
  }),
);

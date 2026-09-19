import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as pricing from '../services/pricingService.js';

export const pricingRouter = Router();

pricingRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ pricingRules: await pricing.listPricingRules() });
  }),
);

pricingRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1),
        billingMethod: z.enum(['PER_MINUTE', 'PER_STARTED_HOUR', 'FIXED_BLOCKS']),
        hourlyRateFils: z.number().int().nonnegative(),
        blocks: z
          .array(
            z.object({
              durationSeconds: z.number().int().positive(),
              priceFils: z.number().int().nonnegative(),
            }),
          )
          .optional(),
      })
      .parse(req.body);
    res.status(201).json({ pricingRule: await pricing.createPricingRule(body) });
  }),
);

pricingRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1).optional(),
        billingMethod: z.enum(['PER_MINUTE', 'PER_STARTED_HOUR', 'FIXED_BLOCKS']).optional(),
        hourlyRateFils: z.number().int().nonnegative().optional(),
        blocks: z
          .array(
            z.object({
              durationSeconds: z.number().int().positive(),
              priceFils: z.number().int().nonnegative(),
            }),
          )
          .optional(),
        active: z.boolean().optional(),
      })
      .parse(req.body);
    res.json({ pricingRule: await pricing.updatePricingRule(req.params.id, body) });
  }),
);

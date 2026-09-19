import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as screens from '../services/screenService.js';

export const screensRouter = Router();

screensRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ screens: await screens.listScreens() });
  }),
);

screensRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1),
        consoleType: z.string().optional(),
        pricingRuleId: z.string().min(1),
        maintenance: z.boolean().optional(),
      })
      .parse(req.body);
    res.status(201).json({ screen: await screens.createScreen(body) });
  }),
);

screensRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1).optional(),
        consoleType: z.string().optional(),
        pricingRuleId: z.string().optional(),
        active: z.boolean().optional(),
        maintenance: z.boolean().optional(),
      })
      .parse(req.body);
    res.json({ screen: await screens.updateScreen(req.params.id, body) });
  }),
);

screensRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await screens.deleteScreen(req.params.id);
    res.json({ ok: true });
  }),
);

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getSettingsMap, updateSettings } from '../services/settingsService.js';

export const settingsRouter = Router();

settingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const settings = await getSettingsMap();
    const paymentMethods = await prisma.paymentMethodConfig.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({ settings, paymentMethods });
  }),
);

settingsRouter.put(
  '/',
  asyncHandler(async (req, res) => {
    const body = z.record(z.string()).parse(req.body);
    res.json({ settings: await updateSettings(body) });
  }),
);

settingsRouter.patch(
  '/payment-methods/:id',
  asyncHandler(async (req, res) => {
    const body = z.object({ enabled: z.boolean() }).parse(req.body);
    await prisma.paymentMethodConfig.update({ where: { id: req.params.id }, data: body });
    const paymentMethods = await prisma.paymentMethodConfig.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({ paymentMethods });
  }),
);

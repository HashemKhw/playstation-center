import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { serializeSession } from '../services/dashboardService.js';
import { addCatalogExtra, addCustomExtra, updateExtraQuantity } from '../services/extrasService.js';
import {
  addTime,
  beginCheckout,
  completePayment,
  pauseSession,
  requireSession,
  resumeSession,
  startSession,
} from '../services/sessionService.js';

export const sessionsRouter = Router();

sessionsRouter.post(
  '/start',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        screenId: z.string().min(1),
        billingMode: z.enum(['OPEN', 'FIXED']),
        plannedDurationSeconds: z.number().int().positive().optional(),
        notes: z.string().optional(),
      })
      .parse(req.body);
    const session = await startSession(body);
    res.status(201).json({ session: serializeSession(session) });
  }),
);

sessionsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const session = await requireSession(req.params.id);
    res.json({ session: serializeSession(session) });
  }),
);

sessionsRouter.post(
  '/:id/pause',
  asyncHandler(async (req, res) => {
    res.json({ session: serializeSession(await pauseSession(req.params.id)) });
  }),
);

sessionsRouter.post(
  '/:id/resume',
  asyncHandler(async (req, res) => {
    res.json({ session: serializeSession(await resumeSession(req.params.id)) });
  }),
);

sessionsRouter.post(
  '/:id/add-time',
  asyncHandler(async (req, res) => {
    const body = z.object({ seconds: z.number().int().positive() }).parse(req.body);
    res.json({ session: serializeSession(await addTime(req.params.id, body.seconds)) });
  }),
);

sessionsRouter.post(
  '/:id/checkout',
  asyncHandler(async (req, res) => {
    res.json({ session: serializeSession(await beginCheckout(req.params.id)) });
  }),
);

sessionsRouter.post(
  '/:id/pay',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        amountReceivedFils: z.number().int().nonnegative(),
        paymentMethod: z.string().min(1),
      })
      .parse(req.body);
    const session = await completePayment({ sessionId: req.params.id, ...body });
    res.json({ session: serializeSession(session) });
  }),
);

sessionsRouter.post(
  '/:id/extras',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        productId: z.string().optional(),
        name: z.string().optional(),
        unitPriceFils: z.number().int().nonnegative().optional(),
        quantity: z.number().int().positive().default(1),
      })
      .parse(req.body);
    if (body.productId) {
      await addCatalogExtra(req.params.id, body.productId, body.quantity);
    } else {
      await addCustomExtra(req.params.id, {
        name: body.name,
        unitPriceFils: body.unitPriceFils ?? 0,
        quantity: body.quantity,
      });
    }
    const session = await requireSession(req.params.id);
    res.json({ session: serializeSession(session) });
  }),
);

sessionsRouter.patch(
  '/extras/:extraId',
  asyncHandler(async (req, res) => {
    const body = z.object({ quantity: z.number().int().nonnegative() }).parse(req.body);
    await updateExtraQuantity(req.params.extraId, body.quantity);
    const extra = await prisma.sessionExtra.findUnique({ where: { id: req.params.extraId } });
    if (extra) {
      const session = await requireSession(extra.sessionId);
      return res.json({ session: serializeSession(session) });
    }
    res.json({ ok: true });
  }),
);

import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { serializeSession } from '../services/dashboardService.js';
import { requireSession } from '../services/sessionService.js';

export const transactionsRouter = Router();

transactionsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = z
      .object({
        from: z.string().optional(),
        to: z.string().optional(),
        screenId: z.string().optional(),
        paymentMethod: z.string().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
      })
      .parse(req.query);

    const where: Prisma.SessionWhereInput = {
      status: q.status ?? { in: ['COMPLETED', 'CHECKOUT'] },
    };
    if (q.screenId) where.screenId = q.screenId;
    if (q.from || q.to) {
      where.closedAt = {
        ...(q.from ? { gte: new Date(q.from) } : {}),
        ...(q.to ? { lt: new Date(q.to) } : {}),
      };
    }
    if (q.search) {
      where.OR = [
        { notes: { contains: q.search } },
        { screen: { name: { contains: q.search } } },
        { id: { contains: q.search } },
      ];
    }

    const sessions = await prisma.session.findMany({
      where,
      include: { extras: true, pauses: true, payments: true, screen: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const filtered = q.paymentMethod
      ? sessions.filter((s) => s.payments.some((p) => p.paymentMethod === q.paymentMethod))
      : sessions;

    res.json({
      transactions: filtered.map((s) => ({
        ...serializeSession(s),
        screenName: s.screen.name,
        paymentMethod: s.payments[0]?.paymentMethod ?? null,
        amountReceivedFils: s.payments[0]?.amountFils ?? null,
        changeFils: s.payments[0]?.changeFils ?? null,
      })),
    });
  }),
);

transactionsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const session = await requireSession(req.params.id);
    const full = await prisma.session.findUnique({
      where: { id: session.id },
      include: { extras: true, pauses: true, payments: true, screen: true, events: true },
    });
    res.json({
      transaction: {
        ...serializeSession(session),
        screenName: full?.screen.name,
        payments: full?.payments,
        events: full?.events,
      },
    });
  }),
);

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { buildDashboard } from '../services/dashboardService.js';
import { buildReport, resolveRange, type ReportPeriod } from '../services/reportService.js';

export const reportsRouter = Router();

reportsRouter.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    res.json(await buildDashboard());
  }),
);

reportsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = z
      .object({
        period: z.enum(['today', 'yesterday', 'week', 'month', 'custom']).default('today'),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .parse(req.query);
    const range = await resolveRange(q.period as ReportPeriod, q.from, q.to);
    res.json(await buildReport(range.start, range.end));
  }),
);

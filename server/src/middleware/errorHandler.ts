import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { MoneyError } from '@pscenter/shared';
import { AppError } from '../errors.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if (err instanceof ZodError) {
    const message = err.issues[0]?.message ?? 'Invalid input';
    return res.status(400).json({ error: { code: 'VALIDATION', message } });
  }
  if (err instanceof MoneyError) {
    return res.status(400).json({ error: { code: 'MONEY', message: err.message } });
  }
  console.error(err);
  return res.status(500).json({
    error: { code: 'INTERNAL', message: 'Something went wrong. The action was not saved.' },
  });
}

import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { TvError } from '../services/adb.js';

export const asyncRoute = (fn: RequestHandler): RequestHandler => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof ZodError) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') } }); return; }
  if (error instanceof TvError) { res.status(error.status).json({ error: { code: error.code, message: error.message } }); return; }
  console.error(error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
};

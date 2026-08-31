import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../shared/response.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('🔥 Erro capturado:', err);

  if (err instanceof ZodError) {
    return sendError({
      res,
      statusCode: 422,
      message: 'Erro de validação dos dados enviados',
      errors: err.flatten().fieldErrors,
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Erro interno do servidor';

  return sendError({
    res,
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' ? { errors: err.stack } : {}),
  });
}

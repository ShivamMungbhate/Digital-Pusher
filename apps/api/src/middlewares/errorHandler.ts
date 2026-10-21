import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || (err.status ? err.status : 500);
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';

  if (statusCode >= 500) {
    logger.error({ err, path: req.path, method: req.method }, 'Server Error');
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {})
    }
  });
};

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';
import { logger } from '../../config/logger.js';
import { ApiResponse } from '../utils/response.js';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId || 'unknown';

  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected server error occurred';
  let details: unknown[] = [];

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if ((err as any).name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid resource identifier provided';
  } else if ((err as any).code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    message = 'Resource with this key already exists';
  }

  if (statusCode >= 500) {
    logger.error(`[Unhandled Error] ${message}`, err, { requestId, url: req.originalUrl, method: req.method });
  } else {
    logger.warn(`[Client Error] ${code} - ${message}`, { requestId, url: req.originalUrl, method: req.method, details });
  }

  const responsePayload: ApiResponse<never> = {
    success: false,
    error: {
      code,
      message,
      details,
      requestId
    }
  };

  res.status(statusCode).json(responsePayload);
}

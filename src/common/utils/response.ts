import { Response } from 'express';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: {
    requestId?: string;
    timestamp: string;
    [key: string]: unknown;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown[];
    requestId?: string;
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta: Record<string, unknown> = {}): Response {
  const requestId = res.req?.requestId;
  const payload: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
  return res.status(statusCode).json(payload);
}

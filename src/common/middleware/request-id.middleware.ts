import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existingId = req.headers['x-request-id'] as string;
  const requestId = existingId || `req_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

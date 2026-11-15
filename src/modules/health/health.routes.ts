import { Router, Request, Response } from 'express';
import { isDatabaseConnected } from '../../config/database.js';

export const healthRouter = Router();

healthRouter.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'live', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

healthRouter.get('/ready', (_req: Request, res: Response) => {
  const dbReady = isDatabaseConnected();
  if (dbReady) {
    res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'not_ready',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

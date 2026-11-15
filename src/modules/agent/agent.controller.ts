import { Request, Response, NextFunction } from 'express';
import { agentService } from './agent.service.js';
import { sendSuccess } from '../../common/utils/response.js';

export class AgentController {
  async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ success: false, error: { message: 'Prompt string is required' } });
        return;
      }

      const result = await agentService.processQuery(
        {
          shopId: req.shopContext!.shopId,
          userId: req.user!.userId,
          role: req.shopContext!.role
        },
        prompt
      );

      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async listRuns(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const result = await agentService.listRuns(req.shopContext!.shopId, limit);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const agentController = new AgentController();

import { Request, Response, NextFunction } from 'express';
import { voiceService } from './voice.service.js';
import { sendSuccess } from '../../common/utils/response.js';

export class VoiceController {
  async parseCommand(req: Request, res: Response, next: NextFunction) {
    try {
      const { transcript } = req.body;
      if (!transcript || typeof transcript !== 'string') {
        res.status(400).json({ success: false, error: { message: 'Transcript text is required' } });
        return;
      }

      const result = await voiceService.parseVoiceCommand(req.shopContext!.shopId, transcript);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const voiceController = new VoiceController();

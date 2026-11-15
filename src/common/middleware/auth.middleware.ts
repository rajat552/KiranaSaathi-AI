import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/crypto.js';
import { AppError } from '../errors/app-error.js';
import { User } from '../../modules/auth/auth.model.js';

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(AppError.unauthorized('Authorization header with Bearer token required'));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub);

    if (!user || user.status !== 'active') {
      next(AppError.unauthorized('User account is invalid or deactivated'));
      return;
    }

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      phone: user.phone,
      name: user.name
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      next(AppError.unauthorized('Access token has expired', 'TOKEN_EXPIRED'));
      return;
    }
    next(AppError.unauthorized('Invalid access token provided'));
  }
}

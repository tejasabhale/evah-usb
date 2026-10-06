import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { UnauthorizedError } from '../errors/app-error';
import { AuthSession } from '../models/auth.model';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      session?: AuthSession;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.substring(7).trim();
  try {
    const session = authService.verifySession(token);
    req.session = session;
    next();
  } catch (err) {
    next(err);
  }
}

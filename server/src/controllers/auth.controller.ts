import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { validators } from '../validators';
import { sendSuccess } from '../utils/response';

export class AuthController {
  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { password } = validators.validateLogin(req.body);
      const result = await authService.login(password!);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public async verifySession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
      const session = authService.verifySession(token);
      sendSuccess(res, { valid: true, session });
    } catch (err) {
      next(err);
    }
  }

  public logout(req: Request, res: Response): void {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (token) {
      authService.logout(token);
    }
    sendSuccess(res, { loggedOut: true });
  }

  public panicLock(req: Request, res: Response): void {
    authService.panicLock();
    sendSuccess(res, { panicTriggered: true, locked: true });
  }
}

export const authController = new AuthController();

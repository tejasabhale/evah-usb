import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn(`Operational error on [${req.method} ${req.path}]: ${err.message}`, {
      code: err.code,
      status: err.statusCode,
    });
    sendError(res, err.message, err.statusCode, err.code);
    return;
  }

  logger.error(`Unhandled server exception on [${req.method} ${req.path}]: ${err.message}`, {
    stack: err.stack,
  });
  sendError(res, 'Internal server error', 500, 'INTERNAL_ERROR');
}

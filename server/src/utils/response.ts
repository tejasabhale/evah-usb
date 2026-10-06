import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    version: string;
    [key: string]: unknown;
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: Record<string, unknown>): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      ...meta,
    },
  };
  return res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  code = 'INTERNAL_ERROR',
  details?: unknown
): Response {
  const response: ApiResponse<never> = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  };
  return res.status(statusCode).json(response);
}

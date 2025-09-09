import { Request, Response, NextFunction } from 'express';
import { APIError } from '../types/errors';
import logger from '../utils/logger';
import { getEnvConfig } from '../../../../libs/shared/utils/src/index';

const config = getEnvConfig();

export const errorHandler = (error: Error, req: Request, res: Response): void => {
  let customError = error;

  // Log error details
  logger.error(`${error.message} - ${req.method} ${req.path} - ${req.ip}`, {
    error: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Handle known API errors
  if (error instanceof APIError) {
    customError = error;
  } else {
    // Handle unknown errors
    customError = new APIError('Something went wrong', 500);
  }

  const errorResponse: Record<string, unknown> = {
    error: customError.message,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  };

  // Include stack trace in development
  if (config.isDevelopment) {
    errorResponse.stack = customError.stack;
  }

  res.status((customError as APIError).statusCode || 500).json(errorResponse);
};

// Async error wrapper
export const asyncHandler =
  (fn: (_req: Request, _res: Response, _next: NextFunction) => Promise<void>) =>
  (_req: Request, _res: Response, _next: NextFunction) => {
    Promise.resolve(fn(_req, _res, _next)).catch(_next);
  };

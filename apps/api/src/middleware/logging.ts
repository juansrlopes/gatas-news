import morgan from 'morgan';
import { Request, Response } from 'express';
import logger from '../utils/logger';
import { getEnvConfig } from '../../../../libs/shared/utils/src/index';

const config = getEnvConfig();

// Custom token for response time in milliseconds
morgan.token('response-time-ms', (req: Request, res: Response) => {
  const responseTime = res.getHeader('X-Response-Time');
  return responseTime ? `${responseTime}ms` : '-';
});

// Custom token for request ID (if you implement it)
morgan.token('request-id', (req: Request & { requestId?: string }) => {
  return req.requestId || '-';
});

// Development logging format
const developmentFormat = ':method :url :status :res[content-length] - :response-time ms';

// Production logging format (more detailed)
const productionFormat =
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

// Create morgan middleware
export const requestLogger = morgan(config.isDevelopment ? developmentFormat : productionFormat, {
  stream: {
    write: (message: string) => {
      // Remove trailing newline and log as info
      logger.http(message.trim());
    },
  },
  // Skip logging for health check endpoint to reduce noise
  skip: (req: Request) => {
    return req.path === '/health' || req.path === '/api/v1/health';
  },
});

// Error logging middleware
export const errorLogger = morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: {
    write: (message: string) => {
      logger.error(message.trim());
    },
  },
  // Only log errors (4xx and 5xx status codes)
  skip: (req: Request, res: Response) => {
    return res.statusCode < 400;
  },
});

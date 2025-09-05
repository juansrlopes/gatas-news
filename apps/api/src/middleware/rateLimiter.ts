import rateLimit from 'express-rate-limit';
import { RateLimitError } from '../types/errors';
import { getEnvConfig } from '../../../../libs/shared/utils/src/index';

const config = getEnvConfig();

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.isDevelopment ? 1000 : 100, // Limit each IP to 100 requests per windowMs in prod, 1000 in dev
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (_req, _res) => {
    throw new RateLimitError('Too many requests from this IP, please try again later.');
  },
});

// Stricter rate limiter for news endpoint (more expensive)
export const newsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: config.isDevelopment ? 100 : 20, // Limit each IP to 20 requests per 5 minutes in prod
  message: {
    error: 'Too many news requests from this IP, please try again later.',
    retryAfter: '5 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res) => {
    throw new RateLimitError('Too many news requests from this IP, please try again later.');
  },
});

// Very permissive rate limiter for health checks
export const healthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: false,
  legacyHeaders: false,
  handler: (_req, _res) => {
    throw new RateLimitError('Too many health check requests.');
  },
});

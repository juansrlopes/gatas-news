import helmet from 'helmet';
import cors from 'cors';
import { getEnvConfig } from '../../../../libs/shared/utils/src/index';

const config = getEnvConfig();

// Security middleware configuration
export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// CORS configuration
export const corsMiddleware = cors({
  origin: config.isDevelopment
    ? ['http://localhost:3000', 'http://localhost:3001'] // Allow local development
    : ['https://yourdomain.com'], // Replace with your production domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // 24 hours
});

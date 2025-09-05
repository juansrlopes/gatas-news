import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { enhancedCacheService } from '../services/cacheService';
import { mongoConnection } from '../database/connections/mongodb';
import { redisConnection } from '../database/connections/redis';
import { getEnvConfig } from '../../../../libs/shared/utils/src/index';
import logger from '../utils/logger';

const config = getEnvConfig();

export class HealthController {
  /**
   * GET /health
   * Basic health check endpoint
   */
  public static healthCheck = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.isDevelopment ? 'development' : 'production',
        version: process.env.npm_package_version || '1.0.0',
        node: process.version,
      };

      res.json(healthData);
    }
  );

  /**
   * GET /health/detailed
   * Detailed health check with system information
   */
  public static detailedHealthCheck = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const memoryUsage = process.memoryUsage();
      const cacheStats = await enhancedCacheService.getStats();

      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.isDevelopment ? 'development' : 'production',
        version: process.env.npm_package_version || '1.0.0',
        node: process.version,
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
        },
        cache: {
          redis: cacheStats.redis,
          memory: cacheStats.memory,
        },
        services: {
          newsApi: config.newsApiKey ? 'configured' : 'not configured',
          mongodb: mongoConnection.getConnectionStatus() ? 'connected' : 'disconnected',
          redis: redisConnection.getConnectionStatus() ? 'connected' : 'disconnected',
          cache: 'operational',
          logging: 'operational',
        },
      };

      logger.debug('Detailed health check performed', {
        memory: healthData.memory,
        cache: healthData.cache,
      });

      res.json(healthData);
    }
  );

  /**
   * GET /health/ready
   * Readiness probe for Kubernetes/Docker
   */
  public static readinessCheck = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      // Check if all required services are ready
      const isReady = {
        cache: true, // Cache is always ready if service starts
        newsApi: !!config.newsApiKey,
        overall: !!config.newsApiKey,
      };

      if (isReady.overall) {
        res.json({
          status: 'ready',
          timestamp: new Date().toISOString(),
          checks: isReady,
        });
      } else {
        res.status(503).json({
          status: 'not ready',
          timestamp: new Date().toISOString(),
          checks: isReady,
        });
      }
    }
  );

  /**
   * GET /health/live
   * Liveness probe for Kubernetes/Docker
   */
  public static livenessCheck = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      // Simple liveness check - if we can respond, we're alive
      res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    }
  );
}

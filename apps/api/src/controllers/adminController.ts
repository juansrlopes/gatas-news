import { Request, Response } from 'express';
import { newsService } from '../services/newsService';
import { enhancedCacheService } from '../services/cacheService';
import { jobScheduler } from '../jobs/scheduler';
import { newsFetcher } from '../jobs/newsFetcher';
import { articleRepository } from '../database/repositories/ArticleRepository';
import { FetchLog } from '../database/models/FetchLog';
import { mongoConnection } from '../database/connections/mongodb';
import { redisConnection } from '../database/connections/redis';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class AdminController {
  /**
   * POST /api/v1/admin/fetch/trigger
   * Manually trigger news fetch
   */
  public static triggerNewsFetch = asyncHandler(async (req: Request, res: Response) => {
    logger.info('Manual news fetch triggered by admin', { ip: req.ip });

    const result = await newsService.triggerNewsFetch();

    res.json({
      success: true,
      message: 'News fetch triggered successfully',
      data: result,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/admin/fetch/status
   * Get fetch job status and history
   */
  public static getFetchStatus = asyncHandler(async (req: Request, res: Response) => {
    const [lastFetch, recentLogs, failedFetches, jobsStatus] = await Promise.all([
      newsFetcher.getLastFetchInfo(),
      FetchLog.getRecentLogs(10),
      FetchLog.getFailedFetches(5),
      Promise.resolve(jobScheduler.getJobsStatus()),
    ]);

    const isDue = await newsFetcher.isFetchDue();

    res.json({
      success: true,
      data: {
        lastFetch,
        isDue,
        recentLogs,
        failedFetches,
        scheduledJobs: jobsStatus,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/admin/fetch/logs
   * Get detailed fetch logs with pagination
   */
  public static getFetchLogs = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, status } = req.query;

    const query: Record<string, unknown> = {};
    if (status && ['success', 'failed', 'partial'].includes(status as string)) {
      query.status = status;
    }

    const logs = await FetchLog.find(query)
      .sort({ fetchDate: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .exec();

    const totalCount = await FetchLog.countDocuments(query).exec();

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalCount,
          totalPages: Math.ceil(totalCount / Number(limit)),
          hasMore: Number(page) * Number(limit) < totalCount,
        },
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/admin/fetch/statistics
   * Get fetch statistics
   */
  public static getFetchStatistics = asyncHandler(async (req: Request, res: Response) => {
    const stats: {
      totalFetches: number;
      successfulFetches: number;
      failedFetches: number;
      averageDuration: number;
      totalArticlesFetched: number;
    } = await FetchLog.getStatistics();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * POST /api/v1/admin/cache/clear
   * Clear all cache
   */
  public static clearCache = asyncHandler(async (req: Request, res: Response) => {
    logger.info('Cache clear triggered by admin', { ip: req.ip });

    await enhancedCacheService.flush();

    res.json({
      success: true,
      message: 'All cache cleared successfully',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * POST /api/v1/admin/cache/clear/news
   * Clear only news-related cache
   */
  public static clearNewsCache = asyncHandler(async (req: Request, res: Response) => {
    logger.info('News cache clear triggered by admin', { ip: req.ip });

    await enhancedCacheService.invalidateNewsCache();

    res.json({
      success: true,
      message: 'News cache cleared successfully',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/admin/cache/stats
   * Get cache statistics
   */
  public static getCacheStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await enhancedCacheService.getStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/admin/database/stats
   * Get database statistics
   */
  public static getDatabaseStats = asyncHandler(async (req: Request, res: Response) => {
    const [articleStats, connectionInfo] = await Promise.all([
      articleRepository.getStatistics(),
      Promise.resolve(mongoConnection.getConnectionInfo()),
    ]);

    res.json({
      success: true,
      data: {
        articles: articleStats,
        connection: connectionInfo,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/admin/system/health
   * Comprehensive system health check
   */
  public static getSystemHealth = asyncHandler(async (req: Request, res: Response) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        mongodb: {
          status: 'unknown',
          connected: false,
          info: null as Record<string, unknown> | null,
        },
        redis: {
          status: 'unknown',
          connected: false,
          info: null as Record<string, unknown> | null,
        },
        cache: {
          status: 'operational',
          stats: null as Record<string, unknown> | null,
        },
        scheduler: {
          status: 'operational',
          jobs: [] as Array<{ name: string; running: boolean; nextRun?: Date }>,
        },
      },
      performance: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
    };

    try {
      // Check MongoDB
      health.services.mongodb.connected = mongoConnection.getConnectionStatus();
      health.services.mongodb.info = mongoConnection.getConnectionInfo();
      health.services.mongodb.status = health.services.mongodb.connected ? 'healthy' : 'unhealthy';
    } catch (error) {
      health.services.mongodb.status = 'error';
      health.services.mongodb.info = { error: (error as Error).message };
    }

    try {
      // Check Redis
      health.services.redis.connected = redisConnection.getConnectionStatus();
      health.services.redis.info = redisConnection.getConnectionInfo();
      health.services.redis.status = health.services.redis.connected ? 'healthy' : 'unhealthy';
    } catch (error) {
      health.services.redis.status = 'error';
      health.services.redis.info = { error: (error as Error).message };
    }

    try {
      // Check Cache
      health.services.cache.stats = await enhancedCacheService.getStats();
    } catch (error) {
      health.services.cache.status = 'error';
      health.services.cache.stats = { error: (error as Error).message };
    }

    try {
      // Check Scheduler
      health.services.scheduler.jobs = jobScheduler.getJobsStatus();
    } catch (error) {
      health.services.scheduler.status = 'error';
      health.services.scheduler.jobs = [{ error: (error as Error).message }];
    }

    // Determine overall health
    const unhealthyServices = Object.values(health.services).filter(
      service => service.status === 'error' || service.status === 'unhealthy'
    );

    if (unhealthyServices.length > 0) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status === 'healthy',
      data: health,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/admin/articles/stats
   * Get detailed article statistics
   */
  public static getArticleStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await articleRepository.getStatistics();

    // Add additional stats
    const additionalStats = {
      ...stats,
      recentActivity: {
        last24Hours: await articleRepository.getCount({
          dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
        }),
        last7Days: await articleRepository.getCount({
          dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        }),
        last30Days: await articleRepository.getCount({
          dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        }),
      },
    };

    res.json({
      success: true,
      data: additionalStats,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * POST /api/v1/admin/articles/:id/toggle
   * Toggle article active status
   */
  public static toggleArticleStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const article = await articleRepository.findById(id);
      if (!article) {
        res.status(404).json({
          success: false,
          error: 'Article not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updatedArticle = await articleRepository.update(id, {
        isActive: !article.isActive,
      });

      logger.info(`Article ${id} status toggled by admin`, {
        ip: req.ip,
        articleId: id,
        newStatus: updatedArticle?.isActive,
      });

      res.json({
        success: true,
        message: `Article ${updatedArticle?.isActive ? 'activated' : 'deactivated'} successfully`,
        data: updatedArticle,
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * DELETE /api/v1/admin/articles/:id
   * Delete article (hard delete)
   */
  public static deleteArticle = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const article = await articleRepository.findById(id);
    if (!article) {
      res.status(404).json({
        success: false,
        error: 'Article not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const deleted = await articleRepository.delete(id);

    if (deleted) {
      logger.warn(`Article ${id} deleted by admin`, {
        ip: req.ip,
        articleId: id,
        articleTitle: article.title,
      });

      // Clear cache after deletion
      await enhancedCacheService.invalidateNewsCache();

      res.json({
        success: true,
        message: 'Article deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete article',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * POST /api/v1/admin/scheduler/jobs/:jobName/stop
   * Stop a scheduled job
   */
  public static stopScheduledJob = asyncHandler(async (req: Request, res: Response) => {
    const { jobName } = req.params;

    const stopped = jobScheduler.stopJob(jobName);

    if (stopped) {
      logger.warn(`Scheduled job '${jobName}' stopped by admin`, { ip: req.ip });

      res.json({
        success: true,
        message: `Job '${jobName}' stopped successfully`,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Job '${jobName}' not found`,
        timestamp: new Date().toISOString(),
      });
    }
  });
}

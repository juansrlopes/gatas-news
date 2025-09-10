import * as cron from 'node-cron';
import { newsFetcher } from './newsFetcher';
import { getEnvConfig } from '../../../../libs/shared/utils/src/index';
import { apiKeyManager } from '../services/apiKeyManager';
import logger from '../utils/logger';
import { Article } from '../database/models/Article';

export class JobScheduler {
  private static instance: JobScheduler;
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private isInitialized = false;
  private static lastStartupTime: number = 0;

  private constructor() {}

  public static getInstance(): JobScheduler {
    if (!JobScheduler.instance) {
      JobScheduler.instance = new JobScheduler();
    }
    return JobScheduler.instance;
  }

  /**
   * Initialize all scheduled jobs
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('Job scheduler already initialized');
      return;
    }

    try {
      // Schedule daily news fetch
      this.scheduleDailyNewsFetch();

      // Schedule cleanup jobs
      this.scheduleCleanupJobs();

      // Schedule health checks
      this.scheduleHealthChecks();

      // Schedule API key health monitoring
      this.scheduleKeyHealthMonitoring();

      this.isInitialized = true;
      logger.info('✅ Job scheduler initialized successfully');
      logger.info(`   📋 ${this.jobs.size} scheduled jobs configured:`);

      // List configured jobs
      const jobNames = Array.from(this.jobs.keys());
      jobNames.forEach(name => {
        const emoji = name.includes('news') ? '📰' : name.includes('cleanup') ? '🧹' : '🎆';
        logger.info(`      ${emoji} ${name}`);
      });

      // Run initial fetch if needed
      await this.runInitialFetchIfNeeded();
    } catch (error) {
      logger.error('Failed to initialize job scheduler:', error);
      throw error;
    }
  }

  /**
   * Schedule daily news fetch job
   */
  private scheduleDailyNewsFetch(): void {
    // Get config when method is called, not at module level
    const config = getEnvConfig();

    // Smart scheduling based on environment
    const cronExpression = config.isDevelopment
      ? '0 */6 * * *' // Every 6 hours in development (much more reasonable)
      : '0 */2 * * *'; // Every 2 hours in production (more frequent than daily)

    const task = cron.schedule(
      cronExpression,
      async () => {
        logger.info('🔄 Scheduled news fetch job starting...');

        try {
          const result = await newsFetcher.fetchAndStoreNews();

          if (result.success) {
            logger.info('✅ Scheduled news fetch completed successfully', {
              articlesProcessed: result.articlesProcessed,
              newArticlesAdded: result.newArticlesAdded,
              duration: `${result.duration}ms`,
            });
          } else {
            logger.error('❌ Scheduled news fetch failed', {
              errors: result.errors,
              duration: `${result.duration}ms`,
            });
          }
        } catch (error) {
          logger.error('❌ Scheduled news fetch job error:', error);
        }
      },
      {
        timezone: 'America/Sao_Paulo', // Adjust timezone as needed
      }
    );

    this.jobs.set('daily-news-fetch', task);
    task.start();

    // Enhanced logging for development
    if (config.isDevelopment) {
      logger.info(`🛠️ Development mode: Reduced fetch frequency (${cronExpression})`, {
        timezone: 'America/Sao_Paulo',
        nextRun: this.getNextRunTime(cronExpression),
        note: 'Use POST /api/v1/admin/fetch-now for manual testing',
      });
    } else {
      logger.info(`📅 News fetch scheduled: ${cronExpression}`, {
        timezone: 'America/Sao_Paulo',
        nextRun: this.getNextRunTime(cronExpression),
      });
    }
  }

  /**
   * Schedule cleanup jobs
   */
  private scheduleCleanupJobs(): void {
    // Clean up old articles weekly (Sunday at 2 AM)
    const cleanupTask = cron.schedule(
      '0 2 * * 0',
      async () => {
        logger.info('🧹 Starting weekly cleanup job...');

        try {
          await this.cleanupOldArticles();
          await this.cleanupOldLogs();
          logger.info('✅ Weekly cleanup completed');
        } catch (error) {
          logger.error('❌ Weekly cleanup failed:', error);
        }
      },
      {
        // scheduled: false, // Not supported in newer versions
        timezone: 'America/Sao_Paulo',
      }
    );

    this.jobs.set('weekly-cleanup', cleanupTask);
    cleanupTask.start();

    logger.info('📅 Weekly cleanup scheduled: Sundays at 2 AM');
  }

  /**
   * Schedule health check jobs
   */
  private scheduleHealthChecks(): void {
    // Check system health every hour
    const healthCheckTask = cron.schedule(
      '0 * * * *',
      async () => {
        logger.debug('🏥 Running hourly health check...');

        try {
          await this.performHealthCheck();
        } catch (error) {
          logger.error('❌ Health check failed:', error);
        }
      },
      {
        // scheduled: false, // Not supported in newer versions
        timezone: 'America/Sao_Paulo',
      }
    );

    this.jobs.set('hourly-health-check', healthCheckTask);
    healthCheckTask.start();

    logger.info('📅 Hourly health checks scheduled');
  }

  /**
   * Schedule API key health monitoring
   */
  private scheduleKeyHealthMonitoring(): void {
    const config = getEnvConfig();

    // Monitor API keys more frequently in production, less in development
    const cronExpression = config.isDevelopment
      ? '0 */15 * * *' // Every 15 minutes in development
      : '*/5 * * * *'; // Every 5 minutes in production

    const keyHealthTask = cron.schedule(
      cronExpression,
      async () => {
        try {
          logger.debug('🔑 Running API key health monitoring...');

          // Get current health summary
          const healthSummary = apiKeyManager.getHealthSummary();

          // Log health status if there are issues
          if (healthSummary.healthyKeys === 0) {
            logger.error('🚨 CRITICAL: No healthy API keys available!');
          } else if (healthSummary.healthyKeys < healthSummary.totalKeys) {
            logger.warn(
              `⚠️ API Key Health Alert: ${healthSummary.healthyKeys}/${healthSummary.totalKeys} keys healthy`
            );
          }

          // Force health check if average health is low
          if (healthSummary.averageHealthScore < 50) {
            logger.info('🏥 Low health score detected, forcing health check...');
            await apiKeyManager.forceHealthCheck();
          }

          // Reset daily stats at midnight
          const now = new Date();
          if (now.getHours() === 0 && now.getMinutes() < 5) {
            logger.info('🔄 Daily API key statistics reset');
            apiKeyManager.resetDailyStatistics();
          }
        } catch (error) {
          logger.error('❌ API key health monitoring failed:', error);
        }
      },
      {
        timezone: 'America/Sao_Paulo',
      }
    );

    this.jobs.set('api-key-health', keyHealthTask);
    keyHealthTask.start();

    logger.info(`🔑 API key health monitoring scheduled: ${cronExpression}`);
  }

  /**
   * Run initial fetch if needed
   */
  private async runInitialFetchIfNeeded(): Promise<void> {
    try {
      const config = getEnvConfig();
      const now = Date.now();
      const timeSinceLastStartup = now - JobScheduler.lastStartupTime;
      JobScheduler.lastStartupTime = now;

      // If restarted within 5 minutes in development, likely a nodemon restart
      if (
        timeSinceLastStartup < 5 * 60 * 1000 &&
        config.isDevelopment &&
        timeSinceLastStartup > 0
      ) {
        logger.info('🔄 Rapid restart detected - skipping initial fetch to preserve API quota');
        return;
      }

      // CRITICAL FIX: Always check article count, not just fetch logs
      const articleCount = await Article.countDocuments({ isActive: true });

      const isFetchDue = await newsFetcher.isFetchDue();
      const shouldFetch = isFetchDue || articleCount === 0;

      if (shouldFetch) {
        if (articleCount === 0) {
          logger.info('🚀 Running initial news fetch (no articles in database)...');
        } else {
          logger.info('🚀 Running initial news fetch (fetch is due)...');
        }

        // Run in background to not block server startup
        setImmediate(async () => {
          try {
            const result = await newsFetcher.fetchAndStoreNews();

            if (result.success) {
              logger.info('✅ Initial news fetch completed', {
                articlesProcessed: result.articlesProcessed,
                newArticlesAdded: result.newArticlesAdded,
              });
            } else {
              logger.warn('⚠️ Initial news fetch had issues', {
                errors: result.errors,
              });
            }
          } catch (error) {
            logger.error('❌ Initial news fetch failed:', error);
          }
        });
      } else {
        logger.info('ℹ️ Recent news data found, skipping initial fetch');
      }
    } catch {
      logger.error('Error checking if initial fetch is needed');
    }
  }

  /**
   * Manually trigger news fetch
   */
  public async triggerNewsFetch(): Promise<{
    success: boolean;
    articlesProcessed: number;
    newArticlesAdded: number;
    duplicatesFound: number;
    errors: string[];
    duration: number;
  }> {
    logger.info('🔄 Manual news fetch triggered...');
    return await newsFetcher.fetchAndStoreNews();
  }

  /**
   * Get status of all scheduled jobs
   */
  public getJobsStatus(): Array<{
    name: string;
    running: boolean;
    nextRun?: string;
  }> {
    const status: Array<{
      name: string;
      running: boolean;
      nextRun?: string;
    }> = [];

    for (const [name, task] of this.jobs) {
      status.push({
        name,
        running: task.getStatus() === 'scheduled',
        // Note: node-cron doesn't provide next run time directly
        // This would need to be calculated based on cron expression
      });
    }

    return status;
  }

  /**
   * Stop all scheduled jobs
   */
  public stopAllJobs(): void {
    logger.info('🛑 Stopping all scheduled jobs...');

    for (const [name, task] of this.jobs) {
      task.stop();
      logger.debug(`Stopped job: ${name}`);
    }

    this.jobs.clear();
    this.isInitialized = false;

    logger.info('✅ All scheduled jobs stopped');
  }

  /**
   * Stop specific job
   */
  public stopJob(jobName: string): boolean {
    const task = this.jobs.get(jobName);
    if (task) {
      task.stop();
      this.jobs.delete(jobName);
      logger.info(`Stopped job: ${jobName}`);
      return true;
    }
    return false;
  }

  /**
   * Cleanup old articles (older than 30 days)
   */
  private async cleanupOldArticles(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      logger.info(`🧹 Marking articles older than ${thirtyDaysAgo.toISOString()} as inactive`);

      // Mark old articles as inactive instead of deleting (preserves data)
      const result = await Article.updateMany(
        {
          publishedAt: { $lt: thirtyDaysAgo },
          isActive: true,
        },
        { isActive: false }
      );

      logger.info(`✅ Marked ${result.modifiedCount} old articles as inactive`);
    } catch (error) {
      logger.error('❌ Error cleaning up old articles:', error);
    }
  }

  /**
   * Cleanup old fetch logs (older than 90 days)
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Delete old fetch logs
      logger.info(`Deleting fetch logs older than ${ninetyDaysAgo.toISOString()}`);

      // This would be implemented with mongoose
      // const result = await FetchLog.deleteMany({
      //   fetchDate: { $lt: ninetyDaysAgo }
      // });
      // logger.info(`Deleted ${result.deletedCount} old fetch logs`);
    } catch (error) {
      logger.error('Error cleaning up old logs:', error);
    }
  }

  /**
   * Perform system health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      // Check database connectivity, cache status, etc.
      // This is a placeholder for actual health checks
      logger.debug('System health check completed');
    } catch (error) {
      logger.error('Health check failed:', error);
    }
  }

  /**
   * Get next run time for a cron expression (simplified)
   */
  private getNextRunTime(cronExpression: string): string {
    // This is a simplified implementation
    // In a real app, you'd use a proper cron parser
    try {
      const now = new Date();
      // For daily jobs, next run is tomorrow at the same time
      if (cronExpression.includes('6 * * *')) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(6, 0, 0, 0);
        return tomorrow.toISOString();
      }
      return 'Unknown';
    } catch {
      return 'Error calculating next run';
    }
  }
}

export const jobScheduler = JobScheduler.getInstance();

import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { rssService } from '../services/rss/rssService';
import { APIResponse } from '../../../../libs/shared/types/src/index';
import logger from '../utils/logger';

export class RSSAdminController {
  /**
   * GET /api/v1/admin/rss/stats
   * Get RSS feed statistics and status
   */
  public static getRSSStats = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    logger.info('RSS stats requested', { ip: req.ip });

    const stats = rssService.getFeedStats();

    res.json({
      success: true,
      message: 'RSS feed statistics',
      data: {
        ...stats,
        summary: {
          totalFeeds: stats.total,
          enabledFeeds: stats.enabled,
          disabledFeeds: stats.disabled,
          enabledPercentage: Math.round((stats.enabled / stats.total) * 100),
        },
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * POST /api/v1/admin/rss/test-feed
   * Test a specific RSS feed URL
   */
  public static testRSSFeed = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    const { feedUrl } = req.body;

    if (!feedUrl) {
      res.status(400).json({
        success: false,
        message: 'Feed URL is required',
        data: null,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.info('Testing RSS feed', { feedUrl, ip: req.ip });

    const result = await rssService.testFeed(feedUrl);

    res.json({
      success: result.success,
      message: result.success 
        ? `Feed test successful: ${result.articleCount} articles found`
        : `Feed test failed: ${result.error}`,
      data: {
        feedUrl,
        ...result,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * POST /api/v1/admin/rss/test-all
   * Test all enabled RSS feeds
   */
  public static testAllRSSFeeds = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    logger.info('Testing all RSS feeds', { ip: req.ip });

    try {
      // Fetch articles to test all feeds
      const articles = await rssService.fetchAllArticles();
      const stats = rssService.getFeedStats();

      res.json({
        success: true,
        message: 'All RSS feeds tested',
        data: {
          totalArticlesFetched: articles.length,
          feedStats: stats,
          testResults: {
            enabledFeeds: stats.enabled,
            totalArticles: articles.length,
            averageArticlesPerFeed: stats.enabled > 0 ? Math.round(articles.length / stats.enabled) : 0,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('RSS feed testing failed:', error);
      res.status(500).json({
        success: false,
        message: 'RSS feed testing failed',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/v1/admin/rss/feeds
   * Get list of all RSS feeds with their status
   */
  public static getRSSFeeds = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    logger.info('RSS feeds list requested', { ip: req.ip });

    const stats = rssService.getFeedStats();

    res.json({
      success: true,
      message: 'RSS feeds list',
      data: {
        feeds: stats.feeds,
        summary: {
          total: stats.total,
          enabled: stats.enabled,
          disabled: stats.disabled,
          categories: [...new Set(stats.feeds.map(f => f.category))],
        },
      },
      timestamp: new Date().toISOString(),
    });
  });
}


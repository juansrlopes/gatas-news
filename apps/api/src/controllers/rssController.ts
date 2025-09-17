import { Request, Response } from 'express';
import { rssService } from '../services/rss/rssService';
import { multiSourceService } from '../services/multiSourceService';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class RSSController {
  /**
   * GET /api/v1/rss/test
   * Test RSS feed fetching
   */
  public static testRSSFeeds = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    logger.info('RSS test endpoint called', { ip: req.ip });

    try {
      const stats = await rssService.getFeedStats();
      const sampleArticles = await rssService.fetchAllArticles();
      
      res.json({
        success: true,
        data: {
          feedStats: stats,
          totalArticles: sampleArticles.length,
          sampleArticles: sampleArticles.slice(0, 5), // First 5 articles as sample
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('RSS test failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test RSS feeds',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/v1/rss/celebrity/:name
   * Test RSS feed fetching for a specific celebrity
   */
  public static testCelebrityRSS = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const celebrityName = req.params.name;
    logger.info(`RSS celebrity test for: ${celebrityName}`, { ip: req.ip });

    try {
      const articles = await rssService.fetchArticlesAboutCelebrity(celebrityName);
      
      res.json({
        success: true,
        data: {
          celebrity: celebrityName,
          articlesFound: articles.length,
          articles: articles.slice(0, 10), // First 10 articles
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error(`RSS celebrity test failed for ${celebrityName}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch celebrity RSS articles',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/v1/rss/multi-source/:name
   * Test multi-source fetching for a specific celebrity
   */
  public static testMultiSource = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const celebrityName = req.params.name;
    logger.info(`Multi-source test for: ${celebrityName}`, { ip: req.ip });

    try {
      const result = await multiSourceService.fetchArticlesForCelebrity(celebrityName);
      
      res.json({
        success: true,
        data: {
          celebrity: celebrityName,
          sources: result.sources,
          duplicatesRemoved: result.duplicatesRemoved,
          articles: result.articles.slice(0, 10), // First 10 articles
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error(`Multi-source test failed for ${celebrityName}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch multi-source articles',
        message: error.message,
      });
    }
  });
}

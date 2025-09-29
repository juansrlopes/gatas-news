import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { rssService } from '../services/rss/rssService';
import { multiSourceService } from '../services/multiSourceService';
import { APIResponse } from '../../../../libs/shared/types/src/index';
import logger from '../utils/logger';

export class RSSController {
  public static getFeeds = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    logger.info('Fetching all RSS feeds...');
    const articles = await rssService.fetchAllArticles();
    const feedStats = rssService.getFeedStats();

    res.json({
      success: true,
      message: 'RSS feeds fetched successfully',
      data: {
        feedStats: feedStats,
        totalArticles: articles.length,
        sampleTitles: articles.slice(0, 5).map(a => a.title),
        feeds: feedStats.feeds,
      },
      timestamp: new Date().toISOString(),
    });
  });

  public static getCelebrityArticles = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    const { celebrityName } = req.params;
    logger.info(`Fetching RSS articles for celebrity: ${celebrityName}`);

    try {
      const articles = await rssService.fetchArticlesAboutCelebrity(celebrityName);
      
      res.json({
        success: true,
        message: `RSS articles for ${celebrityName} fetched successfully`,
        data: {
          celebrity: celebrityName,
          articlesFound: articles.length,
          articles: articles.slice(0, 10).map(a => ({
            title: a.title,
            url: a.url,
            source: a.source.name,
            publishedAt: a.publishedAt,
          })),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(`Failed to fetch RSS articles for ${celebrityName}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch RSS articles',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  public static getMultiSourceArticles = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    const { celebrityName } = req.params;
    logger.info(`Fetching multi-source articles for celebrity: ${celebrityName}`);

    try {
      const articles = await multiSourceService.fetchArticlesForCelebrity(celebrityName);
      
      res.json({
        success: true,
        message: `Multi-source articles for ${celebrityName} fetched successfully`,
        data: {
          celebrity: celebrityName,
          articlesFound: articles.length,
          articles: articles.slice(0, 10).map(a => ({
            title: a.title,
            url: a.url,
            source: a.source?.name || 'Unknown',
            publishedAt: a.publishedAt,
          })),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(`Failed to fetch multi-source articles for ${celebrityName}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch multi-source articles',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  });
}
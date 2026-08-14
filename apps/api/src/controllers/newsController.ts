import { Request, Response } from 'express';
import { newsService } from '../services/newsService';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class NewsController {
  /**
   * GET /api/v1/news
   * Fetch news articles with optional filtering
   */
  public static getNews = asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      celebrity,
      limit = 50, // Increased default to show more articles
      sortBy = 'publishedAt',
      searchTerm,
      q,
      sentiment,
      dateFrom,
      dateTo,
      source = 'database', // 'database' or 'live'
      noMixing = 'false', // 'true' to disable mixing for complete rows
    } = req.query;

    const resolvedSearchTerm =
      typeof searchTerm === 'string' ? searchTerm : typeof q === 'string' ? q : undefined;

    logger.info('News request received', {
      page: Number(page),
      celebrity: celebrity as string,
      limit: Number(limit),
      sortBy: sortBy as string,
      searchTerm: resolvedSearchTerm,
      sentiment: sentiment as string,
      source: source as string,
      ip: req.ip,
    });

    const result = await newsService.getNews({
      page: Number(page),
      celebrity: celebrity as string,
      limit: Number(limit),
      sortBy: sortBy as 'publishedAt' | 'relevancy' | 'popularity',
      searchTerm: resolvedSearchTerm,
      sentiment: sentiment as 'positive' | 'negative' | 'neutral',
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      source: source as 'database' | 'live',
      noMixing: noMixing === 'true',
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/news/trending
   * Get trending topics/celebrities
   */
  public static getTrending = asyncHandler(async (req: Request, res: Response) => {
    logger.info('Trending topics request received', { ip: req.ip });

    const trending = await newsService.getTrendingTopics();

    res.json({
      success: true,
      data: {
        trending,
        count: trending.length,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * POST /api/v1/news/cache/clear
   * Clear news cache (admin endpoint)
   */
  public static clearCache = asyncHandler(async (req: Request, res: Response) => {
    logger.info('Cache clear request received', { ip: req.ip });

    await newsService.clearCache();

    res.json({
      success: true,
      message: 'News cache cleared successfully',
      timestamp: new Date().toISOString(),
    });
  });
}

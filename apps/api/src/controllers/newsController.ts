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
      limit = 20,
      sortBy = 'publishedAt',
      searchTerm,
      sentiment,
      dateFrom,
      dateTo,
    } = req.query;

    logger.info('News request received', {
      page: Number(page),
      celebrity: celebrity as string,
      limit: Number(limit),
      sortBy: sortBy as string,
      searchTerm: searchTerm as string,
      sentiment: sentiment as string,
      ip: req.ip,
    });

    const result = await newsService.getNews({
      page: Number(page),
      celebrity: celebrity as string,
      limit: Number(limit),
      sortBy: sortBy as 'publishedAt' | 'relevancy' | 'popularity',
      searchTerm: searchTerm as string,
      sentiment: sentiment as 'positive' | 'negative' | 'neutral',
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
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

    newsService.clearCache();

    res.json({
      success: true,
      message: 'News cache cleared successfully',
      timestamp: new Date().toISOString(),
    });
  });
}

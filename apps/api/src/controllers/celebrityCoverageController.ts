import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { Article } from '../database/models/Article';
import { Celebrity } from '../database/models/Celebrity';
import { APIResponse } from '../../../../libs/shared/types/src/index';
import logger from '../utils/logger';

export class CelebrityCoverageController {
  /**
   * GET /api/v1/admin/coverage/stats
   * Get celebrity coverage statistics
   */
  public static getCoverageStats = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    logger.info('Celebrity coverage stats requested', { ip: req.ip });

    // Get all celebrities
    const allCelebrities = await Celebrity.find({ isActive: true }).select('name totalArticles lastFetchedAt');
    
    // Get article counts per celebrity
    const articleCounts = await Article.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$celebrity', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Create coverage map
    const coverageMap = new Map<string, number>();
    articleCounts.forEach(item => {
      coverageMap.set(item._id, item.count);
    });

    // Analyze coverage
    const celebrityStats = allCelebrities.map(celebrity => ({
      name: celebrity.name,
      articleCount: coverageMap.get(celebrity.name) || 0,
      lastFetchedAt: celebrity.lastFetchedAt,
      totalArticles: celebrity.totalArticles,
    }));

    // Sort by article count (ascending to see who needs more coverage)
    celebrityStats.sort((a, b) => a.articleCount - b.articleCount);

    // Calculate statistics
    const totalCelebrities = celebrityStats.length;
    const celebritiesWithArticles = celebrityStats.filter(c => c.articleCount > 0).length;
    const celebritiesWithoutArticles = totalCelebrities - celebritiesWithArticles;
    const totalArticles = celebrityStats.reduce((sum, c) => sum + c.articleCount, 0);
    const averageArticlesPerCelebrity = totalCelebrities > 0 ? totalArticles / totalCelebrities : 0;

    // Find celebrities that need attention
    const needsAttention = celebrityStats.filter(c => c.articleCount === 0);
    const lowCoverage = celebrityStats.filter(c => c.articleCount > 0 && c.articleCount < 5);
    const topCovered = celebrityStats.slice(-10).reverse(); // Top 10 most covered

    res.json({
      success: true,
      message: 'Celebrity coverage statistics',
      data: {
        summary: {
          totalCelebrities,
          celebritiesWithArticles,
          celebritiesWithoutArticles,
          coveragePercentage: Math.round((celebritiesWithArticles / totalCelebrities) * 100),
          totalArticles,
          averageArticlesPerCelebrity: Math.round(averageArticlesPerCelebrity * 100) / 100,
        },
        coverage: {
          needsAttention: needsAttention.slice(0, 20), // First 20 celebrities with 0 articles
          lowCoverage: lowCoverage.slice(0, 20), // First 20 celebrities with 1-4 articles
          topCovered: topCovered, // Top 10 most covered celebrities
        },
        allCelebrities: celebrityStats,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/admin/coverage/zero-articles
   * Get celebrities with zero articles
   */
  public static getCelebritiesWithZeroArticles = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    logger.info('Celebrities with zero articles requested', { ip: req.ip });

    // Get all active celebrities
    const allCelebrities = await Celebrity.find({ isActive: true }).select('name');
    
    // Get celebrities that have articles
    const celebritiesWithArticles = await Article.distinct('celebrity', { isActive: true });
    
    // Find celebrities without articles
    const celebritiesWithoutArticles = allCelebrities.filter(
      celebrity => !celebritiesWithArticles.includes(celebrity.name)
    );

    res.json({
      success: true,
      message: `Found ${celebritiesWithoutArticles.length} celebrities with zero articles`,
      data: {
        count: celebritiesWithoutArticles.length,
        celebrities: celebritiesWithoutArticles.map(c => c.name),
        totalCelebrities: allCelebrities.length,
        coveragePercentage: Math.round(((allCelebrities.length - celebritiesWithoutArticles.length) / allCelebrities.length) * 100),
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * POST /api/v1/admin/coverage/prioritize-celebrities
   * Get a prioritized list of celebrities for the next fetch
   */
  public static prioritizeCelebritiesForFetch = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    const { limit = 20 } = req.body;
    
    logger.info('Prioritizing celebrities for fetch', { limit, ip: req.ip });

    // Get article counts per celebrity
    const articleCounts = await Article.aggregate([
      { $match: { isActive: true } },
      { $group: { 
        _id: '$celebrity', 
        count: { $sum: 1 },
        lastArticle: { $max: '$publishedAt' }
      }},
      { $sort: { count: 1, lastArticle: 1 } } // Sort by count (ascending) then by last article date
    ]);

    // Get all celebrities
    const allCelebrities = await Celebrity.find({ isActive: true }).select('name');
    
    // Create priority list
    const priorityList: Array<{
      name: string;
      articleCount: number;
      lastArticleDate?: Date;
      priority: 'critical' | 'high' | 'medium' | 'low';
      reason: string;
    }> = [];

    // Add celebrities with 0 articles (critical priority)
    const celebritiesWithArticles = new Set(articleCounts.map(ac => ac._id));
    allCelebrities.forEach(celebrity => {
      if (!celebritiesWithArticles.has(celebrity.name)) {
        priorityList.push({
          name: celebrity.name,
          articleCount: 0,
          priority: 'critical',
          reason: 'No articles found',
        });
      }
    });

    // Add celebrities with low article counts
    articleCounts.forEach(ac => {
      let priority: 'critical' | 'high' | 'medium' | 'low';
      let reason: string;

      if (ac.count === 0) {
        priority = 'critical';
        reason = 'No articles found';
      } else if (ac.count < 3) {
        priority = 'high';
        reason = `Only ${ac.count} article(s)`;
      } else if (ac.count < 10) {
        priority = 'medium';
        reason = `Low coverage: ${ac.count} articles`;
      } else {
        priority = 'low';
        reason = `Good coverage: ${ac.count} articles`;
      }

      // Check if article is old
      const daysSinceLastArticle = ac.lastArticle 
        ? Math.floor((Date.now() - new Date(ac.lastArticle).getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;

      if (daysSinceLastArticle > 7) {
        if (priority === 'low') priority = 'medium';
        if (priority === 'medium') priority = 'high';
        reason += `, last article ${daysSinceLastArticle} days ago`;
      }

      priorityList.push({
        name: ac._id,
        articleCount: ac.count,
        lastArticleDate: ac.lastArticle,
        priority,
        reason,
      });
    });

    // Sort by priority and limit results
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    priorityList.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.articleCount - b.articleCount; // Then by article count
    });

    const prioritizedCelebrities = priorityList.slice(0, limit);

    res.json({
      success: true,
      message: `Prioritized ${prioritizedCelebrities.length} celebrities for next fetch`,
      data: {
        prioritizedCelebrities,
        summary: {
          critical: prioritizedCelebrities.filter(c => c.priority === 'critical').length,
          high: prioritizedCelebrities.filter(c => c.priority === 'high').length,
          medium: prioritizedCelebrities.filter(c => c.priority === 'medium').length,
          low: prioritizedCelebrities.filter(c => c.priority === 'low').length,
        },
        recommendations: {
          focusOnCritical: prioritizedCelebrities.filter(c => c.priority === 'critical').map(c => c.name),
          nextBatch: prioritizedCelebrities.slice(0, 10).map(c => c.name),
        },
      },
      timestamp: new Date().toISOString(),
    });
  });
}


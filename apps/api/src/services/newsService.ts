import {
  articleRepository,
  ArticleFilters,
  PaginationOptions,
} from '../database/repositories/ArticleRepository';
import { IArticle } from '../database/models/Article';
import { enhancedCacheService } from './cacheService';
import { celebrityService } from './celebrityService';
import { newsFetcher } from '../jobs/newsFetcher';
import { NewsResponse } from '../../../../libs/shared/types/src/index';
import { ValidationError } from '../types/errors';
import logger from '../utils/logger';

export class NewsService {
  private static instance: NewsService;

  private constructor() {}

  public static getInstance(): NewsService {
    if (!NewsService.instance) {
      NewsService.instance = new NewsService();
    }
    return NewsService.instance;
  }

  /**
   * Get news articles from database with caching
   */
  public async getNews(params: {
    page?: number;
    celebrity?: string;
    limit?: number;
    sortBy?: 'publishedAt' | 'relevancy' | 'popularity';
    searchTerm?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<NewsResponse> {
    const {
      page = 1,
      celebrity,
      limit = 20,
      sortBy = 'publishedAt',
      searchTerm,
      sentiment,
      dateFrom,
      dateTo,
    } = params;

    // Generate cache key based on all parameters
    const cacheKey = this.generateCacheKey(params);

    try {
      // Try to get from cache first
      const cachedResult = await enhancedCacheService.getCachedNewsResponse(cacheKey);
      if (cachedResult) {
        logger.debug(`Cache hit for key: ${cacheKey}`);
        return cachedResult;
      }

      logger.debug(`Cache miss for key: ${cacheKey}, fetching from database`);

      // Build filters for database query
      const filters: ArticleFilters = {
        isActive: true,
        sentiment,
        dateFrom,
        dateTo,
      };

      // Handle celebrity filter
      if (celebrity) {
        const foundCelebrity = await celebrityService.findCelebrity(celebrity);
        if (!foundCelebrity) {
          throw new ValidationError(`Celebrity "${celebrity}" not found in our database`);
        }
        filters.celebrity = foundCelebrity;
      }

      // Pagination options
      const paginationOptions: PaginationOptions = {
        page,
        limit,
        sortBy,
        sortOrder: 'desc', // Always newest first
      };

      // Fetch articles from database
      let result;
      if (searchTerm) {
        // Use text search if search term provided
        result = await articleRepository.search(searchTerm, filters, paginationOptions);
      } else {
        // Use regular filtered query
        result = await articleRepository.findWithFilters(filters, paginationOptions);
      }

      // Convert to API response format
      const response: NewsResponse = {
        articles: result.articles.map(this.convertToApiFormat),
        totalResults: result.totalCount,
        page: result.currentPage,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
      };

      // Cache the result for 1 hour
      await enhancedCacheService.cacheNewsResponse(cacheKey, response, 3600);

      logger.info(`Fetched ${result.articles.length} articles from database`, {
        page,
        totalResults: result.totalCount,
        celebrity,
        searchTerm,
      });

      return response;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      logger.error('Error fetching news from database:', error);
      throw new Error('Failed to fetch news articles');
    }
  }

  /**
   * Get recent articles
   */
  public async getRecentArticles(limit: number = 20): Promise<NewsResponse> {
    const cacheKey = enhancedCacheService.generateKeys.recent(limit);

    try {
      // Try cache first
      const cachedResult = await enhancedCacheService.getCachedNewsResponse(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Fetch from database
      const articles = await articleRepository.getRecent(limit);

      const response: NewsResponse = {
        articles: articles.map(this.convertToApiFormat),
        totalResults: articles.length,
        page: 1,
        totalPages: 1,
        hasMore: false,
      };

      // Cache for 30 minutes
      await enhancedCacheService.cacheNewsResponse(cacheKey, response, 1800);

      return response;
    } catch (error) {
      logger.error('Error fetching recent articles:', error);
      throw new Error('Failed to fetch recent articles');
    }
  }

  /**
   * Get popular articles
   */
  public async getPopularArticles(limit: number = 10): Promise<NewsResponse> {
    const cacheKey = enhancedCacheService.generateKeys.popular(limit);

    try {
      // Try cache first
      const cachedResult = await enhancedCacheService.getCachedNewsResponse(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Fetch from database
      const articles = await articleRepository.getPopular(limit);

      const response: NewsResponse = {
        articles: articles.map(this.convertToApiFormat),
        totalResults: articles.length,
        page: 1,
        totalPages: 1,
        hasMore: false,
      };

      // Cache for 2 hours
      await enhancedCacheService.cacheNewsResponse(cacheKey, response, 7200);

      return response;
    } catch (error) {
      logger.error('Error fetching popular articles:', error);
      throw new Error('Failed to fetch popular articles');
    }
  }

  /**
   * Get trending topics based on article statistics
   */
  public async getTrendingTopics(): Promise<string[]> {
    const cacheKey = enhancedCacheService.generateKeys.trending();

    try {
      // Try cache first
      const cached = await enhancedCacheService.get<string[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get statistics from database
      const stats = await articleRepository.getStatistics();
      const trending = stats.articlesByCelebrity
        .slice(0, 10) // Top 10
        .map(item => item.celebrity);

      // Cache for 1 hour
      await enhancedCacheService.set(cacheKey, trending, { ttl: 3600 });

      return trending;
    } catch (error) {
      logger.error('Error fetching trending topics:', error);
      // Fallback to random celebrities
      return await celebrityService.getRandomCelebrities(10);
    }
  }

  /**
   * Get articles by celebrity
   */
  public async getArticlesByCelebrity(
    celebrity: string,
    page: number = 1,
    limit: number = 20
  ): Promise<NewsResponse> {
    try {
      const foundCelebrity = await celebrityService.findCelebrity(celebrity);
      if (!foundCelebrity) {
        throw new ValidationError(`Celebrity "${celebrity}" not found in our database`);
      }

      const articles = await articleRepository.findByCelebrity(foundCelebrity, { page, limit });

      const response: NewsResponse = {
        articles: articles.map(this.convertToApiFormat),
        totalResults: articles.length,
        page,
        totalPages: Math.ceil(articles.length / limit),
        hasMore: articles.length === limit,
      };

      return response;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      logger.error('Error fetching articles by celebrity:', error);
      throw new Error('Failed to fetch articles by celebrity');
    }
  }

  /**
   * Search articles with text search
   */
  public async searchArticles(
    searchTerm: string,
    page: number = 1,
    limit: number = 20,
    filters: Partial<ArticleFilters> = {}
  ): Promise<NewsResponse> {
    const cacheKey = enhancedCacheService.generateKeys.search(searchTerm, page, limit);

    try {
      // Try cache first
      const cachedResult = await enhancedCacheService.getCachedNewsResponse(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Search in database
      const result = await articleRepository.search(searchTerm, filters, {
        page,
        limit,
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      });

      const response: NewsResponse = {
        articles: result.articles.map(this.convertToApiFormat),
        totalResults: result.totalCount,
        page: result.currentPage,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
      };

      // Cache for 30 minutes
      await enhancedCacheService.cacheNewsResponse(cacheKey, response, 1800);

      return response;
    } catch (error) {
      logger.error('Error searching articles:', error);
      throw new Error('Failed to search articles');
    }
  }

  /**
   * Get news statistics
   */
  public async getNewsStatistics(): Promise<{
    totalArticles: number;
    totalActiveCelebrities: number;
    totalSources: number;
    averageArticlesPerDay: number;
    topCelebrities: Array<{ celebrity: string; count: number }>;
    topSources: Array<{ source: string; count: number }>;
    sentimentBreakdown: Array<{ sentiment: string; count: number }>;
    recentActivity: Array<{ date: string; count: number }>;
  }> {
    const cacheKey = enhancedCacheService.generateKeys.stats();

    try {
      // Try cache first
      const cached = await enhancedCacheService.get<{
        totalArticles: number;
        totalActiveCelebrities: number;
        totalSources: number;
        averageArticlesPerDay: number;
        topCelebrities: Array<{ celebrity: string; count: number }>;
        topSources: Array<{ source: string; count: number }>;
        sentimentBreakdown: Array<{ sentiment: string; count: number }>;
        recentActivity: Array<{ date: string; count: number }>;
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database - transform to match expected interface
      const dbStats = await articleRepository.getStatistics();

      // Transform database stats to match the expected interface
      const stats = {
        totalArticles: dbStats.totalArticles,
        totalActiveCelebrities: 0, // Will be populated from celebrity service
        totalSources: 0, // Will be calculated from articles
        averageArticlesPerDay: 0, // Will be calculated
        topCelebrities: dbStats.articlesByCelebrity || [],
        topSources: [], // Will be populated from articles
        sentimentBreakdown: dbStats.articlesBySentiment || [],
        recentActivity: [], // Will be calculated from recent articles
      };

      // Cache for 1 hour
      await enhancedCacheService.set(cacheKey, stats, { ttl: 3600 });

      return stats;
    } catch (error) {
      logger.error('Error fetching news statistics:', error);
      throw new Error('Failed to fetch news statistics');
    }
  }

  /**
   * Trigger manual news fetch
   */
  public async triggerNewsFetch(): Promise<{
    success: boolean;
    articlesProcessed: number;
    newArticlesAdded: number;
    duplicatesFound: number;
    errors: string[];
    duration: number;
  }> {
    try {
      logger.info('Manual news fetch triggered via API');
      const result = await newsFetcher.fetchAndStoreNews();

      // Clear cache after successful fetch
      if (result.success) {
        await enhancedCacheService.invalidateNewsCache();
      }

      return result;
    } catch (error) {
      logger.error('Error triggering manual news fetch:', error);
      throw new Error('Failed to trigger news fetch');
    }
  }

  /**
   * Clear all news-related cache
   */
  public async clearCache(): Promise<void> {
    try {
      await enhancedCacheService.invalidateNewsCache();
      logger.info('News cache cleared successfully');
    } catch (error) {
      logger.error('Error clearing news cache:', error);
      throw new Error('Failed to clear cache');
    }
  }

  /**
   * Convert database article to API format
   */
  private convertToApiFormat(article: IArticle): {
    id: string;
    title: string;
    description: string;
    url: string;
    urlToImage: string;
    publishedAt: string;
    source: { id: string | null; name: string };
    celebrity: string;
    sentiment?: string;
    category?: string;
    isActive: boolean;
  } {
    return {
      id: article._id?.toString() || '',
      url: article.url,
      title: article.title,
      description: article.description,
      urlToImage: article.urlToImage || '',
      publishedAt: article.publishedAt?.toISOString(),
      source: article.source,
      // Additional fields from our database
      celebrity: article.celebrity,
      sentiment: article.sentiment,
      isActive: article.isActive,
    };
  }

  /**
   * Generate cache key based on parameters
   */
  private generateCacheKey(params: Record<string, unknown>): string {
    const {
      page = 1,
      celebrity,
      limit = 20,
      sortBy = 'publishedAt',
      searchTerm,
      sentiment,
      dateFrom,
      dateTo,
    } = params;

    let key = `news:`;

    if (searchTerm && typeof searchTerm === 'string') {
      key += `search:${searchTerm.replace(/[^a-zA-Z0-9]/g, '_')}:`;
    }

    if (celebrity) {
      key += `celebrity:${celebrity}:`;
    }

    if (sentiment) {
      key += `sentiment:${sentiment}:`;
    }

    if (dateFrom || dateTo) {
      const fromStr = dateFrom instanceof Date ? dateFrom.toISOString().split('T')[0] : 'any';
      const toStr = dateTo instanceof Date ? dateTo.toISOString().split('T')[0] : 'any';
      key += `date:${fromStr}-${toStr}:`;
    }

    key += `page:${page}:limit:${limit}:sort:${sortBy}`;

    return key;
  }
}

export const newsService = NewsService.getInstance();

import {
  articleRepository,
  ArticleFilters,
  PaginationOptions,
} from '../database/repositories/ArticleRepository';
import { IArticle } from '../database/models/Article';
import { enhancedCacheService } from './cacheService';
import { celebrityService } from './celebrityService';
import { serperService } from './serper/serperService';
import { multiSourceNewsFetcher } from '../jobs/multiSourceNewsFetcher';
import { NewsResponse, Article } from '../../../../libs/shared/types/src/index';
import { ValidationError } from '../types/errors';
// Removed content scoring imports - NO FILTERING
// Removed quality scoring imports - NO FILTERING
import logger from '../utils/logger';

/**
 * Build a news list cache key from query params.
 * Exported for unit tests.
 */
export function buildNewsCacheKey(params: Record<string, unknown>): string {
  const {
    page = 1,
    celebrity,
    limit = 20,
    sortBy = 'publishedAt',
    searchTerm,
    sentiment,
    dateFrom,
    dateTo,
    mixing = false,
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

  if (mixing) {
    key += ':mixed';
  }

  return key;
}

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
   * Get news articles from database with intelligent caching
   *
   * This method handles the main news retrieval logic with multiple features:
   * - Multi-layer caching (Redis + Memory fallback)
   * - Advanced filtering (celebrity, sentiment, date range, search)
   * - Pagination with configurable limits
   * - Celebrity name validation and normalization
   *
   * @param params - Query parameters for filtering and pagination
   * @param params.page - Page number (default: 1)
   * @param params.celebrity - Filter by celebrity name (fuzzy match)
   * @param params.limit - Articles per page (default: 20, max: 100)
   * @param params.sortBy - Sort order: 'publishedAt' | 'relevancy' | 'popularity'
   * @param params.searchTerm - Full-text search in title/description
   * @param params.sentiment - Filter by sentiment: 'positive' | 'negative' | 'neutral'
   * @param params.dateFrom - Start date for date range filter
   * @param params.dateTo - End date for date range filter
   * @returns Promise<NewsResponse> with articles, pagination info, and metadata
   * @throws ValidationError if celebrity name is not found
   * @throws Error for database or caching issues
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
    source?: 'database' | 'live';
    noMixing?: boolean;
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
      source = 'database',
      noMixing: _noMixing = false,
    } = params;

    // Live search disabled: always serve from database to save Serper credits.
    // Only the scheduled job should call Serper. Ignore source=live and use DB.
    if (source === 'live') {
      logger.info('Live search requested but disabled; serving from database');
    }
    const effectiveSource = 'database';

    // Apply mixing when showing all celebrities to avoid long runs of same celebrity (skip when filtering by one celeb)
    const willApplyMixing = !celebrity;
    const cacheKey = this.generateCacheKey({ ...params, source: effectiveSource, mixing: willApplyMixing });

    try {
      // Try to get from cache first
      const cachedResult = await enhancedCacheService.getCachedNewsResponse(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

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

      // When mixing: fetch a large pool so we have many celebrities to interleave; then mix and slice to limit
      const adjustedLimit = willApplyMixing
        ? Math.min(limit * 10, 300)
        : limit * 2;

      const paginationOptions: PaginationOptions = {
        page,
        limit: adjustedLimit,
        sortBy,
        sortOrder: 'desc', // Always newest first
      };

      // Fetch articles from database
      let result;
      if (searchTerm) {
        result = await articleRepository.search(searchTerm, filters, paginationOptions);
      } else {
        result = await articleRepository.findWithFilters(filters, paginationOptions);
      }

      let articlesToReturn: IArticle[];
      if (willApplyMixing && result.articles.length > 0) {
        articlesToReturn = this.applyConservativeMixing(result.articles).slice(0, limit);
      } else {
        articlesToReturn = result.articles.slice(0, limit);
      }
      logger.info(`Showing ${articlesToReturn.length} articles (limit: ${limit}) - NO FILTERING`);

      // Convert to API response format
      const response: NewsResponse = {
        articles: articlesToReturn.map(this.convertToApiFormat),
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
      const result = await multiSourceNewsFetcher.fetchAndStoreNews();

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
   * Apply conservative mixing algorithm to prevent consecutive articles from same celebrity
   *
   * Algorithm:
   * 1. Group articles by time buckets (6h, 12h, 24h, older)
   * 2. Within each bucket, limit consecutive articles per celebrity (max 2)
   * 3. Maintain chronological order within celebrity groups
   * 4. Interleave celebrities while respecting time boundaries
   *
   * @param articles - Articles sorted by publishedAt DESC (newest first)
   * @returns Mixed articles maintaining recency while adding diversity
   */
  // REMOVED: applyQualityScoring method - NO FILTERING

  private applyConservativeMixing(articles: IArticle[]): IArticle[] {
    if (articles.length <= 2) {
      return articles; // No mixing needed for small sets
    }

    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Group articles by time buckets
    const timeBuckets = {
      recent: [] as IArticle[], // Last 6 hours
      semiRecent: [] as IArticle[], // 6-12 hours ago
      daily: [] as IArticle[], // 12-24 hours ago
      older: [] as IArticle[], // Older than 24 hours
    };

    // Sort articles into time buckets
    for (const article of articles) {
      const publishedAt = article.publishedAt;
      if (!publishedAt) {
        timeBuckets.older.push(article);
        continue;
      }

      if (publishedAt >= sixHoursAgo) {
        timeBuckets.recent.push(article);
      } else if (publishedAt >= twelveHoursAgo) {
        timeBuckets.semiRecent.push(article);
      } else if (publishedAt >= oneDayAgo) {
        timeBuckets.daily.push(article);
      } else {
        timeBuckets.older.push(article);
      }
    }

    // Apply mixing within each bucket
    const mixedBuckets = {
      recent: this.mixArticlesWithinBucket(timeBuckets.recent),
      semiRecent: this.mixArticlesWithinBucket(timeBuckets.semiRecent),
      daily: this.mixArticlesWithinBucket(timeBuckets.daily),
      older: this.mixArticlesWithinBucket(timeBuckets.older),
    };

    // Combine buckets back into single array (maintaining time order)
    const mixedArticles = [
      ...mixedBuckets.recent,
      ...mixedBuckets.semiRecent,
      ...mixedBuckets.daily,
      ...mixedBuckets.older,
    ];

    logger.info('Conservative mixing applied', {
      originalCount: articles.length,
      mixedCount: mixedArticles.length,
      bucketSizes: {
        recent: mixedBuckets.recent.length,
        semiRecent: mixedBuckets.semiRecent.length,
        daily: mixedBuckets.daily.length,
        older: mixedBuckets.older.length,
      },
    });

    return mixedArticles;
  }

  /**
   * Mix articles within a time bucket to prevent celebrity clustering
   *
   * @param bucketArticles - Articles within the same time bucket
   * @returns Mixed articles with max 2 consecutive per celebrity
   */
  private mixArticlesWithinBucket(bucketArticles: IArticle[]): IArticle[] {
    if (bucketArticles.length <= 2) {
      return bucketArticles;
    }

    const mixed: IArticle[] = [];
    const remaining = [...bucketArticles]; // Copy to avoid mutation
    let lastCelebrity = '';
    let consecutiveCount = 0;
    const maxConsecutive = 2;

    while (remaining.length > 0) {
      let selectedIndex = -1;
      let foundDifferent = false;

      // If we've reached the consecutive limit, MUST find a different celebrity
      if (consecutiveCount >= maxConsecutive && lastCelebrity !== '') {
        for (let i = 0; i < remaining.length; i++) {
          if (remaining[i].celebrity !== lastCelebrity) {
            selectedIndex = i;
            foundDifferent = true;
            break;
          }
        }

        // If no different celebrity found, we have to take the same one (edge case)
        if (!foundDifferent) {
          selectedIndex = 0;
          logger.warn(
            `Forced to take consecutive ${lastCelebrity} - no other celebrities available`
          );
        }
      } else {
        // Haven't hit limit yet, or this is the first article - take chronologically first
        selectedIndex = 0;
      }

      // Move selected article to mixed array
      const selectedArticle = remaining.splice(selectedIndex, 1)[0];
      mixed.push(selectedArticle);

      // Update tracking variables
      if (selectedArticle.celebrity === lastCelebrity) {
        consecutiveCount++;
      } else {
        lastCelebrity = selectedArticle.celebrity;
        consecutiveCount = 1;
      }
    }

    return mixed;
  }

  /**
   * Convert database article to API format
   */
  private convertToApiFormat(article: IArticle): Article {
    return {
      url: article.url,
      title: article.title,
      description: article.description,
      imageUrl: article.highResImageUrl || article.urlToImage || '',
      publishedAt: article.publishedAt?.toISOString(),
      source: article.source,
      author: article.author,
      content: article.content,
      celebrity: article.celebrity, // Added missing celebrity field
    };
  }

  /**
   * Generate cache key based on parameters
   */
  private generateCacheKey(params: Record<string, unknown>): string {
    return buildNewsCacheKey(params);
  }

  /**
   * Convert live search results (ArticleWithCelebrity) to API format
   * This is separate from convertToApiFormat which handles IArticle (database model)
   */
  private convertLiveSearchToApiFormat(article: {
    url: string;
    title: string;
    description?: string;
    urlToImage?: string;
    publishedAt?: string;
    source?: { id: string | null; name: string };
    celebrity?: string;
  }): Article {
    return {
      url: article.url,
      title: article.title,
      description: article.description || '',
      imageUrl: article.urlToImage || '',
      publishedAt: article.publishedAt || new Date().toISOString(),
      source: article.source || { id: null, name: 'Unknown' },
      author: undefined,
      content: undefined,
    };
  }

  /**
   * Handle live search by calling Serper API directly
   * This bypasses the database and cache for real-time results
   */
  private async handleLiveSearch(params: {
    celebrity?: string;
    limit?: number;
    page?: number;
  }): Promise<NewsResponse> {
    const { celebrity, limit = 20, page = 1 } = params;

    if (!celebrity) {
      throw new ValidationError('Celebrity name is required for live search');
    }

    logger.info(`🔍 Live search requested for celebrity: ${celebrity} (via Serper)`);

    try {
      // Use Serper to get live results from Google News
      const serperArticles = await serperService.searchCelebrity(celebrity, { 
        limit: limit * 2, // Get more articles to allow for filtering
        searchType: 'comprehensive' 
      });

      logger.info(`📰 Serper returned ${serperArticles.length} articles for ${celebrity}`);

      // NO FILTERING: Return ALL articles
      const limitedArticles = serperArticles.slice(0, limit);

      logger.info(`🎯 Live search results: ${serperArticles.length} → ${limitedArticles.length} articles (NO FILTERING)`);

      // Convert to API response format
      const response: NewsResponse = {
        articles: limitedArticles.map(this.convertLiveSearchToApiFormat),
        totalResults: limitedArticles.length,
        page: page,
        totalPages: 1, // Live search returns single page
        hasMore: false, // Live search returns single page
      };

      return response;
    } catch (error) {
      logger.error('Live search failed', { celebrity, error });
      throw new Error(
        `Live search failed for ${celebrity}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

export const newsService = NewsService.getInstance();

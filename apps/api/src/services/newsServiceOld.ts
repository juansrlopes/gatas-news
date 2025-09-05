import axios, { AxiosResponse } from 'axios';
import { Article, NewsApiResponse, NewsResponse } from '../../../../libs/shared/types/src/index';
import {
  getEnvConfig,
  filterDuplicates,
  isArticleAboutCelebrity,
  sortByDate,
} from '../../../../libs/shared/utils/src/index';
import { cacheService } from '../utils/cache';
import { celebrityService } from './celebrityService';
import { ExternalAPIError, ValidationError } from '../types/errors';
import logger from '../utils/logger';

const config = getEnvConfig();

export class NewsService {
  private static instance: NewsService;
  private readonly NEWS_API_URL = 'https://newsapi.org/v2/everything';
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds

  private constructor() {}

  public static getInstance(): NewsService {
    if (!NewsService.instance) {
      NewsService.instance = new NewsService();
    }
    return NewsService.instance;
  }

  /**
   * Fetch news articles based on request parameters
   */
  public async getNews(params: {
    page?: number;
    celebrity?: string;
    limit?: number;
    sortBy?: 'publishedAt' | 'relevancy' | 'popularity';
  }): Promise<NewsResponse> {
    const { page = 1, celebrity, limit = 20, sortBy = 'publishedAt' } = params;

    // Generate cache key
    const cacheKey = cacheService.generateNewsKey(celebrity, page);

    // Try to get from cache first
    const cachedResult = cacheService.get<NewsResponse>(cacheKey);
    if (cachedResult) {
      logger.debug(`Cache hit for key: ${cacheKey}`);
      return cachedResult;
    }

    logger.debug(`Cache miss for key: ${cacheKey}, fetching from API`);

    try {
      // Determine which celebrities to search for
      let celebrities: string[];

      if (celebrity) {
        // Search for specific celebrity
        const foundCelebrity = await celebrityService.findCelebrity(celebrity);
        if (!foundCelebrity) {
          throw new ValidationError(`Celebrity "${celebrity}" not found in our database`);
        }
        celebrities = [foundCelebrity];
      } else {
        // Get random celebrities for variety
        celebrities = await celebrityService.getRandomCelebrities(5);
      }

      if (celebrities.length === 0) {
        throw new ValidationError('No celebrities available for news search');
      }

      // Fetch articles for all celebrities
      const articles = await this.fetchArticlesForCelebrities(celebrities, page, sortBy);

      // Filter and process articles
      const processedArticles = this.processArticles(articles, celebrities, limit);

      const response: NewsResponse = {
        articles: processedArticles,
        totalResults: processedArticles.length,
        page,
        totalPages: Math.ceil(processedArticles.length / limit),
        hasMore: processedArticles.length === limit, // Simplified logic
      };

      // Cache the result
      cacheService.set(cacheKey, response);

      logger.info(`Fetched ${processedArticles.length} articles for page ${page}`);
      return response;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ExternalAPIError) {
        throw error;
      }

      logger.error('Unexpected error in getNews:', error);
      throw new ExternalAPIError('Failed to fetch news articles');
    }
  }

  /**
   * Fetch articles for multiple celebrities
   */
  private async fetchArticlesForCelebrities(
    celebrities: string[],
    page: number,
    sortBy: string
  ): Promise<Article[]> {
    if (!config.newsApiKey) {
      throw new ExternalAPIError('News API key is not configured');
    }

    const promises = celebrities.map(async name => {
      try {
        logger.debug(`Fetching articles for celebrity: ${name}`);

        const response: AxiosResponse<NewsApiResponse> = await axios.get(this.NEWS_API_URL, {
          params: {
            q: name,
            apiKey: config.newsApiKey,
            sortBy,
            language: 'pt',
            pageSize: 50,
            page,
          },
          timeout: this.REQUEST_TIMEOUT,
        });

        return response.data.articles || [];
      } catch (error: unknown) {
        const axiosError = error as any;
        logger.error(`Error fetching articles for ${name}:`, {
          message: axiosError.message || 'Unknown error',
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
        });

        // Don't fail the entire request if one celebrity fails
        return [];
      }
    });

    const results = await Promise.all(promises);
    return results.flat();
  }

  /**
   * Process and filter articles
   */
  private processArticles(articles: Article[], celebrities: string[], limit: number): Article[] {
    // Filter articles that are actually about the celebrities
    let filteredArticles = articles.filter(article => {
      return celebrities.some(celebrity => isArticleAboutCelebrity(article, celebrity));
    });

    // Remove duplicates
    filteredArticles = filterDuplicates(filteredArticles, (article: Article) => article.url);

    // Sort by date (newest first)
    filteredArticles = sortByDate(filteredArticles);

    // Apply limit
    return filteredArticles.slice(0, limit);
  }

  /**
   * Get trending topics (most searched celebrities)
   */
  public async getTrendingTopics(): Promise<string[]> {
    // This is a simplified implementation
    // In a real app, you'd track search frequency
    return await celebrityService.getRandomCelebrities(10);
  }

  /**
   * Clear news cache
   */
  public clearCache(): void {
    // This is a simplified implementation
    // In a real app, you'd have more sophisticated cache invalidation
    cacheService.flush();
    logger.info('News cache cleared');
  }
}

export const newsService = NewsService.getInstance();

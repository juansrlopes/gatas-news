import axios, { AxiosResponse } from 'axios';
import { IArticle } from '../database/models/Article';
import { FetchLog, IFetchLog } from '../database/models/FetchLog';
import { articleRepository } from '../database/repositories/ArticleRepository';
import { enhancedCacheService } from '../services/cacheService';
import { celebrityService } from '../services/celebrityService';
import {
  getEnvConfig,
  filterDuplicates,
  isArticleAboutCelebrity,
  sortByDate,
} from '../../../../libs/shared/utils/src/index';
import { Article as ArticleType, NewsApiResponse } from '../../../../libs/shared/types/src/index';
import { analyzePortugueseContent, shouldKeepArticle } from '../utils/contentScoring';
import logger from '../utils/logger';

export interface FetchResult {
  success: boolean;
  articlesProcessed: number;
  newArticlesAdded: number;
  duplicatesFound: number;
  errors: string[];
  duration: number;
}

export class NewsFetcher {
  private static instance: NewsFetcher;
  private readonly NEWS_API_URL = 'https://newsapi.org/v2/everything';
  private readonly REQUEST_TIMEOUT = 15000; // 15 seconds
  private readonly MAX_RETRIES = 3;
  private readonly BATCH_SIZE = 100; // Process articles in batches

  private constructor() {}

  public static getInstance(): NewsFetcher {
    if (!NewsFetcher.instance) {
      NewsFetcher.instance = new NewsFetcher();
    }
    return NewsFetcher.instance;
  }

  /**
   * Main method to fetch and store news articles
   *
   * This is the core method that orchestrates the entire news fetching process:
   * 1. Validates API key configuration
   * 2. Fetches celebrity list from database
   * 3. Creates a fetch log for tracking
   * 4. Fetches articles from NewsAPI for all celebrities
   * 5. Applies Portuguese content filtering
   * 6. Stores filtered articles in MongoDB
   * 7. Updates fetch log with results
   * 8. Invalidates cache to ensure fresh data
   *
   * The process is designed to be fault-tolerant and will continue even if
   * some celebrities fail to fetch, logging errors for debugging.
   *
   * @returns FetchResult with success status, counts, and any errors
   */
  public async fetchAndStoreNews(): Promise<FetchResult> {
    const startTime = Date.now();
    let fetchLog: IFetchLog | null = null;

    try {
      logger.info('🔄 Starting news fetch job...');

      // Get fresh config (not cached at module level)
      const config = getEnvConfig();

      // Check if API key is configured
      if (!config.newsApiKey) {
        logger.warn('⚠️ News API key is not configured - skipping news fetch');
        return {
          success: false,
          articlesProcessed: 0,
          newArticlesAdded: 0,
          duplicatesFound: 0,
          errors: ['News API key not configured'],
          duration: 0,
        };
      }

      // Get celebrities to fetch news for
      const celebrities = await celebrityService.getCelebrities();
      if (celebrities.length === 0) {
        throw new Error('No celebrities found to fetch news for');
      }

      // Create fetch log
      fetchLog = await FetchLog.create({
        fetchDate: new Date(),
        celebrities,
        status: 'failed', // Will update to success if everything goes well
        articlesCount: 0,
        apiCallsUsed: 0,
        duration: 0,
        newArticlesAdded: 0,
        duplicatesFound: 0,
        nextFetchDue: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      // Fetch articles for all celebrities
      const fetchResult = await this.fetchArticlesForAllCelebrities(celebrities, config);

      // Process and store articles
      const processResult = await this.processAndStoreArticles(fetchResult.articles, celebrities);

      // Update fetch log with results
      const duration = Date.now() - startTime;
      await fetchLog.updateOne({
        status: 'success',
        articlesCount: fetchResult.totalArticles,
        apiCallsUsed: fetchResult.apiCallsUsed,
        newArticlesAdded: processResult.newArticlesAdded,
        duplicatesFound: processResult.duplicatesFound,
        duration,
        metadata: {
          totalApiCalls: fetchResult.apiCallsUsed,
          rateLimitRemaining: fetchResult.rateLimitRemaining,
          rateLimitReset: fetchResult.rateLimitReset,
        },
      });

      // Clear cache to ensure fresh data
      await enhancedCacheService.invalidateNewsCache();

      const result: FetchResult = {
        success: true,
        articlesProcessed: fetchResult.totalArticles,
        newArticlesAdded: processResult.newArticlesAdded,
        duplicatesFound: processResult.duplicatesFound,
        errors: [],
        duration,
      };

      logger.info('✅ News fetch job completed successfully', {
        duration: `${duration}ms`,
        articlesProcessed: result.articlesProcessed,
        newArticlesAdded: result.newArticlesAdded,
        duplicatesFound: result.duplicatesFound,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('❌ News fetch job failed:', error);

      // Update fetch log with error
      if (fetchLog) {
        await fetchLog.updateOne({
          status: 'failed',
          error: errorMessage,
          duration,
        });
      }

      return {
        success: false,
        articlesProcessed: 0,
        newArticlesAdded: 0,
        duplicatesFound: 0,
        errors: [errorMessage],
        duration,
      };
    }
  }

  /**
   * Fetch articles for all celebrities
   */
  private async fetchArticlesForAllCelebrities(
    celebrities: string[],
    config: ReturnType<typeof getEnvConfig>
  ): Promise<{
    articles: ArticleType[];
    totalArticles: number;
    apiCallsUsed: number;
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
  }> {
    const allArticles: ArticleType[] = [];
    let apiCallsUsed = 0;
    let rateLimitRemaining: number | undefined;
    let rateLimitReset: Date | undefined;

    // Process celebrities in smaller batches to avoid rate limits
    const batchSize = 5; // Process 5 celebrities at a time
    const batches = this.chunkArray(celebrities, batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`Processing celebrity batch ${i + 1}/${batches.length}`, {
        celebrities: batch,
      });

      const batchPromises = batch.map(celebrity =>
        this.fetchArticlesForCelebrity(celebrity, config)
      );

      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          allArticles.push(...result.value.articles);
          apiCallsUsed++;

          // Update rate limit info from the last successful request
          if (result.value.rateLimitRemaining !== undefined) {
            rateLimitRemaining = result.value.rateLimitRemaining;
          }
          if (result.value.rateLimitReset) {
            rateLimitReset = result.value.rateLimitReset;
          }
        } else {
          logger.warn('Failed to fetch articles for celebrity in batch:', result.reason);
        }
      }

      // Add delay between batches to respect rate limits
      if (i < batches.length - 1) {
        await this.delay(1000); // 1 second delay between batches
      }
    }

    return {
      articles: allArticles,
      totalArticles: allArticles.length,
      apiCallsUsed,
      rateLimitRemaining,
      rateLimitReset,
    };
  }

  /**
   * Fetch articles for a single celebrity
   */
  private async fetchArticlesForCelebrity(
    celebrity: string,
    config: ReturnType<typeof getEnvConfig>,
    retryCount: number = 0
  ): Promise<{
    articles: ArticleType[];
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
  }> {
    try {
      logger.debug(`Fetching articles for: ${celebrity}`);

      const response: AxiosResponse<NewsApiResponse> = await axios.get(this.NEWS_API_URL, {
        params: {
          q: celebrity,
          apiKey: config.newsApiKey,
          sortBy: 'publishedAt',
          language: 'pt',
          pageSize: 100, // Maximum allowed by NewsAPI
          from: this.getFromDate(), // Only get articles from last 7 days
        },
        timeout: this.REQUEST_TIMEOUT,
      });

      // Extract rate limit info from headers
      const rateLimitRemaining = response.headers['x-ratelimit-remaining']
        ? parseInt(response.headers['x-ratelimit-remaining'])
        : undefined;

      const rateLimitReset = response.headers['x-ratelimit-reset']
        ? new Date(parseInt(response.headers['x-ratelimit-reset']) * 1000)
        : undefined;

      const articles = response.data.articles || [];

      logger.debug(`Fetched ${articles.length} articles for ${celebrity}`, {
        rateLimitRemaining,
        rateLimitReset,
      });

      return {
        articles,
        rateLimitRemaining,
        rateLimitReset,
      };
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { status?: number; headers?: Record<string, string> };
        message?: string;
      };

      // Handle rate limiting
      if (axiosError.response?.status === 429) {
        const retryAfter = axiosError.response.headers?.['retry-after'] || 60;
        const retryAfterNum =
          typeof retryAfter === 'string' ? parseInt(retryAfter, 10) : retryAfter;
        logger.warn(`Rate limited for ${celebrity}, retrying after ${retryAfterNum}s`);

        if (retryCount < this.MAX_RETRIES) {
          await this.delay(retryAfterNum * 1000);
          return this.fetchArticlesForCelebrity(celebrity, config, retryCount + 1);
        }
      }

      // Handle other errors with retry
      if (retryCount < this.MAX_RETRIES) {
        logger.warn(
          `Error fetching articles for ${celebrity}, retry ${retryCount + 1}/${this.MAX_RETRIES}:`,
          axiosError.message
        );
        await this.delay(5000); // 5 second delay before retry
        return this.fetchArticlesForCelebrity(celebrity, config, retryCount + 1);
      }

      logger.error(
        `Failed to fetch articles for ${celebrity} after ${this.MAX_RETRIES} retries:`,
        axiosError.message
      );
      return { articles: [] };
    }
  }

  /**
   * Process and store articles in database
   */
  private async processAndStoreArticles(
    articles: ArticleType[],
    celebrities: string[]
  ): Promise<{
    newArticlesAdded: number;
    duplicatesFound: number;
  }> {
    if (articles.length === 0) {
      return { newArticlesAdded: 0, duplicatesFound: 0 };
    }

    logger.info(`Processing ${articles.length} articles...`);

    // Filter articles that are actually about the celebrities AND have good visual content
    const relevantArticles = articles.filter(article => {
      // First check if it's about a celebrity
      const isAboutCelebrity = celebrities.some(celebrity =>
        isArticleAboutCelebrity(article, celebrity)
      );

      if (!isAboutCelebrity) return false;

      // Then check content quality using Portuguese scoring (Phase 1 enhanced)
      const contentScore = analyzePortugueseContent(
        article.title,
        article.description,
        article.url
      );
      const keepArticle = shouldKeepArticle(contentScore, 25); // Balanced threshold for quality content

      // Only log filtered articles in development mode
      if (!keepArticle && process.env.NODE_ENV === 'development') {
        logger.debug(`❌ Filtered: ${article.title} (score: ${contentScore.overallScore})`);
      }

      return keepArticle;
    });

    logger.info(
      `Found ${relevantArticles.length} high-quality relevant articles after Portuguese content filtering`
    );

    // Remove duplicates based on URL
    const uniqueArticles = filterDuplicates(
      relevantArticles,
      (article: ArticleType) => article.url
    );
    const duplicatesFound = relevantArticles.length - uniqueArticles.length;

    logger.info(`Found ${duplicatesFound} duplicates, ${uniqueArticles.length} unique articles`);

    // Sort by date (newest first)
    const sortedArticles = sortByDate(uniqueArticles);

    // Convert to database format and process in batches
    let newArticlesAdded = 0;
    const batches = this.chunkArray(sortedArticles, this.BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      // Only log batch progress for large batches
      if (batches.length > 5) {
        logger.debug(`Processing batch ${i + 1}/${batches.length}`);
      }

      const articlesToInsert: Partial<IArticle>[] = [];

      for (const article of batch) {
        // Check if article already exists
        const exists = await articleRepository.existsByUrl(article.url);
        if (!exists) {
          // Find which celebrity this article is about
          const celebrity = celebrities.find(c => isArticleAboutCelebrity(article, c)) || 'unknown';

          // Calculate content score for metadata (Phase 1 enhanced)
          const contentScore = analyzePortugueseContent(
            article.title,
            article.description,
            article.url
          );

          articlesToInsert.push({
            url: article.url,
            title: article.title,
            description: article.description,
            content: article.content,
            urlToImage: article.urlToImage,
            publishedAt: new Date(article.publishedAt || Date.now()),
            source: article.source,
            author: article.author,
            celebrity,
            sentiment: 'neutral', // TODO: Add sentiment analysis
            isActive: true,
            // Note: Content scoring metadata stored in logs for now
            // TODO: Add metadata field to Article model if needed
          });
        }
      }

      // Bulk insert new articles
      if (articlesToInsert.length > 0) {
        try {
          await articleRepository.createMany(articlesToInsert);
          newArticlesAdded += articlesToInsert.length;
          logger.debug(`Inserted ${articlesToInsert.length} new articles`);
        } catch (error) {
          logger.error('Error inserting articles batch:', error);
          // Continue with next batch even if this one fails
        }
      }
    }

    logger.info(`Successfully added ${newArticlesAdded} new articles to database`);

    return {
      newArticlesAdded,
      duplicatesFound,
    };
  }

  /**
   * Get date for fetching recent articles (last 7 days)
   */
  private getFromDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Last 7 days
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  /**
   * Utility method to chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Utility method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the last successful fetch log
   */
  public async getLastFetchInfo(): Promise<IFetchLog | null> {
    try {
      return await FetchLog.getLastSuccessfulFetch();
    } catch (error) {
      logger.error('Error getting last fetch info:', error);
      return null;
    }
  }

  /**
   * Check if a fetch is due
   */
  public async isFetchDue(): Promise<boolean> {
    try {
      const lastFetch = await this.getLastFetchInfo();
      if (!lastFetch) {
        return true; // No previous fetch, so fetch is due
      }

      const now = new Date();
      return now >= lastFetch.nextFetchDue;
    } catch (error) {
      logger.error('Error checking if fetch is due:', error);
      return true; // Default to true if we can't determine
    }
  }
}

export const newsFetcher = NewsFetcher.getInstance();

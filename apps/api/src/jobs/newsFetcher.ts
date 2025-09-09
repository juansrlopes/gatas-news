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

// Extended article type with celebrity information for processing
interface ArticleWithCelebrity extends ArticleType {
  celebrity: string;
}
import { analyzePortugueseContent, shouldKeepArticle } from '../utils/contentScoring';
import { isImageUrlDomainValid } from '../utils/imageValidation';
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
  private currentApiKeyIndex = 0; // Track which API key we're using

  private constructor() {}

  public static getInstance(): NewsFetcher {
    if (!NewsFetcher.instance) {
      NewsFetcher.instance = new NewsFetcher();
    }
    return NewsFetcher.instance;
  }

  /**
   * Get all available API keys from config
   */
  private getAvailableApiKeys(config: ReturnType<typeof getEnvConfig>): string[] {
    const keys = [config.newsApiKey, config.newsApiKeyBackup, config.newsApiKeyBackup2].filter(
      Boolean
    ) as string[];

    return keys;
  }

  /**
   * Get the current API key to use
   */
  private getCurrentApiKey(config: ReturnType<typeof getEnvConfig>): string | null {
    const keys = this.getAvailableApiKeys(config);
    if (keys.length === 0) return null;

    return keys[this.currentApiKeyIndex % keys.length];
  }

  /**
   * Switch to the next available API key
   */
  private switchToNextApiKey(config: ReturnType<typeof getEnvConfig>): string | null {
    const keys = this.getAvailableApiKeys(config);
    if (keys.length === 0) return null;

    this.currentApiKeyIndex = (this.currentApiKeyIndex + 1) % keys.length;
    const newKey = keys[this.currentApiKeyIndex];
    logger.info(`🔄 Switching to API key ${this.currentApiKeyIndex + 1}/${keys.length}`);
    return newKey;
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

      // Check if any API key is configured
      const currentApiKey = this.getCurrentApiKey(config);
      if (!currentApiKey) {
        logger.warn('⚠️ No News API keys are configured - skipping news fetch');
        return {
          success: false,
          articlesProcessed: 0,
          newArticlesAdded: 0,
          duplicatesFound: 0,
          errors: ['No News API keys configured'],
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
    articles: ArticleWithCelebrity[];
    totalArticles: number;
    apiCallsUsed: number;
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
  }> {
    const allArticles: ArticleWithCelebrity[] = [];
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
    articles: ArticleWithCelebrity[];
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
  }> {
    try {
      logger.debug(`Fetching articles for: ${celebrity}`);

      const currentApiKey = this.getCurrentApiKey(config);
      if (!currentApiKey) {
        throw new Error('No API keys available');
      }

      const response: AxiosResponse<NewsApiResponse> = await axios.get(this.NEWS_API_URL, {
        params: {
          q: celebrity,
          apiKey: currentApiKey,
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

      // Add celebrity name to each article for later processing
      const articlesWithCelebrity = articles.map(article => ({
        ...article,
        celebrity: celebrity, // Assign the celebrity name to each article
      }));

      logger.debug(`Fetched ${articles.length} articles for ${celebrity}`, {
        rateLimitRemaining,
        rateLimitReset,
      });

      return {
        articles: articlesWithCelebrity,
        rateLimitRemaining,
        rateLimitReset,
      };
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { status?: number; headers?: Record<string, string> };
        message?: string;
      };

      // Handle rate limiting by switching to next API key
      if (axiosError.response?.status === 429) {
        logger.warn(`Rate limited for ${celebrity}, switching to next API key...`);

        const nextApiKey = this.switchToNextApiKey(config);
        if (nextApiKey && retryCount < this.MAX_RETRIES) {
          // Try with the next API key immediately
          return this.fetchArticlesForCelebrity(celebrity, config, retryCount + 1);
        } else {
          logger.error(`All API keys are rate limited for ${celebrity}`);
          return { articles: [] };
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
   * Apply per-celebrity limits to prevent clustering
   * Keeps the highest quality articles for each celebrity
   */
  private applyPerCelebrityLimits(
    articles: ArticleWithCelebrity[],
    maxPerCelebrity: number
  ): ArticleWithCelebrity[] {
    const celebrityGroups = new Map<string, ArticleWithCelebrity[]>();

    // Group articles by celebrity
    articles.forEach(article => {
      const celebrity = article.celebrity;
      if (!celebrityGroups.has(celebrity)) {
        celebrityGroups.set(celebrity, []);
      }
      celebrityGroups.get(celebrity)!.push(article);
    });

    const limitedArticles: ArticleWithCelebrity[] = [];

    // Apply limits per celebrity, keeping highest quality articles
    celebrityGroups.forEach((celebrityArticles, celebrity) => {
      // Sort by content score (if available) or by date
      const sortedArticles = celebrityArticles.sort((a, b) => {
        // Sort by publishedAt date (newest first) as quality proxy
        const dateA = new Date(a.publishedAt || 0).getTime();
        const dateB = new Date(b.publishedAt || 0).getTime();
        return dateB - dateA;
      });

      // Take only the top articles for this celebrity
      const selectedArticles = sortedArticles.slice(0, maxPerCelebrity);
      limitedArticles.push(...selectedArticles);

      if (celebrityArticles.length > maxPerCelebrity) {
        logger.debug(
          `Limited ${celebrity}: ${celebrityArticles.length} → ${selectedArticles.length} articles`
        );
      }
    });

    return limitedArticles;
  }

  /**
   * Process and store articles in database
   */
  private async processAndStoreArticles(
    articles: ArticleWithCelebrity[],
    celebrities: string[]
  ): Promise<{
    newArticlesAdded: number;
    duplicatesFound: number;
  }> {
    if (articles.length === 0) {
      return { newArticlesAdded: 0, duplicatesFound: 0 };
    }

    logger.info(`Processing ${articles.length} articles...`);

    // PHASE 1: Enhanced filtering for content relevance and quality
    const relevantArticles = articles.filter(article => {
      // FILTER 1: Must have valid celebrity assignment
      if (!article.celebrity || article.celebrity === 'unknown') {
        logger.debug(`❌ Filtered: No valid celebrity assignment - ${article.title}`);
        return false;
      }

      // FILTER 2: Celebrity name must appear in title or description
      const titleLower = (article.title || '').toLowerCase();
      const descLower = (article.description || '').toLowerCase();
      const celebrityLower = article.celebrity.toLowerCase();

      const celebrityInTitle = titleLower.includes(celebrityLower);
      const celebrityInDesc = descLower.includes(celebrityLower);

      if (!celebrityInTitle && !celebrityInDesc) {
        logger.debug(
          `❌ Filtered: Celebrity name not found in content - ${article.title} (${article.celebrity})`
        );
        return false;
      }

      // FILTER 3: Content quality scoring (Phase 1 enhanced)
      const contentScore = analyzePortugueseContent(
        article.title,
        article.description,
        article.url,
        article.celebrity // Pass celebrity name for enhanced relevance scoring
      );

      // AGGRESSIVE GROWTH: Threshold 15 for maximum article count while avoiding trash
      const keepArticle = shouldKeepArticle(contentScore, 15);

      if (!keepArticle) {
        if (process.env.NODE_ENV === 'development') {
          logger.debug(
            `❌ Filtered: Low quality score ${contentScore.overallScore}/100 - ${article.title}`
          );
          logger.debug(`   Reasons: ${contentScore.reasons.join(', ')}`);
        }
        return false;
      }

      // FILTER 4: PHASE 2 - Image URL validation (domain check only for performance)
      if (article.urlToImage) {
        const isImageDomainValid = isImageUrlDomainValid(article.urlToImage);
        if (!isImageDomainValid) {
          logger.debug(`❌ Filtered: Invalid image domain - ${article.title}`);
          logger.debug(`   Image URL: ${article.urlToImage}`);
          return false;
        }
      } else {
        // Articles without images get lower priority but aren't filtered out
        logger.debug(`⚠️ Article has no image: ${article.title}`);
      }

      // Log accepted articles for monitoring
      if (process.env.NODE_ENV === 'development') {
        logger.debug(
          `✅ Accepted: Score ${contentScore.overallScore}/100 - ${article.title} (${article.celebrity})`
        );
      }

      return true;
    });

    logger.info(
      `Found ${relevantArticles.length} high-quality relevant articles after Portuguese content filtering`
    );

    // AGGRESSIVE GROWTH: Apply per-celebrity limits to prevent clustering
    const limitedArticles = this.applyPerCelebrityLimits(relevantArticles, 3);
    logger.info(
      `Applied per-celebrity limits: ${relevantArticles.length} → ${limitedArticles.length} articles`
    );

    // Remove duplicates based on URL
    const uniqueArticles = filterDuplicates(limitedArticles, (article: ArticleType) => article.url);
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

          // Content scoring is done during filtering phase

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

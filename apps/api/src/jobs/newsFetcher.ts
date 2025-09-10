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
// Removed unused imports - simplified filtering approach
import { apiKeyManager } from '../services/apiKeyManager';
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

  // Smart batching configuration
  private readonly CELEBRITY_BATCH_SIZE = 25; // Celebrities per batch
  private currentBatchIndex = 0; // Track which batch we're processing

  private constructor() {}

  public static getInstance(): NewsFetcher {
    if (!NewsFetcher.instance) {
      NewsFetcher.instance = new NewsFetcher();
    }
    return NewsFetcher.instance;
  }

  /**
   * Split celebrities into smart batches for efficient API calls
   */
  private createCelebrityBatches(celebrities: string[]): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < celebrities.length; i += this.CELEBRITY_BATCH_SIZE) {
      batches.push(celebrities.slice(i, i + this.CELEBRITY_BATCH_SIZE));
    }
    logger.info(
      `Created ${batches.length} celebrity batches from ${celebrities.length} celebrities`
    );
    return batches;
  }

  /**
   * Create OR query string from celebrity batch
   */
  private createBatchQuery(celebrityBatch: string[]): string {
    // Create OR query: "Anitta OR Bruna Marquezine OR Gisele Bündchen"
    const query = celebrityBatch.join(' OR ');
    logger.debug(
      `Created batch query with ${celebrityBatch.length} celebrities: ${query.substring(0, 100)}...`
    );
    return query;
  }

  /**
   * Get next batch for rotation (ensures all celebrities get coverage)
   * 🔄 Persistent rotation - remembers position across server restarts
   */
  private async getNextBatch(batches: string[][]): Promise<string[]> {
    if (batches.length === 0) return [];

    const cacheKey = 'news-fetcher:current-batch-index';

    try {
      // Get current batch index from cache (persistent across restarts)
      const cachedIndex = await enhancedCacheService.get<number>(cacheKey);
      this.currentBatchIndex = cachedIndex || 0;

      // Ensure index is within bounds
      if (this.currentBatchIndex >= batches.length) {
        this.currentBatchIndex = 0;
      }

      const batch = batches[this.currentBatchIndex];
      const nextIndex = (this.currentBatchIndex + 1) % batches.length;

      // Save next index for next fetch cycle
      await enhancedCacheService.set(cacheKey, nextIndex, { ttl: 86400 }); // 24 hours

      logger.info(`🔄 Processing batch ${this.currentBatchIndex + 1}/${batches.length}`, {
        batchSize: batch.length,
        nextBatchIndex: nextIndex + 1,
        celebrities: batch.slice(0, 3).join(', ') + (batch.length > 3 ? '...' : ''),
      });

      return batch;
    } catch (error) {
      logger.warn('Failed to get batch index from cache, using default:', error);
      return batches[0] || [];
    }
  }

  /**
   * Assign celebrity names to articles based on content analysis
   */
  private assignCelebritiesToArticles(
    articles: ArticleType[],
    celebrityBatch: string[]
  ): ArticleWithCelebrity[] {
    return articles.map(article => {
      // Find which celebrity this article is most likely about
      let bestMatch = celebrityBatch[0]; // Default to first celebrity
      let bestScore = 0;

      for (const celebrity of celebrityBatch) {
        if (isArticleAboutCelebrity(article, celebrity)) {
          // Simple scoring: count mentions in title and description
          const titleMatches = article.title?.toLowerCase().includes(celebrity.toLowerCase())
            ? 2
            : 0;
          const descMatches = article.description?.toLowerCase().includes(celebrity.toLowerCase())
            ? 1
            : 0;
          const score = titleMatches + descMatches;

          if (score > bestScore) {
            bestScore = score;
            bestMatch = celebrity;
          }
        }
      }

      return {
        ...article,
        celebrity: bestMatch,
      };
    });
  }

  /**
   * Get all available API keys from config (legacy method for compatibility)
   */
  private getAvailableApiKeys(config: ReturnType<typeof getEnvConfig>): string[] {
    const keys = [config.newsApiKey, config.newsApiKeyBackup, config.newsApiKeyBackup2].filter(
      Boolean
    ) as string[];

    return keys;
  }

  /**
   * Get the best available API key using smart key manager
   */
  private async getCurrentApiKey(
    _config?: ReturnType<typeof getEnvConfig>
  ): Promise<string | null> {
    return await apiKeyManager.getBestApiKey();
  }

  /**
   * Switch to the next best API key using smart rotation
   */
  private async switchToNextApiKey(
    config?: ReturnType<typeof getEnvConfig>,
    currentKey?: string
  ): Promise<string | null> {
    const nextKey = await apiKeyManager.getNextBestKey(currentKey);
    if (nextKey) {
      logger.info('🔄 Smart key rotation successful');
    } else {
      logger.warn('⚠️ No alternative API keys available');
    }
    return nextKey;
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
      const currentApiKey = await this.getCurrentApiKey(config);
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
   * Fetch articles for ALL celebrities - SIMPLIFIED APPROACH
   * Just get articles for ALL celebrities in one API call, no complex batching
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
    logger.info('🚀 Fetching articles for ALL celebrities', {
      totalCelebrities: celebrities.length,
    });

    // SIMPLIFIED: Split celebrities into smaller batches to avoid query length limits
    const BATCH_SIZE = 20; // 20 celebrities per API call
    const batches: string[][] = [];

    for (let i = 0; i < celebrities.length; i += BATCH_SIZE) {
      batches.push(celebrities.slice(i, i + BATCH_SIZE));
    }

    logger.info(`🎯 Fetching articles for ALL celebrities in ${batches.length} batches`);

    let allArticles: ArticleWithCelebrity[] = [];
    let totalApiCalls = 0;
    let lastRateLimitInfo: { rateLimitRemaining?: number; rateLimitReset?: Date } = {};

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchQuery = batch.map(name => `"${name}"`).join(' OR ');

      logger.info(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} celebrities)`);

      try {
        const result = await this.fetchArticlesForBatch(batchQuery, batch, config);
        allArticles = allArticles.concat(result.articles);
        totalApiCalls++;

        if (result.rateLimitRemaining !== undefined) {
          lastRateLimitInfo.rateLimitRemaining = result.rateLimitRemaining;
        }
        if (result.rateLimitReset) {
          lastRateLimitInfo.rateLimitReset = result.rateLimitReset;
        }

        logger.info(`✅ Batch ${i + 1} completed: ${result.articles.length} articles found`);

        // Small delay between batches to be respectful to the API
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        logger.error(`❌ Batch ${i + 1} failed:`, error);
        totalApiCalls++;
        // Continue with next batch even if one fails
      }
    }

    logger.info('✅ Fetch completed for ALL celebrities', {
      articlesFound: allArticles.length,
      apiCallsUsed: totalApiCalls,
      rateLimitRemaining: lastRateLimitInfo.rateLimitRemaining,
      celebritiesProcessed: celebrities.length,
      batchesProcessed: batches.length,
    });

    return {
      articles: allArticles,
      totalArticles: allArticles.length,
      apiCallsUsed: totalApiCalls,
      rateLimitRemaining: lastRateLimitInfo.rateLimitRemaining,
      rateLimitReset: lastRateLimitInfo.rateLimitReset,
    };
  }

  /**
   * Fetch articles for a batch of celebrities using OR query
   * 🚀 NEW: Single API call for multiple celebrities
   */
  private async fetchArticlesForBatch(
    batchQuery: string,
    celebrityBatch: string[],
    config: ReturnType<typeof getEnvConfig>,
    retryCount: number = 0
  ): Promise<{
    articles: ArticleWithCelebrity[];
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
  }> {
    let currentApiKey: string | null = null;

    try {
      logger.debug(`Fetching articles for batch of ${celebrityBatch.length} celebrities`);

      currentApiKey = await this.getCurrentApiKey(config);
      if (!currentApiKey) {
        throw new Error('No API keys available');
      }

      const response: AxiosResponse<NewsApiResponse> = await axios.get(this.NEWS_API_URL, {
        params: {
          q: batchQuery, // 🎯 OR query: "Anitta OR Bruna Marquezine OR Gisele OR..."
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

      // 🧠 Smart assignment: Determine which celebrity each article is about
      const articlesWithCelebrity = this.assignCelebritiesToArticles(articles, celebrityBatch);

      logger.info(
        `✅ Batch fetch successful: ${articles.length} articles for ${celebrityBatch.length} celebrities`,
        {
          rateLimitRemaining,
          rateLimitReset,
          celebrityBatch: celebrityBatch.slice(0, 3).join(', ') + '...',
        }
      );

      // Report successful batch API key usage
      if (currentApiKey) {
        apiKeyManager.reportKeyUsage(currentApiKey, true, false);
      }

      return {
        articles: articlesWithCelebrity,
        rateLimitRemaining,
        rateLimitReset,
      };
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { status: number; data?: { message?: string } };
        code?: string;
      };

      // Handle rate limiting
      if (axiosError.response?.status === 429) {
        logger.warn(`Rate limited for batch query. Switching API key...`);

        // Report rate limiting for current key
        if (currentApiKey) {
          apiKeyManager.reportKeyUsage(currentApiKey, false, true);
        }

        await this.switchToNextApiKey(config, currentApiKey || undefined);

        if (retryCount < this.MAX_RETRIES) {
          await this.delay(2000); // Wait 2 seconds before retry
          return this.fetchArticlesForBatch(batchQuery, celebrityBatch, config, retryCount + 1);
        }
      }

      // Handle other errors
      const errorMessage =
        axiosError.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');

      // Report failure for current key
      if (currentApiKey) {
        apiKeyManager.reportKeyUsage(currentApiKey, false, false);
      }

      logger.error(`❌ Batch fetch failed for ${celebrityBatch.length} celebrities:`, {
        error: errorMessage,
        status: axiosError.response?.status,
        retryCount,
      });

      throw new Error(`Batch fetch failed: ${errorMessage}`);
    }
  }

  /**
   * Fetch articles for a single celebrity (PUBLIC - used for live search)
   */
  public async fetchArticlesForCelebrity(
    celebrity: string,
    config: ReturnType<typeof getEnvConfig>,
    retryCount: number = 0
  ): Promise<{
    articles: ArticleWithCelebrity[];
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
  }> {
    let currentApiKey: string | null = null;

    try {
      logger.debug(`Fetching articles for: ${celebrity}`);

      currentApiKey = await this.getCurrentApiKey(config);
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

      // Report successful API key usage
      if (currentApiKey) {
        apiKeyManager.reportKeyUsage(currentApiKey, true, false);
      }

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

        // Report rate limiting for current key
        if (currentApiKey) {
          apiKeyManager.reportKeyUsage(currentApiKey, false, true);
        }

        const nextApiKey = await this.switchToNextApiKey(config, currentApiKey || undefined);
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

        // Report failure for current key
        if (currentApiKey) {
          apiKeyManager.reportKeyUsage(currentApiKey, false, false);
        }

        await this.delay(5000); // 5 second delay before retry
        return this.fetchArticlesForCelebrity(celebrity, config, retryCount + 1);
      }

      // Report final failure
      if (currentApiKey) {
        apiKeyManager.reportKeyUsage(currentApiKey, false, false);
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
    // SMART FILTERING: Maximum articles while removing obvious trash
    const relevantArticles = articles.filter(article => {
      // Filter 1: Must have celebrity assignment
      if (!article.celebrity || article.celebrity === 'unknown') {
        return false;
      }

      // Filter 2: Celebrity name must appear in title or description (simple relevance check)
      const titleLower = (article.title || '').toLowerCase();
      const descLower = (article.description || '').toLowerCase();
      const celebrityLower = article.celebrity.toLowerCase();

      // Check if celebrity name appears in content
      const celebrityInTitle = titleLower.includes(celebrityLower);
      const celebrityInDesc = descLower.includes(celebrityLower);

      if (!celebrityInTitle && !celebrityInDesc) {
        // This is likely a false positive - article not actually about this celebrity
        return false;
      }

      // Keep everything else - maximum relevant articles!
      return true;
    });

    logger.info(`Found ${relevantArticles.length} articles - keeping ALL for maximum content!`);

    // MAXIMUM ARTICLES: No per-celebrity limits - keep all articles!
    const limitedArticles = relevantArticles;
    logger.info(`Keeping ALL ${relevantArticles.length} articles - no artificial limits!`);

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

      const config = getEnvConfig();
      const now = new Date();

      // Use extended grace period in development to prevent excessive API calls
      const gracePeriod = config.isDevelopment
        ? 2 * 60 * 60 * 1000 // 2 hours in development
        : 30 * 60 * 1000; // 30 minutes in production

      const timeSinceLastFetch = now.getTime() - lastFetch.fetchDate.getTime();
      const isDue = timeSinceLastFetch >= gracePeriod;

      if (config.isDevelopment && !isDue) {
        const remainingTime = Math.ceil((gracePeriod - timeSinceLastFetch) / (60 * 1000));
        logger.info(
          `🛠️ Development grace period: ${remainingTime} minutes until next fetch allowed`
        );
      }

      return isDue;
    } catch (error) {
      logger.error('Error checking if fetch is due:', error);
      return true; // Default to true if we can't determine
    }
  }
}

export const newsFetcher = NewsFetcher.getInstance();

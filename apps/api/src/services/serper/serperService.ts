/**
 * Serper Service
 * 
 * Google Search API integration via Serper.dev for Brazilian celebrity news
 * Replaces NewsAPI with more comprehensive and cost-effective solution
 */

import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import axios, { AxiosResponse } from 'axios';
import { getEnvConfig } from '../../../../../libs/shared/utils/src/index';
import { SerperResponse, SerperArticle, SerperSearchOptions, SerperKeyStatus, SerperApiError, SerperNewsResult } from './serperTypes';
import SerperQueryBuilder from './serperQueryBuilder';
import { serperUsageTracker } from './serperUsageTracker';
import { celebrityService } from '../celebrityService';
import logger from '../../utils/logger';

/** Debug: last Serper request/response when 0 articles returned (for batch-query investigation) */
export interface LastRawWhenEmpty {
  request: { q: string; gl: string; hl: string; num: number };
  responseKeys: string[];
  response: unknown;
  at: string;
}

/** Domains we exclude so we only store news articles (no social, video, etc.) */
const NON_NEWS_DOMAIN_PATTERNS = [
  'youtube.com', 'youtu.be', 'twitter.com', 'x.com', 'instagram.com', 'tiktok.com',
  'facebook.com', 'fb.com', 'fb.watch', 'linkedin.com', 'pinterest.com', 'reddit.com',
  'whatsapp.com', 'telegram.org', 'snapchat.com', 'twitch.tv', 'spotify.com',
];

function isNewsUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return !NON_NEWS_DOMAIN_PATTERNS.some(domain => lower.includes(domain));
}

export class SerperService {
  private static instance: SerperService;
  // Use /news endpoint so we get only news results (no organic/social/YouTube)
  private readonly SERPER_API_URL = 'https://google.serper.dev/news';
  private readonly REQUEST_TIMEOUT = 15000; // 15 seconds
  private readonly MAX_RETRIES = 3;
  private lastRawWhenEmpty: LastRawWhenEmpty | null = null;

  private constructor() {}

  public static getInstance(): SerperService {
    if (!SerperService.instance) {
      SerperService.instance = new SerperService();
    }
    return SerperService.instance;
  }

  /** Debug: return last raw request/response when 0 articles (for batch-query investigation) */
  public getLastRawWhenEmpty(): LastRawWhenEmpty | null {
    return this.lastRawWhenEmpty;
  }

  /** Return the same API key the service would use for requests (for diagnostics e.g. raw-batch-test). */
  public async getKeyForRequest(): Promise<string | null> {
    return this.getValidApiKey();
  }

  /**
   * Search for news about a specific celebrity
   */
  public async searchCelebrity(celebrityName: string, options: {
    searchType?: 'comprehensive' | 'entertainment' | 'news' | 'lifestyle' | 'career';
    limit?: number;
    dateRestrict?: string;
  } = {}): Promise<SerperArticle[]> {
    const { searchType = 'comprehensive', limit = 100, dateRestrict = undefined } = options;

    logger.info(`🔍 Searching Serper for celebrity: ${celebrityName}`, {
      searchType,
      limit,
      dateRestrict: dateRestrict || 'ALL ARTICLES (no date restriction)'
    });

    try {
      // Check if we can make API call
      const usageCheck = serperUsageTracker.canMakeApiCall();
      if (!usageCheck.allowed) {
        logger.error(`🚫 Serper API call blocked: ${usageCheck.reason}`);
        throw new Error(`Rate limit exceeded: ${usageCheck.reason}`);
      }

      // Build optimized query (no dateRestrict passed - get ALL articles)
      const searchOptions = SerperQueryBuilder.buildCelebrityQuery(celebrityName, {
        searchType,
        // Don't pass dateRestrict unless explicitly provided (for live search)
        ...(dateRestrict && { dateRestrict }),
      });

      // Execute search
      const response = await this.executeSearch(searchOptions);
      
      // Record successful API call
      serperUsageTracker.recordApiCall();
      
      // Convert to our article format
      const articles = await this.convertToArticles(response, celebrityName);
      
      // Limit results
      const limitedArticles = articles.slice(0, limit);

      logger.info(`✅ Found ${limitedArticles.length} articles for ${celebrityName}`);
      return limitedArticles;

    } catch (error) {
      logger.error(`❌ Serper search failed for ${celebrityName}:`, error);
      throw error;
    }
  }

  /**
   * Batch search for multiple celebrities
   */
  public async searchMultipleCelebrities(celebrities: string[], options: {
    searchType?: 'comprehensive' | 'entertainment' | 'news';
    articlesPerCelebrity?: number;
    useIndividualSearches?: boolean; // true = 1 request per celeb (high credits), false = batch (1 request per N names)
    maxCelebritiesPerQuery?: number; // when useIndividualSearches=false, names per single request (e.g. 4)
  } = {}): Promise<SerperArticle[]> {
      const { 
      searchType = 'comprehensive', 
      articlesPerCelebrity = 100, // Increased to 100 (Serper max per request)
      useIndividualSearches = true, // DEFAULT: Individual searches for 100% coverage
      maxCelebritiesPerQuery = 4, // when batching: names per one Serper request (~30 calls for 112 celebs)
    } = options;

    logger.info(`🔍 Searching Serper for ${celebrities.length} celebrities (individual: ${useIndividualSearches}, articles/celeb: ${articlesPerCelebrity}, maxPerQuery: ${maxCelebritiesPerQuery})`);

    try {
      // Build queries - individual for better coverage, batch for speed (saves credits)
      let queries: SerperSearchOptions[];
      if (useIndividualSearches) {
        // Use the SAME method as searchCelebrity (which works!)
        // Pass articlesPerCelebrity as num parameter
        // NO dateRestrict - get ALL articles regardless of date
        queries = celebrities.map(celebrity => 
          SerperQueryBuilder.buildCelebrityQuery(celebrity, { 
            searchType,
            num: articlesPerCelebrity, // Use the requested articles per celebrity (max 100)
            // No dateRestrict - get ALL articles
          })
        );
        logger.info(`✅ Built ${queries.length} individual queries using buildCelebrityQuery (${articlesPerCelebrity} articles each, NO DATE RESTRICTION - ALL ARTICLES)`);
      } else {
        queries = SerperQueryBuilder.buildBatchQuery(celebrities, { searchType, maxCelebritiesPerQuery });
      }
      
      const allArticles: SerperArticle[] = [];
      let processedCount = 0;
      let capturedRawWhenEmpty: LastRawWhenEmpty | null = null;

      // Track results per celebrity for reporting
      const celebrityResults: Map<string, number> = new Map();
      
      // Execute queries with smart rate limiting
      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        const celebrityName = useIndividualSearches ? celebrities[i] : `batch-${i + 1}`;
        
        try {
          // Check rate limits
          const usageCheck = serperUsageTracker.canMakeApiCall();
          if (!usageCheck.allowed) {
            logger.warn(`🚫 Rate limit reached at celebrity ${i + 1}/${queries.length}: ${usageCheck.reason}`);
            logger.info(`✅ Processed ${processedCount}/${celebrities.length} celebrities before rate limit`);
            break; // Stop here, will resume next fetch cycle
          }

          logger.info(`🔍 Searching ${i + 1}/${queries.length}: ${celebrityName}`);

          const response = await this.executeSearch(query);
          const withRaw = response as SerperResponse & { rawWhenEmpty?: LastRawWhenEmpty };
          if (withRaw.rawWhenEmpty) {
            this.lastRawWhenEmpty = withRaw.rawWhenEmpty;
            capturedRawWhenEmpty = withRaw.rawWhenEmpty;
          }
          serperUsageTracker.recordApiCall();
          
          // Convert with celebrity name for proper detection (individual) or batch detection
          const articles = await this.convertToArticles(response, useIndividualSearches ? celebrityName : 'batch');
          allArticles.push(...articles);
          processedCount++;
          
          // Track results per celebrity
          celebrityResults.set(celebrityName, articles.length);
          
          if (articles.length === 0) {
            logger.warn(`⚠️ ${celebrityName}: 0 articles found (search may have no results for last month)`);
          } else {
            logger.info(`✅ ${celebrityName}: ${articles.length} articles (total: ${allArticles.length})`);
          }

          // Smart delay: 500ms between requests (respectful rate limiting)
          if (i < queries.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }

        } catch (error) {
          logger.error(`❌ Failed for ${celebrityName}:`, error);
          celebrityResults.set(celebrityName, -1); // -1 indicates error
          // Continue with next celebrity
        }
      }
      
      // Log summary of results
      const celebritiesWithArticlesFromSearch = Array.from(celebrityResults.entries()).filter(([_, count]) => count > 0);
      const celebritiesWithZeroResults = Array.from(celebrityResults.entries()).filter(([_, count]) => count === 0);
      const celebritiesWithErrors = Array.from(celebrityResults.entries()).filter(([_, count]) => count === -1);
      
      logger.info(`📊 Search Summary:`);
      logger.info(`   ✅ Celebrities with articles: ${celebritiesWithArticlesFromSearch.length}/${celebrities.length}`);
      logger.info(`   ⚠️ Celebrities with 0 results: ${celebritiesWithZeroResults.length}/${celebrities.length}`);
      logger.info(`   ❌ Celebrities with errors: ${celebritiesWithErrors.length}/${celebrities.length}`);
      
      if (celebritiesWithZeroResults.length > 0 && celebritiesWithZeroResults.length <= 20) {
        logger.info(`   📋 Zero-result celebrities: ${celebritiesWithZeroResults.map(([name]) => name).join(', ')}`);
      } else if (celebritiesWithZeroResults.length > 20) {
        logger.info(`   📋 Zero-result celebrities (first 20): ${celebritiesWithZeroResults.slice(0, 20).map(([name]) => name).join(', ')}...`);
      }

      // For batch queries, distribute articles; for individual, they're already assigned
      const finalArticles = useIndividualSearches 
        ? allArticles // Already have celebrity names assigned
        : this.distributeArticlesByCelebrity(allArticles, celebrities, articlesPerCelebrity);

      logger.info(`✅ Search completed: ${finalArticles.length} articles from ${processedCount} celebrities`);
      
      // Coverage report
      const celebritiesWithArticles = new Set(finalArticles.map(a => a.celebrity).filter(c => c && c !== 'unknown'));
      logger.info(`📊 Coverage: ${celebritiesWithArticles.size}/${celebrities.length} celebrities have articles`);
      
      // When batch mode and 0 articles, return raw so caller can inspect Serper response
      if (!useIndividualSearches && capturedRawWhenEmpty) {
        return Object.assign([], finalArticles, { rawWhenEmpty: capturedRawWhenEmpty }) as SerperArticle[] & { rawWhenEmpty: LastRawWhenEmpty };
      }
      return finalArticles;

    } catch (error) {
      logger.error(`❌ Batch search failed:`, error);
      throw error;
    }
  }

  /**
   * Live search for user queries
   */
  public async liveSearch(searchTerm: string, options: {
    celebrity?: string;
    limit?: number;
    page?: number;
  } = {}): Promise<SerperArticle[]> {
    const { celebrity, limit = 20, page = 1 } = options;

    logger.info(`🔍 Live search on Serper:`, { searchTerm, celebrity, limit, page });

    try {
      // Build live search query
      const searchOptions = SerperQueryBuilder.buildLiveSearchQuery(searchTerm, { celebrity });
      
      // Execute search
      const response = await this.executeSearch(searchOptions);
      
      // Convert and paginate
      const articles = await this.convertToArticles(response, celebrity);
      const startIndex = (page - 1) * limit;
      const paginatedArticles = articles.slice(startIndex, startIndex + limit);

      logger.info(`✅ Live search completed: ${paginatedArticles.length} articles`);
      return paginatedArticles;

    } catch (error) {
      logger.error(`❌ Live search failed:`, error);
      throw error;
    }
  }

  /**
   * Get trending celebrity news
   */
  public async getTrendingNews(options: {
    category?: 'entertainment' | 'fashion' | 'music' | 'tv' | 'social';
    limit?: number;
  } = {}): Promise<SerperArticle[]> {
    const { category = 'entertainment', limit = 30 } = options;

    logger.info(`🔥 Fetching trending news from Serper:`, { category, limit });

    try {
      const searchOptions = SerperQueryBuilder.buildTrendingQuery({ category });
      const response = await this.executeSearch(searchOptions);
      const articles = await this.convertToArticles(response);
      
      return articles.slice(0, limit);

    } catch (error) {
      logger.error(`❌ Trending news fetch failed:`, error);
      throw error;
    }
  }

  /**
   * Execute search request to Serper API
   */
  private async executeSearch(options: SerperSearchOptions): Promise<SerperResponse> {
    const apiKey = await this.getValidApiKey();

    if (!apiKey) {
      throw new Error('No valid Serper API key available');
    }

    // Sanitize query
    const sanitizedQuery = SerperQueryBuilder.sanitizeQuery(options.query);

    // FIXED: Request format matching Serper playground for /news endpoint
    const requestData = {
      q: sanitizedQuery,
      gl: 'br', // Brazil
      hl: 'pt', // Portuguese (NOT pt-br - Serper only accepts 'pt')
      num: options.num || 50, // Use num from options or default to 50
    };

    logger.info(`🔍 Executing Serper search:`, {
      query: sanitizedQuery,
      params: requestData,
      url: this.SERPER_API_URL
    });

    const doPost = (headers: Record<string, string>) =>
      axios.post<SerperResponse>(this.SERPER_API_URL, requestData, {
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'User-Agent': 'Gatas-News-KeyTester/1.0', // Same as validateKeys script (working)
        },
        timeout: this.REQUEST_TIMEOUT,
      });

    try {
      let response: AxiosResponse<SerperResponse>;
      try {
        // Try Bearer first (some Serper setups expect this from server); fallback to X-API-KEY
        response = await doPost({ Authorization: `Bearer ${apiKey}` });
      } catch (firstErr) {
        if (axios.isAxiosError(firstErr) && firstErr.response?.status === 403) {
          logger.warn('Serper 403 with Bearer, retrying with X-API-KEY');
          response = await doPost({ 'X-API-KEY': apiKey });
        } else {
          throw firstErr;
        }
      }

      // DEBUG: Log the actual response structure
      logger.info('🔍 Serper API raw response structure:', {
        keys: Object.keys(response.data),
        hasNews: !!response.data.news,
        newsLength: response.data.news?.length || 0,
        hasOrganic: !!response.data.organic,
        organicLength: response.data.organic?.length || 0,
      });


      // Use only news results – no organic fallback (we want news only, not social/YouTube etc.)
      let newsResults: SerperNewsResult[] = [];
      if (response.data.news && Array.isArray(response.data.news)) {
        newsResults = response.data.news;
        logger.info(`✅ Found ${newsResults.length} news results from Serper`);
      }
      if (newsResults.length === 0) {
        logger.warn(`No news results from Serper for query: ${sanitizedQuery.substring(0, 80)}...`);
        // Grep for SERPER_RAW_0 to find raw response when batch/OR queries return 0 articles
        logger.warn('[SERPER_RAW_0] Request sent:', JSON.stringify(requestData));
        logger.warn('[SERPER_RAW_0] Response keys:', Object.keys(response.data));
        logger.warn('[SERPER_RAW_0] Full response:', JSON.stringify(response.data, null, 2));
        // Store for debug endpoint (investigation)
        this.lastRawWhenEmpty = {
          request: requestData,
          responseKeys: Object.keys(response.data),
          response: response.data,
          at: new Date().toISOString(),
        };
      }
      // Also capture when news array is present but empty (common for batch OR queries)
      const rawWhenEmpty: LastRawWhenEmpty = {
        request: requestData,
        responseKeys: Object.keys(response.data),
        response: response.data,
        at: new Date().toISOString(),
      };
      if (newsResults.length === 0) {
        this.lastRawWhenEmpty = rawWhenEmpty;
      }

      // Return normalized response; include rawWhenEmpty when 0 so caller can use it in same request
      const normalized: SerperResponse = {
        news: newsResults,
        searchParameters: response.data.searchParameters || {},
        searchInformation: response.data.searchInformation || {},
      };
      if (newsResults.length === 0) {
        return Object.assign(normalized, { rawWhenEmpty }) as SerperResponse;
      }
      return normalized;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Serper API error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          requestData
        });
        
        const serperError = error.response?.data as SerperApiError;
        if (serperError?.error) {
          throw new Error(`Serper API error: ${serperError.error.message} (${serperError.error.code})`);
        }
        throw new Error(`Serper request failed: ${error.message} (Status: ${error.response?.status})`);
      }
      throw error;
    }
  }

  /**
   * Convert Serper response to our article format
   */
  private async convertToArticles(response: SerperResponse, celebrity?: string): Promise<SerperArticle[]> {
    const results = response.news || [];
    const newsOnly = results.filter(item => isNewsUrl(item.link || ''));
    const excluded = results.length - newsOnly.length;
    if (excluded > 0) {
      logger.info(`Filtered out ${excluded} non-news URLs (social/video etc.), keeping ${newsOnly.length}`);
    }

    if (!newsOnly.length) {
      logger.debug('No news articles to convert:', {
        hasNews: !!response.news,
        newsLength: response.news?.length || 0,
      });
      return [];
    }

    logger.info(`🔄 Converting ${newsOnly.length} Serper news results to articles`);

    const articles = await Promise.all(newsOnly.map(async (item, index) => {
      try {
        // For individual searches, TRUST the celebrity name passed in
        // For batch searches, try to detect from content
        let detectedCelebrity: string;
        if (celebrity && celebrity !== 'batch' && celebrity !== 'unknown' && celebrity.trim() !== '') {
          // Individual search - use the celebrity name directly (we KNOW this article is about them)
          // ALWAYS assign the celebrity for individual searches - we searched specifically for them!
          detectedCelebrity = celebrity.trim();
          logger.debug(`✅ Using provided celebrity: ${detectedCelebrity} for article: ${item.title.substring(0, 50)}...`);
        } else {
          // Batch search or unknown - try to detect from content
          detectedCelebrity = await this.detectCelebrityFromContent(item.title, item.snippet);
        }

        return {
          url: item.link || '',
          title: item.title || '',
          description: item.snippet || '',
          publishedAt: this.parseDate(item.date),
          source: {
            id: null,
            name: item.source || 'Unknown',
          },
          imageUrl: item.imageUrl || null,
          author: undefined,
          content: item.snippet || '',
          celebrity: detectedCelebrity,
          sentiment: 'neutral' as const,
          isActive: true,
        };
      } catch (error) {
        logger.error(`Error converting article ${index}:`, error, { item });
        return null;
      }
    }));

    return articles.filter(Boolean) as SerperArticle[];
  }

  /**
   * Detect celebrity name from article title and content
   */
  private async detectCelebrityFromContent(title: string, snippet: string): Promise<string> {
    const content = `${title} ${snippet}`.toLowerCase();
    
    try {
      // Get all celebrities from the celebrity service
      const celebrities = await celebrityService.getCelebrities();
      
      logger.debug(`🔍 DEBUG: Checking ${celebrities.length} celebrities for article: ${title.substring(0, 50)}...`);
      logger.debug(`🔍 DEBUG: Article content: ${content.substring(0, 100)}...`);
      
      // Find the first celebrity whose name appears in the content
      for (const celebrity of celebrities) {
        const celebrityName = celebrity.toLowerCase();
        
        // Check for exact name match
        if (content.includes(celebrityName)) {
          logger.info(`🎯 Detected celebrity: ${celebrity} in article: ${title.substring(0, 50)}...`);
          return celebrity;
        }
        
        // Check for partial matches (first name only)
        const firstName = celebrityName.split(' ')[0];
        if (firstName.length > 3 && content.includes(firstName)) {
          logger.info(`🎯 Detected celebrity (partial): ${celebrity} in article: ${title.substring(0, 50)}...`);
          return celebrity;
        }
      }
      
      logger.debug(`❌ No celebrity detected in article: ${title.substring(0, 50)}...`);
      return 'unknown';
    } catch (error) {
      logger.error('Error detecting celebrity from content:', error);
      return 'unknown';
    }
  }

  /**
   * Parse date from Serper format
   */
  private parseDate(dateString: string): string {
    try {
      // Serper provides dates in various formats
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // If parsing fails, use current date
        return new Date().toISOString();
      }
      return date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  /**
   * Distribute articles across celebrities for balanced coverage
   */
  private distributeArticlesByCelebrity(
    articles: SerperArticle[],
    celebrities: string[],
    articlesPerCelebrity: number
  ): SerperArticle[] {
    const distributed: SerperArticle[] = [];
    const celebrityMap = new Map<string, SerperArticle[]>();

    // Group articles by celebrity
    for (const article of articles) {
      for (const celebrity of celebrities) {
        if (this.isArticleAboutCelebrity(article, celebrity)) {
          if (!celebrityMap.has(celebrity)) {
            celebrityMap.set(celebrity, []);
          }
          celebrityMap.get(celebrity)!.push({
            ...article,
            celebrity
          });
          break; // Article assigned to first matching celebrity
        }
      }
    }

    // Take up to articlesPerCelebrity from each celebrity
    for (const [celebrity, celebrityArticles] of celebrityMap) {
      const limited = celebrityArticles.slice(0, articlesPerCelebrity);
      distributed.push(...limited);
      logger.debug(`📊 ${celebrity}: ${limited.length} articles`);
    }

    return distributed;
  }

  /**
   * Check if article is about a specific celebrity
   */
  private isArticleAboutCelebrity(article: SerperArticle, celebrityName: string): boolean {
    const lowerCaseName = celebrityName.toLowerCase();
    const title = article.title.toLowerCase();
    const description = article.description.toLowerCase();

    return title.includes(lowerCaseName) || description.includes(lowerCaseName);
  }

  /**
   * Get valid API key with smart rotation
   */
  private async getValidApiKey(): Promise<string | null> {
    let config = getEnvConfig();
    // SERPER_API_KEY first (main key in .env), then backups; trim whitespace
    let priorityKeys = [
      config.serperApiKey,
      config.serperApiKeyBackup,
      config.serperApiKey2,
      config.serperApiKey3,
    ]
      .filter(Boolean)
      .map((k) => (k as string).trim())
      .filter(Boolean);

    if (priorityKeys.length === 0) {
      const envPaths = [
        path.join(__dirname, '../../../.env'),
        path.join(process.cwd(), 'apps/api/.env'),
        path.join(process.cwd(), '.env'),
      ];
      for (const envPath of envPaths) {
        if (fs.existsSync(envPath)) {
          dotenv.config({ path: envPath });
          config = getEnvConfig();
          priorityKeys = [
            config.serperApiKey,
            config.serperApiKeyBackup,
            config.serperApiKey2,
            config.serperApiKey3,
          ]
            .filter(Boolean)
            .map((k) => (k as string).trim())
            .filter(Boolean);
          if (priorityKeys.length > 0) break;
        }
      }
    }

    if (priorityKeys.length === 0) {
      logger.error('No Serper API keys configured');
      return null;
    }

    for (const key of priorityKeys) {
      const canUse = serperUsageTracker.canUseKey(key);
      if (canUse.allowed) {
        const keyId = key.substring(0, 8);
        logger.info(`✅ Using Serper key: ${keyId}...`);
        return key;
      } else {
        const keyId = key.substring(0, 8);
        logger.warn(`⚠️ Skipping key ${keyId}...: ${canUse.reason}`);
      }
    }

    logger.error('🚫 All Serper API keys have reached their limits');
    return null;
  }

  /**
   * Validate API key
   */
  public async validateApiKey(apiKey: string): Promise<SerperKeyStatus> {
    try {
      await axios.post(
        this.SERPER_API_URL,
        {
          q: 'test',
          gl: 'br',
          hl: 'pt',
          num: 1,
          tbm: 'nws',
        },
        {
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );

      return {
        isValid: true,
        keyUsed: apiKey.substring(0, 8) + '...',
      };

    } catch (error) {
      return {
        isValid: false,
        keyUsed: apiKey.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const serperService = SerperService.getInstance();

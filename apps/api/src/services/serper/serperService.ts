/**
 * Serper Service
 * 
 * Google Search API integration via Serper.dev for Brazilian celebrity news
 * Replaces NewsAPI with more comprehensive and cost-effective solution
 */

import axios, { AxiosResponse } from 'axios';
import { getEnvConfig } from '../../../../../libs/shared/utils/src/index';
import { SerperResponse, SerperArticle, SerperSearchOptions, SerperKeyStatus, SerperApiError, SerperNewsResult } from './serperTypes';
import SerperQueryBuilder from './serperQueryBuilder';
import { serperUsageTracker } from './serperUsageTracker';
import logger from '../../utils/logger';

export class SerperService {
  private static instance: SerperService;
  private readonly SERPER_API_URL = 'https://google.serper.dev/news';
  private readonly REQUEST_TIMEOUT = 15000; // 15 seconds
  private readonly MAX_RETRIES = 3;

  private constructor() {}

  public static getInstance(): SerperService {
    if (!SerperService.instance) {
      SerperService.instance = new SerperService();
    }
    return SerperService.instance;
  }

  /**
   * Search for news about a specific celebrity
   */
  public async searchCelebrity(celebrityName: string, options: {
    searchType?: 'comprehensive' | 'entertainment' | 'news' | 'lifestyle' | 'career';
    limit?: number;
    dateRestrict?: string;
  } = {}): Promise<SerperArticle[]> {
    const { searchType = 'comprehensive', limit = 50, dateRestrict = 'm1' } = options;

    logger.info(`🔍 Searching Serper for celebrity: ${celebrityName}`, {
      searchType,
      limit,
      dateRestrict
    });

    try {
      // Check if we can make API call
      const usageCheck = serperUsageTracker.canMakeApiCall();
      if (!usageCheck.allowed) {
        logger.error(`🚫 Serper API call blocked: ${usageCheck.reason}`);
        throw new Error(`Rate limit exceeded: ${usageCheck.reason}`);
      }

      // Build optimized query
      const searchOptions = SerperQueryBuilder.buildCelebrityQuery(celebrityName, {
        searchType,
        dateRestrict,
      });

      // Execute search
      const response = await this.executeSearch(searchOptions);
      
      // Record successful API call
      serperUsageTracker.recordApiCall();
      
      // Convert to our article format
      const articles = this.convertToArticles(response, celebrityName);
      
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
  } = {}): Promise<SerperArticle[]> {
    const { searchType = 'comprehensive', articlesPerCelebrity = 20 } = options;

    logger.info(`🔍 Batch searching Serper for ${celebrities.length} celebrities`);

    try {
      // Build batch queries
      const queries = SerperQueryBuilder.buildBatchQuery(celebrities, { searchType });
      
      const allArticles: SerperArticle[] = [];

      // Execute queries sequentially with rate limiting delays
      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        try {
          // Check if we can make API call
          const usageCheck = serperUsageTracker.canMakeApiCall();
          if (!usageCheck.allowed) {
            logger.error(`🚫 Serper API call blocked: ${usageCheck.reason}`);
            throw new Error(`Rate limit exceeded: ${usageCheck.reason}`);
          }

          // Add delay between API calls to respect rate limits (except for first call)
          if (i > 0) {
            const delay = 2000; // 2 second delay between calls
            logger.info(`⏱️ Rate limiting: waiting ${delay}ms before next Serper call (${i + 1}/${queries.length})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          const response = await this.executeSearch(query);
          
          // Record successful API call
          serperUsageTracker.recordApiCall();
          
          // For batch queries, we don't have a specific celebrity name to pass
          // The convertToArticles method will handle this gracefully
          const articles = this.convertToArticles(response, 'batch');
          allArticles.push(...articles);
          
          logger.info(`✅ Batch ${i + 1}/${queries.length} completed: ${articles.length} articles`);

        } catch (error) {
          logger.error(`❌ Batch query failed:`, error);
          // Continue with other queries
        }
      }

      // Distribute articles across celebrities
      const distributedArticles = this.distributeArticlesByCelebrity(allArticles, celebrities, articlesPerCelebrity);

      logger.info(`✅ Batch search completed: ${distributedArticles.length} articles for ${celebrities.length} celebrities`);
      return distributedArticles;

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
      const articles = this.convertToArticles(response, celebrity);
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
      const articles = this.convertToArticles(response);
      
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

    const requestData = {
      q: sanitizedQuery,
      location: options.location || 'Brazil',  // Use 'location' parameter as shown in playground
      gl: 'br',                                // Country code
      hl: options.language || 'pt-br',         // Language code
      num: Math.min(options.num || 20, 100),   // Serper max is 100
    };

    logger.info(`🔍 Executing Serper search:`, {
      query: sanitizedQuery,
      params: requestData,
      url: this.SERPER_API_URL
    });

    try {
      const response: AxiosResponse<SerperResponse> = await axios.post(
        this.SERPER_API_URL,
        requestData,
        {
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: this.REQUEST_TIMEOUT,
        }
      );

      // DEBUG: Log the actual response structure
      logger.debug('🔍 Serper API raw response structure:', {
        keys: Object.keys(response.data),
        hasNews: !!response.data.news,
        newsLength: response.data.news?.length || 0,
        hasOrganic: false,
        organicLength: 0,
      });

      // Handle different possible response structures
      let newsResults: SerperNewsResult[] = [];
      
      if (response.data.news && Array.isArray(response.data.news)) {
        newsResults = response.data.news;
        logger.info(`✅ Found ${newsResults.length} news results from /news endpoint`);
      } else {
        logger.warn(`No news results from Serper for query: ${sanitizedQuery.substring(0, 50)}...`);
        logger.debug('Response data keys:', Object.keys(response.data));
      }

      // Return normalized response
      return {
        news: newsResults,
        searchParameters: response.data.searchParameters || {},
        searchInformation: response.data.searchInformation || {},
      };

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
  private convertToArticles(response: SerperResponse, celebrity?: string): SerperArticle[] {
    // Handle both news and organic results
    const results = response.news || [];
    
    if (!results || results.length === 0) {
      logger.debug('No articles to convert:', { 
        hasNews: !!response.news, 
        newsLength: response.news?.length || 0 
      });
      return [];
    }

    logger.info(`🔄 Converting ${results.length} Serper results to articles`);

    return results.map((item, index) => {
      try {
        return {
          url: item.link || '',
          title: item.title || '',
          description: item.snippet || '',
          publishedAt: this.parseDate(item.date),
          source: {
            id: null,
            name: item.source || 'Unknown',
          },
          urlToImage: item.imageUrl || null,
          author: undefined,
          content: item.snippet || '',
          celebrity: celebrity || 'unknown',
          sentiment: 'neutral' as const,
          isActive: true,
        };
      } catch (error) {
        logger.error(`Error converting article ${index}:`, error, { item });
        return null;
      }
    }).filter(Boolean) as SerperArticle[];
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
    const config = getEnvConfig();
    const keys = [
      config.serperApiKey,
      config.serperApiKeyBackup,
      config.serperApiKey2,
      config.serperApiKey3,
    ].filter(Boolean);

    if (keys.length === 0) {
      logger.error('No Serper API keys configured');
      return null;
    }

    // Check each key for availability
    for (const key of keys) {
      if (!key) continue; // Skip undefined keys
      
      const canUse = serperUsageTracker.canUseKey(key);
      if (canUse.allowed) {
        const keyId = key.substring(0, 8);
        logger.info(`✅ Using Serper key: ${keyId}... (${keys.indexOf(key) + 1}/${keys.length})`);
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

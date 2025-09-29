import { serperService } from '../services/serper/serperService';
import { rssService } from '../services/rss/rssService';
import { celebrityService } from '../services/celebrityService';
import { articleRepository } from '../database/repositories/ArticleRepository';
import { Article } from "../database/models/Article";
import { IArticle } from '../database/models/Article';
import { isArticleAboutCelebrity } from '../../../../libs/shared/utils/src/index';
import { enhancedCacheService } from '../services/cacheService';
import { SerperArticle } from '../services/serper/serperTypes';
import logger from '../utils/logger';

export interface MultiSourceFetchResult {
  success: boolean;
  articlesProcessed: number;
  newArticlesAdded: number;
  duplicatesFound: number;
  sources: {
    serper: {
      articles: number;
      newArticles: number;
    };
    rss: {
      articles: number;
      newArticles: number;
    };
  };
  errors: string[];
  duration: number;
}

export class MultiSourceNewsFetcher {
  private static instance: MultiSourceNewsFetcher;

  private constructor() {}

  public static getInstance(): MultiSourceNewsFetcher {
    if (!MultiSourceNewsFetcher.instance) {
      MultiSourceNewsFetcher.instance = new MultiSourceNewsFetcher();
    }
    return MultiSourceNewsFetcher.instance;
  }

  /**
   * Fetch and store news from both Serper and RSS feeds
   */
  public async fetchAndStoreNews(): Promise<MultiSourceFetchResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let totalArticlesProcessed = 0;
    let totalNewArticlesAdded = 0;
    let totalDuplicatesFound = 0;

    const result: MultiSourceFetchResult = {
      success: false,
      articlesProcessed: 0,
      newArticlesAdded: 0,
      duplicatesFound: 0,
      sources: {
        serper: { articles: 0, newArticles: 0 },
        rss: { articles: 0, newArticles: 0 },
      },
      errors: [],
      duration: 0,
    };

    try {
      logger.info('🚀 Starting multi-source news fetch (Serper + RSS)...');

      // Get celebrities list
      const celebrities = await celebrityService.getCelebrities();
      if (celebrities.length === 0) {
        throw new Error('No celebrities found to fetch news for');
      }

      // 1. Fetch from Serper (Google News API)
      logger.info('🔍 Fetching from Serper (Google News)...');
      try {
        const serperResult = await this.fetchAndStoreSerperArticles(celebrities);
        result.sources.serper.articles = serperResult.articlesProcessed;
        result.sources.serper.newArticles = serperResult.newArticlesAdded;
        totalArticlesProcessed += serperResult.articlesProcessed;
        totalNewArticlesAdded += serperResult.newArticlesAdded;
        totalDuplicatesFound += serperResult.duplicatesFound;

        if (!serperResult.success) {
          errors.push(...serperResult.errors);
        }

        logger.info(`✅ Serper: ${serperResult.articlesProcessed} processed, ${serperResult.newArticlesAdded} new`);
      } catch (error) {
        logger.error('❌ Serper fetch failed:', error);
        errors.push(`Serper: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // 2. Fetch from RSS feeds
      logger.info('📡 Fetching from RSS feeds...');
      try {
        const rssResult = await this.fetchAndStoreRSSArticles(celebrities);
        result.sources.rss.articles = rssResult.articlesProcessed;
        result.sources.rss.newArticles = rssResult.newArticlesAdded;
        totalArticlesProcessed += rssResult.articlesProcessed;
        totalNewArticlesAdded += rssResult.newArticlesAdded;
        totalDuplicatesFound += rssResult.duplicatesFound;

        if (!rssResult.success) {
          errors.push(...rssResult.errors);
        }

        logger.info(`✅ RSS: ${rssResult.articlesProcessed} processed, ${rssResult.newArticlesAdded} new`);
      } catch (error) {
        logger.error('❌ RSS fetch failed:', error);
        errors.push(`RSS: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      result.articlesProcessed = totalArticlesProcessed;
      result.newArticlesAdded = totalNewArticlesAdded;
      result.duplicatesFound = totalDuplicatesFound;
      result.errors = errors;
      result.success = errors.length === 0;
      result.duration = Date.now() - startTime;

      // Invalidate cache to ensure fresh data
      await enhancedCacheService.invalidateNewsCache();
      logger.info('News cache invalidated');

      logger.info('🎉 Multi-source fetch completed:', {
        totalProcessed: totalArticlesProcessed,
        totalNew: totalNewArticlesAdded,
        totalDuplicates: totalDuplicatesFound,
        serperNew: result.sources.serper.newArticles,
        rssNew: result.sources.rss.newArticles,
        duration: `${result.duration}ms`,
        success: result.success,
      });

      return result;

    } catch (error) {
      logger.error('💥 Multi-source fetch failed:', error);
      result.errors = [error instanceof Error ? error.message : 'Unknown error'];
      result.duration = Date.now() - startTime;
      result.success = false;
      return result;
    }
  }

  /**
   * Fetch and store articles from Serper (Google News API)
   */
  private async fetchAndStoreSerperArticles(celebrities: string[]): Promise<{
    articlesProcessed: number;
    newArticlesAdded: number;
    duplicatesFound: number;
    errors: string[];
    success: boolean;
  }> {
    const errors: string[] = [];
    let articlesProcessed = 0;
    let newArticlesAdded = 0;
    let duplicatesFound = 0;

    try {
      // 🚨 SEARCH ALL CELEBRITIES - NO LIMITS! This is what our users expect!
      const allCelebrities = celebrities; // Search ALL 112+ celebrities - NO LIMITS!
      logger.info(`🔍 Searching for ${allCelebrities.length} celebrities from total ${celebrities.length}`);
      
      let serperArticles: SerperArticle[] = [];
      try {
        serperArticles = await serperService.searchMultipleCelebrities(allCelebrities, {
          searchType: 'comprehensive',
          articlesPerCelebrity: 20, // Get 20 articles per celebrity for better volume
        });
        logger.info(`✅ Serper returned ${serperArticles.length} articles`);
      } catch (serperError) {
        logger.error(`❌ Serper search failed:`, serperError);
        errors.push(`Serper: ${serperError instanceof Error ? serperError.message : 'Unknown error'}`);
        serperArticles = []; // Continue with empty results
      }

      articlesProcessed = serperArticles.length;
      logger.info(`🔍 Processing ${serperArticles.length} Serper articles...`);

      // Process articles in batches
      const BATCH_SIZE = 50;
      for (let i = 0; i < serperArticles.length; i += BATCH_SIZE) {
        const batch = serperArticles.slice(i, i + BATCH_SIZE);
        const articlesToInsert: Partial<IArticle>[] = [];

        for (const serperArticle of batch) {
          try {
            // Check if article already exists
            const exists = await articleRepository.existsByUrl(serperArticle.url);
            if (exists) {
              duplicatesFound++;
              continue;
            }

            // Convert Serper article to our format
            const article: Partial<IArticle> = {
              url: serperArticle.url,
              title: serperArticle.title,
              description: serperArticle.description,
              publishedAt: new Date(serperArticle.publishedAt),
              source: serperArticle.source,
              urlToImage: serperArticle.urlToImage,
              author: serperArticle.author,
              content: serperArticle.content || undefined, // Convert null to undefined
              celebrity: serperArticle.celebrity,
              sentiment: 'neutral',
              isActive: true,
            };

            articlesToInsert.push(article);

          } catch (error) {
            logger.error(`Error processing Serper article: ${error instanceof Error ? error.message : 'Unknown error'}`);
            errors.push(error instanceof Error ? error.message : 'Unknown error');
          }
        }

        // Insert batch
        if (articlesToInsert.length > 0) {
          await Article.insertMany(articlesToInsert);
          newArticlesAdded += articlesToInsert.length;
          logger.info(`✅ Inserted ${articlesToInsert.length} Serper articles (batch ${Math.floor(i / BATCH_SIZE) + 1})`);
        }
      }

      return {
        articlesProcessed,
        newArticlesAdded,
        duplicatesFound,
        errors,
        success: true,
      };

    } catch (error) {
      logger.error(`❌ Serper fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      return {
        articlesProcessed,
        newArticlesAdded,
        duplicatesFound,
        errors,
        success: false,
      };
    }
  }

  /**
   * Fetch and store articles from RSS feeds
   */
  private async fetchAndStoreRSSArticles(celebrities: string[]): Promise<{
    articlesProcessed: number;
    newArticlesAdded: number;
    duplicatesFound: number;
    errors: string[];
    success: boolean;
  }> {
    const errors: string[] = [];
    let articlesProcessed = 0;
    let newArticlesAdded = 0;
    let duplicatesFound = 0;

    try {
      // Fetch all RSS articles
      const rssArticles = await rssService.fetchAllArticles();
      articlesProcessed = rssArticles.length;

      logger.info(`📡 Processing ${rssArticles.length} RSS articles...`);

      // Process articles in batches to avoid overwhelming the database
      const BATCH_SIZE = 50;
      for (let i = 0; i < rssArticles.length; i += BATCH_SIZE) {
        const batch = rssArticles.slice(i, i + BATCH_SIZE);

        const articlesToInsert: Partial<IArticle>[] = [];

        for (const rssArticle of batch) {
          try {
            // Check if article already exists
            const exists = await articleRepository.existsByUrl(rssArticle.url);
            if (exists) {
              duplicatesFound++;
              continue;
            }

            // Find which celebrity this article is about
            const celebrity = celebrities.find(c => 
              isArticleAboutCelebrity({
                ...rssArticle,
                content: rssArticle.content || undefined // Convert null to undefined for compatibility
              }, c)
            ) || 'unknown';

            // Temporarily disable aggressive trash filtering to isolate Serper issue
            // const articleIsTrash = await isAggressiveTrash(tempArticle);
            // if (articleIsTrash) {
            //   logger.debug(`🗑️ Filtering trash RSS article: ${rssArticle.title.substring(0, 50)}...`);
            //   continue;
            // }

            articlesToInsert.push({
              url: rssArticle.url,
              title: rssArticle.title,
              description: rssArticle.description,
              publishedAt: rssArticle.publishedAt,
              source: rssArticle.source,
              urlToImage: rssArticle.urlToImage,
              author: rssArticle.author,
              content: rssArticle.content || undefined,
              celebrity: celebrity,
              sentiment: 'neutral',
              isActive: true,
            });
          } catch (error) {
            logger.error(`Error processing RSS article: ${error instanceof Error ? error.message : 'Unknown error'}`);
            errors.push(error instanceof Error ? error.message : 'Unknown error');
          }
        }

        // Insert batch
        if (articlesToInsert.length > 0) {
          await Article.insertMany(articlesToInsert);
          newArticlesAdded += articlesToInsert.length;
          logger.info(`✅ Inserted ${articlesToInsert.length} RSS articles (batch ${Math.floor(i / BATCH_SIZE) + 1})`);
        }
      }

      return {
        articlesProcessed,
        newArticlesAdded,
        duplicatesFound,
        errors,
        success: true,
      };
    } catch (error) {
      logger.error(`❌ RSS fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      return {
        articlesProcessed,
        newArticlesAdded,
        duplicatesFound,
        errors,
        success: false,
      };
    }
  }
}

export const multiSourceNewsFetcher = MultiSourceNewsFetcher.getInstance();
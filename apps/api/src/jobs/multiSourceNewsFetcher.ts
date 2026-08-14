import { serperService } from '../services/serper/serperService';
import { celebrityService } from '../services/celebrityService';
import { Article } from "../database/models/Article";
import { IArticle } from '../database/models/Article';
import { enhancedCacheService } from '../services/cacheService';
import { SerperArticle } from '../services/serper/serperTypes';
import { extractBestImageUrls } from '../services/imageExtractService';
import logger from '../utils/logger';

const HIGH_RES_EXTRACT_CONCURRENCY = 3;

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
   * Fetch and store news from Serper (1 request per celebrity)
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
      },
      errors: [],
      duration: 0,
    };

    try {
      logger.info('🚀 Starting news fetch (Serper only)...');

      // Get celebrities list
      const celebrities = await celebrityService.getCelebrities();
      if (celebrities.length === 0) {
        throw new Error('No celebrities found to fetch news for');
      }

      // Fetch from Serper (Google News API) - 1 request per celebrity
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

      result.articlesProcessed = totalArticlesProcessed;
      result.newArticlesAdded = totalNewArticlesAdded;
      result.duplicatesFound = totalDuplicatesFound;
      result.errors = errors;
      result.success = errors.length === 0;
      result.duration = Date.now() - startTime;

      // Invalidate cache to ensure fresh data
      await enhancedCacheService.invalidateNewsCache();
      logger.info('News cache invalidated');

      logger.info('🎉 News fetch completed:', {
        totalProcessed: totalArticlesProcessed,
        totalNew: totalNewArticlesAdded,
        totalDuplicates: totalDuplicatesFound,
        serperNew: result.sources.serper.newArticles,
        duration: `${result.duration}ms`,
        success: result.success,
      });

      return result;

    } catch (error) {
      logger.error('💥 News fetch failed:', error);
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
      // 🚨 SEARCH ALL CELEBRITIES - INDIVIDUAL SEARCHES FOR 100% COVERAGE!
      const allCelebrities = celebrities; // Search ALL 112+ celebrities
      logger.info(`🔍 VERIFICATION: About to search ${allCelebrities.length} celebrities individually`);
      logger.info(`🔍 VERIFICATION: First 10 celebrities: ${allCelebrities.slice(0, 10).join(', ')}`);
      logger.info(`🔍 VERIFICATION: Last 10 celebrities: ${allCelebrities.slice(-10).join(', ')}`);
      
      let serperArticles: SerperArticle[] = [];
      try {
        logger.info(`🚀 CALLING searchMultipleCelebrities with ${allCelebrities.length} celebrities (1 request per name, up to 100 articles each)`);
        serperArticles = await serperService.searchMultipleCelebrities(allCelebrities, {
          searchType: 'comprehensive',
          articlesPerCelebrity: 100,
          useIndividualSearches: true, // 1 request per celebrity (112 requests), all articles per name (up to 100)
        });
        // Normalize result (service returns array; batch mode can attach rawWhenEmpty)
        serperArticles = Array.isArray(serperArticles) ? serperArticles : (serperArticles as unknown as SerperArticle[]);
        logger.info(`✅ Serper returned ${serperArticles.length} articles`);
        
        // Coverage stats
        const celebritiesWithArticles = new Set(serperArticles.map(a => a.celebrity).filter(c => c && c !== 'unknown'));
        logger.info(`📊 Celebrity coverage: ${celebritiesWithArticles.size}/${allCelebrities.length} celebrities`);
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
            const article: Partial<IArticle> = {
              url: serperArticle.url,
              title: serperArticle.title,
              description: serperArticle.description,
              publishedAt: new Date(serperArticle.publishedAt),
              source: serperArticle.source,
              urlToImage: serperArticle.imageUrl || '',
              author: serperArticle.author,
              content: serperArticle.content || undefined,
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

        // Extract high-res image URLs for this batch (once per article for good first-paint quality)
        try {
          const urls = articlesToInsert.map(a => a.url).filter((u): u is string => !!u);
          const highResMap = await extractBestImageUrls(urls, HIGH_RES_EXTRACT_CONCURRENCY);
          let extracted = 0;
          for (const article of articlesToInsert) {
            if (article.url) {
              const highRes = highResMap.get(article.url);
              if (highRes) {
                article.highResImageUrl = highRes;
                extracted++;
              }
            }
          }
          if (extracted > 0) {
            logger.info(`🖼️ Extracted high-res image for ${extracted}/${articlesToInsert.length} articles in batch`);
          }
        } catch (extractErr) {
          logger.warn('High-res extract batch failed (continuing with thumbnails):', extractErr instanceof Error ? extractErr.message : extractErr);
        }

        // Insert batch with duplicate handling
        if (articlesToInsert.length > 0) {
          try {
            // Use ordered: false to continue inserting even if some duplicates fail
            await Article.insertMany(articlesToInsert, { ordered: false });
            newArticlesAdded += articlesToInsert.length;
            logger.info(`✅ Inserted ${articlesToInsert.length} Serper articles (batch ${Math.floor(i / BATCH_SIZE) + 1})`);
          } catch (error: unknown) {
            // Handle duplicate key errors (MongoDB duplicate key)
            const err = error as { code?: number; writeErrors?: unknown[] };
            if (err?.code === 11000 && err?.writeErrors) {
              const inserted = articlesToInsert.length - err.writeErrors.length;
              newArticlesAdded += inserted;
              duplicatesFound += err.writeErrors.length;
              logger.info(`✅ Inserted ${inserted} Serper articles, ${err.writeErrors.length} duplicates skipped (batch ${Math.floor(i / BATCH_SIZE) + 1})`);
            } else {
              logger.error(`Error inserting Serper batch:`, error);
              errors.push(error instanceof Error ? error.message : 'Unknown error');
            }
          }
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

}

export const multiSourceNewsFetcher = MultiSourceNewsFetcher.getInstance();
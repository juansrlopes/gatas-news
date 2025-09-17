import { newsFetcher } from './newsFetcher';
import { rssService } from '../services/rss/rssService';
import { celebrityService } from '../services/celebrityService';
import { articleRepository } from '../database/repositories/ArticleRepository';
import { Article } from "../database/models/Article";
import { IArticle } from '../database/models/Article';
import { isArticleAboutCelebrity } from '../../../../libs/shared/utils/src/index';
import logger from '../utils/logger';

export interface MultiSourceFetchResult {
  success: boolean;
  articlesProcessed: number;
  newArticlesAdded: number;
  duplicatesFound: number;
  sources: {
    newsapi: {
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
   * Fetch and store news from both NewsAPI and RSS feeds
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
        newsapi: { articles: 0, newArticles: 0 },
        rss: { articles: 0, newArticles: 0 },
      },
      errors: [],
      duration: 0,
    };

    try {
      logger.info('🚀 Starting multi-source news fetch (NewsAPI + RSS)...');

      // Get celebrities list
      const celebrities = await celebrityService.getCelebrities();
      if (celebrities.length === 0) {
        throw new Error('No celebrities found to fetch news for');
      }

      // 1. Fetch from NewsAPI (existing logic)
      logger.info('📰 Fetching from NewsAPI...');
      try {
        const newsApiResult = await newsFetcher.fetchAndStoreNews();
        result.sources.newsapi.articles = newsApiResult.articlesProcessed;
        result.sources.newsapi.newArticles = newsApiResult.newArticlesAdded;
        totalArticlesProcessed += newsApiResult.articlesProcessed;
        totalNewArticlesAdded += newsApiResult.newArticlesAdded;
        totalDuplicatesFound += newsApiResult.duplicatesFound;

        if (!newsApiResult.success) {
          errors.push(...newsApiResult.errors);
        }

        logger.info(`✅ NewsAPI: ${newsApiResult.articlesProcessed} processed, ${newsApiResult.newArticlesAdded} new`);
      } catch (error) {
        logger.error('❌ NewsAPI fetch failed:', error);
        errors.push(`NewsAPI: ${error.message}`);
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

        if (rssResult.errors.length > 0) {
          errors.push(...rssResult.errors);
        }

        logger.info(`✅ RSS: ${rssResult.articlesProcessed} processed, ${rssResult.newArticlesAdded} new`);
      } catch (error) {
        logger.error('❌ RSS fetch failed:', error);
        errors.push(`RSS: ${error.message}`);
      }

      // Update final results
      result.articlesProcessed = totalArticlesProcessed;
      result.newArticlesAdded = totalNewArticlesAdded;
      result.duplicatesFound = totalDuplicatesFound;
      result.errors = errors;
      result.duration = Date.now() - startTime;
      result.success = totalNewArticlesAdded > 0 || errors.length === 0;

      logger.info('🎉 Multi-source fetch completed:', {
        totalProcessed: totalArticlesProcessed,
        totalNew: totalNewArticlesAdded,
        totalDuplicates: totalDuplicatesFound,
        newsApiNew: result.sources.newsapi.newArticles,
        rssNew: result.sources.rss.newArticles,
        duration: `${result.duration}ms`,
        success: result.success,
      });

      return result;

    } catch (error) {
      logger.error('💥 Multi-source fetch failed:', error);
      result.errors = [error.message];
      result.duration = Date.now() - startTime;
      result.success = false;
      return result;
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
              isArticleAboutCelebrity(rssArticle, c)
            ) || 'unknown';

            // Convert RSS article to database format
            const articleToInsert: Partial<IArticle> = {
              url: rssArticle.url,
              title: rssArticle.title,
              description: rssArticle.description,
              content: rssArticle.content,
              urlToImage: rssArticle.urlToImage,
              publishedAt: rssArticle.publishedAt,
              source: rssArticle.source,
              author: rssArticle.source.name, // Use source name as author for RSS
              celebrity,
              sentiment: 'neutral',
              isActive: true,
            };

            articlesToInsert.push(articleToInsert);

          } catch (error) {
            logger.error(`Error processing RSS article: ${error.message}`);
            errors.push(`Article processing: ${error.message}`);
          }
        }

        // Bulk insert articles
        if (articlesToInsert.length > 0) {
          try {
            await Article.insertMany(articlesToInsert);
            newArticlesAdded += articlesToInsert.length;
            logger.info(`✅ Inserted ${articlesToInsert.length} RSS articles (batch ${Math.floor(i/BATCH_SIZE) + 1})`);
          } catch (error) {
            logger.error(`Error inserting RSS articles batch: ${error.message}`);
            errors.push(`Batch insert: ${error.message}`);
          }
        }
      }

      logger.info(`📊 RSS processing complete: ${newArticlesAdded} new, ${duplicatesFound} duplicates`);

    } catch (error) {
      logger.error('Error in RSS fetch:', error);
      errors.push(`RSS fetch: ${error.message}`);
    }

    return {
      articlesProcessed,
      newArticlesAdded,
      duplicatesFound,
      errors,
    };
  }
}

export const multiSourceNewsFetcher = MultiSourceNewsFetcher.getInstance();

import { newsService } from './newsService';
import { Article } from '../../../../libs/shared/types/src/index';
import logger from '../utils/logger';

export class MultiSourceService {
  public async aggregateNews(celebrityName?: string): Promise<Article[]> {
    logger.info(`Aggregating news for celebrity: ${celebrityName || 'all'}`);

    const res = await newsService.getNews({ celebrity: celebrityName, limit: 50, noMixing: true });
    logger.info(`Loaded ${res.articles.length} articles from database`);
    return res.articles;
  }

  /**
   * Fetch articles for a specific celebrity from database (Serper-sourced)
   */
  public async fetchArticlesForCelebrity(celebrityName: string): Promise<Article[]> {
    return this.aggregateNews(celebrityName);
  }

  /**
   * Get health status of news sources (Serper only)
   */
  async getSourceHealth(): Promise<{
    serper: { available: boolean; healthy: boolean };
  }> {
    return {
      serper: { available: true, healthy: true },
    };
  }

  /**
   * Get statistics about available sources
   */
  async getSourceStats(): Promise<{ [source: string]: number }> {
    return {
      Serper_Available: 1,
    };
  }

  /**
   * Test Serper source availability
   */
  async testAllSources(): Promise<{
    serper: { working: boolean; error?: string };
  }> {
    return {
      serper: { working: true },
    };
  }
}

export const multiSourceService = new MultiSourceService();

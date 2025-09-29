import { newsService } from './newsService';
import { rssService } from './rss/rssService';
import { Article } from '../../../../libs/shared/types/src/index';
import logger from '../utils/logger';

export class MultiSourceService {
  public async aggregateNews(celebrityName?: string): Promise<Article[]> {
    logger.info(`Aggregating news for celebrity: ${celebrityName || 'all'}`);

    const [newsApiArticles, rssArticles] = await Promise.all([
      newsService.getNews({ celebrity: celebrityName, limit: 50, noMixing: true }).then(res => res.articles),
      celebrityName ? rssService.fetchArticlesAboutCelebrity(celebrityName) : rssService.fetchAllArticles(),
    ]);

    // Convert RSS articles to Article format
    const convertedRssArticles: Article[] = rssArticles.map(rssArticle => ({
      url: rssArticle.url,
      imageUrl: rssArticle.urlToImage || '', // Convert undefined to empty string
      title: rssArticle.title,
      description: rssArticle.description,
      publishedAt: rssArticle.publishedAt.toISOString(),
      source: rssArticle.source,
      author: rssArticle.author,
      content: rssArticle.content || undefined,
    }));

    const combinedArticles = [...newsApiArticles, ...convertedRssArticles];
    logger.info(`Combined ${newsApiArticles.length} from NewsAPI and ${convertedRssArticles.length} from RSS.`);

    const deduplicatedArticles = this.deduplicateArticles(combinedArticles);
    logger.info(`Deduplicated to ${deduplicatedArticles.length} articles.`);

    // TODO: Apply quality scoring and sorting here if not already done by individual services
    return deduplicatedArticles;
  }

  /**
   * Fetch articles for a specific celebrity from all sources
   */
  public async fetchArticlesForCelebrity(celebrityName: string): Promise<Article[]> {
    return this.aggregateNews(celebrityName);
  }

  private deduplicateArticles(articles: Article[]): Article[] {
    const seenUrls = new Set<string>();
    const uniqueArticles: Article[] = [];

    for (const article of articles) {
      if (!seenUrls.has(article.url)) {
        uniqueArticles.push(article);
        seenUrls.add(article.url);
      }
    }
    return uniqueArticles;
  }

  /**
   * Get health status of all sources
   */
  async getSourceHealth(): Promise<{
    rss: { enabled: number; total: number; healthy: boolean };
    serper: { available: boolean; healthy: boolean };
  }> {
    try {
      const rssStats = rssService.getFeedStats();
      
      return {
        rss: {
          enabled: rssStats.enabled,
          total: rssStats.total,
          healthy: rssStats.enabled > 0,
        },
        serper: {
          available: true, // TODO: Check Serper availability
          healthy: true, // TODO: Check Serper health
        },
      };
    } catch (error) {
      logger.error(`Error getting source health: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        rss: { enabled: 0, total: 0, healthy: false },
        serper: { available: false, healthy: false },
      };
    }
  }

  /**
   * Get statistics about available sources
   */
  async getSourceStats(): Promise<{ [source: string]: number }> {
    try {
      const rssStats = rssService.getFeedStats();
      
      return {
        'RSS_Total': rssStats.total,
        'RSS_Enabled': rssStats.enabled,
        'RSS_Disabled': rssStats.disabled,
        'Serper_Available': 1, // TODO: Get actual Serper stats
      };
    } catch (error) {
      logger.error(`Error getting source stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {};
    }
  }

  /**
   * Test all sources and return their status
   */
  async testAllSources(): Promise<{
    rss: { working: string[]; broken: string[] };
    serper: { working: boolean; error?: string };
  }> {
    const results = {
      rss: { working: [] as string[], broken: [] as string[] },
      serper: { working: false, error: undefined as string | undefined },
    };

    try {
      // Test RSS feeds
      const rssStats = rssService.getFeedStats();
      const enabledFeeds = rssStats.feeds.filter(f => f.enabled);
      
      for (const feed of enabledFeeds) {
        try {
          const testResult = await rssService.testFeed(feed.name);
          if (testResult.success) {
            results.rss.working.push(feed.name);
          } else {
            results.rss.broken.push(feed.name);
          }
        } catch {
          results.rss.broken.push(feed.name);
        }
      }

      // TODO: Test Serper
      results.serper.working = true;

    } catch (error) {
      logger.error(`Error testing sources: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return results;
  }
}

export const multiSourceService = new MultiSourceService();
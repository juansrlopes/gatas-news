import { rssService, RSSArticle } from './rss/rssService';
import { Article } from '../../../../libs/shared/types/src/index';
import logger from '../utils/logger';

export interface MultiSourceResult {
  articles: Article[];
  sources: {
    newsapi: number;
    rss: number;
    total: number;
  };
  duplicatesRemoved: number;
}

export class MultiSourceService {
  private static instance: MultiSourceService;

  private constructor() {}

  public static getInstance(): MultiSourceService {
    if (!MultiSourceService.instance) {
      MultiSourceService.instance = new MultiSourceService();
    }
    return MultiSourceService.instance;
  }

  /**
   * Fetch articles from multiple sources for a specific celebrity
   */
  async fetchArticlesForCelebrity(celebrityName: string): Promise<MultiSourceResult> {
    logger.info(`🔍 Multi-source search for: "${celebrityName}"`);

    const results = await Promise.allSettled([
      this.fetchFromNewsAPI(celebrityName),
      this.fetchFromRSS(celebrityName),
    ]);

    // Extract successful results
    const newsApiArticles = results[0].status === 'fulfilled' ? results[0].value : [];
    const rssArticles = results[1].status === 'fulfilled' ? results[1].value : [];

    // Log any errors
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const source = index === 0 ? 'NewsAPI' : 'RSS';
        logger.error(`${source} fetch failed: ${result.reason}`);
      }
    });

    // Convert RSS articles to Article format
    const convertedRssArticles = rssArticles.map(this.convertRSSToArticle);

    // Combine all articles
    const allArticles = [...newsApiArticles, ...convertedRssArticles];

    // Remove duplicates
    const { articles: deduplicatedArticles, duplicatesRemoved } = this.removeDuplicates(allArticles);

    // Sort by publication date (newest first)
    const sortedArticles = deduplicatedArticles.sort((a, b) => 
      new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
    );

    const result: MultiSourceResult = {
      articles: sortedArticles,
      sources: {
        newsapi: newsApiArticles.length,
        rss: rssArticles.length,
        total: sortedArticles.length,
      },
      duplicatesRemoved,
    };

    logger.info(`📊 Multi-source results for "${celebrityName}":`, {
      newsapi: result.sources.newsapi,
      rss: result.sources.rss,
      total: result.sources.total,
      duplicatesRemoved: result.duplicatesRemoved,
    });

    return result;
  }

  /**
   * Fetch articles from RSS feeds for a specific celebrity
   */
  private async fetchFromRSS(celebrityName: string): Promise<RSSArticle[]> {
    try {
      logger.info(`📡 Fetching from RSS feeds for: ${celebrityName}`);
      return await rssService.fetchArticlesAboutCelebrity(celebrityName);
    } catch (error) {
      logger.error(`RSS fetch error: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch articles from NewsAPI for a specific celebrity
   */
  private async fetchFromNewsAPI(celebrityName: string): Promise<Article[]> {
    try {
      logger.info(`📰 Fetching from NewsAPI for: ${celebrityName}`);
      // For now, return empty array - we'll integrate with existing NewsAPI logic later
      return [];
    } catch (error) {
      logger.error(`NewsAPI fetch error: ${error.message}`);
      return [];
    }
  }

  /**
   * Convert RSS article to Article format
   */
  private convertRSSToArticle(rssArticle: RSSArticle): Article {
    return {
      source: rssArticle.source,
      author: rssArticle.source.name,
      title: rssArticle.title,
      description: rssArticle.description,
      url: rssArticle.url,
      urlToImage: rssArticle.urlToImage || '',
      publishedAt: rssArticle.publishedAt.toISOString(),
      content: rssArticle.content || undefined,
    };
  }

  /**
   * Remove duplicate articles based on URL and title similarity
   */
  private removeDuplicates(articles: Article[]): { articles: Article[]; duplicatesRemoved: number } {
    const seen = new Set<string>();
    const uniqueArticles: Article[] = [];
    let duplicatesRemoved = 0;

    for (const article of articles) {
      // Create a unique key based on URL and normalized title
      const normalizedTitle = article.title?.toLowerCase().replace(/[^\w\s]/g, '').trim() || '';
      const key = `${article.url}|${normalizedTitle}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueArticles.push(article);
      } else {
        duplicatesRemoved++;
      }
    }

    return { articles: uniqueArticles, duplicatesRemoved };
  }

  /**
   * Get statistics about available sources
   */
  async getSourceStats(): Promise<{ [source: string]: number }> {
    try {
      const rssStats = await rssService.getFeedStats();
      
      return {
        'NewsAPI': 0, // TODO: Get actual NewsAPI stats
        ...rssStats,
      };
    } catch (error) {
      logger.error(`Error getting source stats: ${error.message}`);
      return {};
    }
  }
}

export const multiSourceService = MultiSourceService.getInstance();

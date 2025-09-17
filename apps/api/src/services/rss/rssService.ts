import Parser from 'rss-parser';
import { isArticleAboutCelebrity } from '../../../../../libs/shared/utils/src/index';
import logger from '../../utils/logger';
import axios from 'axios';

export interface RSSFeed {
  name: string;
  url: string;
  category: string;
  enabled: boolean;
}

export interface RSSArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: Date;
  source: {
    id: string | null;
    name: string;
  };
  content?: string;
  urlToImage?: string;
}

export class RSSService {
  private parser: Parser;
  private feeds: RSSFeed[] = [
    // CONFIRMED WORKING FEEDS
    {
      name: 'Terra Diversão',
      url: 'https://www.terra.com.br/diversao/rss.xml',
      category: 'entertainment',
      enabled: true,
    },
    {
      name: 'Metropoles',
      url: 'https://www.metropoles.com/feed',
      category: 'celebrities',
      enabled: true,
    },
    
    // ADDITIONAL WORKING FEEDS TO TEST
    {
      name: 'R7 Entretenimento',
      url: 'https://noticias.r7.com/entretenimento/feed.xml',
      category: 'entertainment',
      enabled: true,
    },
    {
      name: 'Folha Celebridades',
      url: 'https://feeds.folha.uol.com.br/celebridades/rss091.xml',
      category: 'celebrities',
      enabled: true,
    },
    {
      name: 'Estadão Cultura',
      url: 'https://cultura.estadao.com.br/rss.xml',
      category: 'culture',
      enabled: true,
    },
    {
      name: 'O Globo Cultura',
      url: 'https://oglobo.globo.com/cultura/rss.xml',
      category: 'culture',
      enabled: true,
    },
    {
      name: 'Veja Entretenimento',
      url: 'https://veja.abril.com.br/entretenimento/feed/',
      category: 'entertainment',
      enabled: true,
    },
    {
      name: 'IstoÉ Gente',
      url: 'https://istoe.com.br/gente/feed/',
      category: 'celebrities',
      enabled: true,
    },
  ];

  constructor() {
    this.parser = new Parser({
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GatasNews/1.0; +https://gatas-news.vercel.app)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });
  }

  /**
   * Fetch articles from all enabled RSS feeds
   */
  async fetchAllArticles(): Promise<RSSArticle[]> {
    const enabledFeeds = this.feeds.filter(feed => feed.enabled);
    const allArticles: RSSArticle[] = [];

    logger.info(`Fetching from ${enabledFeeds.length} RSS feeds...`);

    // Process feeds in parallel for better performance
    const feedPromises = enabledFeeds.map(async (feed) => {
      try {
        const articles = await this.fetchFromFeed(feed);
        logger.info(`✅ ${feed.name}: ${articles.length} articles`);
        return articles;
      } catch (error: unknown) {
        logger.error(`❌ ${feed.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return [];
      }
    });

    const results = await Promise.all(feedPromises);
    results.forEach(articles => allArticles.push(...articles));

    logger.info(`📰 Total RSS articles fetched: ${allArticles.length}`);
    return allArticles;
  }

  /**
   * Fetch articles about a specific celebrity from all feeds
   */
  async fetchArticlesAboutCelebrity(celebrityName: string): Promise<RSSArticle[]> {
    const allArticles = await this.fetchAllArticles();
    
    const relevantArticles = allArticles.filter(article => 
      isArticleAboutCelebrity(article, celebrityName)
    );

    logger.info(`🎯 Found ${relevantArticles.length} RSS articles about "${celebrityName}"`);
    return relevantArticles;
  }

  /**
   * Fetch articles from a single RSS feed
   */
  private async fetchFromFeed(feed: RSSFeed): Promise<RSSArticle[]> {
    try {
      const parsedFeed = await this.parser.parseURL(feed.url);
      const articles: RSSArticle[] = [];

      for (const item of parsedFeed.items || []) {
        if (!item.title || !item.link) continue;

        // Try to get image from RSS first, then scrape from article page
        let imageUrl = this.extractImageUrl(item);
        
        // If no image in RSS, try to scrape from article page
        if (!imageUrl && item.link) {
          imageUrl = await this.scrapeImageFromArticle(item.link);
        }

        const article: RSSArticle = {
          title: this.cleanText(item.title),
          description: this.cleanText(item.contentSnippet || item.content || item.description || ''),
          url: item.link,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          source: {
            id: null,
            name: feed.name,
          },
          content: this.cleanText(item.content || ''),
          urlToImage: imageUrl,
        };

        // Only include articles from the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        if (article.publishedAt >= thirtyDaysAgo) {
          articles.push(article);
        }
      }

      return articles;
    } catch (error: unknown) {
      throw new Error(`Failed to fetch from ${feed.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean HTML tags and extra whitespace from text
   */
  private cleanText(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[^;]+;/g, ' ') // Remove HTML entities
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Extract image URL from RSS item
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractImageUrl(item: Record<string, any>): string | undefined {
    // Try different possible image fields
    if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
      return item.enclosure.url;
    }
    
    if (item['media:content']?.url) {
      return item['media:content'].url;
    }
    
    if (item.image?.url) {
      return item.image.url;
    }

    // Try to extract from content
    const content = item.content || item.description || '';
    const imgMatch = content.match(/<img[^>]+src="([^"]+)"/i);
    if (imgMatch) {
      return imgMatch[1];
    }

    return undefined;
  }

  /**
   * Scrape image from article page when RSS doesn't provide one
   */
  private async scrapeImageFromArticle(articleUrl: string): Promise<string | undefined> {
    try {
      const response = await axios.get(articleUrl, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GatasNews/1.0; +https://gatas-news.vercel.app)',
        },
      });

      const html = response.data;
      
      // Try different meta tags for images
      const metaImagePatterns = [
        /<meta\s+property="og:image"\s+content="([^"]+)"/i,
        /<meta\s+name="twitter:image"\s+content="([^"]+)"/i,
        /<meta\s+property="og:image:url"\s+content="([^"]+)"/i,
        /<img[^>]+src="([^"]+)"[^>]*class="[^"]*featured[^"]*"/i,
        /<img[^>]+class="[^"]*featured[^"]*"[^>]+src="([^"]+)"/i,
        /<img[^>]+src="([^"]+)"[^>]*>/i, // Fallback to first image
      ];

      for (const pattern of metaImagePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          let imageUrl = match[1];
          
          // Convert relative URLs to absolute
          if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
          } else if (imageUrl.startsWith('/')) {
            const urlObj = new URL(articleUrl);
            imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
          }
          
          // Validate image URL
          if (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg') || 
              imageUrl.includes('.png') || imageUrl.includes('.webp')) {
            logger.debug(`🖼️ Scraped image from ${articleUrl}: ${imageUrl.substring(0, 50)}...`);
            return imageUrl;
          }
        }
      }

      logger.debug(`🚫 No image found for ${articleUrl}`);
      return undefined;

    } catch (error) {
      logger.debug(`❌ Failed to scrape image from ${articleUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return undefined;
    }
  }

  /**
   * Get feed statistics
   */
  async getFeedStats(): Promise<{ [feedName: string]: number }> {
    const stats: { [feedName: string]: number } = {};
    
    // Process feeds in parallel
    const feedPromises = this.feeds
      .filter(f => f.enabled)
      .map(async (feed) => {
        try {
          const articles = await this.fetchFromFeed(feed);
          return { name: feed.name, count: articles.length };
        } catch {
          return { name: feed.name, count: 0 };
        }
      });

    const results = await Promise.all(feedPromises);
    results.forEach(result => {
      stats[result.name] = result.count;
    });
    
    return stats;
  }
}

export const rssService = new RSSService();

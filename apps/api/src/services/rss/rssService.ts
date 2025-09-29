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
  source: { id: null; name: string };
  content: string | null;
  author?: string;
  urlToImage?: string;
}

export class RSSService {
  private parser: Parser;
  private feeds: RSSFeed[] = [
    // ✅ CONFIRMED WORKING FEEDS
    {
      name: 'Terra Diversão',
      url: 'https://www.terra.com.br/diversao/rss.xml',
      category: 'entertainment',
      enabled: true,
    },
    {
      name: 'IstoÉ Gente',
      url: 'https://istoe.com.br/feed/', // Fixed URL - removed /gente/
      category: 'celebrities',
      enabled: true,
    },
    
    // 🔄 WORKING ALTERNATIVE FEEDS
    {
      name: 'UOL Entretenimento',
      url: 'https://rss.uol.com.br/feed/entretenimento.xml',
      category: 'entertainment',
      enabled: true,
    },
    {
      name: 'UOL Celebridades',
      url: 'https://rss.uol.com.br/feed/celebridades.xml',
      category: 'celebrities',
      enabled: true,
    },
    {
      name: 'G1 Pop & Arte',
      url: 'https://g1.globo.com/pop-arte/feed/rss2.xml',
      category: 'entertainment',
      enabled: true,
    },
    {
      name: 'G1 Música',
      url: 'https://g1.globo.com/musica/feed/rss2.xml',
      category: 'music',
      enabled: true,
    },
    {
      name: 'Extra Globo',
      url: 'https://extra.globo.com/feed/rss2.xml',
      category: 'entertainment',
      enabled: true,
    },
    {
      name: 'Caras Brasil',
      url: 'https://caras.uol.com.br/rss.xml',
      category: 'celebrities',
      enabled: true,
    },
    {
      name: 'Quem Acontece',
      url: 'https://revistaquem.globo.com/rss.xml',
      category: 'celebrities',
      enabled: true,
    },
    {
      name: 'Contigo UOL',
      url: 'https://contigo.uol.com.br/rss.xml',
      category: 'celebrities',
      enabled: true,
    },
    
    // ❌ DISABLED BROKEN FEEDS (will re-enable after fixing)
    {
      name: 'Metropoles (BROKEN)',
      url: 'https://www.metropoles.com/feed',
      category: 'celebrities',
      enabled: false, // XML parsing error
    },
    {
      name: 'R7 Entretenimento (TESTING)',
      url: 'https://noticias.r7.com/entretenimento/feed.xml',
      category: 'entertainment',
      enabled: false, // Need to test
    },
    {
      name: 'Folha Celebridades (EMPTY)',
      url: 'https://feeds.folha.uol.com.br/celebridades/rss091.xml',
      category: 'celebrities',
      enabled: false, // Returns 0 articles
    },
    {
      name: 'Estadão Cultura (404)',
      url: 'https://cultura.estadao.com.br/rss.xml',
      category: 'culture',
      enabled: false, // 404 error
    },
    {
      name: 'O Globo Cultura (504)',
      url: 'https://oglobo.globo.com/cultura/rss.xml',
      category: 'culture',
      enabled: false, // 504 error
    },
    {
      name: 'Veja Entretenimento (TESTING)',
      url: 'https://veja.abril.com.br/entretenimento/feed/',
      category: 'entertainment',
      enabled: false, // Need to test
    },
  ];

  constructor() {
    this.parser = new Parser({
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GatasNews/1.0; +https://gatas-news.vercel.app)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      customFields: {
        item: ['media:content', 'media:thumbnail', 'enclosure'],
      },
    });
  }

  /**
   * Fetch articles from all enabled RSS feeds
   */
  async fetchAllArticles(): Promise<RSSArticle[]> {
    const enabledFeeds = this.feeds.filter(feed => feed.enabled);
    const allArticles: RSSArticle[] = [];

    logger.info(`🔄 Fetching from ${enabledFeeds.length} RSS feeds...`);

    // Process feeds in parallel for better performance
    const feedPromises = enabledFeeds.map(async (feed) => {
      try {
        const articles = await this.fetchFromFeed(feed);
        logger.info(`✅ ${feed.name}: ${articles.length} articles`);
        return articles;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`❌ ${feed.name}: ${errorMessage}`);
        
        // Log more details for debugging
        if (error instanceof Error && error.message.includes('Non-whitespace before first tag')) {
          logger.error(`   🔍 XML parsing error for ${feed.url} - likely malformed XML`);
        } else if (error instanceof Error && error.message.includes('404')) {
          logger.error(`   🔍 404 error for ${feed.url} - URL may have changed`);
        } else if (error instanceof Error && error.message.includes('504')) {
          logger.error(`   🔍 504 error for ${feed.url} - server timeout`);
        }
        
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
    return allArticles.filter(article => 
      isArticleAboutCelebrity({
        ...article,
        content: article.content || undefined // Convert null to undefined for compatibility
      }, celebrityName)
    );
  }

  /**
   * Fetch articles from a single RSS feed with improved error handling
   */
  private async fetchFromFeed(feed: RSSFeed): Promise<RSSArticle[]> {
    try {
      // Add retry logic for temporary failures
      let lastError: Error | null = null;
      const maxRetries = 2;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
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

            // Ensure description is never empty (required by Article model)
            const description = this.cleanText(item.contentSnippet || item.content || item.description || item.title || 'No description available');
            
            const article: RSSArticle = {
              title: this.cleanText(item.title),
              description: description,
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
          
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          
          if (attempt < maxRetries) {
            logger.debug(`   🔄 Retry ${attempt}/${maxRetries} for ${feed.name} after error: ${lastError.message}`);
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      // If all retries failed, throw the last error
      throw lastError || new Error('All retry attempts failed');
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch from ${feed.name}: ${errorMessage}`);
    }
  }

  /**
   * Extract image URL from RSS item with improved handling
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractImageUrl(item: Record<string, any>): string | undefined {
    // Try different possible image fields
    if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
      return item.enclosure.url;
    }
    if (item['media:content'] && item['media:content'].$.url) {
      return item['media:content'].$.url;
    }
    if (item['media:thumbnail'] && item['media:thumbnail'].$.url) {
      return item['media:thumbnail'].$.url;
    }
    // Try to find an image within the content if available
    if (item.content) {
      const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/i);
      if (imgMatch && imgMatch[1]) {
        return imgMatch[1];
      }
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

    } catch {
      logger.debug(`❌ Failed to scrape image from ${articleUrl}`);
      return undefined;
    }
  }

  /**
   * Clean text content by removing HTML and extra whitespace
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
   * Get feed statistics for monitoring
   */
  public getFeedStats(): { total: number; enabled: number; disabled: number; feeds: Array<{ name: string; enabled: boolean; category: string }> } {
    const enabled = this.feeds.filter(f => f.enabled);
    const disabled = this.feeds.filter(f => !f.enabled);
    
    return {
      total: this.feeds.length,
      enabled: enabled.length,
      disabled: disabled.length,
      feeds: this.feeds.map(f => ({
        name: f.name,
        enabled: f.enabled,
        category: f.category,
      })),
    };
  }

  /**
   * Test a specific feed URL
   */
  public async testFeed(feedUrl: string): Promise<{ success: boolean; articleCount: number; error?: string }> {
    try {
      const testFeed: RSSFeed = {
        name: 'Test Feed',
        url: feedUrl,
        category: 'test',
        enabled: true,
      };
      
      const articles = await this.fetchFromFeed(testFeed);
      return {
        success: true,
        articleCount: articles.length,
      };
    } catch (error) {
      return {
        success: false,
        articleCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const rssService = new RSSService();
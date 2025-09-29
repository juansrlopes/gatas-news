/**
 * Simple Serper Test Controller (for debugging)
 */

import { Request, Response } from 'express';
import { serperService } from '../services/serper/serperService';
import logger from '../utils/logger';

export class SerperTestController {
  public static async simpleTest(req: Request, res: Response): Promise<void> {
    try {
      logger.info('🧪 Starting simple Serper test...');
      
      // Test with direct API call using simple parameters
      const testResponse = await serperService.validateApiKey('3030315f5dcc6be6ac1b9a7e9a60ed5bdedd22b2');
      if (!testResponse.isValid) {
        throw new Error('API key is invalid');
      }

      logger.info('✅ API key is valid, testing actual search...');

      // Test with a real celebrity search
      const searchResults = await serperService.searchCelebrity('Anitta', {
        searchType: 'comprehensive',
        limit: 5,
        dateRestrict: 'm1'
      });

      logger.info(`✅ Search completed: ${searchResults.length} articles found`);

      res.json({
        success: true,
        articlesFound: searchResults.length,
        articles: searchResults.map((a) => ({
          title: a.title,
          source: a.source.name,
          url: a.url,
          publishedAt: a.publishedAt,
          celebrity: a.celebrity,
        })),
        testQuery: 'Anitta Brasil',
      });

    } catch (error) {
      logger.error('❌ Serper test failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}

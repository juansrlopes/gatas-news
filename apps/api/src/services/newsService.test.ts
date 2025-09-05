import { NewsService } from './newsService';
import { CacheService } from '../utils/cache';

describe('NewsService', () => {
  let newsService: NewsService;
  let cacheService: CacheService;

  beforeEach(() => {
    newsService = NewsService.getInstance();
    cacheService = CacheService.getInstance();
    cacheService.flush();
  });

  describe('generateCacheKey', () => {
    it('should generate cache key for basic filters', () => {
      const filters = {
        page: 1,
        limit: 20,
        sortBy: 'publishedAt' as const,
      };

      const result = (newsService as any).generateCacheKey(filters);

      expect(result).toBe('news:page:1:limit:20:sort:publishedAt');
    });

    it('should generate cache key with search term', () => {
      const filters = {
        page: 1,
        limit: 20,
        sortBy: 'publishedAt' as const,
        searchTerm: 'music',
      };

      const result = (newsService as any).generateCacheKey(filters);

      expect(result).toBe('news:search:music:page:1:limit:20:sort:publishedAt');
    });

    it('should generate cache key with celebrity filter', () => {
      const filters = {
        page: 1,
        limit: 20,
        sortBy: 'publishedAt' as const,
        celebrity: 'Taylor Swift',
      };

      const result = (newsService as any).generateCacheKey(filters);

      expect(result).toBe('news:celebrity:Taylor Swift:page:1:limit:20:sort:publishedAt');
    });
  });
});

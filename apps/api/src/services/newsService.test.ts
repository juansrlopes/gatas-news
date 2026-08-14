import { buildNewsCacheKey } from './newsService';

describe('buildNewsCacheKey', () => {
  it('should generate cache key for basic filters', () => {
    const result = buildNewsCacheKey({
      page: 1,
      limit: 20,
      sortBy: 'publishedAt',
    });

    expect(result).toBe('news:page:1:limit:20:sort:publishedAt');
  });

  it('should generate cache key with search term', () => {
    const result = buildNewsCacheKey({
      page: 1,
      limit: 20,
      sortBy: 'publishedAt',
      searchTerm: 'music',
    });

    expect(result).toBe('news:search:music:page:1:limit:20:sort:publishedAt');
  });

  it('should generate cache key with celebrity filter', () => {
    const result = buildNewsCacheKey({
      page: 1,
      limit: 20,
      sortBy: 'publishedAt',
      celebrity: 'Taylor Swift',
    });

    expect(result).toBe('news:celebrity:Taylor Swift:page:1:limit:20:sort:publishedAt');
  });
});

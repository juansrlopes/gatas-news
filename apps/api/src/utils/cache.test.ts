import { CacheService } from './cache';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = CacheService.getInstance();
    // Clear cache before each test
    cacheService.flush();
  });

  it('should be a singleton', () => {
    const instance1 = CacheService.getInstance();
    const instance2 = CacheService.getInstance();

    expect(instance1).toBe(instance2);
  });

  it('should set and get values', () => {
    const key = 'test-key';
    const value = { data: 'test-value' };

    cacheService.set(key, value);
    const result = cacheService.get(key);

    expect(result).toEqual(value);
  });

  it('should return undefined for non-existent keys', () => {
    const result = cacheService.get('non-existent-key');

    expect(result).toBeUndefined();
  });
});

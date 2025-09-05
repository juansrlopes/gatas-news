import NodeCache from 'node-cache';
import { getEnvConfig } from '../../../../libs/shared/utils/src/index';

const config = getEnvConfig();

// Create cache instance with configurable TTL
const cache = new NodeCache({
  stdTTL: config.isDevelopment ? 60 : 300, // 1 min in dev, 5 min in prod
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false, // Better performance, but be careful with object mutations
});

export class CacheService {
  private static instance: CacheService;
  private cache: NodeCache;

  private constructor() {
    this.cache = cache;
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  public get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  public set<T>(key: string, value: T, ttl?: number): boolean {
    if (ttl !== undefined) {
      return this.cache.set(key, value, ttl);
    }
    return this.cache.set(key, value);
  }

  public del(key: string): number {
    return this.cache.del(key);
  }

  public flush(): void {
    this.cache.flushAll();
  }

  public getStats() {
    return this.cache.getStats();
  }

  // Generate cache key for news requests
  public generateNewsKey(celebrityName?: string, page: number = 1): string {
    const baseKey = celebrityName ? `news-${celebrityName}` : 'news-all';
    return `${baseKey}-page-${page}`;
  }

  // Generate cache key for celebrities list
  public generateCelebritiesKey(): string {
    return 'celebrities-list';
  }
}

export const cacheService = CacheService.getInstance();

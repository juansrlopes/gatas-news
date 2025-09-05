import Redis from 'ioredis';
import { redisConnection } from '../database/connections/redis';
import { cacheService as nodeCacheService } from '../utils/cache';
import logger from '../utils/logger';
import { IArticle } from '../database/models/Article';
import { NewsResponse } from '../../../../libs/shared/types/src/index';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  useRedis?: boolean; // Whether to use Redis or fallback to memory cache
}

export class EnhancedCacheService {
  private static instance: EnhancedCacheService;
  private redisClient: Redis | null = null;
  private isRedisAvailable = false;

  private constructor() {
    this.initializeRedis();
  }

  public static getInstance(): EnhancedCacheService {
    if (!EnhancedCacheService.instance) {
      EnhancedCacheService.instance = new EnhancedCacheService();
    }
    return EnhancedCacheService.instance;
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.redisClient = await redisConnection.connect();
      this.isRedisAvailable = true;
      logger.info('Enhanced cache service initialized with Redis');
    } catch (error) {
      logger.warn('Redis not available, falling back to memory cache:', error);
      this.isRedisAvailable = false;
    }
  }

  /**
   * Get value from cache (Redis first, then memory cache)
   */
  public async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first
      if (this.isRedisAvailable && this.redisClient) {
        const redisValue = await this.redisClient.get(key);
        if (redisValue) {
          logger.debug(`Cache hit (Redis): ${key}`);
          return JSON.parse(redisValue);
        }
      }

      // Fallback to memory cache
      const memoryValue = nodeCacheService.get<T>(key);
      if (memoryValue) {
        logger.debug(`Cache hit (Memory): ${key}`);
        return memoryValue;
      }

      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      logger.error('Error getting from cache:', error);
      return null;
    }
  }

  /**
   * Set value in cache (both Redis and memory)
   */
  public async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    try {
      const { ttl = 3600, useRedis = true } = options; // Default 1 hour TTL

      let success = false;

      // Set in Redis if available
      if (this.isRedisAvailable && this.redisClient && useRedis) {
        await this.redisClient.setex(key, ttl, JSON.stringify(value));
        success = true;
        logger.debug(`Cache set (Redis): ${key}, TTL: ${ttl}s`);
      }

      // Always set in memory cache as backup
      nodeCacheService.set(key, value, ttl);
      success = true;
      logger.debug(`Cache set (Memory): ${key}, TTL: ${ttl}s`);

      return success;
    } catch (error) {
      logger.error('Error setting cache:', error);
      return false;
    }
  }

  /**
   * Delete from cache
   */
  public async delete(key: string): Promise<boolean> {
    try {
      let success = false;

      // Delete from Redis
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.del(key);
        success = true;
      }

      // Delete from memory cache
      nodeCacheService.del(key);
      success = true;

      logger.debug(`Cache deleted: ${key}`);
      return success;
    } catch (error) {
      logger.error('Error deleting from cache:', error);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  public async flush(): Promise<boolean> {
    try {
      let success = false;

      // Flush Redis
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.flushdb();
        success = true;
      }

      // Flush memory cache
      nodeCacheService.flush();
      success = true;

      logger.info('Cache flushed successfully');
      return success;
    } catch (error) {
      logger.error('Error flushing cache:', error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  public async exists(key: string): Promise<boolean> {
    try {
      // Check Redis first
      if (this.isRedisAvailable && this.redisClient) {
        const exists = await this.redisClient.exists(key);
        if (exists) return true;
      }

      // Check memory cache
      const memoryValue = nodeCacheService.get(key);
      return memoryValue !== undefined;
    } catch (error) {
      logger.error('Error checking cache existence:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  public async getStats(): Promise<{
    redis: {
      available: boolean;
      connected: boolean;
      info?: Record<string, unknown>;
    };
    memory: Record<string, unknown>;
  }> {
    try {
      const stats = {
        redis: {
          available: this.isRedisAvailable,
          connected: redisConnection.getConnectionStatus(),
          info: undefined as Record<string, unknown> | undefined,
        },
        memory: nodeCacheService.getStats() as unknown as Record<string, unknown>,
      };

      // Get Redis info if available
      if (this.isRedisAvailable && this.redisClient) {
        try {
          const info = await this.redisClient.info('memory');
          stats.redis.info = this.parseRedisInfo(info);
        } catch (error) {
          logger.debug('Could not get Redis info:', error);
        }
      }

      return stats;
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return {
        redis: { available: false, connected: false },
        memory: nodeCacheService.getStats() as unknown as Record<string, unknown>,
      };
    }
  }

  // Specialized cache methods for news data

  /**
   * Cache news response
   */
  public async cacheNewsResponse(
    key: string,
    response: NewsResponse,
    ttl: number = 3600
  ): Promise<boolean> {
    return await this.set(key, response, { ttl });
  }

  /**
   * Get cached news response
   */
  public async getCachedNewsResponse(key: string): Promise<NewsResponse | null> {
    return await this.get<NewsResponse>(key);
  }

  /**
   * Cache articles list
   */
  public async cacheArticles(
    key: string,
    articles: IArticle[],
    ttl: number = 1800
  ): Promise<boolean> {
    return await this.set(key, articles, { ttl });
  }

  /**
   * Get cached articles
   */
  public async getCachedArticles(key: string): Promise<IArticle[] | null> {
    return await this.get<IArticle[]>(key);
  }

  /**
   * Generate cache keys for different data types
   */
  public generateKeys = {
    news: (celebrity?: string, page: number = 1, limit: number = 20): string => {
      const baseKey = celebrity ? `news:celebrity:${celebrity}` : 'news:all';
      return `${baseKey}:page:${page}:limit:${limit}`;
    },

    trending: (): string => 'news:trending',

    popular: (limit: number = 10): string => `news:popular:limit:${limit}`,

    recent: (limit: number = 20): string => `news:recent:limit:${limit}`,

    search: (query: string, page: number = 1, limit: number = 20): string => {
      const sanitizedQuery = query.replace(/[^a-zA-Z0-9]/g, '_');
      return `news:search:${sanitizedQuery}:page:${page}:limit:${limit}`;
    },

    celebrity: (name: string): string => `celebrity:${name}`,

    stats: (): string => 'stats:articles',
  };

  /**
   * Invalidate related cache keys
   */
  public async invalidateNewsCache(): Promise<void> {
    try {
      const patterns = ['news:*', 'stats:*'];

      for (const pattern of patterns) {
        await this.deleteByPattern(pattern);
      }

      logger.info('News cache invalidated');
    } catch (error) {
      logger.error('Error invalidating news cache:', error);
    }
  }

  /**
   * Delete cache keys by pattern (Redis only)
   */
  private async deleteByPattern(pattern: string): Promise<void> {
    if (!this.isRedisAvailable || !this.redisClient) {
      // For memory cache, we'll just flush everything
      nodeCacheService.flush();
      return;
    }

    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        logger.debug(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error(`Error deleting keys by pattern ${pattern}:`, error);
    }
  }

  /**
   * Parse Redis INFO command output
   */
  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = info.split('\r\n');

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    }

    return result;
  }
}

export const enhancedCacheService = EnhancedCacheService.getInstance();

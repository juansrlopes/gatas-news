// MIGRATED TO DATABASE-DRIVEN CELEBRITY SERVICE
// This file now uses the new database-driven celebrity management system
// The old JSON-based implementation has been replaced

import { celebrityRepository } from '../database/repositories/CelebrityRepository';
import { ICelebrity } from '../database/models/Celebrity';
import { enhancedCacheService } from './cacheService';
import logger from '../utils/logger';

export class CelebrityService {
  private static instance: CelebrityService;

  private constructor() {}

  public static getInstance(): CelebrityService {
    if (!CelebrityService.instance) {
      CelebrityService.instance = new CelebrityService();
    }
    return CelebrityService.instance;
  }

  /**
   * Get all active celebrities for news fetching
   */
  public async getCelebrities(): Promise<string[]> {
    const cacheKey = 'celebrities:active:names';

    try {
      // Try cache first
      const cached = await enhancedCacheService.get<string[]>(cacheKey);
      if (cached) {
        logger.debug('Retrieved celebrities from cache');
        return cached;
      }

      // Get from database
      const celebrities = await celebrityRepository.getActiveForFetching();
      const names = celebrities.map(celebrity => celebrity.name);

      if (names.length === 0) {
        logger.warn('No active celebrities found in database');
        return [];
      }

      // Cache for 1 hour
      await enhancedCacheService.set(cacheKey, names, { ttl: 3600 });

      logger.info(`Loaded ${names.length} celebrities from database`);
      return names;
    } catch (error) {
      logger.error('Error getting celebrities:', error);
      throw new Error('Failed to load celebrities');
    }
  }

  /**
   * Get celebrities with full details
   */
  public async getCelebritiesWithDetails(): Promise<ICelebrity[]> {
    const cacheKey = 'celebrities:active:details';

    try {
      // Try cache first
      const cached = await enhancedCacheService.get<ICelebrity[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const celebrities = await celebrityRepository.getActiveForFetching();

      // Cache for 30 minutes
      await enhancedCacheService.set(cacheKey, celebrities, { ttl: 1800 });

      return celebrities;
    } catch (error) {
      logger.error('Error getting celebrities with details:', error);
      throw error;
    }
  }

  /**
   * Find a specific celebrity by name (fuzzy search)
   */
  public async findCelebrity(name: string): Promise<string | null> {
    try {
      // Try exact match first
      const exactMatch = await celebrityRepository.findByName(name);
      if (exactMatch) {
        return exactMatch.name;
      }

      // Try search (includes aliases and search terms)
      const searchResults = await celebrityRepository.search(name, { page: 1, limit: 1 });
      if (searchResults.celebrities.length > 0) {
        return searchResults.celebrities[0].name;
      }

      return null;
    } catch (error) {
      logger.error('Error finding celebrity:', error);
      return null;
    }
  }

  /**
   * Get random celebrities for variety
   */
  public async getRandomCelebrities(count: number = 10): Promise<string[]> {
    try {
      const celebrities = await this.getCelebrities();

      // Shuffle array and take first 'count' items
      const shuffled = celebrities.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, Math.min(count, shuffled.length));
    } catch (error) {
      logger.error('Error getting random celebrities:', error);
      throw error;
    }
  }

  /**
   * Get high-priority celebrities for priority fetching
   */
  public async getHighPriorityCelebrities(): Promise<string[]> {
    const cacheKey = 'celebrities:high-priority:names';

    try {
      // Try cache first
      const cached = await enhancedCacheService.get<string[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const celebrities = await celebrityRepository.getHighPriority(7); // Priority 7+
      const names = celebrities.map(celebrity => celebrity.name);

      // Cache for 2 hours
      await enhancedCacheService.set(cacheKey, names, { ttl: 7200 });

      return names;
    } catch (error) {
      logger.error('Error getting high-priority celebrities:', error);
      throw error;
    }
  }

  /**
   * Get celebrities by category
   */
  public async getCelebritiesByCategory(category: string): Promise<string[]> {
    const cacheKey = `celebrities:category:${category}:names`;

    try {
      // Try cache first
      const cached = await enhancedCacheService.get<string[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const celebrities = await celebrityRepository.getByCategory(category);
      const names = celebrities.map(celebrity => celebrity.name);

      // Cache for 1 hour
      await enhancedCacheService.set(cacheKey, names, { ttl: 3600 });

      return names;
    } catch (error) {
      logger.error('Error getting celebrities by category:', error);
      throw error;
    }
  }

  /**
   * Get top performing celebrities
   */
  public async getTopPerformers(limit: number = 10): Promise<ICelebrity[]> {
    const cacheKey = `celebrities:top-performers:${limit}`;

    try {
      // Try cache first
      const cached = await enhancedCacheService.get<ICelebrity[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const celebrities = await celebrityRepository.getTopPerformers(limit);

      // Cache for 1 hour
      await enhancedCacheService.set(cacheKey, celebrities, { ttl: 3600 });

      return celebrities;
    } catch (error) {
      logger.error('Error getting top performers:', error);
      throw error;
    }
  }

  /**
   * Search celebrities
   */
  public async searchCelebrities(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    celebrities: ICelebrity[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasMore: boolean;
  }> {
    try {
      return await celebrityRepository.search(query, { page, limit });
    } catch (error) {
      logger.error('Error searching celebrities:', error);
      throw error;
    }
  }

  /**
   * Add a new celebrity
   */
  public async addCelebrity(celebrityData: {
    name: string;
    category: ICelebrity['category'];
    priority?: number;
    aliases?: string[];
    searchTerms?: string[];
    socialMedia?: ICelebrity['socialMedia'];
    description?: string;
  }): Promise<ICelebrity> {
    try {
      const celebrity = await celebrityRepository.create({
        ...celebrityData,
        priority: celebrityData.priority || 5,
        aliases: celebrityData.aliases || [],
        searchTerms: celebrityData.searchTerms || [celebrityData.name],
        isActive: true,
      });

      // Clear cache
      await this.clearCache();

      logger.info(`Added new celebrity: ${celebrity.name}`);
      return celebrity;
    } catch (error) {
      logger.error('Error adding celebrity:', error);
      throw error;
    }
  }

  /**
   * Update celebrity
   */
  public async updateCelebrity(
    id: string,
    updateData: Partial<ICelebrity>
  ): Promise<ICelebrity | null> {
    try {
      const celebrity = await celebrityRepository.update(id, updateData);

      if (celebrity) {
        // Clear cache
        await this.clearCache();
        logger.info(`Updated celebrity: ${celebrity.name}`);
      }

      return celebrity;
    } catch (error) {
      logger.error('Error updating celebrity:', error);
      throw error;
    }
  }

  /**
   * Remove celebrity (soft delete)
   */
  public async removeCelebrity(id: string): Promise<ICelebrity | null> {
    try {
      const celebrity = await celebrityRepository.softDelete(id);

      if (celebrity) {
        // Clear cache
        await this.clearCache();
        logger.info(`Removed celebrity: ${celebrity.name}`);
      }

      return celebrity;
    } catch (error) {
      logger.error('Error removing celebrity:', error);
      throw error;
    }
  }

  /**
   * Update celebrity article statistics
   */
  public async updateArticleStats(celebrityName: string, articleCount: number): Promise<void> {
    try {
      const celebrity = await celebrityRepository.findByName(celebrityName);
      if (celebrity) {
        await celebrityRepository.updateArticleStats(
          (celebrity._id as string).toString(),
          articleCount
        );

        // Clear performance-related cache
        await enhancedCacheService.delete('celebrities:top-performers:10');
      }
    } catch (error) {
      logger.error('Error updating celebrity article stats:', error);
      // Don't throw - this is not critical for the main flow
    }
  }

  /**
   * Get celebrity statistics
   */
  public async getStatistics(): Promise<{
    totalCelebrities: number;
    activeCelebrities: number;
    inactiveCelebrities: number;
    categoriesBreakdown: Array<{ category: string; count: number }>;
    priorityBreakdown: Array<{ priority: number; count: number }>;
    topPerformers: ICelebrity[];
    recentlyAdded: ICelebrity[];
  }> {
    const cacheKey = 'celebrities:statistics';

    try {
      // Try cache first
      const cached = await enhancedCacheService.get<{
        totalCelebrities: number;
        activeCelebrities: number;
        inactiveCelebrities: number;
        categoriesBreakdown: Array<{ category: string; count: number }>;
        priorityBreakdown: Array<{ priority: number; count: number }>;
        topPerformers: ICelebrity[];
        recentlyAdded: ICelebrity[];
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const stats = await celebrityRepository.getStatistics();

      // Cache for 30 minutes
      await enhancedCacheService.set(cacheKey, stats, { ttl: 1800 });

      return stats;
    } catch (error) {
      logger.error('Error getting celebrity statistics:', error);
      throw error;
    }
  }

  /**
   * Migrate from JSON file to database
   */
  public async migrateFromJson(jsonCelebrities: string[]): Promise<{
    created: number;
    skipped: number;
    errors: string[];
  }> {
    try {
      logger.info(`Starting migration of ${jsonCelebrities.length} celebrities from JSON`);

      const result = await celebrityRepository.migrateFromJson(jsonCelebrities);

      // Clear cache after migration
      await this.clearCache();

      logger.info(
        `Migration completed: ${result.created} created, ${result.skipped} skipped, ${result.errors.length} errors`
      );

      return result;
    } catch (error) {
      logger.error('Error migrating celebrities from JSON:', error);
      throw error;
    }
  }

  /**
   * Clear all celebrity-related cache (legacy method for compatibility)
   */
  public refreshCache(): void {
    // For backward compatibility with old interface
    this.clearCache().catch(error => {
      logger.error('Error refreshing celebrity cache:', error);
    });
  }

  /**
   * Clear all celebrity-related cache
   */
  public async clearCache(): Promise<void> {
    try {
      // Clear specific known cache keys
      await Promise.all([
        enhancedCacheService.delete('celebrities:active:names'),
        enhancedCacheService.delete('celebrities:active:details'),
        enhancedCacheService.delete('celebrities:high-priority:names'),
        enhancedCacheService.delete('celebrities:statistics'),
        enhancedCacheService.delete('celebrities:top-performers:10'),
      ]);

      logger.info('Celebrity cache cleared');
    } catch (error) {
      logger.error('Error clearing celebrity cache:', error);
    }
  }
}

export const celebrityService = CelebrityService.getInstance();

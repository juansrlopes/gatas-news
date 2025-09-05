import { CelebrityService, celebrityService } from './celebrityService';
import { celebrityRepository } from '../database/repositories/CelebrityRepository';
import { enhancedCacheService } from './cacheService';
import { ICelebrity } from '../database/models/Celebrity';
import {
  createCelebrityData,
  createMultipleCelebrities,
  createHighPriorityCelebrity,
} from '../test/factories';

// Mock dependencies
jest.mock('../database/repositories/CelebrityRepository');
jest.mock('./cacheService');
jest.mock('../utils/logger');

const mockCelebrityRepository = celebrityRepository as jest.Mocked<typeof celebrityRepository>;
const mockEnhancedCacheService = enhancedCacheService as jest.Mocked<typeof enhancedCacheService>;

describe('CelebrityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCelebrities', () => {
    it('should return cached celebrities if available', async () => {
      const cachedCelebrities = ['Celebrity 1', 'Celebrity 2'];
      mockEnhancedCacheService.get.mockResolvedValue(cachedCelebrities);

      const result = await celebrityService.getCelebrities();

      expect(result).toEqual(cachedCelebrities);
      expect(mockEnhancedCacheService.get).toHaveBeenCalledWith('celebrities:active:names');
      expect(mockCelebrityRepository.getActiveForFetching).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache when no cache available', async () => {
      const mockCelebrities = [
        { name: 'Celebrity 1', _id: '1' } as ICelebrity,
        { name: 'Celebrity 2', _id: '2' } as ICelebrity,
      ];

      mockEnhancedCacheService.get.mockResolvedValue(null);
      mockCelebrityRepository.getActiveForFetching.mockResolvedValue(mockCelebrities);
      mockEnhancedCacheService.set.mockResolvedValue(true);

      const result = await celebrityService.getCelebrities();

      expect(result).toEqual(['Celebrity 1', 'Celebrity 2']);
      expect(mockCelebrityRepository.getActiveForFetching).toHaveBeenCalled();
      expect(mockEnhancedCacheService.set).toHaveBeenCalledWith(
        'celebrities:active:names',
        ['Celebrity 1', 'Celebrity 2'],
        { ttl: 3600 }
      );
    });

    it('should return empty array when no active celebrities found', async () => {
      mockEnhancedCacheService.get.mockResolvedValue(null);
      mockCelebrityRepository.getActiveForFetching.mockResolvedValue([]);

      const result = await celebrityService.getCelebrities();

      expect(result).toEqual([]);
      expect(mockEnhancedCacheService.set).not.toHaveBeenCalled();
    });

    it('should throw error when database operation fails', async () => {
      mockEnhancedCacheService.get.mockResolvedValue(null);
      mockCelebrityRepository.getActiveForFetching.mockRejectedValue(new Error('Database error'));

      await expect(celebrityService.getCelebrities()).rejects.toThrow('Failed to load celebrities');
    });
  });

  describe('getCelebritiesWithDetails', () => {
    it('should return cached detailed celebrities if available', async () => {
      const cachedDetails = [
        createCelebrityData({ name: 'Celebrity 1' }),
        createCelebrityData({ name: 'Celebrity 2' }),
      ];

      mockEnhancedCacheService.get.mockResolvedValue(cachedDetails);

      const result = await celebrityService.getCelebritiesWithDetails();

      expect(result).toEqual(cachedDetails);
      expect(mockEnhancedCacheService.get).toHaveBeenCalledWith('celebrities:active:details');
    });

    it('should fetch from database and cache detailed celebrities', async () => {
      const mockCelebrities = [
        createCelebrityData({ name: 'Celebrity 1' }) as ICelebrity,
        createCelebrityData({ name: 'Celebrity 2' }) as ICelebrity,
      ];

      mockEnhancedCacheService.get.mockResolvedValue(null);
      mockCelebrityRepository.getActiveForFetching.mockResolvedValue(mockCelebrities);
      mockEnhancedCacheService.set.mockResolvedValue(true);

      const result = await celebrityService.getCelebritiesWithDetails();

      expect(result).toEqual(mockCelebrities);
      expect(mockEnhancedCacheService.set).toHaveBeenCalledWith(
        'celebrities:active:details',
        mockCelebrities,
        { ttl: 1800 }
      );
    });
  });

  describe('findCelebrity', () => {
    it('should find celebrity by name', async () => {
      const mockCelebrity = createCelebrityData({ name: 'Test Celebrity' }) as ICelebrity;
      mockCelebrityRepository.findByName.mockResolvedValue(mockCelebrity);

      const result = await celebrityService.findCelebrity('Test Celebrity');

      expect(result).toBe('Test Celebrity');
      expect(mockCelebrityRepository.findByName).toHaveBeenCalledWith('Test Celebrity');
    });

    it('should find celebrity by search when name search fails', async () => {
      const mockCelebrity = createCelebrityData({ name: 'Test Celebrity' }) as ICelebrity;
      mockCelebrityRepository.findByName.mockResolvedValue(null);
      mockCelebrityRepository.search.mockResolvedValue({
        celebrities: [mockCelebrity],
        totalCount: 1,
        totalPages: 1,
        currentPage: 1,
        hasMore: false,
      });

      const result = await celebrityService.findCelebrity('test-celebrity');

      expect(result).toBe('Test Celebrity');
      expect(mockCelebrityRepository.findByName).toHaveBeenCalledWith('test-celebrity');
      expect(mockCelebrityRepository.search).toHaveBeenCalledWith('test-celebrity', {
        page: 1,
        limit: 1,
      });
    });

    it('should return null when celebrity not found', async () => {
      mockCelebrityRepository.findByName.mockResolvedValue(null);
      mockCelebrityRepository.search.mockResolvedValue({
        celebrities: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
        hasMore: false,
      });

      const result = await celebrityService.findCelebrity('Non Existent');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockCelebrityRepository.findByName.mockRejectedValue(new Error('Database error'));

      const result = await celebrityService.findCelebrity('Test');

      expect(result).toBeNull();
    });
  });

  describe('getRandomCelebrities', () => {
    it('should return random celebrities from active list', async () => {
      const mockCelebrities = [
        createCelebrityData({ name: 'Celebrity 1' }) as ICelebrity,
        createCelebrityData({ name: 'Celebrity 2' }) as ICelebrity,
        createCelebrityData({ name: 'Celebrity 3' }) as ICelebrity,
        createCelebrityData({ name: 'Celebrity 4' }) as ICelebrity,
        createCelebrityData({ name: 'Celebrity 5' }) as ICelebrity,
      ];

      mockCelebrityRepository.getActiveForFetching.mockResolvedValue(mockCelebrities);

      const result = await celebrityService.getRandomCelebrities(3);

      expect(result).toHaveLength(3);
      expect(result.every(name => typeof name === 'string')).toBe(true);
      expect(mockCelebrities.map(c => c.name)).toEqual(expect.arrayContaining(result));
    });

    it('should return all celebrities when requested count exceeds available', async () => {
      const mockCelebrities = [
        createCelebrityData({ name: 'Celebrity 1' }) as ICelebrity,
        createCelebrityData({ name: 'Celebrity 2' }) as ICelebrity,
      ];

      mockCelebrityRepository.getActiveForFetching.mockResolvedValue(mockCelebrities);

      const result = await celebrityService.getRandomCelebrities(5);

      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining(['Celebrity 1', 'Celebrity 2']));
    });

    it('should return empty array when no celebrities available', async () => {
      mockCelebrityRepository.getActiveForFetching.mockResolvedValue([]);

      const result = await celebrityService.getRandomCelebrities(3);

      expect(result).toEqual([]);
    });
  });

  describe('getHighPriorityCelebrities', () => {
    it('should return cached high priority celebrities if available', async () => {
      const cachedCelebrities = ['High Priority 1', 'High Priority 2'];
      mockEnhancedCacheService.get.mockResolvedValue(cachedCelebrities);

      const result = await celebrityService.getHighPriorityCelebrities();

      expect(result).toEqual(cachedCelebrities);
      expect(mockEnhancedCacheService.get).toHaveBeenCalledWith('celebrities:high-priority:names');
    });

    it('should fetch from database and cache high priority celebrities', async () => {
      const mockCelebrities = [
        createHighPriorityCelebrity() as ICelebrity,
        createCelebrityData({ name: 'High Priority 2', priority: 9 }) as ICelebrity,
      ];

      mockEnhancedCacheService.get.mockResolvedValue(null);
      mockCelebrityRepository.getHighPriority.mockResolvedValue(mockCelebrities);
      mockEnhancedCacheService.set.mockResolvedValue(true);

      const result = await celebrityService.getHighPriorityCelebrities();

      expect(result).toEqual(['High Priority Celebrity', 'High Priority 2']);
      expect(mockCelebrityRepository.getHighPriority).toHaveBeenCalledWith(7);
      expect(mockEnhancedCacheService.set).toHaveBeenCalledWith(
        'celebrities:high-priority:names',
        ['High Priority Celebrity', 'High Priority 2'],
        { ttl: 7200 }
      );
    });
  });

  describe('getTopPerformers', () => {
    it('should return cached top performers if available', async () => {
      const cachedPerformers = [
        createHighPriorityCelebrity() as ICelebrity,
        createCelebrityData({ name: 'Performer 2' }) as ICelebrity,
      ];

      mockEnhancedCacheService.get.mockResolvedValue(cachedPerformers);

      const result = await celebrityService.getTopPerformers(10);

      expect(result).toEqual(cachedPerformers);
      expect(mockEnhancedCacheService.get).toHaveBeenCalledWith('celebrities:top-performers:10');
    });

    it('should fetch from database and cache top performers', async () => {
      const mockPerformers = [
        createHighPriorityCelebrity() as ICelebrity,
        createCelebrityData({ name: 'Performer 2', totalArticles: 50 }) as ICelebrity,
      ];

      mockEnhancedCacheService.get.mockResolvedValue(null);
      mockCelebrityRepository.getTopPerformers.mockResolvedValue(mockPerformers);
      mockEnhancedCacheService.set.mockResolvedValue(true);

      const result = await celebrityService.getTopPerformers(10);

      expect(result).toEqual(mockPerformers);
      expect(mockCelebrityRepository.getTopPerformers).toHaveBeenCalledWith(10);
      expect(mockEnhancedCacheService.set).toHaveBeenCalledWith(
        'celebrities:top-performers:10',
        mockPerformers,
        { ttl: 3600 }
      );
    });
  });

  describe('updateArticleStats', () => {
    it('should update celebrity article statistics', async () => {
      const mockCelebrity = createCelebrityData({
        name: 'Test Celebrity',
        _id: 'test-id',
      }) as ICelebrity;
      mockCelebrityRepository.findByName.mockResolvedValue(mockCelebrity);
      mockCelebrityRepository.updateArticleStats.mockResolvedValue(mockCelebrity);
      mockEnhancedCacheService.delete.mockResolvedValue(true);

      await celebrityService.updateArticleStats('Test Celebrity', 5);

      expect(mockCelebrityRepository.findByName).toHaveBeenCalledWith('Test Celebrity');
      expect(mockCelebrityRepository.updateArticleStats).toHaveBeenCalledWith('test-id', 5);
      expect(mockEnhancedCacheService.delete).toHaveBeenCalledWith('celebrities:top-performers:10');
    });

    it('should not update stats for non-existent celebrity', async () => {
      mockCelebrityRepository.findByName.mockResolvedValue(null);

      await celebrityService.updateArticleStats('Non Existent', 5);

      expect(mockCelebrityRepository.updateArticleStats).not.toHaveBeenCalled();
      expect(mockEnhancedCacheService.delete).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully without throwing', async () => {
      mockCelebrityRepository.findByName.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(celebrityService.updateArticleStats('Test', 5)).resolves.toBeUndefined();
    });
  });

  describe('getStatistics', () => {
    it('should return cached statistics if available', async () => {
      const cachedStats = {
        totalCelebrities: 10,
        activeCelebrities: 8,
        inactiveCelebrities: 2,
        categoriesBreakdown: [{ category: 'actress', count: 5 }],
        priorityBreakdown: [{ priority: 8, count: 3 }],
        topPerformers: [],
        recentlyAdded: [],
      };

      mockEnhancedCacheService.get.mockResolvedValue(cachedStats);

      const result = await celebrityService.getStatistics();

      expect(result).toEqual(cachedStats);
      expect(mockEnhancedCacheService.get).toHaveBeenCalledWith('celebrities:statistics');
    });

    it('should fetch from database and cache statistics', async () => {
      const mockStats = {
        totalCelebrities: 10,
        activeCelebrities: 8,
        inactiveCelebrities: 2,
        categoriesBreakdown: [{ category: 'actress', count: 5 }],
        priorityBreakdown: [{ priority: 8, count: 3 }],
        topPerformers: [],
        recentlyAdded: [],
      };

      mockEnhancedCacheService.get.mockResolvedValue(null);
      mockCelebrityRepository.getStatistics.mockResolvedValue(mockStats);
      mockEnhancedCacheService.set.mockResolvedValue(true);

      const result = await celebrityService.getStatistics();

      expect(result).toEqual(mockStats);
      expect(mockCelebrityRepository.getStatistics).toHaveBeenCalled();
      expect(mockEnhancedCacheService.set).toHaveBeenCalledWith(
        'celebrities:statistics',
        mockStats,
        { ttl: 1800 }
      );
    });

    it('should throw error when database operation fails', async () => {
      mockEnhancedCacheService.get.mockResolvedValue(null);
      mockCelebrityRepository.getStatistics.mockRejectedValue(new Error('Database error'));

      await expect(celebrityService.getStatistics()).rejects.toThrow('Database error');
    });
  });

  describe('migrateFromJson', () => {
    it('should migrate celebrities from JSON array', async () => {
      const jsonCelebrities = ['Celebrity 1', 'Celebrity 2'];
      const mockResult = { created: 2, skipped: 0, errors: [] };

      mockCelebrityRepository.migrateFromJson.mockResolvedValue(mockResult);

      const result = await celebrityService.migrateFromJson(jsonCelebrities);

      expect(result).toEqual(mockResult);
      expect(mockCelebrityRepository.migrateFromJson).toHaveBeenCalledWith(jsonCelebrities);
    });

    it('should throw error when migration fails', async () => {
      const jsonCelebrities = ['Celebrity 1'];
      mockCelebrityRepository.migrateFromJson.mockRejectedValue(new Error('Migration error'));

      await expect(celebrityService.migrateFromJson(jsonCelebrities)).rejects.toThrow(
        'Migration error'
      );
    });
  });

  describe('clearCache', () => {
    it('should clear celebrity cache', async () => {
      mockEnhancedCacheService.delete.mockResolvedValue(true);

      await celebrityService.clearCache();

      expect(mockEnhancedCacheService.delete).toHaveBeenCalledWith('celebrities:active:names');
      expect(mockEnhancedCacheService.delete).toHaveBeenCalledWith('celebrities:active:details');
      expect(mockEnhancedCacheService.delete).toHaveBeenCalledWith(
        'celebrities:high-priority:names'
      );
      expect(mockEnhancedCacheService.delete).toHaveBeenCalledWith('celebrities:statistics');
      expect(mockEnhancedCacheService.delete).toHaveBeenCalledWith('celebrities:top-performers:10');
    });

    it('should handle cache clearing errors gracefully', async () => {
      mockEnhancedCacheService.delete.mockRejectedValue(new Error('Cache error'));

      // Should not throw
      await expect(celebrityService.clearCache()).resolves.toBeUndefined();
    });
  });
});

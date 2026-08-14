import { celebrityRepository } from './CelebrityRepository';
import { createCelebrityData, createInactiveCelebrity } from '../../test/factories';
import {
  createTestCelebrity,
  createMultipleTestCelebrities,
  clearDatabase,
  countCelebrities,
  expectValidCelebrityStructure,
} from '../../test/helpers';

describe('CelebrityRepository', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('create', () => {
    it('should create a new celebrity with valid data', async () => {
      const celebrityData = createCelebrityData({ name: 'New Celebrity' });

      const result = await celebrityRepository.create(celebrityData);

      expectValidCelebrityStructure(result);
      expect(result.name).toBe('New Celebrity');
      expect(result.slug).toBe('new-celebrity');
      expect(result.isActive).toBe(true);
    });

    it('should auto-generate slug from name', async () => {
      const celebrityData = createCelebrityData({ name: 'Test Celebrity Name!' });

      const result = await celebrityRepository.create(celebrityData);

      expect(result.slug).toBe('test-celebrity-name');
    });

    it('should persist aliases on create', async () => {
      const celebrityData = createCelebrityData({
        name: 'Celebrity Name',
        aliases: ['Celeb', 'Famous Person'],
      });

      const result = await celebrityRepository.create(celebrityData);

      expect(result.aliases).toEqual(expect.arrayContaining(['Celeb', 'Famous Person']));
    });

    it('should create celebrities with different names', async () => {
      const celebrityData1 = createCelebrityData({ name: 'First Celebrity' });
      const celebrityData2 = createCelebrityData({ name: 'Second Celebrity' });

      const first = await celebrityRepository.create(celebrityData1);
      const second = await celebrityRepository.create(celebrityData2);

      // Both should be created successfully with different names
      expect(first).toBeDefined();
      expect(first.name).toBe('First Celebrity');
      expect(second).toBeDefined();
      expect(second.name).toBe('Second Celebrity');
    });
  });

  describe('findById', () => {
    it('should find celebrity by valid ID', async () => {
      const celebrityData = createCelebrityData({ name: 'Find By ID Test' });
      const created = await createTestCelebrity(celebrityData);

      const result = await celebrityRepository.findById((created._id as string).toString());

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Find By ID Test');
    });

    it('should return null for invalid ID', async () => {
      const result = await celebrityRepository.findById('507f1f77bcf86cd799439011');

      expect(result).toBeNull();
    });

    it('should throw error for malformed ID', async () => {
      await expect(celebrityRepository.findById('invalid-id')).rejects.toThrow();
    });
  });

  describe('findByName', () => {
    it('should find celebrity by exact name (case insensitive)', async () => {
      const celebrityData = createCelebrityData({ name: 'Test Celebrity' });
      await createTestCelebrity(celebrityData);

      const result = await celebrityRepository.findByName('test celebrity');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Test Celebrity');
    });

    it('should only return active celebrities', async () => {
      const inactiveCelebrity = createInactiveCelebrity();
      await createTestCelebrity(inactiveCelebrity);

      const result = await celebrityRepository.findByName(inactiveCelebrity.name!);

      expect(result).toBeNull();
    });

    it('should return null for non-existent celebrity', async () => {
      const result = await celebrityRepository.findByName('Non Existent Celebrity');

      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should find celebrity by slug', async () => {
      const celebrityData = createCelebrityData({ name: 'Slug Test Celebrity' });
      await createTestCelebrity(celebrityData);

      const result = await celebrityRepository.findBySlug('slug-test-celebrity');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Slug Test Celebrity');
    });

    it('should only return active celebrities', async () => {
      const inactiveCelebrity = createInactiveCelebrity();
      const created = await createTestCelebrity(inactiveCelebrity);

      const result = await celebrityRepository.findBySlug(created.slug);

      expect(result).toBeNull();
    });
  });

  describe('findWithFilters', () => {
    beforeEach(async () => {
      const celebrities = [
        createCelebrityData({ name: 'Actress 1', totalArticles: 8 }),
        createCelebrityData({ name: 'Singer 1', totalArticles: 6 }),
        createCelebrityData({ name: 'Actress 2', totalArticles: 9 }),
        createInactiveCelebrity(),
      ];

      await createMultipleTestCelebrities(celebrities);
    });

    it('should return all active celebrities with default pagination', async () => {
      const result = await celebrityRepository.findWithFilters();

      expect(result.celebrities).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      expect(result.currentPage).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should filter by active status', async () => {
      const result = await celebrityRepository.findWithFilters({ isActive: true });

      expect(result.celebrities).toHaveLength(3);
      expect(result.celebrities.every(c => c.isActive)).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      const result = await celebrityRepository.findWithFilters({}, { page: 1, limit: 2 });

      expect(result.celebrities).toHaveLength(2);
      expect(result.currentPage).toBe(1);
      expect(result.totalPages).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should sort by name by default', async () => {
      const result = await celebrityRepository.findWithFilters();

      const names = result.celebrities.map(c => c.name);
      expect(names).toEqual([...names].sort());
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const celebrities = [
        createCelebrityData({
          name: 'Famous Actress',
          aliases: ['Famous', 'Star'],
        }),
        createCelebrityData({
          name: 'Popular Singer',
          aliases: ['Pop Star'],
        }),
      ];

      await createMultipleTestCelebrities(celebrities);
    });

    it('should search by name', async () => {
      const result = await celebrityRepository.search('Famous');

      expect(result.celebrities).toHaveLength(1);
      expect(result.celebrities[0].name).toBe('Famous Actress');
    });

    it('should search by aliases', async () => {
      const result = await celebrityRepository.search('Pop Star');

      expect(result.celebrities).toHaveLength(1);
      expect(result.celebrities[0].name).toBe('Popular Singer');
    });

    it('should be case insensitive', async () => {
      const result = await celebrityRepository.search('FAMOUS');

      expect(result.celebrities).toHaveLength(1);
      expect(result.celebrities[0].name).toBe('Famous Actress');
    });

    it('should return empty results for no matches', async () => {
      const result = await celebrityRepository.search('NonExistent');

      expect(result.celebrities).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('update', () => {
    it('should update celebrity data', async () => {
      const celebrityData = createCelebrityData({ name: 'Update Test' });
      const created = await createTestCelebrity(celebrityData);

      const result = await celebrityRepository.update((created._id as string).toString(), {
        aliases: ['Updated'],
        totalArticles: 10,
      });

      expect(result).not.toBeNull();
      expect(result!.aliases).toEqual(['Updated']);
      expect(result!.totalArticles).toBe(10);
    });

    it('should return null for non-existent celebrity', async () => {
      const result = await celebrityRepository.update('507f1f77bcf86cd799439011', {
        aliases: ['Updated'],
      });

      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('should set isActive to false', async () => {
      const celebrityData = createCelebrityData({ name: 'Delete Test' });
      const created = await createTestCelebrity(celebrityData);

      const result = await celebrityRepository.softDelete((created._id as string).toString());

      expect(result).not.toBeNull();
      expect(result!.isActive).toBe(false);
    });
  });

  describe('existsByName', () => {
    it('should return true for existing celebrity', async () => {
      const celebrityData = createCelebrityData({ name: 'Exists Test' });
      await createTestCelebrity(celebrityData);

      const result = await celebrityRepository.existsByName('Exists Test');

      expect(result).toBe(true);
    });

    it('should return false for non-existing celebrity', async () => {
      const result = await celebrityRepository.existsByName('Does Not Exist');

      expect(result).toBe(false);
    });

    it('should be case insensitive', async () => {
      const celebrityData = createCelebrityData({ name: 'Case Test' });
      await createTestCelebrity(celebrityData);

      const result = await celebrityRepository.existsByName('case test');

      expect(result).toBe(true);
    });
  });

  describe('getTopPerformers', () => {
    beforeEach(async () => {
      const celebrities = [
        createCelebrityData({
          name: 'Top Performer 1',
          totalArticles: 100,
          avgArticlesPerDay: 5.0,
        }),
        createCelebrityData({
          name: 'Top Performer 2',
          totalArticles: 80,
          avgArticlesPerDay: 6.0,
        }),
        createCelebrityData({
          name: 'Low Performer',
          totalArticles: 10,
          avgArticlesPerDay: 1.0,
        }),
      ];

      await createMultipleTestCelebrities(celebrities);
    });

    it('should return top performers sorted by performance metrics', async () => {
      const result = await celebrityRepository.getTopPerformers(2);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Top Performer 1');
      expect(result[1].name).toBe('Top Performer 2');
    });

    it('should respect the limit parameter', async () => {
      const result = await celebrityRepository.getTopPerformers(1);

      expect(result).toHaveLength(1);
    });
  });

  describe('getActiveForFetching', () => {
    beforeEach(async () => {
      const celebrities = [
        createCelebrityData({ name: 'Active High Volume', totalArticles: 9, isActive: true }),
        createCelebrityData({ name: 'Active Low Volume', totalArticles: 3, isActive: true }),
        createInactiveCelebrity(),
      ];

      await createMultipleTestCelebrities(celebrities);
    });

    it('should return only active celebrities', async () => {
      const result = await celebrityRepository.getActiveForFetching();

      expect(result).toHaveLength(2);
      expect(result.every(c => c.isActive)).toBe(true);
    });

    it('should return active celebrities', async () => {
      const result = await celebrityRepository.getActiveForFetching();

      expect(result).toHaveLength(2);
      expect(result.every(c => c.isActive)).toBe(true);
      expect(result.map(c => c.name).sort()).toEqual(['Active High Volume', 'Active Low Volume']);
    });
  });

  describe('migrateFromJson', () => {
    it('should create celebrities from JSON array', async () => {
      const jsonCelebrities = ['Celebrity 1', 'Celebrity 2', 'Celebrity 3'];

      const result = await celebrityRepository.migrateFromJson(jsonCelebrities);

      expect(result.created).toBe(3);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);

      const count = await countCelebrities();
      expect(count).toBe(3);
    });

    it('should skip existing celebrities', async () => {
      const celebrityData = createCelebrityData({ name: 'Existing Celebrity' });
      await createTestCelebrity(celebrityData);

      const jsonCelebrities = ['Existing Celebrity', 'New Celebrity'];

      const result = await celebrityRepository.migrateFromJson(jsonCelebrities);

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      // Create a celebrity with invalid data to trigger an error
      const jsonCelebrities = ['', 'Valid Celebrity']; // Empty name should cause error

      const result = await celebrityRepository.migrateFromJson(jsonCelebrities);

      expect(result.created).toBe(1); // Only the valid one
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

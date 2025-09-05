import {
  createCelebrityData,
  createMultipleCelebrities,
  createInactiveCelebrity,
  createHighPriorityCelebrity,
} from './factories';

describe('Test Factories', () => {
  describe('createCelebrityData', () => {
    it('should create celebrity data with default values', () => {
      const result = createCelebrityData();

      expect(result.name).toBe('Test Celebrity');
      expect(result.slug).toBe('test-celebrity');
      expect(result.category).toBe('actress');
      expect(result.priority).toBe(5);
      expect(result.isActive).toBe(true);
      expect(result.aliases).toEqual(['test celebrity']);
      expect(result.searchTerms).toEqual(['test celebrity']);
    });

    it('should create celebrity data with overrides', () => {
      const overrides = {
        name: 'Custom Celebrity',
        category: 'singer' as const,
        priority: 8,
      };

      const result = createCelebrityData(overrides);

      expect(result.name).toBe('Custom Celebrity');
      expect(result.slug).toBe('custom-celebrity');
      expect(result.category).toBe('singer');
      expect(result.priority).toBe(8);
      expect(result.isActive).toBe(true);
    });
  });

  describe('createMultipleCelebrities', () => {
    it('should create multiple celebrities with default count', () => {
      const result = createMultipleCelebrities();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Test Celebrity 1');
      expect(result[1].name).toBe('Test Celebrity 2');
      expect(result[2].name).toBe('Test Celebrity 3');
    });

    it('should create specified number of celebrities', () => {
      const result = createMultipleCelebrities(5);

      expect(result).toHaveLength(5);
      expect(result[0].name).toBe('Test Celebrity 1');
      expect(result[4].name).toBe('Test Celebrity 5');
    });
  });

  describe('createInactiveCelebrity', () => {
    it('should create inactive celebrity', () => {
      const result = createInactiveCelebrity();

      expect(result.name).toBe('Inactive Celebrity');
      expect(result.isActive).toBe(false);
    });
  });

  describe('createHighPriorityCelebrity', () => {
    it('should create high priority celebrity', () => {
      const result = createHighPriorityCelebrity();

      expect(result.name).toBe('High Priority Celebrity');
      expect(result.priority).toBe(9);
      expect(result.totalArticles).toBe(100);
      expect(result.avgArticlesPerDay).toBe(5.5);
    });
  });
});

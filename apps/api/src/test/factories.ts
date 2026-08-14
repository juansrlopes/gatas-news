import { ICelebrity } from '../database/models/Celebrity';

/**
 * Test data factories for creating consistent test objects
 */

export const createCelebrityData = (overrides: Partial<ICelebrity> = {}): Partial<ICelebrity> => {
  const baseName = overrides.name || 'Test Celebrity';

  return {
    name: baseName,
    slug: baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-*|-*$/g, ''),
    aliases: [baseName.toLowerCase()],
    isActive: true,
    totalArticles: 0,
    avgArticlesPerDay: 0,
    ...overrides,
  };
};

export const createMultipleCelebrities = (count: number = 3): Partial<ICelebrity>[] => {
  return Array.from({ length: count }, (_, index) =>
    createCelebrityData({
      name: `Test Celebrity ${index + 1}`,
    })
  );
};

export const createInactiveCelebrity = (): Partial<ICelebrity> => {
  return createCelebrityData({
    name: 'Inactive Celebrity',
    isActive: false,
  });
};

export const createHighPriorityCelebrity = (): Partial<ICelebrity> => {
  return createCelebrityData({
    name: 'High Priority Celebrity',
    totalArticles: 100,
    avgArticlesPerDay: 5.5,
  });
};

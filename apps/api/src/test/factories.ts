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
    category: 'actress',
    priority: 5,
    isActive: true,
    searchTerms: [baseName.toLowerCase()],
    description: 'A test celebrity for unit testing',
    totalArticles: 0,
    avgArticlesPerDay: 0,
    socialMedia: {
      instagram: '@testcelebrity',
      twitter: '@testcelebrity',
    },
    ...overrides,
  };
};

export const createMultipleCelebrities = (count: number = 3): Partial<ICelebrity>[] => {
  return Array.from({ length: count }, (_, index) =>
    createCelebrityData({
      name: `Test Celebrity ${index + 1}`,
      priority: Math.floor(Math.random() * 10) + 1,
      category: ['actress', 'singer', 'influencer'][index % 3] as ICelebrity['category'],
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
    priority: 9,
    totalArticles: 100,
    avgArticlesPerDay: 5.5,
  });
};

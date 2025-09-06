/**
 * Mock Data Utilities for Testing
 *
 * Provides realistic mock data for testing components and API responses.
 * Includes factories for creating test data with customizable properties.
 */

import { Article } from '../../../../../libs/shared/types/src/index';

/**
 * Creates a mock article with default or custom properties
 *
 * @param overrides - Properties to override in the default article
 * @returns A complete Article object for testing
 */
export const createMockArticle = (overrides: Partial<Article> = {}): Article => ({
  url: 'https://example.com/article',
  urlToImage: 'https://images.unsplash.com/photo-1234567890',
  title: 'Mock Article Title',
  description: 'This is a mock article description for testing purposes.',
  publishedAt: '2024-01-01T00:00:00Z',
  source: {
    id: 'mock-source',
    name: 'Mock News Source',
  },
  author: 'Mock Author',
  content: 'Full mock article content...',
  ...overrides,
});

/**
 * Creates an array of mock articles
 *
 * @param count - Number of articles to create
 * @param baseOverrides - Base properties to apply to all articles
 * @returns Array of Article objects
 */
export const createMockArticles = (
  count: number = 5,
  baseOverrides: Partial<Article> = {}
): Article[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockArticle({
      ...baseOverrides,
      url: `https://example.com/article-${index + 1}`,
      title: `Mock Article ${index + 1}`,
      urlToImage: `https://images.unsplash.com/photo-${index + 1}`,
    })
  );
};

/**
 * Mock API response structure
 */
export const createMockApiResponse = (articles: Article[], totalResults?: number) => ({
  success: true,
  data: {
    articles,
    totalResults: totalResults || articles.length,
    page: 1,
    limit: 20,
  },
});

/**
 * Mock error response
 */
export const createMockErrorResponse = (message: string = 'Mock error') => ({
  success: false,
  error: message,
});

/**
 * Celebrity names for testing search functionality
 */
export const mockCelebrityNames = [
  'Anitta',
  'Bruna Marquezine',
  'Luísa Sonza',
  'Isis Valverde',
  'Juliette',
  'Camila Queiroz',
  'Marina Ruy Barbosa',
  'Giovanna Ewbank',
  'Sabrina Sato',
  'Grazi Massafera',
];

/**
 * Creates mock articles about specific celebrities
 */
export const createCelebrityArticles = (celebrityName: string, count: number = 3): Article[] => {
  return createMockArticles(count, {
    title: `${celebrityName} em nova aparição pública`,
    description: `Notícia sobre ${celebrityName} e suas últimas atividades.`,
  });
};

/**
 * Mock Instagram profile data
 */
export interface MockInstagramProfile {
  username: string;
  displayName: string;
  profileUrl: string;
  imageUrl: string;
}

export const createMockInstagramProfile = (
  overrides: Partial<MockInstagramProfile> = {}
): MockInstagramProfile => ({
  username: 'mockuser',
  displayName: 'Mock User',
  profileUrl: 'https://instagram.com/mockuser',
  imageUrl: 'https://images.unsplash.com/photo-profile',
  ...overrides,
});

/**
 * Creates multiple Instagram profiles
 */
export const createMockInstagramProfiles = (count: number = 10): MockInstagramProfile[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockInstagramProfile({
      username: `user${index + 1}`,
      displayName: `User ${index + 1}`,
      profileUrl: `https://instagram.com/user${index + 1}`,
      imageUrl: `https://images.unsplash.com/photo-profile-${index + 1}`,
    })
  );
};

/**
 * Mock fetch responses for different scenarios
 */
export const mockFetchResponses = {
  success: (data: any) =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data),
    } as Response),

  error: (status: number = 500, message: string = 'Server Error') =>
    Promise.resolve({
      ok: false,
      status,
      json: () => Promise.resolve({ error: message }),
    } as Response),

  networkError: () => Promise.reject(new Error('Network Error')),

  timeout: () => Promise.reject({ name: 'AbortError' }),

  loading: () => new Promise(() => {}), // Never resolves
};

/**
 * Test data for different scenarios
 */
export const testScenarios = {
  // Empty state
  noArticles: createMockApiResponse([]),

  // Normal state with articles
  withArticles: createMockApiResponse(createMockArticles(8)),

  // Search results
  searchResults: (celebrity: string) =>
    createMockApiResponse(createCelebrityArticles(celebrity, 5)),

  // Pagination
  secondPage: createMockApiResponse(
    createMockArticles(5).map((article, index) => ({
      ...article,
      title: `Page 2 Article ${index + 1}`,
    }))
  ),

  // Large dataset
  manyArticles: createMockApiResponse(createMockArticles(50)),
};

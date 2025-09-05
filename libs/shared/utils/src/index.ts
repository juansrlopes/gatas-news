// Environment configuration utilities
export const getEnvConfig = () => {
  return {
    // API Configuration
    apiUrl: process.env['NEXT_PUBLIC_API_URL'] || process.env['API_URL'] || 'http://localhost:8000',
    newsApiEndpoint: process.env['NEXT_PUBLIC_NEWS_API_ENDPOINT'] || '/news',

    // Mock API flag - set to false when real API is ready
    useMockApi: process.env['NEXT_PUBLIC_USE_MOCK_API'] !== 'false',

    // External APIs
    newsApiKey: process.env['NEWS_API_KEY'],
    guardianApiKey: process.env['GUARDIAN_API_KEY'],

    // App Configuration
    appName: process.env['NEXT_PUBLIC_APP_NAME'] || 'Gatas News',
    appDescription:
      process.env['NEXT_PUBLIC_APP_DESCRIPTION'] ||
      'O portal de notícias sobre as mulheres mais admiradas do mundo',

    // Image Proxy Configuration
    allowedImageDomains: process.env['ALLOWED_IMAGE_DOMAINS']?.split(',') || [],

    // Development
    isDevelopment: process.env['NODE_ENV'] === 'development',
    isProduction: process.env['NODE_ENV'] === 'production',

    // Server Configuration
    port: parseInt(process.env['PORT'] || '8000', 10),
  } as const;
};

// Array utilities
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Deduplication utilities
export const filterDuplicates = <T>(
  items: T[],
  keyExtractor: (item: T) => string | number = item => JSON.stringify(item)
): T[] => {
  const seen = new Set<string | number>();
  return items.filter(item => {
    const key = keyExtractor(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

// String utilities
export const normalizeString = (str: string): string => {
  return str.toLowerCase().trim();
};

export const containsKeyword = (text: string, keyword: string): boolean => {
  return normalizeString(text).includes(normalizeString(keyword));
};

// Date utilities
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const sortByDate = <T extends { publishedAt?: string }>(
  items: T[],
  order: 'asc' | 'desc' = 'desc'
): T[] => {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.publishedAt || 0).getTime();
    const dateB = new Date(b.publishedAt || 0).getTime();
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
};

// Validation utilities
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Pagination utilities
export const paginate = <T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; hasMore: boolean; totalPages: number } => {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = items.slice(startIndex, endIndex);
  const totalPages = Math.ceil(items.length / pageSize);
  const hasMore = page < totalPages;

  return {
    items: paginatedItems,
    hasMore,
    totalPages,
  };
};

// Error handling utilities
export const createApiError = (message: string, status?: number, code?: string) => {
  return {
    message,
    status: status || 500,
    code: code || 'INTERNAL_ERROR',
  };
};

export const handleAsyncError = async <T>(
  asyncFn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> => {
  try {
    return await asyncFn();
  } catch (error) {
    console.error('Async operation failed:', error);
    return fallback;
  }
};

// Celebrity utilities
export const isArticleAboutCelebrity = (
  article: { title?: string; content?: string; description?: string },
  celebrityName: string
): boolean => {
  if (!article || !celebrityName) return false;

  const lowerCaseName = normalizeString(celebrityName);
  const title = article.title || '';
  const content = article.content || '';
  const description = article.description || '';

  return (
    containsKeyword(title, lowerCaseName) ||
    containsKeyword(content, lowerCaseName) ||
    containsKeyword(description, lowerCaseName)
  );
};

export default {
  getEnvConfig,
  shuffleArray,
  filterDuplicates,
  normalizeString,
  containsKeyword,
  formatDate,
  sortByDate,
  isValidUrl,
  isValidEmail,
  paginate,
  createApiError,
  handleAsyncError,
  isArticleAboutCelebrity,
};

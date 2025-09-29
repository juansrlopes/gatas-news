/**
 * Serper API Types
 * 
 * Types for Google Search API integration via Serper.dev
 * Provides comprehensive news search with Brazilian content focus
 */

export interface SerperNewsResult {
  title: string;
  link: string;
  snippet: string;
  date: string;
  source: string;
  imageUrl?: string;
  position: number;
}

export interface SerperResponse {
  news: SerperNewsResult[];
  searchParameters: {
    q: string;
    gl: string;
    hl: string;
    num: number;
    type: string;
  };
  searchInformation: {
    totalResults: string;
    timeTaken: number;
    originalQuery: string;
  };
}

export interface SerperSearchOptions {
  query: string;
  location?: string;        // Country code (e.g., 'br' for Brazil)
  language?: string;        // Language code (e.g., 'pt' for Portuguese)
  num?: number;            // Number of results (1-100)
  dateRestrict?: string;   // Date restriction (e.g., 'd1', 'w1', 'm1')
  sortBy?: 'relevance' | 'date';
  // Removed tbm parameter - using /news endpoint instead
}

export interface SerperArticle {
  url: string;
  title: string;
  description: string;
  publishedAt: string;
  source: {
    id: string | null;
    name: string;
  };
  urlToImage?: string;
  author?: string;
  content?: string;
  celebrity?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  isActive?: boolean;
}

export interface SerperFetchResult {
  success: boolean;
  articlesProcessed: number;
  newArticlesAdded: number;
  duplicatesFound: number;
  errors: string[];
  duration: number;
  searchQuery: string;
  totalResults: number;
}

export interface SerperApiError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

export interface SerperKeyStatus {
  isValid: boolean;
  remainingQuota?: number;
  resetTime?: Date;
  keyUsed: string;
  error?: string;
}

/**
 * Brazilian Celebrity Search Query Templates
 */
export const BRAZILIAN_CELEBRITY_QUERIES = {
  // Entertainment news focused on Brazilian celebrities
  ENTERTAINMENT: (celebrity: string) => `"${celebrity}" entretenimento OR celebridade OR famosa site:br`,
  
  // News with broader coverage
  NEWS: (celebrity: string) => `"${celebrity}" notícias OR news site:br`,
  
  // Social media and lifestyle
  LIFESTYLE: (celebrity: string) => `"${celebrity}" instagram OR vida pessoal OR relacionamento site:br`,
  
  // Professional and career news
  CAREER: (celebrity: string) => `"${celebrity}" carreira OR trabalho OR projeto site:br`,
  
  // Combined comprehensive search
  COMPREHENSIVE: (celebrity: string) => `"${celebrity}" (entretenimento OR notícias OR celebridade OR famosa OR instagram) site:br`,
};

/**
 * Brazilian News Source Preferences
 */
export const BRAZILIAN_NEWS_SOURCES = [
  'g1.globo.com',
  'uol.com.br',
  'terra.com.br',
  'metropoles.com',
  'extra.globo.com',
  'purepeople.com.br',
  'caras.uol.com.br',
  'quem.globo.com',
  'gshow.globo.com',
  'istoe.com.br',
  'veja.abril.com.br',
  'r7.com',
  'band.uol.com.br',
  'sbt.com.br',
];

export default {
  BRAZILIAN_CELEBRITY_QUERIES,
  BRAZILIAN_NEWS_SOURCES,
};

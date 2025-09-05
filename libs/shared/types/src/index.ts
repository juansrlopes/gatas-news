// Article types
export interface Article {
  url: string;
  urlToImage: string;
  title: string;
  description: string;
  publishedAt?: string;
  source?: {
    id: string | null;
    name: string;
  };
  author?: string;
  content?: string;
}

// API Response types
export interface NewsApiResponse {
  articles: Article[];
  totalResults?: number;
  status?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// Component Props types
export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

// Instagram types
export interface InstagramProfile {
  username: string;
  displayName?: string;
  profileUrl: string;
}

// Pagination types
export interface PaginationState {
  page: number;
  hasMore: boolean;
  loading: boolean;
}

// Hook return types
export interface UseArticlesReturn {
  articles: Article[];
  loading: boolean;
  error: string;
  fetchArticles: (page?: number, query?: string) => Promise<void>;
  loadMore: () => void;
  hasMore: boolean;
}

export interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  handleSearch: () => void;
  handleClear: () => void;
}

// Legacy celebrity types (kept for backward compatibility)
export interface CelebrityList {
  celebrities: string[];
}

// API Request/Response types
export interface NewsRequest {
  page?: number;
  celebrityName?: string;
  pageSize?: number;
}

export interface NewsResponse {
  articles: Article[];
  totalResults?: number;
  page?: number;
  totalPages?: number;
  hasMore?: boolean;
}

// Enhanced API Response types for new endpoints
export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface TrendingResponse {
  trending: string[];
  count: number;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  node: string;
}

export interface DetailedHealthResponse extends HealthResponse {
  memory: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
    external: string;
  };
  cache: {
    keys: number;
    hits: number;
    misses: number;
    hitRate: string;
  };
  services: {
    newsApi: string;
    cache: string;
    logging: string;
  };
}

// Celebrity Management Types
export interface CelebrityBase {
  name: string;
  slug: string;
  aliases: string[];
  category: 'actress' | 'singer' | 'influencer' | 'model' | 'athlete' | 'presenter' | 'other';
  priority: number; // 1-10
  isActive: boolean;
  socialMedia?: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
  searchTerms: string[];
  description?: string;
  totalArticles: number;
  lastFetchedAt?: Date;
  avgArticlesPerDay: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Celebrity {
  _id: string;
  name: string;
  slug: string;
  aliases: string[];
  category: 'actress' | 'singer' | 'influencer' | 'model' | 'athlete' | 'presenter' | 'other';
  priority: number; // 1-10
  isActive: boolean;
  socialMedia?: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
  searchTerms: string[];
  description?: string;
  totalArticles: number;
  lastFetchedAt?: Date;
  avgArticlesPerDay: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CelebrityCreateRequest {
  name: string;
  category: CelebrityBase['category'];
  priority?: number;
  aliases?: string[];
  searchTerms?: string[];
  socialMedia?: CelebrityBase['socialMedia'];
  description?: string;
}

export interface CelebrityUpdateRequest extends Partial<CelebrityCreateRequest> {
  isActive?: boolean;
}

export interface CelebrityFilters {
  category?: string;
  minPriority?: number;
  maxPriority?: number;
  isActive?: boolean;
  hasArticles?: boolean;
}

export interface CelebritySearchOptions {
  page: number;
  limit: number;
  sortBy?: 'name' | 'priority' | 'totalArticles' | 'avgArticlesPerDay' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CelebrityListResponse {
  celebrities: Celebrity[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasMore: boolean;
}

export interface CelebrityStatsResponse {
  totalCelebrities: number;
  activeCelebrities: number;
  inactiveCelebrities: number;
  categoriesBreakdown: Array<{ category: string; count: number }>;
  priorityBreakdown: Array<{ priority: number; count: number }>;
  topPerformers: Celebrity[];
  recentlyAdded: Celebrity[];
}

export interface MigrationResult {
  created: number;
  skipped: number;
  errors: string[];
}

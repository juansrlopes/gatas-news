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
export interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  handleSearch: () => void;
  handleClear: () => void;
}

/**
 * API Configuration for Frontend
 */

// Get the API base URL from environment or default to localhost:8000
const getApiBaseUrl = (): string => {
  // In production, this would come from environment variables
  // For development, we use the local API server
  if (typeof window !== 'undefined') {
    // Client-side
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  } else {
    // Server-side (SSR)
    return process.env.API_BASE_URL || 'http://localhost:8000';
  }
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Helper function to create full API URLs
 */
export const createApiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

/**
 * Common API endpoints
 */
export const API_ENDPOINTS = {
  // Health
  HEALTH: '/health',

  // News
  NEWS: '/api/v1/news',

  // Admin - Celebrities
  ADMIN_CELEBRITIES: '/api/v1/admin/celebrities',
  ADMIN_CELEBRITIES_SEARCH: '/api/v1/admin/celebrities/search',
  ADMIN_CELEBRITIES_STATS: '/api/v1/admin/celebrities/stats',

  // Admin - System
  ADMIN_SYSTEM_HEALTH: '/api/v1/admin/system/health',
  ADMIN_DATABASE_STATS: '/api/v1/admin/database/stats',

  // Admin - Articles
  ADMIN_ARTICLES_STATS: '/api/v1/admin/articles/stats',

  // Admin - Fetch
  ADMIN_FETCH_TRIGGER: '/api/v1/admin/fetch/trigger',
  ADMIN_FETCH_STATUS: '/api/v1/admin/fetch/status',
} as const;

/**
 * Helper function to get full URL for a specific endpoint
 */
export const getApiUrl = (endpoint: keyof typeof API_ENDPOINTS): string => {
  return createApiUrl(API_ENDPOINTS[endpoint]);
};

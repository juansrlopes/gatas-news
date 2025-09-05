// Environment configuration
export const config = {
  // API Configuration
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  newsApiEndpoint: process.env.NEXT_PUBLIC_NEWS_API_ENDPOINT || '/api/news',

  // Mock API flag - set to false when real API is ready
  useMockApi: process.env.NEXT_PUBLIC_USE_MOCK_API !== 'false',

  // External APIs
  newsApiKey: process.env.NEWS_API_KEY,
  guardianApiKey: process.env.GUARDIAN_API_KEY,

  // App Configuration
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Gatas News',
  appDescription:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
    'O portal de notícias sobre as mulheres mais admiradas do mundo',

  // Image Proxy Configuration
  allowedImageDomains: process.env.ALLOWED_IMAGE_DOMAINS?.split(',') || [],

  // Development
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;

export default config;

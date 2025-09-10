import axios from 'axios';
import logger from './logger';

/**
 * API Key Status Interface
 */
export interface ApiKeyStatus {
  isValid: boolean;
  isRateLimited: boolean;
  error?: string;
  message?: string;
  keyUsed: string;
}

/**
 * Validates NewsAPI key by making a minimal test request
 *
 * @param apiKey - The NewsAPI key to validate
 * @returns Promise<ApiKeyStatus> - Status of the API key
 */
export async function validateNewsApiKey(apiKey: string): Promise<ApiKeyStatus> {
  try {
    // Test API key quietly

    // Make minimal test request to NewsAPI
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: 'test',
        apiKey: apiKey,
        pageSize: 1, // Minimal request
      },
      timeout: 10000, // 10 second timeout
    });

    if (response.data.status === 'ok') {
      return {
        isValid: true,
        isRateLimited: false,
        keyUsed: apiKey,
      };
    } else {
      return {
        isValid: false,
        isRateLimited: false,
        error: response.data.message || 'Unknown error',
        keyUsed: apiKey,
      };
    }
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { code?: string; message?: string } } };
    const errorData = axiosError.response?.data;

    if (errorData?.code === 'rateLimited') {
      return {
        isValid: false,
        isRateLimited: true,
        error: 'RATE_LIMITED',
        message: errorData.message,
        keyUsed: apiKey,
      };
    }

    if (errorData?.code === 'apiKeyInvalid') {
      return {
        isValid: false,
        isRateLimited: false,
        error: 'INVALID_KEY',
        message: errorData.message,
        keyUsed: apiKey,
      };
    }

    // Network or other errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
    return {
      isValid: false,
      isRateLimited: false,
      error: 'NETWORK_ERROR',
      message: errorMessage,
      keyUsed: apiKey,
    };
  }
}

/**
 * Tests all available API keys and returns the first working one
 *
 * @param apiKeys - Array of API keys to test
 * @returns Promise<ApiKeyStatus> - Status of the first working key or last error
 */
export async function findWorkingApiKey(apiKeys: string[]): Promise<ApiKeyStatus> {
  // Test keys quietly - only log important results
  for (let i = 0; i < apiKeys.length; i++) {
    const key = apiKeys[i];
    const status = await validateNewsApiKey(key);

    if (status.isValid) {
      // Only log success
      return status;
    }
  }

  // No working keys found
  return {
    isValid: false,
    isRateLimited: true, // Assume rate limited if all keys failed
    error: 'ALL_KEYS_FAILED',
    message: 'All API keys are either rate limited or invalid',
    keyUsed: 'none',
  };
}

/**
 * Validates API keys on server startup - CRASHES SERVER if no working keys
 *
 * @param config - Environment configuration object
 * @throws Error if no working API keys are found
 */
export async function validateApiKeysOnStartup(
  config: ReturnType<typeof import('../../../../libs/shared/utils/src/index').getEnvConfig>
): Promise<void> {
  // Collect all available API keys
  const apiKeys: string[] = [];

  if (config.newsApiKey) apiKeys.push(config.newsApiKey);
  if (config.newsApiKeyBackup) apiKeys.push(config.newsApiKeyBackup);
  if (config.newsApiKeyBackup2) apiKeys.push(config.newsApiKeyBackup2);

  if (apiKeys.length === 0) {
    logger.error('🚨 FATAL ERROR: NO API KEYS CONFIGURED!');
    logger.error('Please configure NewsAPI keys in your environment');
    logger.error('Get API keys from: https://newsapi.org/register');
    throw new Error('NO_API_KEYS_CONFIGURED');
  }

  // Test all keys and find a working one (quietly)
  const result = await findWorkingApiKey(apiKeys);

  if (!result.isValid) {
    let errorMsg = '';

    if (result.isRateLimited) {
      errorMsg = `
🚨 FATAL ERROR: ALL API KEYS ARE RATE LIMITED!

NewsAPI Developer Account Limits:
- 100 requests per 24 hours
- 50 requests available every 12 hours

Current Status: ${result.message}

Solutions:
1. ⏰ WAIT: Keys will reset in ~24 hours from last usage
2. 🔑 NEW KEYS: Get additional API keys from https://newsapi.org/register  
3. 💰 UPGRADE: Purchase a paid NewsAPI plan for higher limits

The server will not start until working API keys are available.
`;
    } else {
      errorMsg = `
🚨 FATAL ERROR: NO VALID API KEYS FOUND!

All configured API keys failed validation.
Error: ${result.error}
Message: ${result.message}

Please check your API keys and try again.
Get new keys from: https://newsapi.org/register
`;
    }

    logger.error(errorMsg);
    throw new Error(result.error || 'API_KEYS_VALIDATION_FAILED');
  }

  // Success - no need to log, handled by server.ts
}

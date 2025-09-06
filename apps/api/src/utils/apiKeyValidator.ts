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
    logger.info(`🔑 Testing API key: ${apiKey.substring(0, 8)}...`);

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
      logger.info(`✅ API key is valid and working`);
      return {
        isValid: true,
        isRateLimited: false,
        keyUsed: apiKey,
      };
    } else {
      logger.error(`❌ API key returned unexpected status: ${response.data.status}`);
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
      logger.error(`🚫 API key is RATE LIMITED: ${errorData.message}`);
      return {
        isValid: false,
        isRateLimited: true,
        error: 'RATE_LIMITED',
        message: errorData.message,
        keyUsed: apiKey,
      };
    }

    if (errorData?.code === 'apiKeyInvalid') {
      logger.error(`🔑 API key is INVALID: ${errorData.message}`);
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
    logger.error(`🌐 Network error testing API key:`, errorMessage);
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
  logger.info(`🔍 Testing ${apiKeys.length} API keys...`);

  for (let i = 0; i < apiKeys.length; i++) {
    const key = apiKeys[i];
    logger.info(`📋 Testing key ${i + 1}/${apiKeys.length}: ${key.substring(0, 8)}...`);

    const status = await validateNewsApiKey(key);

    if (status.isValid) {
      logger.info(`🎉 Found working API key: ${key.substring(0, 8)}...`);
      return status;
    }

    if (status.isRateLimited) {
      logger.warn(`⏳ Key ${i + 1} is rate limited, trying next...`);
    } else {
      logger.warn(`❌ Key ${i + 1} failed: ${status.error}, trying next...`);
    }
  }

  // No working keys found
  logger.error(`💥 NO WORKING API KEYS FOUND!`);
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
  logger.info('🚀 VALIDATING API KEYS ON STARTUP...');

  // Collect all available API keys
  const apiKeys: string[] = [];

  if (config.newsApiKey) apiKeys.push(config.newsApiKey);
  if (config.newsApiKeyBackup) apiKeys.push(config.newsApiKeyBackup);
  if (config.newsApiKeyBackup2) apiKeys.push(config.newsApiKeyBackup2);

  if (apiKeys.length === 0) {
    const errorMsg = `
🚨 FATAL ERROR: NO API KEYS CONFIGURED!

Please configure at least one NewsAPI key in your environment:
- NEWS_API_KEY=your_primary_key
- NEWS_API_KEY_BACKUP=your_backup_key  
- NEWS_API_KEY_BACKUP_2=your_second_backup_key

Get API keys from: https://newsapi.org/register
`;
    logger.error(errorMsg);
    throw new Error('NO_API_KEYS_CONFIGURED');
  }

  logger.info(`📋 Found ${apiKeys.length} API keys to validate`);

  // Test all keys and find a working one
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

  logger.info(`✅ API KEY VALIDATION SUCCESSFUL!`);
  logger.info(`🔑 Using API key: ${result.keyUsed.substring(0, 8)}...`);
}

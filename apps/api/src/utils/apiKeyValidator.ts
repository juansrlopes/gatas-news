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
 * Validates Serper API key by making a minimal test request
 *
 * @param apiKey - The Serper API key to validate
 * @returns Promise<ApiKeyStatus> - Status of the API key
 */
export async function validateSerperApiKey(apiKey: string): Promise<ApiKeyStatus> {
  try {
    // Test API key quietly

    // Make minimal test request to Serper API
    const response = await axios.post('https://google.serper.dev/search', {
      q: 'test',
      gl: 'us',
      hl: 'en',
      num: 1, // Minimal request
    }, {
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    if (response.status === 200 && response.data) {
      return {
        isValid: true,
        isRateLimited: false,
        keyUsed: apiKey,
      };
    } else {
      return {
        isValid: false,
        isRateLimited: false,
        error: 'Invalid response from Serper API',
        keyUsed: apiKey,
      };
    }
  } catch (error: unknown) {
    const axiosError = error as { response?: { status?: number; data?: { error?: { message?: string } } } };
    
    if (axiosError.response?.status === 429) {
      return {
        isValid: false,
        isRateLimited: true,
        error: 'RATE_LIMITED',
        message: 'Serper API rate limit exceeded',
        keyUsed: apiKey,
      };
    }

    if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
      return {
        isValid: false,
        isRateLimited: false,
        error: 'INVALID_KEY',
        message: 'Invalid Serper API key',
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
 * Tests all available Serper API keys and returns the first working one
 *
 * @param apiKeys - Array of Serper API keys to test
 * @returns Promise<ApiKeyStatus> - Status of the first working key or last error
 */
export async function findWorkingSerperKey(apiKeys: string[]): Promise<ApiKeyStatus> {
  // Test keys quietly - only log important results
  for (let i = 0; i < apiKeys.length; i++) {
    const key = apiKeys[i];
    const status = await validateSerperApiKey(key);

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
    message: 'All Serper API keys are either rate limited or invalid',
    keyUsed: 'none',
  };
}

/**
 * Validates Serper API keys on server startup - CRASHES SERVER if no working keys
 *
 * @param config - Environment configuration object
 * @throws Error if no working Serper API keys are found
 */
export async function validateApiKeysOnStartup(
  config: ReturnType<typeof import('../../../../libs/shared/utils/src/index').getEnvConfig>
): Promise<void> {
  // Collect all available Serper API keys
  const apiKeys: string[] = [];

  if (config.serperApiKey) apiKeys.push(config.serperApiKey);
  if (config.serperApiKeyBackup) apiKeys.push(config.serperApiKeyBackup);

  if (apiKeys.length === 0) {
    logger.error('🚨 FATAL ERROR: NO SERPER API KEYS CONFIGURED!');
    logger.error('Please configure Serper API keys in your environment');
    logger.error('Get API keys from: https://serper.dev/');
    throw new Error('NO_SERPER_KEYS_CONFIGURED');
  }

  // Test all keys and find a working one (quietly)
  const result = await findWorkingSerperKey(apiKeys);

  if (!result.isValid) {
    let errorMsg = '';

    if (result.isRateLimited) {
      errorMsg = `
🚨 FATAL ERROR: ALL SERPER API KEYS ARE RATE LIMITED!

Serper API Limits:
- Free tier: 2,500 searches per month
- Rate limits may apply for excessive usage

Current Status: ${result.message}

Solutions:
1. ⏰ WAIT: Rate limits typically reset within an hour
2. 🔑 NEW KEYS: Get additional API keys from https://serper.dev/
3. 💰 UPGRADE: Purchase a paid Serper plan for higher limits

The server will not start until working API keys are available.
`;
    } else {
      errorMsg = `
🚨 FATAL ERROR: NO VALID SERPER API KEYS FOUND!

All configured Serper API keys failed validation.
Error: ${result.error}
Message: ${result.message}

Please check your Serper API keys and try again.
Get new keys from: https://serper.dev/
`;
    }

    logger.error(errorMsg);
    throw new Error(result.error || 'SERPER_KEYS_VALIDATION_FAILED');
  }

  // Success - no need to log, handled by server.ts
}

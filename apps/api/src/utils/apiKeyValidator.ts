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

const SERPER_SEARCH_URL = 'https://google.serper.dev/search';
/** Exact same request as npm run validateKeys (test-api-keys.js) */
const SERPER_TEST_BODY = { q: 'test', gl: 'br', hl: 'pt', num: 1 };
const SERPER_USER_AGENT = 'Gatas-News-KeyTester/1.0';

function doSerperTest(apiKey: string, useBearer: boolean) {
  const trimmedKey = (apiKey || '').trim();
  return axios.post(SERPER_SEARCH_URL, SERPER_TEST_BODY, {
    headers: {
      ...(useBearer ? { Authorization: `Bearer ${trimmedKey}` } : { 'X-API-KEY': trimmedKey }),
      'Content-Type': 'application/json',
      'User-Agent': SERPER_USER_AGENT,
    },
    timeout: 10000,
  });
}

/**
 * Validates Serper API key by making the exact same request as validateKeys script
 * Uses gl: 'br', hl: 'pt', User-Agent. On 403 with X-API-KEY, retries with Authorization: Bearer.
 */
export async function validateSerperApiKey(apiKey: string): Promise<ApiKeyStatus> {
  const trimmedKey = (apiKey || '').trim();
  if (!trimmedKey) {
    return { isValid: false, isRateLimited: false, error: 'EMPTY_KEY', message: 'No key provided', keyUsed: '' };
  }
  try {
    let response;
    try {
      response = await doSerperTest(trimmedKey, false);
    } catch (firstErr: unknown) {
      const status = (firstErr as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        try {
          response = await doSerperTest(trimmedKey, true);
        } catch {
          return {
            isValid: false,
            isRateLimited: false,
            error: 'INVALID_KEY',
            message: 'Invalid Serper API key (403 with both X-API-KEY and Bearer)',
            keyUsed: trimmedKey.substring(0, 8) + '...',
          };
        }
      } else {
        throw firstErr;
      }
    }

    if (response.status === 200 && response.data) {
      return {
        isValid: true,
        isRateLimited: false,
        keyUsed: trimmedKey.substring(0, 8) + '...',
      };
    }
    return {
      isValid: false,
      isRateLimited: false,
      error: 'Invalid response from Serper API',
      keyUsed: trimmedKey.substring(0, 8) + '...',
    };
  } catch (error: unknown) {
    const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
    if (axiosError.response?.status === 429) {
      return {
        isValid: false,
        isRateLimited: true,
        error: 'RATE_LIMITED',
        message: 'Serper API rate limit exceeded',
        keyUsed: trimmedKey.substring(0, 8) + '...',
      };
    }
    if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
      return {
        isValid: false,
        isRateLimited: false,
        error: 'INVALID_KEY',
        message: axiosError.response?.data?.message || 'Invalid Serper API key',
        keyUsed: trimmedKey.substring(0, 8) + '...',
      };
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
    return {
      isValid: false,
      isRateLimited: false,
      error: 'NETWORK_ERROR',
      message: errorMessage,
      keyUsed: trimmedKey.substring(0, 8) + '...',
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
  // Collect all available Serper API keys (trimmed, same order as validateKeys script)
  const apiKeys: string[] = [];
  const raw = [
    config.serperApiKey,
    config.serperApiKeyBackup,
    config.serperApiKey2,
    config.serperApiKey3,
  ].filter(Boolean) as string[];
  raw.forEach((k) => {
    const t = k.trim();
    if (t) apiKeys.push(t);
  });

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

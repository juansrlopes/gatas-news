import { getEnvConfig } from '../../../../libs/shared/utils/src/index';
import { validateNewsApiKey, ApiKeyStatus } from '../utils/apiKeyValidator';
import logger from '../utils/logger';

/**
 * Enhanced API Key Status with health metrics
 */
export interface EnhancedApiKeyStatus extends ApiKeyStatus {
  keyIndex: number;
  keyId: string; // First 8 chars for identification
  lastChecked: Date;
  lastUsed: Date;
  consecutiveFailures: number;
  totalRequests: number;
  successfulRequests: number;
  rateLimitedCount: number;
  healthScore: number; // 0-100 score based on recent performance
  estimatedResetTime?: Date;
  isPreferred: boolean;
}

/**
 * Key usage statistics
 */
export interface KeyUsageStats {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  rateLimitEvents: number;
  lastRateLimitTime?: Date;
  dailyUsage: number;
  remainingQuota?: number;
}

/**
 * Smart API Key Manager with health monitoring and intelligent rotation
 */
export class ApiKeyManager {
  private static instance: ApiKeyManager;
  private keyStatuses: Map<string, EnhancedApiKeyStatus> = new Map();
  private currentKeyIndex = 0;
  private lastHealthCheck = new Date(0);
  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly RATE_LIMIT_COOLDOWN = 60 * 60 * 1000; // 1 hour

  private constructor() {
    this.initializeKeys();
  }

  public static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  /**
   * Initialize all available API keys with default status
   */
  private initializeKeys(): void {
    const config = getEnvConfig();
    const keys: string[] = [];

    if (config.newsApiKey) keys.push(config.newsApiKey);
    if (config.newsApiKeyBackup) keys.push(config.newsApiKeyBackup);
    if (config.newsApiKeyBackup2) keys.push(config.newsApiKeyBackup2);

    keys.forEach((key, index) => {
      const keyId = this.generateKeyId(key);
      const status: EnhancedApiKeyStatus = {
        keyIndex: index,
        keyId,
        isValid: true,
        isRateLimited: false,
        keyUsed: key,
        lastChecked: new Date(0),
        lastUsed: new Date(0),
        consecutiveFailures: 0,
        totalRequests: 0,
        successfulRequests: 0,
        rateLimitedCount: 0,
        healthScore: 100,
        isPreferred: index === 0, // First key is initially preferred
      };
      this.keyStatuses.set(keyId, status);
    });

    logger.info(`🔑 Initialized ${keys.length} API keys for management`);
  }

  /**
   * Generate a safe identifier for logging (first 8 chars)
   */
  private generateKeyId(key: string): string {
    return key.substring(0, 8) + '...';
  }

  /**
   * Get the best available API key based on health scores
   */
  public async getBestApiKey(): Promise<string | null> {
    await this.performHealthCheckIfNeeded();

    // Sort keys by health score and preference
    const sortedKeys = Array.from(this.keyStatuses.values())
      .filter(status => status.isValid && !this.isInCooldown(status))
      .sort((a, b) => {
        // Prefer non-rate-limited keys
        if (a.isRateLimited !== b.isRateLimited) {
          return a.isRateLimited ? 1 : -1;
        }
        // Then by health score
        if (a.healthScore !== b.healthScore) {
          return b.healthScore - a.healthScore;
        }
        // Finally by preference (original order)
        return a.keyIndex - b.keyIndex;
      });

    if (sortedKeys.length === 0) {
      logger.error('🚨 No healthy API keys available!');
      return null;
    }

    const bestKey = sortedKeys[0];
    logger.info(`🎯 Selected API key ${bestKey.keyId} (health: ${bestKey.healthScore})`);

    // Update usage tracking
    bestKey.lastUsed = new Date();
    bestKey.totalRequests++;

    return bestKey.keyUsed;
  }

  /**
   * Report the result of an API request for key health tracking
   */
  public reportKeyUsage(
    key: string,
    success: boolean,
    isRateLimited: boolean = false,
    _responseTime?: number
  ): void {
    const keyId = this.generateKeyId(key);
    const status = this.keyStatuses.get(keyId);

    if (!status) {
      logger.warn(`🔍 Unknown API key reported: ${keyId}`);
      return;
    }

    // Update statistics
    if (success) {
      status.successfulRequests++;
      status.consecutiveFailures = 0;
      status.healthScore = Math.min(100, status.healthScore + 2);
    } else {
      status.consecutiveFailures++;
      status.healthScore = Math.max(0, status.healthScore - 10);
    }

    if (isRateLimited) {
      status.isRateLimited = true;
      status.rateLimitedCount++;
      status.estimatedResetTime = new Date(Date.now() + this.RATE_LIMIT_COOLDOWN);
      status.healthScore = Math.max(0, status.healthScore - 20);

      logger.warn(
        `⚠️ API key ${keyId} rate limited (cooldown until ${status.estimatedResetTime?.toLocaleTimeString()})`
      );
    }

    // Mark as invalid if too many consecutive failures
    if (status.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      status.isValid = false;
      logger.error(
        `❌ API key ${keyId} marked as invalid after ${this.MAX_CONSECUTIVE_FAILURES} failures`
      );
    }

    status.lastUsed = new Date();
  }

  /**
   * Check if a key is in cooldown period
   */
  private isInCooldown(status: EnhancedApiKeyStatus): boolean {
    if (!status.isRateLimited || !status.estimatedResetTime) {
      return false;
    }

    const now = new Date();
    if (now >= status.estimatedResetTime) {
      // Cooldown period over, reset rate limit status
      status.isRateLimited = false;
      status.estimatedResetTime = undefined;
      status.healthScore = Math.min(100, status.healthScore + 10);
      logger.info(`✅ API key ${status.keyId} cooldown period ended`);
      return false;
    }

    return true;
  }

  /**
   * Perform health check on all keys if needed
   */
  private async performHealthCheckIfNeeded(): Promise<void> {
    const now = new Date();
    const timeSinceLastCheck = now.getTime() - this.lastHealthCheck.getTime();

    if (timeSinceLastCheck < this.HEALTH_CHECK_INTERVAL) {
      return; // Too soon for another check
    }

    logger.info('🏥 Performing API key health check...');
    this.lastHealthCheck = now;

    const promises = Array.from(this.keyStatuses.values()).map(async status => {
      try {
        const result = await validateNewsApiKey(status.keyUsed);

        status.isValid = result.isValid;
        status.isRateLimited = result.isRateLimited;
        status.lastChecked = now;

        if (result.isValid) {
          status.healthScore = Math.min(100, status.healthScore + 5);
          status.consecutiveFailures = 0;
        } else {
          status.healthScore = Math.max(0, status.healthScore - 5);
        }

        if (result.isRateLimited) {
          status.estimatedResetTime = new Date(Date.now() + this.RATE_LIMIT_COOLDOWN);
        }
      } catch (error) {
        logger.error(`Health check failed for key ${status.keyId}:`, error);
        status.healthScore = Math.max(0, status.healthScore - 10);
      }
    });

    await Promise.all(promises);

    const healthyKeys = Array.from(this.keyStatuses.values()).filter(
      s => s.isValid && !s.isRateLimited
    );
    logger.info(
      `🏥 Health check complete: ${healthyKeys.length}/${this.keyStatuses.size} keys healthy`
    );
  }

  /**
   * Force health check on all keys
   */
  public async forceHealthCheck(): Promise<void> {
    this.lastHealthCheck = new Date(0); // Reset timer
    await this.performHealthCheckIfNeeded();
  }

  /**
   * Get comprehensive status of all API keys
   */
  public getKeyStatuses(): EnhancedApiKeyStatus[] {
    return Array.from(this.keyStatuses.values()).sort((a, b) => a.keyIndex - b.keyIndex);
  }

  /**
   * Get usage statistics for all keys
   */
  public getUsageStatistics(): Record<string, KeyUsageStats> {
    const stats: Record<string, KeyUsageStats> = {};

    this.keyStatuses.forEach((status, keyId) => {
      stats[keyId] = {
        totalRequests: status.totalRequests,
        successRate:
          status.totalRequests > 0 ? (status.successfulRequests / status.totalRequests) * 100 : 0,
        averageResponseTime: 0, // TODO: Implement response time tracking
        rateLimitEvents: status.rateLimitedCount,
        lastRateLimitTime: status.estimatedResetTime,
        dailyUsage: status.totalRequests, // TODO: Implement daily reset
        remainingQuota: undefined, // TODO: Estimate based on NewsAPI limits
      };
    });

    return stats;
  }

  /**
   * Reset statistics (useful for daily resets)
   */
  public resetDailyStatistics(): void {
    this.keyStatuses.forEach(status => {
      status.totalRequests = 0;
      status.successfulRequests = 0;
      status.rateLimitedCount = 0;
      // Don't reset health score or consecutive failures
    });

    logger.info('📊 Daily API key statistics reset');
  }

  /**
   * Get the next best key for rotation
   */
  public async getNextBestKey(excludeCurrentKey?: string): Promise<string | null> {
    await this.performHealthCheckIfNeeded();

    const availableKeys = Array.from(this.keyStatuses.values())
      .filter(
        status =>
          status.isValid && !this.isInCooldown(status) && status.keyUsed !== excludeCurrentKey
      )
      .sort((a, b) => b.healthScore - a.healthScore);

    if (availableKeys.length === 0) {
      logger.warn('🔄 No alternative API keys available for rotation');
      return null;
    }

    const nextKey = availableKeys[0];
    logger.info(`🔄 Rotating to API key ${nextKey.keyId} (health: ${nextKey.healthScore})`);

    return nextKey.keyUsed;
  }

  /**
   * Mark a key as invalid (for external error handling)
   */
  public markKeyAsInvalid(key: string, reason: string): void {
    const keyId = this.generateKeyId(key);
    const status = this.keyStatuses.get(keyId);

    if (status) {
      status.isValid = false;
      status.healthScore = 0;
      logger.error(`❌ API key ${keyId} marked as invalid: ${reason}`);
    }
  }

  /**
   * Get summary for logging/monitoring
   */
  public getHealthSummary(): {
    totalKeys: number;
    healthyKeys: number;
    rateLimitedKeys: number;
    invalidKeys: number;
    averageHealthScore: number;
  } {
    const statuses = Array.from(this.keyStatuses.values());
    const healthyKeys = statuses.filter(s => s.isValid && !s.isRateLimited);
    const rateLimitedKeys = statuses.filter(s => s.isRateLimited);
    const invalidKeys = statuses.filter(s => !s.isValid);
    const averageHealthScore =
      statuses.reduce((sum, s) => sum + s.healthScore, 0) / statuses.length;

    return {
      totalKeys: statuses.length,
      healthyKeys: healthyKeys.length,
      rateLimitedKeys: rateLimitedKeys.length,
      invalidKeys: invalidKeys.length,
      averageHealthScore: Math.round(averageHealthScore),
    };
  }
}

export const apiKeyManager = ApiKeyManager.getInstance();

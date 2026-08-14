import logger from '../../utils/logger';

interface UsageStats {
  dailyCount: number;
  monthlyCount: number;
  lastResetDate: string;
  lastCallTimestamp: string;
}

export class SerperUsageTracker {
  private static instance: SerperUsageTracker;
  private usageStats: UsageStats;
  private readonly DAILY_LIMIT = 5000; // Serper free tier allows way more than 100/day (2500/month total)
  private readonly MONTHLY_LIMIT = 2000; // Conservative monthly limit (500 buffer from 2500 total)

  private constructor() {
    this.usageStats = this.loadUsageStats();
  }

  public static getInstance(): SerperUsageTracker {
    if (!SerperUsageTracker.instance) {
      SerperUsageTracker.instance = new SerperUsageTracker();
    }
    return SerperUsageTracker.instance;
  }

  /**
   * Check if we can make an API call without exceeding limits
   */
  public canMakeApiCall(): { allowed: boolean; reason?: string } {
    this.resetCountersIfNeeded();

    if (this.usageStats.dailyCount >= this.DAILY_LIMIT) {
      return {
        allowed: false,
        reason: `Daily limit reached (${this.usageStats.dailyCount}/${this.DAILY_LIMIT})`
      };
    }

    if (this.usageStats.monthlyCount >= this.MONTHLY_LIMIT) {
      return {
        allowed: false,
        reason: `Monthly limit reached (${this.usageStats.monthlyCount}/${this.MONTHLY_LIMIT})`
      };
    }

    return { allowed: true };
  }

  /**
   * Record an API call
   */
  public recordApiCall(): void {
    this.resetCountersIfNeeded();
    
    this.usageStats.dailyCount++;
    this.usageStats.monthlyCount++;
    this.usageStats.lastCallTimestamp = new Date().toISOString();
    
    this.saveUsageStats();
    
    logger.info(`📊 Serper API usage: Daily ${this.usageStats.dailyCount}/${this.DAILY_LIMIT}, Monthly ${this.usageStats.monthlyCount}/${this.MONTHLY_LIMIT}`);
    
    // Warn when approaching limits
    if (this.usageStats.dailyCount >= this.DAILY_LIMIT * 0.8) {
      logger.warn(`⚠️ Approaching daily Serper limit: ${this.usageStats.dailyCount}/${this.DAILY_LIMIT}`);
    }
    
    if (this.usageStats.monthlyCount >= this.MONTHLY_LIMIT * 0.8) {
      logger.warn(`⚠️ Approaching monthly Serper limit: ${this.usageStats.monthlyCount}/${this.MONTHLY_LIMIT}`);
    }
  }

  /**
   * Get current usage statistics
   */
  public getUsageStats(): UsageStats & {
    dailyRemaining: number;
    monthlyRemaining: number;
    dailyLimitReached: boolean;
    monthlyLimitReached: boolean;
  } {
    this.resetCountersIfNeeded();
    
    return {
      ...this.usageStats,
      dailyRemaining: Math.max(0, this.DAILY_LIMIT - this.usageStats.dailyCount),
      monthlyRemaining: Math.max(0, this.MONTHLY_LIMIT - this.usageStats.monthlyCount),
      dailyLimitReached: this.usageStats.dailyCount >= this.DAILY_LIMIT,
      monthlyLimitReached: this.usageStats.monthlyCount >= this.MONTHLY_LIMIT,
    };
  }

  /**
   * Reset counters if day/month has changed
   */
  private resetCountersIfNeeded(): void {
    const now = new Date();
    const lastReset = new Date(this.usageStats.lastResetDate);
    
    // Reset daily counter if it's a new day
    if (now.getDate() !== lastReset.getDate() || 
        now.getMonth() !== lastReset.getMonth() || 
        now.getFullYear() !== lastReset.getFullYear()) {
      
      logger.info(`🔄 Resetting daily Serper usage counter (was ${this.usageStats.dailyCount})`);
      this.usageStats.dailyCount = 0;
    }
    
    // Reset monthly counter if it's a new month
    if (now.getMonth() !== lastReset.getMonth() || 
        now.getFullYear() !== lastReset.getFullYear()) {
      
      logger.info(`🔄 Resetting monthly Serper usage counter (was ${this.usageStats.monthlyCount})`);
      this.usageStats.monthlyCount = 0;
    }
    
    // Update last reset date
    if (this.usageStats.lastResetDate !== now.toDateString()) {
      this.usageStats.lastResetDate = now.toDateString();
      this.saveUsageStats();
    }
  }

  /**
   * Load usage stats from memory (in production, this could be Redis/database)
   */
  private loadUsageStats(): UsageStats {
    // In a real implementation, load from persistent storage
    // For now, start fresh each server restart
    return {
      dailyCount: 0,
      monthlyCount: 0,
      lastResetDate: new Date().toDateString(),
      lastCallTimestamp: '',
    };
  }

  /**
   * Save usage stats to memory (in production, this could be Redis/database)
   */
  private saveUsageStats(): void {
    // In a real implementation, save to persistent storage
    // For now, just keep in memory (will reset on server restart)
  }

  /**
   * Force reset counters (for testing/admin purposes)
   */
  public resetCounters(): void {
    logger.info('🔄 Force resetting all Serper usage counters');
    this.usageStats.dailyCount = 0;
    this.usageStats.monthlyCount = 0;
    this.usageStats.lastResetDate = new Date().toDateString();
    this.saveUsageStats();
  }

  /**
   * Check if a specific API key can be used (for key rotation)
   */
  public canUseKey(apiKey: string): { allowed: boolean; reason?: string } {
    const _keyId = this.getKeyId(apiKey); // Reserved for per-key tracking

    // For now, allow all keys to be used (per-key tracking can be enhanced later)
    // This ensures that if one key is rate limited, others can still be used
    return { allowed: true };
  }

  /**
   * Get key identifier for logging
   */
  private getKeyId(apiKey: string): string {
    return apiKey.substring(0, 8);
  }
}

export const serperUsageTracker = SerperUsageTracker.getInstance();

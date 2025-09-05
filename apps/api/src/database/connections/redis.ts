import Redis from 'ioredis';
import logger from '../../utils/logger';

class RedisConnection {
  private static instance: RedisConnection;
  private client: Redis | null = null;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  public async connect(): Promise<Redis> {
    if (this.client && this.isConnected) {
      logger.debug('Redis already connected');
      return this.client;
    }

    try {
      const redisConfig = this.getRedisConfig();

      this.client = new Redis(redisConfig);

      // Handle connection events
      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('✅ Redis connected successfully', {
          host: redisConfig.host,
          port: redisConfig.port,
          db: redisConfig.db,
        });
      });

      this.client.on('error', error => {
        logger.error('Redis connection error:', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      // Wait for connection to be established
      await new Promise((resolve, reject) => {
        if (this.client) {
          this.client.once('connect', resolve);
          this.client.once('error', reject);
        }
      });

      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info('Redis disconnected gracefully');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  public getClient(): Redis | null {
    return this.client;
  }

  public getConnectionStatus(): boolean {
    return this.isConnected && this.client?.status === 'ready';
  }

  public async ping(): Promise<boolean> {
    try {
      if (!this.client) return false;
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed:', error);
      return false;
    }
  }

  public getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      status: this.client?.status,
      host: this.client?.options.host,
      port: this.client?.options.port,
      db: this.client?.options.db,
    };
  }

  private getRedisConfig() {
    // Support different Redis configurations
    if (process.env.REDIS_URL) {
      // Parse Redis URL (e.g., redis://localhost:6379/0)
      return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      };
    }

    // Default local Redis configuration
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };
  }
}

export const redisConnection = RedisConnection.getInstance();

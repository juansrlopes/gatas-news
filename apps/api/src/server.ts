import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import app from './app';
import logger from './utils/logger';
import { getEnvConfig } from '../../../libs/shared/utils/src/index';
import { mongoConnection } from './database/connections/mongodb';
import { redisConnection } from './database/connections/redis';
import { jobScheduler } from './jobs/scheduler';
import { validateApiKeysOnStartup } from './utils/apiKeyValidator';
import { validateCelebritiesOnStartup } from './middleware/celebrityProtection';
import {
  createAutomaticBackup,
  scheduleAutomaticBackups,
  verifyBackupIntegrity,
} from './utils/celebrityBackup';

// Load environment variables from .env file
// Primary location: apps/api/.env
const envPath = path.join(__dirname, '../.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✅ Environment loaded from: ${envPath}`);
} else {
  console.log(`⚠️ No .env file found at: ${envPath}`);
  console.log('Please create apps/api/.env with required environment variables');
}

const config = getEnvConfig();

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Initialize database connections and services
const initializeServices = async (): Promise<void> => {
  try {
    // Print startup banner
    console.log('\n' + '='.repeat(60));
    console.log('🐱 GATAS NEWS API SERVER');
    console.log('='.repeat(60));
    logger.info('🔧 Initializing services...');
    console.log('');

    // Validate API keys - allow server to start even if rate limited
    logger.info('🔑 Validating NewsAPI keys...');
    try {
      await validateApiKeysOnStartup(config);
      logger.info('✅ NewsAPI keys validated successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'ALL_KEYS_FAILED') {
        logger.warn('⚠️ All NewsAPI keys are rate limited - starting server in LIMITED MODE');
        logger.warn('📋 Admin panel will work, but news fetching is disabled');
        logger.warn('🔄 News fetching will resume when API keys reset');
      } else {
        logger.error('❌ Unexpected error during API key validation:', error);
        throw error; // Re-throw unexpected errors
      }
    }

    // Connect to MongoDB
    logger.info('📊 Connecting to MongoDB...');
    await mongoConnection.connect();

    // CRITICAL: Celebrity protection safeguards
    logger.info('👥 Validating celebrity data...');
    await validateCelebritiesOnStartup();
    logger.info('💾 Creating celebrity backup...');
    await createAutomaticBackup();
    logger.info('🔍 Verifying backup integrity...');
    const backupValid = await verifyBackupIntegrity();
    if (!backupValid) {
      logger.warn('⚠️ Backup integrity check failed, but continuing startup...');
    }

    // Connect to Redis (optional, will fallback to memory cache if fails)
    logger.info('🚀 Connecting to Redis...');
    try {
      await redisConnection.connect();
    } catch {
      logger.warn('⚠️  Redis connection failed, using memory cache only');
    }

    // Initialize job scheduler
    logger.info('⏰ Initializing job scheduler...');
    await jobScheduler.initialize();

    // TEMPORARY: Disable automatic backups for debugging
    // TODO: Re-enable after fixing startup issues
    // logger.info('🔄 Starting automatic celebrity backup scheduler...');
    scheduleAutomaticBackups();

    console.log('');
    logger.info('✅ All services initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize services:', error);
    throw error;
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Stop scheduled jobs
    jobScheduler.stopAllJobs();

    // Close server
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error?: Error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }

    // Disconnect from databases
    await Promise.all([mongoConnection.disconnect(), redisConnection.disconnect()]);

    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Declare server variable
let server: import('http').Server | undefined;

// Start server with service initialization
const startServer = async (): Promise<void> => {
  try {
    // Initialize all services first
    await initializeServices();

    // Start the HTTP server
    server = app.listen(config.port, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🚀 SERVER STARTED SUCCESSFULLY!');
      console.log('='.repeat(60));

      logger.info(`📍 Server running on port ${config.port}`);
      logger.info(`🌍 Environment: ${config.isDevelopment ? 'development' : 'production'}`);

      console.log('\n📋 Available Endpoints:');
      console.log('─'.repeat(40));
      logger.info(`📊 Health check:  http://localhost:${config.port}/health`);
      logger.info(`📰 News API:      http://localhost:${config.port}/api/v1/news`);
      logger.info(`🔧 Admin panel:   http://localhost:${config.port}/api/v1/admin`);

      if (config.isDevelopment) {
        console.log('\n🛠️  Development Features:');
        console.log('─'.repeat(40));
        logger.info(`🔧 Enhanced logging enabled`);
        logger.info(`🚦 Relaxed rate limits`);
        logger.info(`🔄 Auto-reload on file changes`);
      }

      console.log('\n💡 Quick Start:');
      console.log('─'.repeat(40));
      console.log(`   curl http://localhost:${config.port}/health`);
      console.log(`   curl http://localhost:${config.port}/api/v1/news`);

      console.log('\n' + '='.repeat(60));
      console.log('🎉 Ready to serve requests!');
      console.log('='.repeat(60) + '\n');
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default server;

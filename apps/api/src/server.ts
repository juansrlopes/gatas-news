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
    console.log('\n' + '='.repeat(50));
    console.log('🐱 GATAS NEWS API');
    console.log('='.repeat(50));
    console.log('🔧 Starting services...\n');

    // Validate API keys - allow server to start even if rate limited
    process.stdout.write('🔑 Checking API keys... ');
    try {
      await validateApiKeysOnStartup(config);
      console.log('✅');
    } catch (error) {
      if (error instanceof Error && error.message === 'ALL_KEYS_FAILED') {
        console.log('⚠️  Rate limited');
        console.log('   📋 Server will start in LIMITED MODE');
      } else {
        console.log('❌');
        logger.error('Unexpected error during API key validation:', error);
        throw error; // Re-throw unexpected errors
      }
    }

    // Connect to MongoDB
    process.stdout.write('📊 Connecting to MongoDB... ');
    await mongoConnection.connect();
    console.log('✅');

    // CRITICAL: Celebrity protection safeguards
    process.stdout.write('👥 Validating celebrities... ');
    await validateCelebritiesOnStartup();
    await createAutomaticBackup();
    const backupValid = await verifyBackupIntegrity();
    if (backupValid) {
      console.log('✅');
    } else {
      console.log('⚠️  Backup issue (continuing)');
    }

    // Connect to Redis (optional, will fallback to memory cache if fails)
    process.stdout.write('🚀 Connecting to Redis... ');
    try {
      await redisConnection.connect();
      console.log('✅');
    } catch {
      console.log('⚠️  Using memory cache');
    }

    // Initialize job scheduler
    process.stdout.write('⏰ Setting up scheduler... ');
    await jobScheduler.initialize();
    console.log('✅');

    // Schedule automatic backups
    scheduleAutomaticBackups();

    console.log('\n✅ All services ready!');

    // Development-specific information
    if (config.isDevelopment) {
      console.log('\n🛠️  Development Tools:');
      console.log(
        `   🔄 Manual fetch: POST http://localhost:${config.port}/api/v1/admin/fetch-now`
      );
      console.log(
        `   📊 Fetch status: GET http://localhost:${config.port}/api/v1/admin/fetch/status`
      );
      console.log(`   🏥 Health check: GET http://localhost:${config.port}/health`);
      console.log(`   📰 News API: GET http://localhost:${config.port}/api/v1/news`);
    }
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
      console.log('\n' + '='.repeat(50));
      console.log('🚀 SERVER RUNNING');
      console.log('='.repeat(50));

      console.log(`📍 Port: ${config.port}`);
      console.log(`🌍 Mode: ${config.isDevelopment ? 'development' : 'production'}`);

      console.log('\n📋 Endpoints:');
      console.log(`   📊 Health: http://localhost:${config.port}/health`);
      console.log(`   📰 News:   http://localhost:${config.port}/api/v1/news`);
      console.log(`   🔧 Admin:  http://localhost:${config.port}/api/v1/admin`);

      console.log('\n' + '='.repeat(50));
      console.log('🎉 Ready for requests!');
      console.log('='.repeat(50) + '\n');
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

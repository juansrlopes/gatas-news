import dotenv from 'dotenv';
import app from './app';
import logger from './utils/logger';
import { getEnvConfig } from '../../../libs/shared/utils/src/index';
import { mongoConnection } from './database/connections/mongodb';
import { redisConnection } from './database/connections/redis';
import { jobScheduler } from './jobs/scheduler';

// Load environment variables
dotenv.config();

const config = getEnvConfig();

// Create logs directory if it doesn't exist
import fs from 'fs';
import path from 'path';

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
    logger.info('🔧 Initializing services...');

    // Connect to MongoDB
    await mongoConnection.connect();

    // Connect to Redis (optional, will fallback to memory cache if fails)
    try {
      await redisConnection.connect();
    } catch (error) {
      logger.warn('Redis connection failed, using memory cache only:', error);
    }

    // Initialize job scheduler
    await jobScheduler.initialize();

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
      logger.info(`🚀 Gatas News API Server started successfully!`);
      logger.info(`📍 Server running on port ${config.port}`);
      logger.info(`🌍 Environment: ${config.isDevelopment ? 'development' : 'production'}`);
      logger.info(`📊 Health check: http://localhost:${config.port}/health`);
      logger.info(`📰 API endpoint: http://localhost:${config.port}/api/v1/news`);
      logger.info(`🔧 Admin panel: http://localhost:${config.port}/api/v1/admin`);

      if (config.isDevelopment) {
        logger.info(`🔧 Development mode: Enhanced logging and relaxed rate limits`);
      }
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

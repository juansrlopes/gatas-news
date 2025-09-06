import mongoose from 'mongoose';
import logger from '../../utils/logger';

class MongoDBConnection {
  private static instance: MongoDBConnection;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): MongoDBConnection {
    if (!MongoDBConnection.instance) {
      MongoDBConnection.instance = new MongoDBConnection();
    }
    return MongoDBConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.debug('MongoDB already connected');
      return;
    }

    try {
      const mongoUri = this.getMongoUri();

      await mongoose.connect(mongoUri, {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        bufferCommands: false, // Disable mongoose buffering
        // bufferMaxEntries: 0, // Disable mongoose buffering (deprecated in newer versions)
      });

      this.isConnected = true;
      logger.info(`✅ MongoDB connected successfully`);
      logger.info(`   📍 Database: ${mongoose.connection.db?.databaseName}`);
      logger.info(`   🔗 Host: ${this.maskConnectionString(mongoUri)}`);

      // Handle connection events
      mongoose.connection.on('error', error => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      this.isConnected = false;
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('MongoDB disconnected gracefully');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.db?.databaseName,
    };
  }

  private getMongoUri(): string {
    // Priority: Environment variable > Default local MongoDB
    const mongoUri =
      process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/gatas-news';

    if (!mongoUri) {
      throw new Error(
        'MongoDB connection string not provided. Set MONGODB_URI environment variable.'
      );
    }

    return mongoUri;
  }

  private maskConnectionString(uri: string): string {
    // Mask password in connection string for logging
    return uri.replace(/:([^:@]+)@/, ':****@');
  }
}

export const mongoConnection = MongoDBConnection.getInstance();

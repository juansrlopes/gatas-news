import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { mongoConnection } from '../database/connections/mongodb';

let mongoServer: MongoMemoryServer;

// Global test setup
beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Override the MongoDB connection for testing
  process.env.MONGODB_URI = mongoUri;
  process.env.NODE_ENV = 'test';

  // Connect to the test database
  await mongoConnection.connect();
});

// Clean up after each test
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});

// Global test teardown
afterAll(async () => {
  // Close database connection
  await mongoConnection.disconnect();

  // Stop the in-memory MongoDB instance
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Increase timeout for database operations
jest.setTimeout(30000);

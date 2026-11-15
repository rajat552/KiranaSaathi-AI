import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env.js';
import { logger } from './logger.js';

let mongod: MongoMemoryServer | null = null;

export async function connectDatabase(): Promise<void> {
  try {
    let mongoUri = env.MONGODB_URI;

    if (!mongoUri || env.USE_MEMORY_DB) {
      logger.info('Initializing MongoDB Memory Server for standalone execution/testing...');
      mongod = await MongoMemoryServer.create();
      mongoUri = mongod.getUri();
      logger.info(`MongoDB Memory Server started at ${mongoUri}`);
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    logger.info('Connected to MongoDB successfully');
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
      mongod = null;
    }
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB', error);
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

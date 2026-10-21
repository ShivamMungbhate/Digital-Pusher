import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer: MongoMemoryServer | null = null;

export async function connectDB(): Promise<typeof mongoose> {
  try {
    logger.info(`Attempting to connect to MongoDB at ${env.MONGO_URI}...`);
    // Try to connect with a short timeout first to test availability
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000
    });
    logger.info('Connected to MongoDB successfully.');
    return mongoose;
  } catch (err: any) {
    logger.warn({ error: err.message }, 'Could not connect to external MongoDB. Starting in-memory MongoDB fallback for seamless zero-config running...');
    try {
      const isWindowsArm64 = process.platform === 'win32' && process.arch === 'arm64';
      memoryServer = await MongoMemoryServer.create({
        binary: isWindowsArm64 ? { arch: 'x64' } : undefined
      });
      const inMemoryUri = memoryServer.getUri();
      logger.info(`MongoMemoryServer started at ${inMemoryUri}`);
      await mongoose.connect(inMemoryUri);
      logger.info('Connected to in-memory MongoDB successfully.');
      return mongoose;
    } catch (memErr: any) {
      logger.error({ error: memErr.message }, 'Failed to start in-memory MongoDB fallback.');
      throw memErr;
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
}

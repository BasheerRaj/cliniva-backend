import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalSetup() {
  const instance = await MongoMemoryServer.create();
  const uri = instance.getUri();

  (global as any).__MONGOINSTANCE = instance;
  (global as any).__MONGO_URI__ = uri;

  // Set environment variables for tests
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'test';
}

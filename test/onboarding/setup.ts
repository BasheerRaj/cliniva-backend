import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

declare global {
  var __MONGOINSTANCE: MongoMemoryServer;
  var __MONGO_URI__: string;
}

beforeAll(async () => {
  if (!global.__MONGOINSTANCE) {
    global.__MONGOINSTANCE = await MongoMemoryServer.create();
    global.__MONGO_URI__ = global.__MONGOINSTANCE.getUri();
  }

  await mongoose.connect(global.__MONGO_URI__);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();

  if (global.__MONGOINSTANCE) {
    await global.__MONGOINSTANCE.stop();
  }
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Increase timeout for database operations
jest.setTimeout(30000);

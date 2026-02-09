// Script to clear rate limit counters for testing
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cliniva';

async function clearRateLimits() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('rate_limit_counters');

    // Count documents before deletion
    const countBefore = await collection.countDocuments();
    console.log(`\nFound ${countBefore} rate limit counters`);

    if (countBefore > 0) {
      // Delete all rate limit counters
      const result = await collection.deleteMany({});
      console.log(`✅ Cleared ${result.deletedCount} rate limit counters`);
    } else {
      console.log('ℹ️  No rate limit counters to clear');
    }

    console.log('\n✅ Rate limits cleared successfully!');
    console.log('You can now test the endpoints again.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

clearRateLimits();

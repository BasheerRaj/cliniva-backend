/**
 * Migration: Add onboarding fields to existing users
 * Run this script to ensure all existing users have the new schema fields
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cliniva';

async function migrateUsers() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Find users that don't have the new onboarding fields
    const usersToUpdate = await usersCollection.find({
      $or: [
        { setupComplete: { $exists: false } },
        { onboardingComplete: { $exists: false } },
        { onboardingProgress: { $exists: false } }
      ]
    }).toArray();
    
    console.log(`Found ${usersToUpdate.length} users to update`);
    
    if (usersToUpdate.length === 0) {
      console.log('✅ All users already have onboarding fields');
      return;
    }
    
    // Update users with default onboarding field values
    const result = await usersCollection.updateMany(
      {
        $or: [
          { setupComplete: { $exists: false } },
          { onboardingComplete: { $exists: false } },
          { onboardingProgress: { $exists: false } }
        ]
      },
      {
        $set: {
          setupComplete: false,
          onboardingComplete: false,
          onboardingProgress: []
        }
      }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} users with onboarding fields`);
    
    // Update users who have subscriptions but missing subscription IDs in user record
    const subscriptionsCollection = db.collection('subscriptions');
    const subscriptions = await subscriptionsCollection.find({ status: 'active' }).toArray();
    
    let linkedSubscriptions = 0;
    for (const subscription of subscriptions) {
      const updateResult = await usersCollection.updateOne(
        { 
          _id: subscription.userId,
          subscriptionId: { $exists: false }
        },
        {
          $set: {
            subscriptionId: subscription._id,
            onboardingProgress: ['plan_selected', 'account_created']
          }
        }
      );
      
      if (updateResult.modifiedCount > 0) {
        linkedSubscriptions++;
      }
    }
    
    if (linkedSubscriptions > 0) {
      console.log(`✅ Linked ${linkedSubscriptions} existing subscriptions to user records`);
    }
    
    console.log('🎉 Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateUsers()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateUsers }; 
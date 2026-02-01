import { config } from 'dotenv';
import { connect, disconnect, connection } from 'mongoose';

// Load environment variables
config();

/**
 * Migration script to add optional fields for user management M1 feature
 * 
 * This script adds the following optional fields:
 * 
 * Users Collection:
 * - deactivatedAt: Date - Timestamp when user was deactivated
 * - deactivatedBy: ObjectId - Reference to user who performed deactivation
 * 
 * Appointments Collection:
 * - previousDoctorId: ObjectId - Reference to previous doctor (for transfers)
 * - transferredAt: Date - Timestamp when appointment was transferred
 * - transferredBy: ObjectId - Reference to user who performed transfer
 * - reschedulingReason: string - Reason for rescheduling
 * - markedForReschedulingAt: Date - Timestamp when marked for rescheduling
 * - markedBy: ObjectId - Reference to user who marked for rescheduling
 * 
 * Note: These fields are optional and will be null by default.
 * No data migration is needed as existing documents will work without these fields.
 */

async function up() {
  try {
    console.log('Starting user management fields migration (up)...');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cliniva';
    await connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = connection.db;

    if (!db) {
      throw new Error('Database connection not established');
    }

    // 1. Add optional fields to users collection
    console.log('Adding optional fields to users collection...');
    const usersCollection = db.collection('users');
    
    // Check if any user already has these fields
    const userWithFields = await usersCollection.findOne({
      $or: [
        { deactivatedAt: { $exists: true } },
        { deactivatedBy: { $exists: true } }
      ]
    });

    if (userWithFields) {
      console.log('Users collection already has deactivation fields, skipping...');
    } else {
      // Add fields to existing documents (set to null)
      const usersResult = await usersCollection.updateMany(
        {},
        {
          $set: {
            deactivatedAt: null,
            deactivatedBy: null
          }
        }
      );
      console.log(`✓ Updated ${usersResult.modifiedCount} user documents with deactivation fields`);
    }

    // 2. Add optional fields to appointments collection
    console.log('Adding optional fields to appointments collection...');
    const appointmentsCollection = db.collection('appointments');
    
    // Check if any appointment already has these fields
    const appointmentWithFields = await appointmentsCollection.findOne({
      $or: [
        { previousDoctorId: { $exists: true } },
        { transferredAt: { $exists: true } },
        { transferredBy: { $exists: true } },
        { reschedulingReason: { $exists: true } },
        { markedForReschedulingAt: { $exists: true } },
        { markedBy: { $exists: true } }
      ]
    });

    if (appointmentWithFields) {
      console.log('Appointments collection already has transfer fields, skipping...');
    } else {
      // Add fields to existing documents (set to null)
      const appointmentsResult = await appointmentsCollection.updateMany(
        {},
        {
          $set: {
            previousDoctorId: null,
            transferredAt: null,
            transferredBy: null,
            reschedulingReason: null,
            markedForReschedulingAt: null,
            markedBy: null
          }
        }
      );
      console.log(`✓ Updated ${appointmentsResult.modifiedCount} appointment documents with transfer fields`);
    }

    console.log('User management fields migration (up) completed successfully!');
    console.log('\nSummary:');
    console.log('- Users collection: Added deactivatedAt, deactivatedBy fields');
    console.log('- Appointments collection: Added previousDoctorId, transferredAt, transferredBy, reschedulingReason, markedForReschedulingAt, markedBy fields');
    console.log('\nNote: These fields are optional and will be populated when relevant actions occur.');
  } catch (error) {
    console.error('Migration (up) failed:', error);
    throw error;
  } finally {
    await disconnect();
    console.log('Disconnected from MongoDB');
  }
}

/**
 * Rollback function to remove the optional fields
 */
async function down() {
  try {
    console.log('Starting user management fields migration rollback (down)...');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cliniva';
    await connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = connection.db;

    if (!db) {
      throw new Error('Database connection not established');
    }

    // 1. Remove fields from users collection
    console.log('Removing optional fields from users collection...');
    const usersCollection = db.collection('users');
    const usersResult = await usersCollection.updateMany(
      {},
      {
        $unset: {
          deactivatedAt: '',
          deactivatedBy: ''
        }
      }
    );
    console.log(`✓ Removed deactivation fields from ${usersResult.modifiedCount} user documents`);

    // 2. Remove fields from appointments collection
    console.log('Removing optional fields from appointments collection...');
    const appointmentsCollection = db.collection('appointments');
    const appointmentsResult = await appointmentsCollection.updateMany(
      {},
      {
        $unset: {
          previousDoctorId: '',
          transferredAt: '',
          transferredBy: '',
          reschedulingReason: '',
          markedForReschedulingAt: '',
          markedBy: ''
        }
      }
    );
    console.log(`✓ Removed transfer fields from ${appointmentsResult.modifiedCount} appointment documents`);

    console.log('User management fields migration rollback (down) completed successfully!');
    console.log('\nWarning: Any data in these fields has been permanently removed.');
  } catch (error) {
    console.error('Migration rollback (down) failed:', error);
    throw error;
  } finally {
    await disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'down') {
    down()
      .then(() => {
        console.log('Rollback completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Rollback failed:', error);
        process.exit(1);
      });
  } else {
    up()
      .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
      });
  }
}

export { up, down };

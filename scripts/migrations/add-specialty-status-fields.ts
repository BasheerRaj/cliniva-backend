import { config } from 'dotenv';
import { connect, disconnect, connection } from 'mongoose';

// Load environment variables
config();

/**
 * Migration script to add status management fields to Specialty schema (M3)
 *
 * This script adds the following fields to specialties collection:
 * - isActive: boolean (default: true)
 * - complexId: ObjectId (optional, null)
 * - deactivatedAt: Date (optional, null)
 * - deactivatedBy: ObjectId (optional, null)
 * - deactivationReason: string (optional, null)
 */

async function up() {
  try {
    console.log('Starting specialty status fields migration (up)...');

    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/cliniva';
    await connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const specialtiesCollection = db.collection('specialties');

    const result = await specialtiesCollection.updateMany(
      { isActive: { $exists: false } },
      {
        $set: {
          isActive: true,
          complexId: null,
          deactivatedAt: null,
          deactivatedBy: null,
          deactivationReason: null,
        },
      },
    );

    console.log(
      `✓ Updated ${result.modifiedCount} specialty documents with new fields`,
    );
    console.log(`  (${result.matchedCount} documents matched filter)`);
    console.log('\nSpecialty status fields migration (up) completed successfully!');
  } catch (error) {
    console.error('Migration (up) failed:', error);
    throw error;
  } finally {
    await disconnect();
    console.log('Disconnected from MongoDB');
  }
}

async function down() {
  try {
    console.log('Starting specialty status fields migration rollback (down)...');

    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/cliniva';
    await connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const specialtiesCollection = db.collection('specialties');
    const result = await specialtiesCollection.updateMany(
      {},
      {
        $unset: {
          isActive: '',
          complexId: '',
          deactivatedAt: '',
          deactivatedBy: '',
          deactivationReason: '',
        },
      },
    );

    console.log(
      `✓ Removed status fields from ${result.modifiedCount} specialty documents`,
    );
    console.log('\nWarning: Any data in these fields has been permanently removed.');
  } catch (error) {
    console.error('Migration rollback (down) failed:', error);
    throw error;
  } finally {
    await disconnect();
    console.log('Disconnected from MongoDB');
  }
}

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

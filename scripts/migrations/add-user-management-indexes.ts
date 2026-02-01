import { config } from 'dotenv';
import { connect, disconnect, connection } from 'mongoose';

// Load environment variables
config();

/**
 * Migration script to add indexes for user management M1 feature
 * This script:
 * 1. Creates composite index on users collection: { isActive: 1, role: 1 }
 * 2. Creates composite index on appointments collection: { doctorId: 1, status: 1, appointmentDate: 1 }
 * 3. Creates composite index on clinics collection: { complexId: 1, isActive: 1 }
 * 
 * These indexes optimize queries for:
 * - Active user filtering by role (dropdown queries)
 * - Doctor appointment transfer queries
 * - Complex-based clinic filtering
 */
async function addUserManagementIndexes() {
  try {
    console.log('Starting user management indexes migration...');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cliniva';
    await connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = connection.db;

    if (!db) {
      throw new Error('Database connection not established');
    }

    // 1. Create index on users collection
    console.log('Creating index on users collection: { isActive: 1, role: 1 }');
    await db.collection('users').createIndex(
      { isActive: 1, role: 1 },
      { 
        name: 'idx_users_active_role',
        background: true 
      }
    );
    console.log('✓ Users index created successfully');

    // 2. Create index on appointments collection
    console.log('Creating index on appointments collection: { doctorId: 1, status: 1, appointmentDate: 1 }');
    await db.collection('appointments').createIndex(
      { doctorId: 1, status: 1, appointmentDate: 1 },
      { 
        name: 'idx_appointments_doctor_status_date',
        background: true 
      }
    );
    console.log('✓ Appointments index created successfully');

    // 3. Create index on clinics collection
    console.log('Creating index on clinics collection: { complexId: 1, isActive: 1 }');
    await db.collection('clinics').createIndex(
      { complexId: 1, isActive: 1 },
      { 
        name: 'idx_clinics_complex_active',
        background: true 
      }
    );
    console.log('✓ Clinics index created successfully');

    console.log('User management indexes migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await disconnect();
    console.log('Disconnected from MongoDB');
  }
}

/**
 * Rollback function to remove the indexes
 */
async function removeUserManagementIndexes() {
  try {
    console.log('Starting user management indexes rollback...');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cliniva';
    await connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = connection.db;

    if (!db) {
      throw new Error('Database connection not established');
    }

    // Remove indexes
    console.log('Removing index from users collection: idx_users_active_role');
    try {
      await db.collection('users').dropIndex('idx_users_active_role');
      console.log('✓ Users index removed successfully');
    } catch (error: any) {
      if (error.code === 27) {
        console.log('Index does not exist, skipping...');
      } else {
        throw error;
      }
    }

    console.log('Removing index from appointments collection: idx_appointments_doctor_status_date');
    try {
      await db.collection('appointments').dropIndex('idx_appointments_doctor_status_date');
      console.log('✓ Appointments index removed successfully');
    } catch (error: any) {
      if (error.code === 27) {
        console.log('Index does not exist, skipping...');
      } else {
        throw error;
      }
    }

    console.log('Removing index from clinics collection: idx_clinics_complex_active');
    try {
      await db.collection('clinics').dropIndex('idx_clinics_complex_active');
      console.log('✓ Clinics index removed successfully');
    } catch (error: any) {
      if (error.code === 27) {
        console.log('Index does not exist, skipping...');
      } else {
        throw error;
      }
    }

    console.log('User management indexes rollback completed successfully!');
  } catch (error) {
    console.error('Rollback failed:', error);
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
    removeUserManagementIndexes()
      .then(() => {
        console.log('Rollback completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Rollback failed:', error);
        process.exit(1);
      });
  } else {
    addUserManagementIndexes()
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

export { addUserManagementIndexes, removeUserManagementIndexes };

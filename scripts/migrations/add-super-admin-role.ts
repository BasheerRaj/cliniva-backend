import { config } from 'dotenv';
import { connect, disconnect, model } from 'mongoose';
import { User, UserSchema } from '../../src/database/schemas/user.schema';
import { UserAccess, UserAccessSchema } from '../../src/database/schemas/user-access.schema';
import { UserRole } from '../../src/common/enums/user-role.enum';

// Load environment variables
config();

/**
 * Migration script to add super_admin role support
 * This script:
 * 1. Updates the user schema to support super_admin role
 * 2. Creates a default super admin user if none exists
 * 3. Updates any existing role references
 */
async function migrateSuperAdminRole() {
  try {
    console.log('Starting super admin role migration...');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cliniva';
    await connect(mongoUri);
    console.log('Connected to MongoDB');

    // Compile models for migration
    const UserModel = model('User', UserSchema);
    const UserAccessModel = model('UserAccess', UserAccessSchema);

    // Check if super admin user already exists
    const existingSuperAdmin = await UserModel.findOne({ role: UserRole.SUPER_ADMIN });
    
    if (!existingSuperAdmin) {
      console.log('No super admin user found, creating default super admin...');
      
      // Create default super admin user
      const superAdminUser = new UserModel({
        email: 'superadmin@cliniva.com',
        passwordHash: '$2b$12$defaultHashedPasswordForSuperAdmin', // This should be changed on first login
        firstName: 'Super',
        lastName: 'Administrator',
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        emailVerified: true,
        twoFactorEnabled: false,
        // Authentication fields
        isFirstLogin: true,
        lastPasswordChange: new Date(),
        passwordChangeRequired: true, // Force password change on first login
        passwordResetUsed: false,
      });

      await superAdminUser.save();
      console.log('Default super admin user created with email: superadmin@cliniva.com');
      console.log('⚠️  IMPORTANT: Change the password for the super admin user on first login!');
    } else {
      console.log('Super admin user already exists');
    }

    // Update any existing user_access records that might have invalid roles
    const userAccessUpdates = await UserAccessModel.updateMany(
      { role: { $nin: Object.values(UserRole) } },
      { $set: { role: UserRole.PATIENT } } // Default to patient role for invalid roles
    );

    if (userAccessUpdates.modifiedCount > 0) {
      console.log(`Updated ${userAccessUpdates.modifiedCount} user access records with invalid roles`);
    }

    // Update any existing user records that might have invalid roles
    const userUpdates = await UserModel.updateMany(
      { role: { $nin: Object.values(UserRole) } },
      { $set: { role: UserRole.PATIENT } } // Default to patient role for invalid roles
    );

    if (userUpdates.modifiedCount > 0) {
      console.log(`Updated ${userUpdates.modifiedCount} user records with invalid roles`);
    }

    console.log('Super admin role migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateSuperAdminRole()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateSuperAdminRole };
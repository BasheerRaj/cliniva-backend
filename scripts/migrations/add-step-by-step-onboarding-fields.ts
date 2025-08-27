#!/usr/bin/env ts-node

import { MongoClient, Db, Collection } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface MigrationResult {
  success: boolean;
  message: string;
  details?: any;
}

class StepByStepOnboardingMigration {
  private client: MongoClient;
  private db: Db;

  constructor() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cliniva';
    this.client = new MongoClient(mongoUri);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    const dbName = process.env.DATABASE_NAME || 'cliniva';
    this.db = this.client.db(dbName);
    console.log(`✅ Connected to MongoDB database: ${dbName}`);
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    console.log('✅ Disconnected from MongoDB');
  }

  /**
   * Main migration method - orchestrates all migration steps
   */
  async runMigration(): Promise<MigrationResult> {
    try {
      console.log('🚀 Starting Step-by-Step Onboarding Migration...\n');

      // Step 1: Backup collections (optional but recommended)
      await this.createBackup();

      // Step 2: Add new fields to existing documents
      await this.migrateOrganizations();
      await this.migrateComplexes();
      await this.migrateClinics();

      // Step 3: Create new Emergency Contact collection
      await this.createEmergencyContactCollection();

      // Step 4: Create new indexes
      await this.createIndexes();

      // Step 5: Validate migration results
      await this.validateMigration();

      console.log('\n🎉 Migration completed successfully!');
      return { success: true, message: 'Step-by-step onboarding migration completed successfully' };

    } catch (error) {
      console.error('❌ Migration failed:', error);
      return { success: false, message: `Migration failed: ${error.message}`, details: error };
    }
  }

  /**
   * Create backup collections
   */
  private async createBackup(): Promise<void> {
    console.log('📦 Creating backup collections...');
    
    const collections = ['organizations', 'complexes', 'clinics'];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    for (const collectionName of collections) {
      const collection = this.db.collection(collectionName);
      const backupName = `${collectionName}_backup_${timestamp}`;
      
      // Check if collection exists and has documents
      const count = await collection.countDocuments();
      if (count > 0) {
        // Use aggregation pipeline to copy all documents
        await collection.aggregate([
          { $match: {} },
          { $out: backupName }
        ]).toArray();
        
        console.log(`  ✅ Backed up ${count} documents from ${collectionName} to ${backupName}`);
      } else {
        console.log(`  ⚠️  Collection ${collectionName} is empty, skipping backup`);
      }
    }
  }

  /**
   * Migrate Organization documents
   */
  private async migrateOrganizations(): Promise<void> {
    console.log('🏢 Migrating Organization documents...');
    
    const collection = this.db.collection('organizations');
    
    // Add new fields to all existing organizations
    const result = await collection.updateMany(
      { ownerId: { $exists: false } }, // Only update documents that don't have ownerId
      {
        $set: {
          // We can't automatically set ownerId - this needs to be done manually
          // or through a separate data migration script
          overview: null,
          goals: null,
          emergencyContactName: null,
          emergencyContactPhone: null,
          termsConditionsUrl: null,
          privacyPolicyUrl: null
        }
      }
    );

    console.log(`  ✅ Updated ${result.modifiedCount} organization documents`);
    
    // Log organizations that need ownerId assignment
    const orgsWithoutOwner = await collection.countDocuments({ ownerId: { $exists: false } });
    if (orgsWithoutOwner > 0) {
      console.log(`  ⚠️  ${orgsWithoutOwner} organizations need ownerId assignment (manual step required)`);
    }
  }

  /**
   * Migrate Complex documents
   */
  private async migrateComplexes(): Promise<void> {
    console.log('🏗️ Migrating Complex documents...');
    
    const collection = this.db.collection('complexes');
    
    const result = await collection.updateMany(
      { inheritsFromOrganization: { $exists: false } }, // Only update documents that don't have inheritance flags
      {
        $set: {
          inheritsFromOrganization: false, // Default to false
          overview: null,
          goals: null,
          emergencyContactName: null,
          emergencyContactPhone: null
        }
      }
    );

    console.log(`  ✅ Updated ${result.modifiedCount} complex documents`);
  }

  /**
   * Migrate Clinic documents
   */
  private async migrateClinics(): Promise<void> {
    console.log('🏥 Migrating Clinic documents...');
    
    const collection = this.db.collection('clinics');
    
    const result = await collection.updateMany(
      { inheritsFromComplex: { $exists: false } }, // Only update documents that don't have inheritance flags
      {
        $set: {
          complexId: null, // Will be set based on complexDepartmentId in a separate step if needed
          inheritsFromComplex: false, // Default to false
          inheritsFromOrganization: false // Default to false
        }
      }
    );

    console.log(`  ✅ Updated ${result.modifiedCount} clinic documents`);
  }

  /**
   * Create Emergency Contact collection if it doesn't exist
   */
  private async createEmergencyContactCollection(): Promise<void> {
    console.log('📞 Creating Emergency Contact collection...');
    
    const collections = await this.db.listCollections({ name: 'emergency_contacts' }).toArray();
    
    if (collections.length === 0) {
      await this.db.createCollection('emergency_contacts');
      console.log('  ✅ Created emergency_contacts collection');
    } else {
      console.log('  ℹ️  emergency_contacts collection already exists');
    }
  }

  /**
   * Create all new indexes
   */
  private async createIndexes(): Promise<void> {
    console.log('🔍 Creating new indexes...');

    // Organization indexes
    const orgCollection = this.db.collection('organizations');
    await this.createIndexSafely(orgCollection, { ownerId: 1 }, 'ownerId_1');
    await this.createIndexSafely(orgCollection, { emergencyContactPhone: 1 }, 'emergencyContactPhone_1');

    // Complex indexes
    const complexCollection = this.db.collection('complexes');
    await this.createIndexSafely(complexCollection, { inheritsFromOrganization: 1 }, 'inheritsFromOrganization_1');
    await this.createIndexSafely(complexCollection, { emergencyContactPhone: 1 }, 'emergencyContactPhone_1');
    await this.createIndexSafely(complexCollection, { organizationId: 1, name: 1 }, 'organizationId_1_name_1');

    // Clinic indexes
    const clinicCollection = this.db.collection('clinics');
    await this.createIndexSafely(clinicCollection, { complexId: 1 }, 'complexId_1');
    await this.createIndexSafely(clinicCollection, { inheritsFromComplex: 1 }, 'inheritsFromComplex_1');
    await this.createIndexSafely(clinicCollection, { inheritsFromOrganization: 1 }, 'inheritsFromOrganization_1');
    await this.createIndexSafely(clinicCollection, { complexId: 1, name: 1 }, 'complexId_1_name_1');
    await this.createIndexSafely(clinicCollection, { complexDepartmentId: 1, name: 1 }, 'complexDepartmentId_1_name_1');

    // Emergency Contact indexes
    const emergencyCollection = this.db.collection('emergency_contacts');
    await this.createIndexSafely(emergencyCollection, { entityType: 1, entityId: 1 }, 'entityType_1_entityId_1');
    await this.createIndexSafely(emergencyCollection, { contactPhone: 1 }, 'contactPhone_1');
    await this.createIndexSafely(emergencyCollection, { email: 1 }, 'email_1');
    await this.createIndexSafely(emergencyCollection, { isActive: 1 }, 'isActive_1');
    await this.createIndexSafely(emergencyCollection, { isPrimary: 1 }, 'isPrimary_1');
    await this.createIndexSafely(emergencyCollection, { entityType: 1, entityId: 1, isPrimary: 1 }, 'entityType_1_entityId_1_isPrimary_1');
    await this.createIndexSafely(emergencyCollection, { entityType: 1, entityId: 1, isActive: 1 }, 'entityType_1_entityId_1_isActive_1');
  }

  /**
   * Helper method to create index safely (skip if already exists)
   */
  private async createIndexSafely(collection: Collection, indexSpec: any, indexName: string): Promise<void> {
    try {
      const existingIndexes = await collection.listIndexes().toArray();
      const indexExists = existingIndexes.some(index => index.name === indexName);
      
      if (!indexExists) {
        await collection.createIndex(indexSpec, { name: indexName });
        console.log(`  ✅ Created index: ${indexName} on ${collection.collectionName}`);
      } else {
        console.log(`  ℹ️  Index ${indexName} already exists on ${collection.collectionName}`);
      }
    } catch (error) {
      console.warn(`  ⚠️  Failed to create index ${indexName}: ${error.message}`);
    }
  }

  /**
   * Validate migration results
   */
  private async validateMigration(): Promise<void> {
    console.log('🔍 Validating migration results...');

    // Check Organization schema
    const orgSample = await this.db.collection('organizations').findOne({});
    if (orgSample) {
      const hasNewFields = 'overview' in orgSample && 'goals' in orgSample;
      console.log(`  ${hasNewFields ? '✅' : '❌'} Organization schema updated`);
    }

    // Check Complex schema
    const complexSample = await this.db.collection('complexes').findOne({});
    if (complexSample) {
      const hasNewFields = 'inheritsFromOrganization' in complexSample && 'overview' in complexSample;
      console.log(`  ${hasNewFields ? '✅' : '❌'} Complex schema updated`);
    }

    // Check Clinic schema
    const clinicSample = await this.db.collection('clinics').findOne({});
    if (clinicSample) {
      const hasNewFields = 'inheritsFromComplex' in clinicSample && 'inheritsFromOrganization' in clinicSample;
      console.log(`  ${hasNewFields ? '✅' : '❌'} Clinic schema updated`);
    }

    // Check Emergency Contact collection exists
    const emergencyExists = await this.db.listCollections({ name: 'emergency_contacts' }).hasNext();
    console.log(`  ${emergencyExists ? '✅' : '❌'} Emergency Contact collection created`);

    // Verify index counts
    const orgIndexCount = (await this.db.collection('organizations').listIndexes().toArray()).length;
    const complexIndexCount = (await this.db.collection('complexes').listIndexes().toArray()).length;
    const clinicIndexCount = (await this.db.collection('clinics').listIndexes().toArray()).length;
    
    console.log(`  📊 Index counts: Organizations: ${orgIndexCount}, Complexes: ${complexIndexCount}, Clinics: ${clinicIndexCount}`);
  }

  /**
   * Rollback migration (in case of issues)
   */
  async rollback(): Promise<MigrationResult> {
    console.log('🔄 Rolling back migration...');
    
    try {
      // Find backup collections
      const collections = await this.db.listCollections().toArray();
      const backupCollections = collections.filter(col => col.name.includes('_backup_'));
      
      if (backupCollections.length === 0) {
        throw new Error('No backup collections found for rollback');
      }

      // Restore from most recent backup
      const latestBackup = backupCollections.sort((a, b) => b.name.localeCompare(a.name))[0];
      const originalName = latestBackup.name.split('_backup_')[0];
      
      // Drop current collection and restore from backup
      await this.db.collection(originalName).drop();
      await this.db.collection(latestBackup.name).aggregate([
        { $match: {} },
        { $out: originalName }
      ]).toArray();

      console.log(`✅ Restored ${originalName} from ${latestBackup.name}`);
      
      return { success: true, message: 'Migration rollback completed successfully' };
    } catch (error) {
      return { success: false, message: `Rollback failed: ${error.message}`, details: error };
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'migrate';

  const migration = new StepByStepOnboardingMigration();
  
  try {
    await migration.connect();
    
    let result: MigrationResult;
    
    switch (command) {
      case 'migrate':
        result = await migration.runMigration();
        break;
      case 'rollback':
        result = await migration.rollback();
        break;
      default:
        console.log('Usage: ts-node add-step-by-step-onboarding-fields.ts [migrate|rollback]');
        process.exit(1);
    }
    
    if (!result.success) {
      console.error('Migration failed:', result.message);
      process.exit(1);
    }
    
  } finally {
    await migration.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { StepByStepOnboardingMigration }; 
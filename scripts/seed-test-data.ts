#!/usr/bin/env ts-node

/**
 * Test Data Seed Script
 *
 * Seeds the database with clean, relational test data for two ownership models:
 *   • Owner 1 (company plan): Organization → 2 Complexes → 2 Clinics each (4 total)
 *   • Owner 2 (complex plan): Standalone Complex → 2 Clinics
 *
 * Each clinic has: 2 admins, 2 doctors, 2 staff, 5 patients, services, working hours.
 *
 * Usage:
 *   npm run seed:test              # Seed test data
 *   npm run seed:test:clear        # Clear test data
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TestDataSeederService } from '../src/database/seeders/test-data.seeder';

async function bootstrap() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');

  console.log('\n🚀 Cliniva Test Data Seeder\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const seeder = app.get(TestDataSeederService);

    if (shouldClear) {
      await seeder.clearTestData();
      console.log('\n✅ Test data cleared successfully\n');
    } else {
      await seeder.seedTestData();
      console.log('\n📊 Summary:');
      console.log('  Plan 1 — Company:');
      console.log('    • 1 Organization: Cliniva Test Healthcare Group');
      console.log('    • 2 Complexes: Test Complex Alpha, Test Complex Beta');
      console.log('    • 4 Clinics (2 per complex): Cardiology, Neurology, Pediatrics, Dermatology');
      console.log('    • 24 Staff (6 per clinic: 2 admins + 2 doctors + 2 staff)');
      console.log('    • 20 Patients (5 per clinic)');
      console.log('  Plan 2 — Complex:');
      console.log('    • 1 Complex: Test Independent Complex');
      console.log('    • 2 Clinics: ENT, Ophthalmology');
      console.log('    • 12 Staff (6 per clinic)');
      console.log('    • 10 Patients (5 per clinic)');
      console.log('\n🔐 Login Credentials (password: Test@1234):');
      console.log('  owner1@cliniva-test.com  →  Company plan owner');
      console.log('  owner2@cliniva-test.com  →  Complex plan owner');
      console.log('  admin1.a1@cliniva-test.com, dr1.a1@cliniva-test.com, staff1.a1@cliniva-test.com  (etc.)');
      console.log('');
    }
  } catch (error) {
    console.error('\n❌ Seeding failed:', (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();

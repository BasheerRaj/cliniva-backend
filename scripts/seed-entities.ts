#!/usr/bin/env ts-node

/**
 * Seed Entities Script
 * 
 * This script seeds the database with sample organizations, complexes, and clinics
 * for all three subscription plans (Company, Complex, Clinic).
 * 
 * Usage:
 *   npm run seed:entities           # Seed entities
 *   npm run seed:entities -- --clear # Clear and reseed
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DatabaseSeederService } from '../src/database/seeders/database-seeder.service';
import { EntitiesSeederService } from '../src/database/seeders/entities.seeder';

async function bootstrap() {
  console.log('🚀 Starting entity seeding process...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const seederService = app.get(DatabaseSeederService);
    const entitiesSeeder = app.get(EntitiesSeederService);

    const args = process.argv.slice(2);
    const shouldClear = args.includes('--clear');

    if (shouldClear) {
      console.log('⚠️  Clearing existing entities...\n');
      await entitiesSeeder.clearEntities();
      console.log('✅ Entities cleared\n');
    }

    console.log('🌱 Seeding entities...\n');
    await entitiesSeeder.seedAll();

    console.log('\n✅ Entity seeding completed successfully!');
    console.log('\n📊 Seeded Data Summary:');
    console.log('  • 3 Users (Company Owner, Complex Owner, Clinic Owner)');
    console.log('  • 3 Subscriptions (Company, Complex, Clinic plans)');
    console.log('  • 1 Organization (HealthCare Solutions Group)');
    console.log('  • 3 Complexes (2 under organization + 1 standalone)');
    console.log('  • 11 Clinics (6 under company complexes + 5 under standalone complex + 1 standalone)');
    console.log('\n🔐 Test User Credentials:');
    console.log('  Company Owner:');
    console.log('    Email: company.owner@cliniva.com');
    console.log('    Password: Password123!');
    console.log('  Complex Owner:');
    console.log('    Email: complex.owner@cliniva.com');
    console.log('    Password: Password123!');
    console.log('  Clinic Owner:');
    console.log('    Email: clinic.owner@cliniva.com');
    console.log('    Password: Password123!');
    console.log('\n');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();

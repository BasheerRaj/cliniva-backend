#!/usr/bin/env ts-node

/**
 * Seed Example Relational Data Script
 *
 * Creates a fully relational example dataset:
 *   • 1 Company (Organization) with company-plan subscription
 *   • 2 Medical Complexes under the company
 *   • 4 Clinics (2 per complex)
 *   • Each clinic: 1 owner, 1 admin, 2 doctors, 1 staff
 *   • Hierarchical working hours:
 *       Company → Complex → Clinic → Doctor
 *       (each level is a subset of its parent's hours)
 *
 * Usage:
 *   npx ts-node scripts/seed-example-data.ts
 *   npx ts-node scripts/seed-example-data.ts --clear   # wipe and re-seed
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExampleDataSeederService } from '../src/database/seeders/example-data.seeder';

async function bootstrap() {
  console.log('🚀 Starting example data seeding...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const seeder = app.get(ExampleDataSeederService);
    const args = process.argv.slice(2);

    if (args.includes('--clear')) {
      console.log('⚠️  Clearing existing example data...\n');
      await seeder.clearExampleData();
      console.log('✅ Example data cleared\n');
    }

    await seeder.seedAll();

    console.log('\n✅ Example data seeding completed!\n');
    console.log('🔑 All accounts use password: Password123!\n');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();

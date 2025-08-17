import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DatabaseInitializerService } from '../src/database/database-initializer.service';

async function runDatabaseCLI() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const initializerService = app.get(DatabaseInitializerService);
  
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'init':
      case 'initialize':
        console.log('🚀 Initializing database...');
        await initializerService.initializeDatabase();
        console.log('✅ Database initialization completed');
        break;
        
      case 'seed':
        console.log('🌱 Seeding database...');
        await initializerService.seedDatabase();
        console.log('✅ Database seeding completed');
        break;
        
      case 'reset':
        console.log('⚠️ Resetting database...');
        await initializerService.resetDatabase();
        console.log('✅ Database reset completed');
        break;
        
      default:
        console.log('❌ Unknown command. Available commands:');
        console.log('  - init/initialize: Initialize database with seed data');
        console.log('  - seed: Seed database with default data');
        console.log('  - reset: Reset and reseed database');
        console.log('');
        console.log('Usage: npm run db:cli <command>');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Database operation failed:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runDatabaseCLI();

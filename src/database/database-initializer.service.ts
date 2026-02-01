import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseSeederService } from './seeders/database-seeder.service';

@Injectable()
export class DatabaseInitializerService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitializerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly seederService: DatabaseSeederService,
  ) {}

  async onModuleInit() {
    const shouldSeed =
      this.configService.get<string>('DATABASE_SEED') === 'true';

    if (shouldSeed) {
      this.logger.log('🔄 Auto-seeding enabled, initializing database...');
      await this.initializeDatabase();
    } else {
      this.logger.log(
        '📊 Auto-seeding disabled. Run manual seeding if needed.',
      );
    }
  }

  async initializeDatabase(): Promise<void> {
    try {
      this.logger.log('🚀 Initializing Cliniva database...');

      await this.seederService.seedAll();

      this.logger.log('✅ Database initialization completed successfully');
    } catch (error) {
      this.logger.error('❌ Database initialization failed:', error.message);
      throw error;
    }
  }

  async resetDatabase(): Promise<void> {
    try {
      this.logger.warn('⚠️ Resetting database...');

      await this.seederService.clearDatabase();
      await this.seederService.seedAll();

      this.logger.log('✅ Database reset completed successfully');
    } catch (error) {
      this.logger.error('❌ Database reset failed:', error.message);
      throw error;
    }
  }

  async seedDatabase(): Promise<void> {
    try {
      this.logger.log('🌱 Seeding database...');

      await this.seederService.seedAll();

      this.logger.log('✅ Database seeding completed successfully');
    } catch (error) {
      this.logger.error('❌ Database seeding failed:', error.message);
      throw error;
    }
  }
}

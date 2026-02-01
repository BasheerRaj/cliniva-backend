import {
  Controller,
  Get,
  Post,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DatabaseService } from './database.service';
import { DatabaseInitializerService } from './database-initializer.service';

@Controller('database')
export class DatabaseController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly initializerService: DatabaseInitializerService,
  ) {}

  @Get('health')
  async getHealth() {
    try {
      const health = await this.databaseService.getHealth();

      if (health.status === 'error') {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message: 'Database is not healthy',
            data: health,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Database health check completed',
        data: health,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to check database health',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('info')
  async getDatabaseInfo() {
    try {
      const info = await this.databaseService.getDatabaseInfo();

      return {
        statusCode: HttpStatus.OK,
        message: 'Database information retrieved successfully',
        data: info,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve database information',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('test')
  async testConnection() {
    try {
      const result = await this.databaseService.performConnectionTest();

      return {
        statusCode: result.success
          ? HttpStatus.OK
          : HttpStatus.SERVICE_UNAVAILABLE,
        message: result.message,
        data: result.details || null,
        error: result.error || null,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database connection test failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('ping')
  async ping() {
    try {
      await this.databaseService.testConnection();

      return {
        statusCode: HttpStatus.OK,
        message: 'Database ping successful',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database ping failed',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Post('initialize')
  async initializeDatabase() {
    try {
      await this.initializerService.initializeDatabase();
      return {
        statusCode: HttpStatus.OK,
        message: 'Database initialized successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database initialization failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('seed')
  async seedDatabase() {
    try {
      await this.initializerService.seedDatabase();
      return {
        statusCode: HttpStatus.OK,
        message: 'Database seeded successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database seeding failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('reset')
  async resetDatabase() {
    try {
      await this.initializerService.resetDatabase();
      return {
        statusCode: HttpStatus.OK,
        message: 'Database reset successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database reset failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

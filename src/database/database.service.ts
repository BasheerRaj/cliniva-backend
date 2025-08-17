import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export interface DatabaseHealth {
  status: 'connected' | 'disconnected' | 'error';
  message: string;
  connectionState: string;
  database: string;
  collections: number;
  timestamp: Date;
}

export interface DatabaseInfo {
  name: string;
  host: string;
  port: number;
  collections: string[];
  stats: {
    collections: number;
    dataSize: number;
    storageSize: number;
    indexes: number;
    avgObjSize: number;
  };
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async onModuleInit() {
    this.logger.log('🔄 Initializing database connection test...');
    await this.testConnection();
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.connection.db) {
        throw new Error('Database connection not established');
      }

      // Test basic connection with ping
      await this.connection.db.admin().ping();
      
      // Get database name and collection count
      const dbName = this.connection.db.databaseName;
      const collections = await this.connection.db.listCollections().toArray();
      
      this.logger.log(`✅ Database connection test: SUCCESS`);
      this.logger.log(`📊 Connected to database: ${dbName}`);
      this.logger.log(`📁 Collections found: ${collections.length}`);
      
      return true;
    } catch (error) {
      this.logger.error('❌ Database connection test: FAILED', error.message);
      throw error;
    }
  }

  async getHealth(): Promise<DatabaseHealth> {
    try {
      const connectionStates = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
      };

      const state = this.connection.readyState;
      const isConnected = state === 1;
      
      if (!isConnected || !this.connection.db) {
        return {
          status: 'disconnected',
          message: `Database is ${connectionStates[state]}`,
          connectionState: connectionStates[state],
          database: this.connection.db?.databaseName || 'unknown',
          collections: 0,
          timestamp: new Date(),
        };
      }

      // Test the connection with a ping
      await this.connection.db.admin().ping();
      const collections = await this.connection.db.listCollections().toArray();
      
      return {
        status: 'connected',
        message: 'Database is connected and responsive',
        connectionState: connectionStates[state],
        database: this.connection.db.databaseName,
        collections: collections.length,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Database error: ${error.message}`,
        connectionState: 'error',
        database: this.connection.db?.databaseName || 'unknown',
        collections: 0,
        timestamp: new Date(),
      };
    }
  }

  async getDatabaseInfo(): Promise<DatabaseInfo> {
    try {
      const db = this.connection.db;
      if (!db) {
        throw new Error('Database connection not established');
      }

      const collections = await db.listCollections().toArray();
      const stats = await db.stats();
      
      // Parse connection string to get host and port
      const hostAddress = this.connection.getClient().options?.hosts?.[0];
      let host = 'localhost';
      let port = 27017;
      
      if (hostAddress && typeof hostAddress === 'object' && 'host' in hostAddress) {
        host = hostAddress.host || 'localhost';
        port = hostAddress.port || 27017;
      }
      
      return {
        name: db.databaseName,
        host,
        port,
        collections: collections.map(col => col.name),
        stats: {
          collections: stats.collections || 0,
          dataSize: stats.dataSize || 0,
          storageSize: stats.storageSize || 0,
          indexes: stats.indexes || 0,
          avgObjSize: stats.avgObjSize || 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get database info:', error.message);
      throw new Error(`Failed to get database info: ${error.message}`);
    }
  }

  async performConnectionTest(): Promise<{
    success: boolean;
    message: string;
    details?: any;
    error?: string;
  }> {
    try {
      if (!this.connection.db) {
        throw new Error('Database connection not established');
      }

      const startTime = Date.now();
      
      // Ping test
      await this.connection.db.admin().ping();
      const pingTime = Date.now() - startTime;
      
      // Get basic info
      const health = await this.getHealth();
      const info = await this.getDatabaseInfo();
      
      return {
        success: true,
        message: 'Database connection test completed successfully',
        details: {
          responseTime: `${pingTime}ms`,
          health,
          info: {
            database: info.name,
            collections: info.collections.length,
            host: `${info.host}:${info.port}`,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Database connection test failed',
        error: error.message,
      };
    }
  }
}

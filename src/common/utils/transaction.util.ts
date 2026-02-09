import { Connection, ClientSession } from 'mongoose';
import { Logger } from '@nestjs/common';

/**
 * Transaction utility for handling MongoDB transactions gracefully
 * Supports both replica set (with transactions) and standalone MongoDB (without transactions)
 */
export class TransactionUtil {
  private static readonly logger = new Logger('TransactionUtil');
  private static transactionsSupported: boolean | null = null;

  /**
   * Start a session and transaction if supported
   * Falls back to no transaction for standalone MongoDB
   */
  static async startTransaction(
    connection: Connection,
  ): Promise<{ session: ClientSession | null; useTransaction: boolean }> {
    // If we already know transactions aren't supported, skip the attempt
    if (this.transactionsSupported === false) {
      this.logger.debug(
        'Transactions not supported (standalone MongoDB). Proceeding without transaction.',
      );
      return { session: null, useTransaction: false };
    }

    try {
      const session = await connection.startSession();
      session.startTransaction();
      
      // If we haven't verified support yet, let's verify it now
      if (this.transactionsSupported === null) {
        try {
          if (!connection.db) {
            throw new Error('Database connection is not fully established');
          }
          // Attempt a lightweight command with the session to verify transaction support
          await connection.db.command({ ping: 1 }, { session });
          
          this.transactionsSupported = true;
          this.logger.log('MongoDB transactions are supported (verified)');
        } catch (e) {
          // If checking fails, we assume no support
          await session.abortTransaction();
          await session.endSession();
          
          this.transactionsSupported = false;
          this.logger.warn(`MongoDB transactions not supported (standalone mode): ${e.message}`);
          return { session: null, useTransaction: false };
        }
      }
      
      return { session, useTransaction: true };
    } catch (error) {
      // Cache that transactions aren't supported
      this.transactionsSupported = false;
      
      this.logger.warn(
        'MongoDB transactions not available (standalone mode). Proceeding without transaction.',
      );
      
      return { session: null, useTransaction: false };
    }
  }

  /**
   * Commit transaction if session exists
   */
  static async commitTransaction(
    session: ClientSession | null,
    useTransaction: boolean,
  ): Promise<void> {
    if (useTransaction && session) {
      await session.commitTransaction();
    }
  }

  /**
   * Abort transaction if session exists
   */
  static async abortTransaction(
    session: ClientSession | null,
    useTransaction: boolean,
  ): Promise<void> {
    if (useTransaction && session) {
      await session.abortTransaction();
    }
  }

  /**
   * End session if it exists
   */
  static async endSession(session: ClientSession | null): Promise<void> {
    if (session) {
      await session.endSession();
    }
  }

  /**
   * Get session options for database operations
   * Returns empty object if no transaction is being used
   */
  static getSessionOptions(
    session: ClientSession | null,
    useTransaction: boolean,
  ): { session?: ClientSession } {
    return useTransaction && session ? { session } : {};
  }

  /**
   * Execute a function within a transaction (if supported)
   * Automatically handles commit, abort, and cleanup
   */
  static async withTransaction<T>(
    connection: Connection,
    operation: (session: ClientSession | null, useTransaction: boolean) => Promise<T>,
  ): Promise<T> {
    const { session, useTransaction } = await this.startTransaction(connection);

    try {
      const result = await operation(session, useTransaction);
      await this.commitTransaction(session, useTransaction);
      return result;
    } catch (error) {
      await this.abortTransaction(session, useTransaction);
      throw error;
    } finally {
      await this.endSession(session);
    }
  }
}

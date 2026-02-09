import { Injectable, Logger } from '@nestjs/common';
import { ClientSession } from 'mongoose';

/**
 * EmailService - Handles bilingual email notifications
 *
 * Provides methods for sending security-related email notifications
 * in both Arabic and English based on user preferences.
 *
 * Requirements: 4.1-4.7
 *
 * Note: This is a minimal implementation for task 17.1.
 * Full implementation with email templates and retry logic will be completed in task 7.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * Send password reset email
   *
   * @param email - Recipient email address
   * @param firstName - User's first name
   * @param resetToken - Password reset token
   * @param language - Preferred language ('ar' or 'en')
   *
   * Requirement 4.1: Password reset email with bilingual content
   */
  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string,
    language: 'ar' | 'en',
  ): Promise<void> {
    try {
      this.logger.log(
        `Sending password reset email to ${email} in ${language}`,
      );

      // TODO: Implement actual email sending with templates
      // For now, just log the action
      this.logger.debug(`Password reset email would be sent to ${email}`);
      this.logger.debug(`Reset token: ${resetToken.substring(0, 8)}...`);

      // Simulate email sending
      // In production, this would use a service like SendGrid, AWS SES, etc.
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send password changed notification
   *
   * @param email - Recipient email address
   * @param firstName - User's first name
   * @param language - Preferred language ('ar' or 'en')
   *
   * Requirement 4.4: Password change confirmation email
   */
  async sendPasswordChangedNotification(
    email: string,
    firstName: string,
    language: 'ar' | 'en',
  ): Promise<void> {
    try {
      this.logger.log(
        `Sending password changed notification to ${email} in ${language}`,
      );

      // TODO: Implement actual email sending with templates
      this.logger.debug(
        `Password changed notification would be sent to ${email}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send password changed notification to ${email}: ${error.message}`,
        error.stack,
      );
      // Don't throw - email failure shouldn't block the operation
    }
  }

  /**
   * Send username (email) changed notification
   *
   * @param newEmail - New email address
   * @param oldEmail - Old email address
   * @param firstName - User's first name
   * @param language - Preferred language ('ar' or 'en')
   *
   * Requirement 4.2: Email change notification
   * Requirement 3.8: Notification on session invalidation
   */
  async sendUsernameChangedNotification(
    newEmail: string,
    oldEmail: string,
    firstName: string,
    language: 'ar' | 'en',
  ): Promise<void> {
    try {
      this.logger.log(
        `Sending username changed notification to ${newEmail} in ${language}`,
      );

      // TODO: Implement actual email sending with templates
      this.logger.debug(
        `Username changed notification would be sent to ${newEmail}`,
      );
      this.logger.debug(`Old email: ${oldEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send username changed notification to ${newEmail}: ${error.message}`,
        error.stack,
      );
      // Don't throw - email failure shouldn't block the operation
    }
  }

  /**
   * Send role changed notification
   *
   * @param email - Recipient email address
   * @param firstName - User's first name
   * @param oldRole - Previous role
   * @param newRole - New role
   * @param language - Preferred language ('ar' or 'en')
   *
   * Requirement 4.3: Role change notification
   * Requirement 3.8: Notification on session invalidation
   */
  async sendRoleChangedNotification(
    email: string,
    firstName: string,
    oldRole: string,
    newRole: string,
    language: 'ar' | 'en',
  ): Promise<void> {
    try {
      this.logger.log(
        `Sending role changed notification to ${email} in ${language}`,
      );

      // TODO: Implement actual email sending with templates
      this.logger.debug(`Role changed notification would be sent to ${email}`);
      this.logger.debug(`Old role: ${oldRole}, New role: ${newRole}`);
    } catch (error) {
      this.logger.error(
        `Failed to send role changed notification to ${email}: ${error.message}`,
        error.stack,
      );
      // Don't throw - email failure shouldn't block the operation
    }
  }

  /**
   * Send session invalidated notification
   *
   * @param email - Recipient email address
   * @param firstName - User's first name
   * @param reason - Reason for session invalidation
   * @param language - Preferred language ('ar' or 'en')
   *
   * Requirement 3.8: Notification on session invalidation
   */
  async sendSessionInvalidatedNotification(
    email: string,
    firstName: string,
    reason: string,
    language: 'ar' | 'en',
  ): Promise<void> {
    try {
      this.logger.log(
        `Sending session invalidated notification to ${email} in ${language}`,
      );

      // TODO: Implement actual email sending with templates
      this.logger.debug(
        `Session invalidated notification would be sent to ${email}`,
      );
      this.logger.debug(`Reason: ${reason}`);
    } catch (error) {
      this.logger.error(
        `Failed to send session invalidated notification to ${email}: ${error.message}`,
        error.stack,
      );
      // Don't throw - email failure shouldn't block the operation
    }
  }

  /**
   * Send appointment notification
   *
   * @param email - Recipient email address
   * @param appointmentData - Appointment details
   * @param type - Notification type ('transferred' or 'rescheduled')
   * @param language - Preferred language ('ar' or 'en')
   * @param session - Optional MongoDB session for transaction support
   *
   * Requirement 7.4: Notify affected patients via email
   */
  async sendAppointmentNotification(
    email: string,
    appointmentData: {
      patientName: string;
      doctorName?: string;
      appointmentDate: Date;
      appointmentTime: string;
      serviceName: string;
      reason?: string;
    },
    type: 'transferred' | 'rescheduled',
    language: 'ar' | 'en',
    session?: ClientSession,
  ): Promise<void> {
    try {
      this.logger.log(
        `Sending appointment ${type} notification to ${email} in ${language}`,
      );

      // TODO: Implement actual email sending with templates
      this.logger.debug(
        `Appointment ${type} notification would be sent to ${email}`,
      );
      this.logger.debug(`Appointment data:`, appointmentData);
    } catch (error) {
      this.logger.error(
        `Failed to send appointment ${type} notification to ${email}: ${error.message}`,
        error.stack,
      );
      // Don't throw - email failure shouldn't block the operation
    }
  }
}

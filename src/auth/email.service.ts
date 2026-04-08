import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
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
  private gmailClient: ReturnType<typeof google.gmail> | null = null;

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private getErrorStack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }

  private getSenderEmail(): string {
    return (
      process.env.GOOGLE_EMAIL ||
      process.env.MAIL_FROM ||
      process.env.SMTP_USER ||
      ''
    );
  }

  private getFrontendBaseUrl(): string {
    return (
      process.env.FRONTEND_URL ||
      process.env.CLIENT_URL ||
      'http://localhost:5173'
    ).replace(/\/$/, '');
  }

  private getDisplayName(firstName?: string): string {
    return firstName?.trim() || 'Cliniva user';
  }

  private toBase64Url(value: string): string {
    return Buffer.from(value)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  private createRawEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): string {
    const from = this.getSenderEmail();
    const headers = [
      `From: Cliniva <${from}>`,
      `To: ${params.to}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      `Subject: ${params.subject}`,
      '',
      `${params.html}<br /><br /><hr /><p style="font-family: Arial, sans-serif; color: #6b7280; white-space: pre-line;">${params.text}</p>`,
    ];

    return this.toBase64Url(headers.join('\r\n'));
  }

  private getGmailClient() {
    if (this.gmailClient) {
      return this.gmailClient;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const senderEmail = this.getSenderEmail();

    if (!clientId || !clientSecret || !refreshToken || !senderEmail) {
      throw new Error(
        'Google email configuration is incomplete. Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, and GOOGLE_EMAIL.',
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      process.env.GOOGLE_REDIRECT_URI,
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    this.gmailClient = google.gmail({ version: 'v1', auth: oauth2Client });

    return this.gmailClient;
  }

  private async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    const gmail = this.getGmailClient();

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: this.createRawEmail(params),
      },
    });
  }

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
      const recipientName = this.getDisplayName(firstName);
      const resetLink = `${this.getFrontendBaseUrl()}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;
      const subject =
        language === 'ar'
          ? 'إعادة تعيين كلمة المرور - Cliniva'
          : 'Reset your Cliniva password';
      const html = `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <p>${language === 'ar' ? `مرحباً ${recipientName}` : `Hello ${recipientName},`}</p>
          <p>
            ${
              language === 'ar'
                ? 'تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. استخدم الزر التالي لإكمال العملية. صلاحية الرابط 24 ساعة ويُستخدم مرة واحدة فقط.'
                : 'We received a request to reset your account password. Use the button below to complete the process. The link is valid for 24 hours and can only be used once.'
            }
          </p>
          <p style="margin: 24px 0;">
            <a href="${resetLink}" style="background: #00B48D; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; display: inline-block;">
              ${language === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset password'}
            </a>
          </p>
          <p>
            ${
              language === 'ar'
                ? 'إذا لم تقم بهذا الطلب، يمكنك تجاهل هذه الرسالة بأمان.'
                : 'If you did not request this, you can safely ignore this email.'
            }
          </p>
          <p style="font-size: 12px; color: #6b7280;">${resetLink}</p>
        </div>
      `;
      const text =
        language === 'ar'
          ? `مرحباً ${recipientName}\n\nاستخدم هذا الرابط لإعادة تعيين كلمة المرور:\n${resetLink}\n\nصلاحية الرابط 24 ساعة. إذا لم تطلب ذلك، تجاهل هذه الرسالة.`
          : `Hello ${recipientName},\n\nUse this link to reset your password:\n${resetLink}\n\nThis link expires in 24 hours. If you did not request this, ignore this email.`;

      await this.sendEmail({ to: email, subject, html, text });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
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
      const recipientName = this.getDisplayName(firstName);
      const subject =
        language === 'ar'
          ? 'تم تغيير كلمة المرور - Cliniva'
          : 'Your Cliniva password was changed';
      const html = `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <p>${language === 'ar' ? `مرحباً ${recipientName}` : `Hello ${recipientName},`}</p>
          <p>
            ${
              language === 'ar'
                ? 'تم تغيير كلمة المرور الخاصة بحسابك بنجاح. إذا لم تقم بهذا التغيير، يرجى التواصل مع الدعم فوراً.'
                : 'Your account password was changed successfully. If you did not make this change, contact support immediately.'
            }
          </p>
        </div>
      `;
      const text =
        language === 'ar'
          ? `مرحباً ${recipientName}\n\nتم تغيير كلمة المرور الخاصة بحسابك بنجاح. إذا لم تقم بهذا التغيير، تواصل مع الدعم فوراً.`
          : `Hello ${recipientName},\n\nYour account password was changed successfully. If you did not make this change, contact support immediately.`;

      await this.sendEmail({ to: email, subject, html, text });
      this.logger.log(`Password changed notification sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password changed notification to ${email}: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
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
        `Failed to send username changed notification to ${newEmail}: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
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
        `Failed to send role changed notification to ${email}: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
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
        `Failed to send session invalidated notification to ${email}: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      // Don't throw - email failure shouldn't block the operation
    }
  }

  /**
   * Send email change verification
   *
   * @param newEmail - New email address
   * @param firstName - User's first name
   * @param verificationToken - Email verification token
   * @param language - Preferred language ('ar' or 'en')
   *
   * Requirement: Email change verification
   */
  async sendEmailChangeVerification(
    newEmail: string,
    firstName: string,
    verificationToken: string,
    language: 'ar' | 'en',
  ): Promise<void> {
    try {
      this.logger.log(
        `Sending email change verification to ${newEmail} in ${language}`,
      );

      // TODO: Implement actual email sending with templates
      this.logger.debug(
        `Email change verification would be sent to ${newEmail}`,
      );
      this.logger.debug(
        `Verification token: ${verificationToken.substring(0, 8)}...`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email change verification to ${newEmail}: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      throw new Error('Failed to send email change verification');
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
        `Failed to send appointment ${type} notification to ${email}: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      // Don't throw - email failure shouldn't block the operation
    }
  }
}

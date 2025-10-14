export const passwordResetEmailTemplate = {
  subject: 'Reset Your Password - Clinva',
  
  html: (data: { firstName: string; resetUrl: string; expiresIn: string }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .content {
          background-color: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 2px solid #4CAF50;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          margin: 20px 0;
          background-color: #4CAF50;
          color: white !important;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
        }
        .button:hover {
          background-color: #45a049;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 12px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding-top: 20px;
          margin-top: 20px;
          border-top: 1px solid #ddd;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          
          <p>Hello <strong>${data.firstName}</strong>,</p>
          
          <p>We received a request to reset your password for your Clinva account.</p>
          
          <p>Click the button below to reset your password:</p>
          
          <div style="text-align: center;">
            <a href="${data.resetUrl}" class="button">Reset Password</a>
          </div>
          
          <p>Or copy and paste this link in your browser:</p>
          <p style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all;">
            ${data.resetUrl}
          </p>
          
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul>
              <li>This link will expire in <strong>${data.expiresIn}</strong></li>
              <li>If you didn't request this, please ignore this email</li>
              <li>Your password won't change until you access the link above</li>
            </ul>
          </div>
          
          <p>If you have any questions, please contact our support team.</p>
          
          <div class="footer">
            <p>Best regards,<br>The Clinva Team</p>
            <p style="font-size: 12px; color: #999;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
  
  text: (data: { firstName: string; resetUrl: string; expiresIn: string }) => `
    Password Reset Request
    
    Hello ${data.firstName},
    
    We received a request to reset your password for your Clinva account.
    
    Click the link below to reset your password:
    ${data.resetUrl}
    
    This link will expire in ${data.expiresIn}.
    
    If you didn't request this, please ignore this email.
    Your password won't change until you access the link above.
    
    Best regards,
    The Clinva Team
  `
};

export const passwordChangedEmailTemplate = {
  subject: 'Your Password Has Been Changed - Clinva',
  
  html: (data: { firstName: string }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .content {
          background-color: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 2px solid #4CAF50;
        }
        .success-icon {
          font-size: 48px;
          text-align: center;
          margin: 20px 0;
        }
        .alert {
          background-color: #d4edda;
          border-left: 4px solid #28a745;
          padding: 12px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding-top: 20px;
          margin-top: 20px;
          border-top: 1px solid #ddd;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          <div class="header">
            <h1>✅ Password Changed Successfully</h1>
          </div>
          
          <div class="success-icon">✓</div>
          
          <p>Hello <strong>${data.firstName}</strong>,</p>
          
          <div class="alert">
            <strong>Your password has been changed successfully!</strong>
          </div>
          
          <p>This email confirms that your Clinva account password was recently changed.</p>
          
          <p><strong>If you made this change:</strong><br>
          No further action is needed. Your account is secure.</p>
          
          <p><strong>If you did NOT make this change:</strong><br>
          Please contact our support team immediately to secure your account.</p>
          
          <div class="footer">
            <p>Best regards,<br>The Clinva Team</p>
            <p style="font-size: 12px; color: #999;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
  
  text: (data: { firstName: string }) => `
    Password Changed Successfully
    
    Hello ${data.firstName},
    
    Your password has been changed successfully!
    
    This email confirms that your Clinva account password was recently changed.
    
    If you made this change:
    No further action is needed. Your account is secure.
    
    If you did NOT make this change:
    Please contact our support team immediately to secure your account.
    
    Best regards,
    The Clinva Team
  `
};
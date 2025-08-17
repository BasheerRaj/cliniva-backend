# Authentication System

This directory contains the complete authentication implementation for the Cliniva backend system, built with NestJS, JWT, and MongoDB.

## 🚀 Features

- **JWT-based Authentication**: Stateless authentication using JSON Web Tokens
- **Password Security**: Bcrypt hashing with salt rounds for secure password storage
- **Role-based Access**: Integration with existing role system (owner, admin, doctor, staff, patient)
- **Token Refresh**: Refresh token mechanism for extended sessions
- **Input Validation**: Comprehensive DTO validation with class-validator
- **Type Safety**: Full TypeScript support with proper typing
- **Integration Ready**: Seamlessly works with existing permissions system

## 📁 Directory Structure

```
src/auth/
├── dto/                     # Data Transfer Objects
│   ├── login.dto.ts         # Login request validation
│   ├── register.dto.ts      # Registration request validation
│   ├── auth-response.dto.ts # Authentication response types
│   ├── refresh-token.dto.ts # Token refresh validation
│   └── index.ts            # DTO exports
├── strategies/             # Passport strategies
│   └── jwt.strategy.ts     # JWT validation strategy
├── guards/                 # Authentication guards
│   └── jwt-auth.guard.ts   # JWT authentication guard
├── examples/               # Usage examples
│   └── auth-usage.example.ts # Complete usage guide
├── auth.service.ts         # Core authentication logic
├── auth.controller.ts      # HTTP endpoints
├── auth.module.ts          # Module configuration
├── index.ts               # Module exports
└── README.md              # This file
```

## 🛠️ Installation

Before using the authentication system, install the required dependencies:

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer
npm install --save-dev @types/bcrypt @types/passport-jwt
```

## ⚙️ Configuration

Add these environment variables to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-token-secret-key
JWT_REFRESH_EXPIRES_IN=7d
```

## 🎯 API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/refresh` | Refresh access token | No |
| GET | `/auth/profile` | Get current user profile | Yes |
| POST | `/auth/logout` | Logout user (client-side) | Yes |

### Request/Response Examples

#### Register User
```bash
POST /auth/register
Content-Type: application/json

{
  "email": "doctor@clinic.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "doctor",
  "phone": "+1234567890",
  "nationality": "US",
  "gender": "male"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "doctor@clinic.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "doctor",
    "isActive": true,
    "emailVerified": false
  }
}
```

#### Login User
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "doctor@clinic.com",
  "password": "SecurePass123!"
}
```

#### Get Profile
```bash
GET /auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🔒 Usage with Guards

### Basic Authentication
```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('protected')
export class ProtectedController {
  @Get()
  @UseGuards(JwtAuthGuard)
  getProtectedData() {
    return { message: 'This requires authentication' };
  }
}
```

### Authentication + Permissions
```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsEnum } from '../common/enums/permissions.enum';

@Controller('admin')
export class AdminController {
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions([PermissionsEnum.ADMIN_ACCESS])
  getAdminData() {
    return { message: 'This requires admin permissions' };
  }
}
```

## 🔑 Password Requirements

The system enforces strong password requirements:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one number
- At least one special character (@$!%*?&)

## 🚫 Error Handling

The system returns appropriate HTTP status codes:

| Status Code | Description | Example |
|-------------|-------------|---------|
| 200 | Success | Successful login |
| 201 | Created | User registered |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Invalid credentials or token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 409 | Conflict | Email already exists |

## 🔐 Security Features

### Password Security
- Bcrypt hashing with 12 salt rounds
- Secure password validation
- No plain text password storage

### Token Security
- JWT with configurable expiration
- Separate refresh token mechanism
- Secret key from environment variables
- Token verification on each request

### Input Validation
- Email format validation
- Password strength requirements
- Role validation against allowed values
- Request sanitization and transformation

## 🧪 Testing

### Manual Testing with cURL

#### Register a new user:
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@clinic.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User",
    "role": "staff"
  }'
```

#### Login:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@clinic.com",
    "password": "SecurePass123!"
  }'
```

#### Access protected endpoint:
```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🔄 Integration with Existing System

The authentication system integrates seamlessly with existing components:

### User Schema
- Uses existing `User` schema from `database/schemas/user.schema.ts`
- Leverages existing fields: `passwordHash`, `isActive`, `emailVerified`, etc.
- Compatible with existing user roles and permissions

### Permissions System
- Works with existing `PermissionsGuard`
- Uses existing `PermissionsEnum` and role definitions
- Maintains existing permission checking logic

### Database
- Uses existing MongoDB connection
- No schema changes required
- Compatible with existing user records

## 🚀 Deployment Considerations

### Environment Variables
Ensure these are set in production:
```env
JWT_SECRET=your-production-secret-minimum-32-characters
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-production-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
```

### Security Recommendations
- Use strong, unique JWT secrets (minimum 32 characters)
- Set shorter token expiration in production (1h instead of 24h)
- Enable HTTPS in production
- Consider implementing rate limiting on auth endpoints
- Monitor failed login attempts

## 📚 Future Enhancements

The system is designed to support future features:

- **Email Verification**: Using existing `emailVerified` field
- **Two-Factor Authentication**: Using existing `twoFactorEnabled` field  
- **Password Reset**: Using existing `passwordResetToken` fields
- **Account Lockout**: Track failed login attempts
- **Session Management**: Optional session tracking
- **Social Login**: OAuth integration
- **Audit Logging**: Track authentication events

## 🤝 Best Practices

### Guard Order
Always use guards in this order:
```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
```

### Error Handling
Implement proper error handling in your controllers:
```typescript
try {
  const result = await this.authService.login(loginDto);
  return result;
} catch (error) {
  // Handle specific errors
  throw error;
}
```

### Token Storage (Frontend)
- Store tokens securely (httpOnly cookies or secure storage)
- Implement automatic token refresh
- Clear tokens on logout
- Handle token expiration gracefully

### Password Policies
- Enforce strong passwords
- Consider password history
- Implement password change policies
- Educate users on security

## 📞 Support

For questions or issues with the authentication system:

1. Check the examples in `examples/auth-usage.example.ts`
2. Review the test cases for expected behavior
3. Verify environment variable configuration
4. Check MongoDB connection and user schema
5. Ensure all dependencies are installed

## 🏗️ Architecture

The authentication system follows NestJS best practices:

- **Modular Design**: Self-contained auth module
- **Dependency Injection**: Proper service injection
- **Guards**: Reusable authentication logic
- **DTOs**: Input validation and transformation
- **Strategies**: Passport.js integration
- **Type Safety**: Full TypeScript support

This design ensures maintainability, testability, and scalability for the Cliniva healthcare management system.





import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Enable CORS for development
  app.enableCors();

  // Apply global validation exception filter for bilingual error messages
  app.useGlobalFilters(new ValidationExceptionFilter());

  // Swagger API Documentation Configuration
  const config = new DocumentBuilder()
    .setTitle('Cliniva Healthcare Management API')
    .setDescription(
      `
      Comprehensive API for managing healthcare operations including:
      - Authentication & Authorization
      - User & Employee Management
      - Organization & Complex Management
      - Clinic & Department Management
      - Patient Management
      - Appointment Scheduling
      - Medical Services
      - Working Hours Management
      - Onboarding Flow
      - Subscription Management
      
      ## Features
      - ✅ Bilingual support (Arabic/English) for all error messages
      - ✅ Role-based access control (RBAC)
      - ✅ Multi-tenant architecture
      - ✅ Comprehensive audit logging
      - ✅ RESTful API design
      
      ## Response Format
      All endpoints return responses in a consistent format:
      
      **Success Response:**
      \`\`\`json
      {
        "success": true,
        "data": { ... },
        "message": {
          "ar": "رسالة النجاح بالعربية",
          "en": "Success message in English"
        }
      }
      \`\`\`
      
      **Error Response:**
      \`\`\`json
      {
        "success": false,
        "error": {
          "code": "ERROR_CODE",
          "message": {
            "ar": "رسالة الخطأ بالعربية",
            "en": "Error message in English"
          },
          "details": { ... }
        }
      }
      \`\`\`
      
      ## Authentication
      Most endpoints require authentication using JWT Bearer tokens.
      Include the token in the Authorization header: \`Bearer <token>\`
    `,
    )
    .setVersion('1.0')
    .setContact('Cliniva Support', 'https://cliniva.com', 'support@cliniva.com')
    .setLicense('Proprietary', 'https://cliniva.com/license')
    // M1 Tags - Security & User Management
    .addTag(
      'Authentication',
      'User authentication, authorization, and session management',
    )
    .addTag('Users', 'User account management and profile operations')
    .addTag(
      'User Access',
      'Role-based access control and permissions management',
    )
    .addTag('Employees', 'Employee profile and information management')
    .addTag('Working Hours', 'Working hours configuration and validation')
    // M2 Tags - Medical Facilities Management
    .addTag('Organizations', 'Organization and company management')
    .addTag(
      'Complexes',
      'Medical complex management with full lifecycle operations',
    )
    .addTag('Departments', 'Department management within complexes')
    .addTag('Clinics', 'Clinic management and operations')
    .addTag('Onboarding', 'Step-by-step onboarding flow for new organizations')
    .addTag('Subscriptions', 'Subscription plan management and billing')
    // Additional Tags
    .addTag('Patients', 'Patient records and medical history management')
    .addTag('Appointments', 'Appointment scheduling and management')
    .addTag('Services', 'Medical services and offerings management')
    .addTag('Specialties', 'Medical specialties and doctor specializations')
    .addTag('Database', 'Database health checks and system information')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Cliniva API Documentation',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { font-size: 36px; }
    `,
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      defaultModelsExpandDepth: 3,
      defaultModelExpandDepth: 3,
      displayRequestDuration: true,
      tryItOutEnabled: true,
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Cliniva Backend is running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(
    `📊 Database health check: http://localhost:${port}/api/v1/database/health`,
  );
  console.log(
    `🔍 Database info: http://localhost:${port}/api/v1/database/info`,
  );
  console.log(
    `🧪 Test connection: http://localhost:${port}/api/v1/database/test`,
  );
  console.log(
    `🏓 Ping database: http://localhost:${port}/api/v1/database/ping`,
  );
}
bootstrap();

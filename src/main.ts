import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Enable CORS for development
  app.enableCors();

  // Swagger API Documentation Configuration
  const config = new DocumentBuilder()
    .setTitle('Cliniva Healthcare Management API')
    .setDescription(
      `
      Comprehensive API for managing healthcare operations including:
      - Complex Management (medical complexes with full lifecycle operations)
      - Clinic Management
      - Patient Management
      - Appointment Scheduling
      - User Management
      - Authentication & Authorization
      
      All endpoints support bilingual error messages (Arabic/English).
    `,
    )
    .setVersion('1.0')
    .addTag('Complex Management', 'Endpoints for managing medical complexes')
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('User Management', 'User CRUD operations')
    .addTag('Clinic Management', 'Clinic operations')
    .addTag('Patient Management', 'Patient records and operations')
    .addTag('Appointment Management', 'Appointment scheduling and management')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Cliniva API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
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

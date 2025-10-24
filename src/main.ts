import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Set global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // إعدادات Swagger
  const config = new DocumentBuilder()
    .setTitle('My API Docs')
    .setDescription('all apis')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });



  // Enable CORS for development
  app.enableCors();

  const port = process.env.PORT || 3001;
  await app.listen(port);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // ✅ مهم جداً لتحويل الأنواع
      transformOptions: {
        enableImplicitConversion: true, // ✅ تحويل تلقائي
      },
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );
  console.log(`🚀 Cliniva Backend is running on port ${port}`);
  console.log(`📊 Database health check: http://localhost:${port}/api/v1/database/health`);
  console.log(`🔍 Database info: http://localhost:${port}/api/v1/database/info`);
  console.log(`🧪 Test connection: http://localhost:${port}/api/v1/database/test`);
  console.log(`🏓 Ping database: http://localhost:${port}/api/v1/database/ping`);
}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Set global prefix for all routes
  app.setGlobalPrefix('api/v1');
  
  // Enable CORS for development
  app.enableCors();
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 Cliniva Backend is running on port ${port}`);
  console.log(`📊 Database health check: http://localhost:${port}/api/v1/database/health`);
  console.log(`🔍 Database info: http://localhost:${port}/api/v1/database/info`);
  console.log(`🧪 Test connection: http://localhost:${port}/api/v1/database/test`);
  console.log(`🏓 Ping database: http://localhost:${port}/api/v1/database/ping`);
}
bootstrap();

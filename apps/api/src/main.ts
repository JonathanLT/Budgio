import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.NEXTAUTH_URL ?? 'http://localhost:3000', credentials: true });

  const config = new DocumentBuilder()
    .setTitle('Budgio API')
    .setDescription('API de gestion budgétaire familiale')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3001);
  console.log('API running on http://localhost:3001');
  console.log('Swagger on http://localhost:3001/api/docs');
}
bootstrap();

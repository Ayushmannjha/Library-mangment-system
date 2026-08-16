import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

/**
 * Application bootstrap.
 * Centralizes every cross-cutting HTTP concern (prefix, versioning,
 * validation, CORS, response envelope, error mapping, Swagger) here so that
 * every feature controller stays thin and behaves identically.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Headers
  app.use(helmet());

  // Enable CORS securely via config (falling back to strict default)
  const configService = app.get(ConfigService);
  const corsOrigins = configService.get<string>('CORS_ORIGINS');
  if (corsOrigins) {
    app.enableCors({
      origin: corsOrigins.split(',').map((o) => o.trim()),
      credentials: true,
    });
  } else {
    // Default to only localhost for development if not configured
    // Origins: admin frontend (4201), student portal (4202), API/docs.
    app.enableCors({
      origin: [
        'http://localhost:3000',
        'http://localhost:4000',
        'http://127.0.0.1:4201',
        'http://localhost:4201',
        'http://127.0.0.1:4202',
        'http://localhost:4202',
      ],
      credentials: true,
    });
  }

  // All routes live under /api and /api/v1 via URI versioning. Versioning
  // lets us introduce breaking changes in v2 without breaking v1 clients.
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation strategy:
  //  - whitelist           -> silently strips fields that have no DTO decorator
  //  - forbidNonWhitelisted -> rejects unknown fields instead of ignoring them
  //  - transform           -> converts plain payload objects into DTO classes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Wrap every response in the { success, message, data } envelope and
  // convert BigInt ids into strings (JSON cannot serialize BigInt).
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Turn HTTP/Prisma failures into one uniform, safe error body.
  app.useGlobalFilters(new HttpExceptionFilter());

  // OpenAPI (Swagger) docs at /api/docs. addBearerAuth reserves a Bearer
  // security scheme so JWT-protected endpoints (added later) already
  // have the "Authorize" button in Swagger UI.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Library Management API')
    .setDescription('REST API for the Library Management SaaS application.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Read host/port from environment; fall back to 3000 in local dev.
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

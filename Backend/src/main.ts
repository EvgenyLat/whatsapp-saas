import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import * as express from 'express';
import { Request, Response } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Get configuration service
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const environment = configService.get<string>('app.environment', 'development');

  // EXPLICIT: Add body parser for ALL routes FIRST
  // This ensures JSON parsing works before any other middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // SECURITY: Raw body parser for webhook signature validation
  // WhatsApp webhook signatures require access to raw request body
  // IMPORTANT: This MUST be configured BEFORE express.json() middleware
  app.use(
    '/api/v1/whatsapp/webhook',
    express.json({
      verify: (req: any, res, buf) => {
        // Store raw body for signature validation
        req.rawBody = buf.toString('utf8');
      },
    }),
  );

  // Performance: Compression middleware (gzip/deflate)
  // Compress all responses > 1KB with high compression level
  app.use(compression({
    threshold: 1024, // Only compress responses > 1KB
    level: 6, // Compression level (0-9, 6 is default and balanced)
    filter: (req: Request, res: Response) => {
      // Don't compress Server-Sent Events
      if (req.headers['accept'] === 'text/event-stream') {
        return false;
      }
      return compression.filter(req, res);
    },
  }));

  // Security: Helmet middleware
  app.use(helmet());

  // CORS configuration - SECURITY: Strict validation
  const corsOrigin = configService.get<string>('app.corsOrigin', '*');

  // SECURITY: Reject wildcard origin with credentials in production
  if (environment === 'production' && corsOrigin === '*') {
    logger.error('SECURITY ERROR: CORS_ORIGIN cannot be wildcard (*) in production when credentials are enabled');
    logger.error('Set CORS_ORIGIN environment variable to specific allowed origins (comma-separated)');
    throw new Error('SECURITY ERROR: Wildcard CORS origin not allowed in production with credentials');
  }

  // Parse multiple origins (comma-separated)
  const allowedOrigins = corsOrigin === '*'
    ? corsOrigin
    : corsOrigin.split(',').map(origin => origin.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, Postman)
      if (!origin) {
        return callback(null, true);
      }

      // In development with wildcard, allow all
      if (allowedOrigins === '*' && environment !== 'production') {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (Array.isArray(allowedOrigins)) {
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        logger.warn(`CORS: Blocked request from unauthorized origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-API-Version',
      'X-Request-ID',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    exposedHeaders: ['X-CSRF-Token'],
    maxAge: 86400, // 24 hours
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger API documentation (only in development)
  if (environment !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('WhatsApp SaaS API')
      .setDescription('WhatsApp Cloud API Booking SaaS Platform')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('organizations', 'Organization management')
      .addTag('whatsapp', 'WhatsApp integration')
      .addTag('campaigns', 'Campaign management')
      .addTag('templates', 'Template management')
      .addTag('webhooks', 'Webhook handlers')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);

  logger.log('====================================');
  logger.log('WhatsApp SaaS API is running!');
  logger.log('====================================');
  logger.log(`Environment: ${environment}`);
  logger.log(`Port: ${port}`);
  logger.log(`API: http://localhost:${port}/api/v1`);
  if (environment !== 'production') {
    logger.log(`Swagger: http://localhost:${port}/api/docs`);
  }
  logger.log('====================================');
}

bootstrap();

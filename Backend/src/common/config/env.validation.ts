/**
 * Environment Variable Validation
 * Validates all required environment variables on application startup
 */

import * as Joi from 'joi';

export interface EnvironmentVariables {
  // Application
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  APP_NAME: string;
  APP_URL: string;
  API_PREFIX: string;
  CORS_ORIGIN: string;

  // Database
  DATABASE_URL: string;
  DATABASE_POOL_SIZE: number;
  DATABASE_CONNECTION_TIMEOUT: number;
  DATABASE_LOGGING: boolean;

  // JWT
  JWT_SECRET: string;
  JWT_ACCESS_TOKEN_EXPIRY: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_TOKEN_EXPIRY: string;

  // WhatsApp
  WHATSAPP_API_VERSION: string;
  WHATSAPP_API_URL: string;
  WHATSAPP_VERIFY_TOKEN: string;
  WHATSAPP_WEBHOOK_SECRET: string;

  // Redis
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  REDIS_DB: number;
  REDIS_ENABLE_TLS: boolean;

  // Rate Limiting
  RATE_LIMIT_TTL: number;
  RATE_LIMIT_MAX: number;

  // Logging
  LOG_LEVEL: string;

  // OpenAI
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_MAX_TOKENS?: number;
  OPENAI_TEMPERATURE?: number;

  // Encryption
  ENCRYPTION_KEY: string;

  // Feature Flags
  ENABLE_SWAGGER: boolean;
  ENABLE_RATE_LIMITING: boolean;
  ENABLE_CORS: boolean;
}

export const validationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  APP_NAME: Joi.string().required(),
  APP_URL: Joi.string().uri().required(),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGIN: Joi.string().required(),

  // Database
  DATABASE_URL: Joi.string().required(),
  DATABASE_POOL_SIZE: Joi.number().integer().min(1).default(10),
  DATABASE_CONNECTION_TIMEOUT: Joi.number().integer().min(1000).default(10000),
  DATABASE_LOGGING: Joi.boolean().default(false),

  // JWT - Strict validation for production
  JWT_SECRET: Joi.string().min(32).required()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().invalid('dev-jwt-secret-change-in-production')
        .messages({
          'any.invalid': 'JWT_SECRET must be changed in production! Do not use default development value.',
        }),
    }),
  JWT_ACCESS_TOKEN_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().invalid('dev-refresh-secret-change-in-production')
        .messages({
          'any.invalid': 'JWT_REFRESH_SECRET must be changed in production! Do not use default development value.',
        }),
    }),
  JWT_REFRESH_TOKEN_EXPIRY: Joi.string().default('7d'),

  // WhatsApp
  WHATSAPP_API_VERSION: Joi.string().default('v18.0'),
  WHATSAPP_API_URL: Joi.string().uri().default('https://graph.facebook.com'),
  WHATSAPP_VERIFY_TOKEN: Joi.string().required()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().invalid('dev-webhook-verify-token')
        .messages({
          'any.invalid': 'WHATSAPP_VERIFY_TOKEN must be changed in production!',
        }),
    }),
  WHATSAPP_WEBHOOK_SECRET: Joi.string().required()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().invalid('dev-webhook-secret')
        .messages({
          'any.invalid': 'WHATSAPP_WEBHOOK_SECRET must be changed in production!',
        }),
    }),

  // Redis
  REDIS_HOST: Joi.string().hostname().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().integer().min(0).default(0),
  REDIS_ENABLE_TLS: Joi.boolean().default(false),

  // Rate Limiting
  RATE_LIMIT_TTL: Joi.number().integer().min(1000).default(60000),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(100),

  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly').default('info'),

  // OpenAI (Optional for AI assistant feature)
  OPENAI_API_KEY: Joi.string().optional()
    .messages({
      'string.base': 'OPENAI_API_KEY must be a valid API key string. Required for AI booking assistant.',
    }),
  OPENAI_MODEL: Joi.string().default('gpt-4')
    .valid('gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo')
    .messages({
      'any.only': 'OPENAI_MODEL must be one of: gpt-4, gpt-4-turbo-preview, gpt-3.5-turbo',
    }),
  OPENAI_MAX_TOKENS: Joi.number().integer().min(1).max(4000).default(1000),
  OPENAI_TEMPERATURE: Joi.number().min(0).max(2).default(0.7)
    .messages({
      'number.min': 'OPENAI_TEMPERATURE must be between 0 and 2',
      'number.max': 'OPENAI_TEMPERATURE must be between 0 and 2',
    }),

  // Encryption
  ENCRYPTION_KEY: Joi.string().length(32).required()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().invalid('dev-32-char-encryption-key-12')
        .messages({
          'any.invalid': 'ENCRYPTION_KEY must be changed in production! Generate a secure 32-character key.',
        }),
    }),

  // Feature Flags
  ENABLE_SWAGGER: Joi.boolean().default(false),
  ENABLE_RATE_LIMITING: Joi.boolean().default(true),
  ENABLE_CORS: Joi.boolean().default(true),
});

/**
 * Validates environment variables on application startup
 * Throws an error if any required variables are missing or invalid
 */
export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const { error, value } = validationSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => {
      return `${detail.path.join('.')}: ${detail.message}`;
    });

    throw new Error(
      `❌ Environment validation failed:\n\n${errorMessages.join('\n')}\n\n` +
      `Please check your .env.${process.env.NODE_ENV || 'development'} file.\n`,
    );
  }

  return value as EnvironmentVariables;
}

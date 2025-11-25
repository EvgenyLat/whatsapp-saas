import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
  connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '10000', 10),
  enableLogging: process.env.DATABASE_LOGGING === 'true',
}));

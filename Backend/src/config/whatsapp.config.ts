import { registerAs } from '@nestjs/config';

export default registerAs('whatsapp', () => ({
  apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0',
  apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com',
  webhookVerifyToken: process.env.META_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || '',
  webhookSecret: process.env.META_APP_SECRET || process.env.WHATSAPP_WEBHOOK_SECRET || '',
  disableWebhookValidation: process.env.DISABLE_WEBHOOK_VALIDATION === 'true',
  timeout: parseInt(process.env.WHATSAPP_TIMEOUT || '30000', 10),
  retryAttempts: parseInt(process.env.WHATSAPP_RETRY_ATTEMPTS || '3', 10),
  retryDelay: parseInt(process.env.WHATSAPP_RETRY_DELAY || '1000', 10),
}));

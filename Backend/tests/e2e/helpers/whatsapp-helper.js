/**
 * =============================================================================
 * WHATSAPP HELPER
 * =============================================================================
 * Helper functions for simulating WhatsApp webhook interactions
 * =============================================================================
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');

class WhatsAppHelper {
  constructor(page) {
    this.page = page;
    this.baseUrl = process.env.BASE_URL || 'http://localhost:4000';
    this.webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET || 'test-secret';
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'test-verify-token';
  }

  /**
   * Send webhook with message
   */
  async sendWebhook(message, options = {}) {
    const url = new URL('/webhook/whatsapp', this.baseUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'test-entry-id',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: message.to,
                    phone_number_id: 'test-phone-id',
                  },
                  messages: [
                    {
                      from: message.from,
                      id: `msg_${Date.now()}`,
                      timestamp: message.timestamp || Date.now(),
                      type: message.type || 'text',
                      text: message.type === 'text' || !message.type ? { body: message.body } : undefined,
                      image: message.image,
                      document: message.document,
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      });

      const requestOptions = {
        method: 'POST',
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: options.timeout || 10000,
      };

      if (!options.skipSignature) {
        const signature = this.generateSignature(payload);
        requestOptions.headers['X-Hub-Signature-256'] = signature;
      }

      const startTime = Date.now();
      const req = lib.request(requestOptions, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const duration = Date.now() - startTime;
          const body = Buffer.concat(chunks).toString();

          try {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: JSON.parse(body),
              duration,
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: body,
              duration,
            });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(payload);
      req.end();
    });
  }

  /**
   * Send webhook with custom signature
   */
  async sendWebhookWithSignature(message, options = {}) {
    const url = new URL('/webhook/whatsapp', this.baseUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'test-entry-id',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: message.to,
                    phone_number_id: 'test-phone-id',
                  },
                  messages: [
                    {
                      from: message.from,
                      id: `msg_${Date.now()}`,
                      timestamp: message.timestamp || Date.now(),
                      type: 'text',
                      text: { body: message.body },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      });

      let signature;
      if (options.invalidSignature) {
        signature = 'sha256=invalid_signature_12345';
      } else {
        signature = this.generateSignature(payload);
      }

      const requestOptions = {
        method: 'POST',
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'X-Hub-Signature-256': signature,
        },
      };

      const req = lib.request(requestOptions, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          try {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: JSON.parse(body),
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: body,
            });
          }
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  /**
   * Send raw webhook payload
   */
  async sendRawWebhook(payload) {
    const url = new URL('/webhook/whatsapp', this.baseUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

      const requestOptions = {
        method: 'POST',
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payloadString),
        },
      };

      const req = lib.request(requestOptions, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          try {
            resolve({
              status: res.statusCode,
              body: JSON.parse(body),
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              body: body,
            });
          }
        });
      });

      req.on('error', reject);
      req.write(payloadString);
      req.end();
    });
  }

  /**
   * Send webhook verification request
   */
  async sendVerificationRequest(params) {
    const url = new URL('/webhook/whatsapp', this.baseUrl);
    const queryString = new URLSearchParams(params).toString();
    url.search = queryString;

    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const requestOptions = {
        method: 'GET',
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
      };

      const req = lib.request(requestOptions, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          resolve({
            status: res.statusCode,
            body: body,
          });
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * Send status callback
   */
  async sendStatusCallback(status) {
    const url = new URL('/webhook/whatsapp/status', this.baseUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'test-entry-id',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    phone_number_id: 'test-phone-id',
                  },
                  statuses: [
                    {
                      id: status.id,
                      status: status.status,
                      timestamp: status.timestamp || Date.now(),
                      errors: status.error ? [status.error] : undefined,
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      });

      const requestOptions = {
        method: 'POST',
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const req = lib.request(requestOptions, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          resolve({
            status: res.statusCode,
            body: body,
          });
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  /**
   * Generate webhook signature
   */
  generateSignature(payload) {
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }
}

module.exports = { WhatsAppHelper };

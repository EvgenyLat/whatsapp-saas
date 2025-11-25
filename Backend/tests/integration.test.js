const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const webhook = require('../src/webhook');
const salons = require('../src/salons');

// Mock dependencies for integration tests
jest.mock('../src/salons');
jest.mock('../src/bookings');
jest.mock('../src/messaging');
jest.mock('../src/ai');

const app = express();
app.use(bodyParser.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.get('/', (_req, res) => res.send('WhatsApp SaaS Starter is running'));
app.get('/healthz', (_req, res) => res.status(200).send('ok'));
app.post('/admin/salons', (req, res) => {
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
  if (!ADMIN_TOKEN || req.get('x-admin-token') !== ADMIN_TOKEN) {
    return res.sendStatus(401);
  }
  const { id, name, phone_number_id, access_token } = req.body || {};
  if (!phone_number_id || !access_token) {
    return res.status(400).json({ error: 'phone_number_id and access_token are required' });
  }
  const saved = salons.upsert({ id, name, phone_number_id, access_token });
  return res.json(saved);
});
app.get('/webhook', webhook.verify);
app.post('/webhook', webhook.receive);

describe('Integration Tests', () => {
  beforeEach(() => {
    process.env.ADMIN_TOKEN = 'test-admin-token';
    process.env.META_VERIFY_TOKEN = 'test-verify-token';
    process.env.META_APP_SECRET = 'test-app-secret';
    jest.clearAllMocks();
  });

  describe('Health and Status', () => {
    test('GET / should return status', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toBe('WhatsApp SaaS Starter is running');
    });

    test('GET /healthz should return ok', async () => {
      const response = await request(app).get('/healthz');
      expect(response.status).toBe(200);
      expect(response.text).toBe('ok');
    });
  });

  describe('Admin API', () => {
    test('POST /admin/salons should create salon with valid token', async () => {
      const mockSalon = {
        id: 'salon1',
        name: 'Test Salon',
        phone_number_id: '123456789',
        access_token: 'test-token'
      };
      salons.upsert.mockReturnValue(mockSalon);

      const response = await request(app)
        .post('/admin/salons')
        .set('x-admin-token', 'test-admin-token')
        .send({
          name: 'Test Salon',
          phone_number_id: '123456789',
          access_token: 'test-token'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSalon);
      expect(salons.upsert).toHaveBeenCalledWith({
        name: 'Test Salon',
        phone_number_id: '123456789',
        access_token: 'test-token'
      });
    });

    test('POST /admin/salons should reject without token', async () => {
      const response = await request(app)
        .post('/admin/salons')
        .send({
          name: 'Test Salon',
          phone_number_id: '123456789',
          access_token: 'test-token'
        });

      expect(response.status).toBe(401);
    });

    test('POST /admin/salons should reject with wrong token', async () => {
      const response = await request(app)
        .post('/admin/salons')
        .set('x-admin-token', 'wrong-token')
        .send({
          name: 'Test Salon',
          phone_number_id: '123456789',
          access_token: 'test-token'
        });

      expect(response.status).toBe(401);
    });

    test('POST /admin/salons should reject missing phone_number_id', async () => {
      const response = await request(app)
        .post('/admin/salons')
        .set('x-admin-token', 'test-admin-token')
        .send({
          name: 'Test Salon',
          access_token: 'test-token'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('phone_number_id and access_token are required');
    });

    test('POST /admin/salons should reject missing access_token', async () => {
      const response = await request(app)
        .post('/admin/salons')
        .set('x-admin-token', 'test-admin-token')
        .send({
          name: 'Test Salon',
          phone_number_id: '123456789'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('phone_number_id and access_token are required');
    });
  });

  describe('Webhook Verification', () => {
    test('GET /webhook should verify with correct token', async () => {
      const response = await request(app)
        .get('/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'test-verify-token',
          'hub.challenge': 'test-challenge'
        });

      expect(response.status).toBe(200);
      expect(response.text).toBe('test-challenge');
    });

    test('GET /webhook should reject with wrong token', async () => {
      const response = await request(app)
        .get('/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': 'test-challenge'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('End-to-End Flow', () => {
    test('should handle complete booking flow', async () => {
      // Mock all dependencies
      const mockSalon = {
        id: 'salon1',
        phone_number_id: '123456789',
        access_token: 'salon-token'
      };
      
      salons.getByPhoneNumberId.mockReturnValue(mockSalon);
      
      const bookings = require('../src/bookings');
      const messaging = require('../src/messaging');
      const ai = require('../src/ai');
      
      ai.aiParse.mockResolvedValue({
        intent: 'booking',
        date: 'завтра',
        time: '14:00',
        name: 'Иван'
      });
      
      bookings.tryCreateBookingFromParsed.mockReturnValue({
        ok: true,
        booking: {
          booking_code: 'ABC123',
          summary: 'Бронирование ABC123: стрижка, 13.09.2025, 14:00'
        }
      });
      
      messaging.sendText.mockResolvedValue({ success: true });

      // Mock signature verification
      const crypto = require('crypto');
      jest.spyOn(crypto, 'createHmac').mockReturnValue({
        update: jest.fn(),
        digest: jest.fn().mockReturnValue('test-hash')
      });
      jest.spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      const webhookPayload = {
        entry: [{
          changes: [{
            value: {
              messages: [{
                type: 'text',
                from: '987654321',
                text: { body: 'хочу записаться завтра в 14:00, меня зовут Иван' }
              }],
              metadata: { phone_number_id: '123456789' }
            }
          }]
        }]
      };

      const response = await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', 'sha256=test-hash')
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.text).toBe('EVENT_RECEIVED');
      
      // Verify all interactions
      expect(salons.getByPhoneNumberId).toHaveBeenCalledWith('123456789');
      expect(ai.aiParse).toHaveBeenCalledWith('хочу записаться завтра в 14:00, меня зовут Иван');
      expect(bookings.tryCreateBookingFromParsed).toHaveBeenCalledWith(
        { intent: 'booking', date: 'завтра', time: '14:00', name: 'Иван' },
        '987654321',
        'salon1'
      );
      expect(messaging.sendText).toHaveBeenCalledWith(
        '987654321',
        'Готово! Бронирование ABC123: стрижка, 13.09.2025, 14:00\nКод отмены: ABC123',
        mockSalon
      );
    });

    test('should handle cancel flow', async () => {
      const mockSalon = {
        id: 'salon1',
        phone_number_id: '123456789',
        access_token: 'salon-token'
      };
      
      salons.getByPhoneNumberId.mockReturnValue(mockSalon);
      
      const bookings = require('../src/bookings');
      const messaging = require('../src/messaging');
      const ai = require('../src/ai');
      
      ai.aiParse.mockResolvedValue({
        intent: 'cancel',
        booking_id: 'ABC123'
      });
      
      bookings.cancelByCode.mockResolvedValue(true);
      messaging.sendText.mockResolvedValue({ success: true });

      // Mock signature verification
      const crypto = require('crypto');
      jest.spyOn(crypto, 'createHmac').mockReturnValue({
        update: jest.fn(),
        digest: jest.fn().mockReturnValue('test-hash')
      });
      jest.spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      const webhookPayload = {
        entry: [{
          changes: [{
            value: {
              messages: [{
                type: 'text',
                from: '987654321',
                text: { body: 'отменить ABC123' }
              }],
              metadata: { phone_number_id: '123456789' }
            }
          }]
        }]
      };

      const response = await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', 'sha256=test-hash')
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.text).toBe('EVENT_RECEIVED');
      
      expect(bookings.cancelByCode).toHaveBeenCalledWith('ABC123', '987654321', 'salon1');
      expect(messaging.sendText).toHaveBeenCalledWith(
        '987654321',
        'Бронирование отменено.',
        mockSalon
      );
    });
  });
});

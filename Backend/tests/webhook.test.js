const crypto = require('crypto');
const webhook = require('../src/webhook');
const bookings = require('../src/bookings');
const messaging = require('../src/messaging');
const ai = require('../src/ai');
const salons = require('../src/salons');

// Mock dependencies
jest.mock('../src/bookings');
jest.mock('../src/messaging');
jest.mock('../src/ai');
jest.mock('../src/salons');

describe('Webhook Module', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Reset environment
    process.env.META_VERIFY_TOKEN = 'test-verify-token';
    process.env.META_APP_SECRET = 'test-app-secret';
    
    // Mock request/response objects
    mockReq = {
      query: {},
      get: jest.fn(),
      body: {},
      rawBody: Buffer.from('')
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      sendStatus: jest.fn()
    };
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('verify', () => {
    test('should verify webhook with correct token', () => {
      mockReq.query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test-verify-token',
        'hub.challenge': 'test-challenge'
      };
      
      webhook.verify(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith('test-challenge');
    });

    test('should reject webhook with wrong token', () => {
      mockReq.query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'test-challenge'
      };
      
      webhook.verify(mockReq, mockRes);
      
      expect(mockRes.sendStatus).toHaveBeenCalledWith(403);
    });

    test('should reject webhook with wrong mode', () => {
      mockReq.query = {
        'hub.mode': 'unsubscribe',
        'hub.verify_token': 'test-verify-token',
        'hub.challenge': 'test-challenge'
      };
      
      webhook.verify(mockReq, mockRes);
      
      expect(mockRes.sendStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('receive', () => {
    beforeEach(() => {
      // Mock successful signature verification
      jest.spyOn(crypto, 'createHmac').mockReturnValue({
        update: jest.fn(),
        digest: jest.fn().mockReturnValue('test-hash')
      });
      jest.spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);
    });

    test('should process booking message', async () => {
      const mockSalon = {
        id: 'salon1',
        phone_number_id: '123456789',
        access_token: 'salon-token'
      };
      
      salons.getByPhoneNumberId.mockReturnValue(mockSalon);
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
      
      mockReq.body = {
        entry: [{
          changes: [{
            value: {
              messages: [{
                type: 'text',
                from: '987654321',
                text: { body: 'хочу записаться завтра в 14:00' }
              }],
              metadata: { phone_number_id: '123456789' }
            }
          }]
        }]
      };
      
      await webhook.receive(mockReq, mockRes);
      
      expect(salons.getByPhoneNumberId).toHaveBeenCalledWith('123456789');
      expect(ai.aiParse).toHaveBeenCalledWith('хочу записаться завтра в 14:00');
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
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith('EVENT_RECEIVED');
    });

    test('should process cancel message', async () => {
      const mockSalon = {
        id: 'salon1',
        phone_number_id: '123456789',
        access_token: 'salon-token'
      };
      
      salons.getByPhoneNumberId.mockReturnValue(mockSalon);
      ai.aiParse.mockResolvedValue({
        intent: 'cancel',
        booking_id: 'ABC123'
      });
      bookings.cancelByCode.mockResolvedValue(true);
      messaging.sendText.mockResolvedValue({ success: true });
      
      mockReq.body = {
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
      
      await webhook.receive(mockReq, mockRes);
      
      expect(bookings.cancelByCode).toHaveBeenCalledWith('ABC123', '987654321', 'salon1');
      expect(messaging.sendText).toHaveBeenCalledWith(
        '987654321',
        'Бронирование отменено.',
        mockSalon
      );
    });

    test('should process FAQ message', async () => {
      const mockSalon = {
        id: 'salon1',
        phone_number_id: '123456789',
        access_token: 'salon-token'
      };
      
      salons.getByPhoneNumberId.mockReturnValue(mockSalon);
      ai.aiParse.mockResolvedValue({
        intent: 'faq',
        question: 'сколько стоит'
      });
      messaging.sendText.mockResolvedValue({ success: true });
      
      mockReq.body = {
        entry: [{
          changes: [{
            value: {
              messages: [{
                type: 'text',
                from: '987654321',
                text: { body: 'сколько стоит стрижка?' }
              }],
              metadata: { phone_number_id: '123456789' }
            }
          }]
        }]
      };
      
      await webhook.receive(mockReq, mockRes);
      
      expect(messaging.sendText).toHaveBeenCalledWith(
        '987654321',
        'Базовая стрижка — 1500₽. Доступно с 10:00 до 19:00.',
        mockSalon
      );
    });

    test('should handle unknown intent', async () => {
      const mockSalon = {
        id: 'salon1',
        phone_number_id: '123456789',
        access_token: 'salon-token'
      };
      
      salons.getByPhoneNumberId.mockReturnValue(mockSalon);
      ai.aiParse.mockResolvedValue({ intent: 'unknown' });
      messaging.sendText.mockResolvedValue({ success: true });
      
      mockReq.body = {
        entry: [{
          changes: [{
            value: {
              messages: [{
                type: 'text',
                from: '987654321',
                text: { body: 'привет' }
              }],
              metadata: { phone_number_id: '123456789' }
            }
          }]
        }]
      };
      
      await webhook.receive(mockReq, mockRes);
      
      expect(messaging.sendText).toHaveBeenCalledWith(
        '987654321',
        'Я могу помочь с записью. Напишите дату и время, например: "12.09.2025 14:00" или "завтра в 11:00".',
        mockSalon
      );
    });

    test('should handle busy booking', async () => {
      const mockSalon = {
        id: 'salon1',
        phone_number_id: '123456789',
        access_token: 'salon-token'
      };
      
      salons.getByPhoneNumberId.mockReturnValue(mockSalon);
      ai.aiParse.mockResolvedValue({
        intent: 'booking',
        date: '12.09.2025',
        time: '14:00'
      });
      bookings.tryCreateBookingFromParsed.mockReturnValue({
        ok: false,
        reason: 'busy',
        alternatives: ['2025-09-12T15:00:00.000Z', '2025-09-13T10:00:00.000Z']
      });
      messaging.sendText.mockResolvedValue({ success: true });
      
      mockReq.body = {
        entry: [{
          changes: [{
            value: {
              messages: [{
                type: 'text',
                from: '987654321',
                text: { body: 'хочу записаться на 12.09.2025 в 14:00' }
              }],
              metadata: { phone_number_id: '123456789' }
            }
          }]
        }]
      };
      
      await webhook.receive(mockReq, mockRes);
      
      expect(messaging.sendText).toHaveBeenCalledWith(
        '987654321',
        'Это время занято. Доступно:\n12.09.2025, 15:00\n13.09.2025, 10:00',
        mockSalon
      );
    });

    test('should handle missing salon gracefully', async () => {
      salons.getByPhoneNumberId.mockReturnValue(null);
      ai.aiParse.mockResolvedValue({
        intent: 'booking',
        date: 'завтра',
        time: '14:00'
      });
      bookings.tryCreateBookingFromParsed.mockReturnValue({
        ok: true,
        booking: { booking_code: 'ABC123', summary: 'test' }
      });
      messaging.sendText.mockResolvedValue({ success: true });
      
      mockReq.body = {
        entry: [{
          changes: [{
            value: {
              messages: [{
                type: 'text',
                from: '987654321',
                text: { body: 'хочу записаться' }
              }],
              metadata: { phone_number_id: '123456789' }
            }
          }]
        }]
      };
      
      await webhook.receive(mockReq, mockRes);
      
      expect(bookings.tryCreateBookingFromParsed).toHaveBeenCalledWith(
        { intent: 'booking', date: 'завтра', time: '14:00' },
        '987654321',
        'default'
      );
      expect(messaging.sendText).toHaveBeenCalledWith(
        '987654321',
        'Готово! test\nКод отмены: ABC123',
        null
      );
    });

    test('should reject invalid signature', async () => {
      crypto.timingSafeEqual.mockReturnValue(false);
      mockReq.get.mockReturnValue('sha256=invalid');
      
      await webhook.receive(mockReq, mockRes);
      
      expect(mockRes.sendStatus).toHaveBeenCalledWith(401);
    });

    test('should handle missing body gracefully', async () => {
      mockReq.body = null;
      
      await webhook.receive(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith('EVENT_RECEIVED');
    });
  });
});

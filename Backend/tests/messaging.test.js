const fetch = require('node-fetch');
const messaging = require('../src/messaging');

// Mock node-fetch
jest.mock('node-fetch');

describe('Messaging Module', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    // Clear all mocks
    jest.clearAllMocks();
  });

  test('should mock send when no credentials', async () => {
    const result = await messaging.sendText('123456789', 'test message');
    
    expect(result.ok).toBe(true);
    expect(result.mock).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  test('should mock send when only phone ID missing', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    
    const result = await messaging.sendText('123456789', 'test message');
    
    expect(result.ok).toBe(true);
    expect(result.mock).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  test('should mock send when only token missing', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456789';
    
    const result = await messaging.sendText('123456789', 'test message');
    
    expect(result.ok).toBe(true);
    expect(result.mock).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  test('should send real message with env credentials', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456789';
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ success: true })
    };
    fetch.mockResolvedValue(mockResponse);
    
    const result = await messaging.sendText('987654321', 'test message');
    
    expect(fetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v18.0/123456789/messages',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: '987654321',
          type: 'text',
          text: { body: 'test message' }
        })
      }
    );
    expect(result.success).toBe(true);
  });

  test('should send real message with salon credentials', async () => {
    const salon = {
      phone_number_id: '555555555',
      access_token: 'salon-token'
    };
    
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ success: true })
    };
    fetch.mockResolvedValue(mockResponse);
    
    const result = await messaging.sendText('987654321', 'test message', salon);
    
    expect(fetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v18.0/555555555/messages',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer salon-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: '987654321',
          type: 'text',
          text: { body: 'test message' }
        })
      }
    );
    expect(result.success).toBe(true);
  });

  test('should handle API errors', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456789';
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    
    const mockResponse = {
      ok: false,
      json: () => Promise.resolve({ error: { message: 'Invalid token' } })
    };
    fetch.mockResolvedValue(mockResponse);
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const result = await messaging.sendText('987654321', 'test message');
    
    expect(consoleSpy).toHaveBeenCalledWith('WhatsApp API error', { error: { message: 'Invalid token' } });
    expect(result.error.message).toBe('Invalid token');
    
    consoleSpy.mockRestore();
  });

  test('should send template message', async () => {
    const salon = {
      phone_number_id: '555555555',
      access_token: 'salon-token'
    };
    
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ success: true })
    };
    fetch.mockResolvedValue(mockResponse);
    
    const result = await messaging.sendTemplate(
      '987654321',
      'booking_confirm',
      'ru',
      [{ type: 'body', parameters: [{ type: 'text', text: 'Иван' }] }],
      salon
    );
    
    expect(fetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v18.0/555555555/messages',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer salon-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: '987654321',
          type: 'template',
          template: {
            name: 'booking_confirm',
            language: { code: 'ru' },
            components: [{ type: 'body', parameters: [{ type: 'text', text: 'Иван' }] }]
          }
        })
      }
    );
    expect(result.success).toBe(true);
  });

  test('should mock template when no credentials', async () => {
    const result = await messaging.sendTemplate('123456789', 'test_template', 'ru', []);
    
    expect(result.ok).toBe(true);
    expect(result.mock).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
});

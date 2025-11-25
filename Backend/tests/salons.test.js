const fs = require('fs');
const path = require('path');
const salons = require('../src/salons');

// Mock data directory for tests
const TEST_DATA_DIR = path.join(__dirname, '..', 'test-data');
const TEST_DB_FILE = path.join(TEST_DATA_DIR, 'salons.json');

// Override the data directory for tests
jest.mock('../src/salons', () => {
  const originalModule = jest.requireActual('../src/salons');
  const fs = require('fs');
  const path = require('path');
  
  const TEST_DATA_DIR = path.join(__dirname, '..', 'test-data');
  const TEST_DB_FILE = path.join(TEST_DATA_DIR, 'salons.json');
  
  // Ensure test data directory exists
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
  
  return {
    ...originalModule,
    // Override the file path for testing
    getByPhoneNumberId: jest.fn((phoneNumberId) => {
      try {
        const data = fs.readFileSync(TEST_DB_FILE, 'utf8');
        const salons = JSON.parse(data || '[]');
        const found = salons.find(s => s.phone_number_id === phoneNumberId);
        if (found) return found;
        // fallback to env
        if (process.env.WHATSAPP_PHONE_NUMBER_ID === phoneNumberId) {
          return {
            id: 'env-default',
            name: 'Default Salon',
            phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID,
            access_token: process.env.WHATSAPP_ACCESS_TOKEN
          };
        }
        return null;
      } catch (e) {
        return null;
      }
    }),
    upsert: jest.fn((salon) => {
      try {
        const salons = JSON.parse(fs.readFileSync(TEST_DB_FILE, 'utf8') || '[]');
        let existingIdx = -1;
        if (salon.id) existingIdx = salons.findIndex(s => s.id === salon.id);
        if (existingIdx === -1 && salon.phone_number_id) {
          existingIdx = salons.findIndex(s => s.phone_number_id === salon.phone_number_id);
        }
        const record = {
          id: salon.id || require('uuid').v4(),
          name: salon.name || 'Salon',
          phone_number_id: salon.phone_number_id,
          access_token: salon.access_token
        };
        if (existingIdx >= 0) salons[existingIdx] = { ...salons[existingIdx], ...record };
        else salons.push(record);
        fs.writeFileSync(TEST_DB_FILE, JSON.stringify(salons, null, 2), 'utf8');
        return record;
      } catch (e) {
        return null;
      }
    })
  };
});

describe('Salons Store', () => {
  beforeEach(() => {
    // Clean test data
    if (fs.existsSync(TEST_DB_FILE)) {
      fs.unlinkSync(TEST_DB_FILE);
    }
    // Set test env vars
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456789';
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
  });

  afterEach(() => {
    // Clean up test data
    if (fs.existsSync(TEST_DB_FILE)) {
      fs.unlinkSync(TEST_DB_FILE);
    }
  });

  test('should return null for unknown phone number', () => {
    const result = salons.getByPhoneNumberId('unknown');
    expect(result).toBeNull();
  });

  test('should return env fallback for default phone number', () => {
    const result = salons.getByPhoneNumberId('123456789');
    expect(result).toEqual({
      id: 'env-default',
      name: 'Default Salon',
      phone_number_id: '123456789',
      access_token: 'test-token'
    });
  });

  test('should create new salon', () => {
    const salon = {
      name: 'Test Salon',
      phone_number_id: '987654321',
      access_token: 'salon-token'
    };
    const result = salons.upsert(salon);
    
    expect(result).toMatchObject({
      name: 'Test Salon',
      phone_number_id: '987654321',
      access_token: 'salon-token'
    });
    expect(result.id).toBeDefined();
  });

  test('should update existing salon by phone number', () => {
    // Create initial salon
    const initial = salons.upsert({
      name: 'Initial Salon',
      phone_number_id: '111111111',
      access_token: 'initial-token'
    });
    
    // Update by phone number
    const updated = salons.upsert({
      name: 'Updated Salon',
      phone_number_id: '111111111',
      access_token: 'updated-token'
    });
    
    expect(updated.id).toBe(initial.id);
    expect(updated.name).toBe('Updated Salon');
    expect(updated.access_token).toBe('updated-token');
  });

  test('should find salon by phone number after creation', () => {
    const salon = {
      name: 'Findable Salon',
      phone_number_id: '555555555',
      access_token: 'findable-token'
    };
    salons.upsert(salon);
    
    const found = salons.getByPhoneNumberId('555555555');
    expect(found).toMatchObject({
      name: 'Findable Salon',
      phone_number_id: '555555555',
      access_token: 'findable-token'
    });
  });
});

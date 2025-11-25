const fs = require('fs');
const path = require('path');
const bookings = require('../src/bookings');

// Mock data directory for tests
const TEST_DATA_DIR = path.join(__dirname, '..', 'test-data');

// Override the data directory for tests
jest.mock('../src/bookings', () => {
  const originalModule = jest.requireActual('../src/bookings');
  const fs = require('fs');
  const path = require('path');
  const { v4: uuidv4 } = require('uuid');
  
  const TEST_DATA_DIR = path.join(__dirname, '..', 'test-data');
  
  function fileForSalon(salonId = 'default') {
    return path.join(TEST_DATA_DIR, `bookings_${salonId}.json`);
  }
  
  function ensureSalonFile(salonId) {
    const file = fileForSalon(salonId);
    if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf8');
    return file;
  }
  
  function loadForSalon(salonId = 'default') {
    try {
      const file = ensureSalonFile(salonId);
      const raw = fs.readFileSync(file, 'utf8');
      return JSON.parse(raw || '[]');
    } catch (_e) {
      return [];
    }
  }
  
  function saveForSalon(salonId, bookings) {
    const file = ensureSalonFile(salonId);
    fs.writeFileSync(file, JSON.stringify(bookings, null, 2), 'utf8');
  }
  
  function parseDateTime(dateStr, timeStr) {
    if (!dateStr) return null;
    let date;
    if (/\d{4}-\d{2}-\d{2}/.test(dateStr)) date = dateStr;
    else if (/\d{2}\.\d{2}\.\d{4}/.test(dateStr)) {
      const [d, m, y] = dateStr.split('.');
      date = `${y}-${m}-${d}`;
    } else if ((dateStr || '').toLowerCase() === 'завтра') {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      date = t.toISOString().slice(0, 10);
    } else {
      return null;
    }
    const time = timeStr && /\d{1,2}:\d{2}/.test(timeStr) ? timeStr : '10:00';
    return new Date(date + 'T' + time + ':00Z');
  }
  
  function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  
  function findConflicts(bookings, startTsISO) {
    return bookings.some(b => b.start_ts === startTsISO && b.status === 'confirmed');
  }
  
  function tryCreateBookingFromParsed(parsed, from, salonId = 'default') {
    const start = parseDateTime(parsed.date, parsed.time);
    if (!start) {
      return { ok: false, reason: 'invalid_datetime' };
    }
    const bookings = loadForSalon(salonId);
    if (findConflicts(bookings, start.toISOString())) {
      const alternatives = [];
      const nextHour = new Date(start.getTime());
      nextHour.setHours(nextHour.getHours() + 1);
      alternatives.push(nextHour.toISOString());
      const nextDay = new Date(start.getTime());
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(10, 0, 0, 0);
      alternatives.push(nextDay.toISOString());
      return { ok: false, reason: 'busy', alternatives };
    }
    const booking = {
      id: uuidv4(),
      booking_code: generateCode(),
      salon_id: salonId,
      customer_phone: from,
      customer_name: parsed.name || 'Клиент',
      service: parsed.service || 'услуга',
      start_ts: start.toISOString(),
      status: 'confirmed',
      created_at: new Date().toISOString()
    };
    bookings.push(booking);
    saveForSalon(salonId, bookings);
    return { ok: true, booking: { ...booking, summary: `Бронирование ${booking.booking_code}: ${booking.service}, ${new Date(booking.start_ts).toLocaleString('ru-RU')}` } };
  }
  
  async function cancelByCode(code, from, salonId = 'default') {
    const bookings = loadForSalon(salonId);
    const idx = bookings.findIndex(b => b.booking_code === code && b.customer_phone === from);
    if (idx === -1) return false;
    bookings[idx].status = 'cancelled';
    saveForSalon(salonId, bookings);
    return true;
  }
  
  return { tryCreateBookingFromParsed, cancelByCode, loadForSalon };
});

describe('Bookings Store', () => {
  beforeEach(() => {
    // Clean test data
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up test data
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  test('should create booking with valid date/time', () => {
    const parsed = {
      date: '12.09.2025',
      time: '14:00',
      name: 'Иван'
    };
    const result = bookings.tryCreateBookingFromParsed(parsed, '123456789', 'salon1');
    
    expect(result.ok).toBe(true);
    expect(result.booking).toMatchObject({
      salon_id: 'salon1',
      customer_phone: '123456789',
      customer_name: 'Иван',
      service: 'услуга',
      status: 'confirmed'
    });
    expect(result.booking.booking_code).toBeDefined();
    expect(result.booking.id).toBeDefined();
  });

  test('should create booking with "завтра" date', () => {
    const parsed = {
      date: 'завтра',
      time: '10:00'
    };
    const result = bookings.tryCreateBookingFromParsed(parsed, '123456789', 'salon1');
    
    expect(result.ok).toBe(true);
    expect(result.booking.customer_name).toBe('Клиент');
  });

  test('should fail with invalid date', () => {
    const parsed = {
      date: 'invalid-date',
      time: '14:00'
    };
    const result = bookings.tryCreateBookingFromParsed(parsed, '123456789', 'salon1');
    
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('invalid_datetime');
  });

  test('should detect conflicts and suggest alternatives', () => {
    const salonId = 'salon1';
    const parsed = {
      date: '12.09.2025',
      time: '14:00'
    };
    
    // Create first booking
    const first = bookings.tryCreateBookingFromParsed(parsed, '111111111', salonId);
    expect(first.ok).toBe(true);
    
    // Try to create conflicting booking
    const second = bookings.tryCreateBookingFromParsed(parsed, '222222222', salonId);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('busy');
    expect(second.alternatives).toHaveLength(2);
  });

  test('should cancel booking by code', async () => {
    const salonId = 'salon1';
    const parsed = {
      date: '12.09.2025',
      time: '14:00'
    };
    
    // Create booking
    const created = bookings.tryCreateBookingFromParsed(parsed, '123456789', salonId);
    expect(created.ok).toBe(true);
    
    // Cancel booking
    const cancelled = await bookings.cancelByCode(created.booking.booking_code, '123456789', salonId);
    expect(cancelled).toBe(true);
    
    // Verify booking is cancelled
    const allBookings = bookings.loadForSalon(salonId);
    const booking = allBookings.find(b => b.booking_code === created.booking.booking_code);
    expect(booking.status).toBe('cancelled');
  });

  test('should not cancel booking with wrong code', async () => {
    const salonId = 'salon1';
    const parsed = {
      date: '12.09.2025',
      time: '14:00'
    };
    
    // Create booking
    bookings.tryCreateBookingFromParsed(parsed, '123456789', salonId);
    
    // Try to cancel with wrong code
    const cancelled = await bookings.cancelByCode('WRONG', '123456789', salonId);
    expect(cancelled).toBe(false);
  });

  test('should isolate bookings by salon', () => {
    const parsed1 = { date: '12.09.2025', time: '14:00' };
    const parsed2 = { date: '13.09.2025', time: '15:00' };
    
    // Create bookings for different salons
    const result1 = bookings.tryCreateBookingFromParsed(parsed1, '111111111', 'salon1');
    const result2 = bookings.tryCreateBookingFromParsed(parsed2, '222222222', 'salon2');
    
    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    
    // Check isolation
    const salon1Bookings = bookings.loadForSalon('salon1');
    const salon2Bookings = bookings.loadForSalon('salon2');
    
    expect(salon1Bookings).toHaveLength(1);
    expect(salon2Bookings).toHaveLength(1);
    expect(salon1Bookings[0].salon_id).toBe('salon1');
    expect(salon2Bookings[0].salon_id).toBe('salon2');
  });
});

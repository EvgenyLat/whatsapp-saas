const ai = require('../src/ai');

describe('AI Parser', () => {
  test('should parse booking intent with date and time', () => {
    const result = ai.simpleParse('Хочу записаться на 12.09.2025 в 14:00');
    
    expect(result.intent).toBe('booking');
    expect(result.date).toBe('12.09.2025');
    expect(result.time).toBe('14:00');
  });

  test('should parse booking intent with "завтра"', () => {
    const result = ai.simpleParse('записаться завтра в 10:00');
    
    expect(result.intent).toBe('booking');
    expect(result.date).toBe('завтра');
    expect(result.time).toBe('10:00');
  });

  test('should parse booking intent with name', () => {
    const result = ai.simpleParse('меня зовут Иван, хочу записаться завтра');
    
    expect(result.intent).toBe('booking');
    expect(result.name).toBe('Иван');
    expect(result.date).toBe('завтра');
  });

  test('should parse cancel intent with booking code', () => {
    const result = ai.simpleParse('отменить ABC123');
    
    expect(result.intent).toBe('cancel');
    expect(result.booking_id).toBe('ABC123');
  });

  test('should parse cancel intent with date format', () => {
    const result = ai.simpleParse('отменить 2025-09-12_14:00_стрижка');
    
    expect(result.intent).toBe('cancel');
    expect(result.booking_id).toBe('2025-09-12_14:00_стрижка');
  });

  test('should parse FAQ intent', () => {
    const result = ai.simpleParse('сколько стоит стрижка?');
    
    expect(result.intent).toBe('faq');
    expect(result.question).toBe('сколько стоит стрижка?');
  });

  test('should parse FAQ intent in English', () => {
    const result = ai.simpleParse('what is the price?');
    
    expect(result.intent).toBe('faq');
    expect(result.question).toBe('what is the price?');
  });

  test('should return unknown for unrecognized text', () => {
    const result = ai.simpleParse('привет как дела');
    
    expect(result.intent).toBe('unknown');
  });

  test('should handle empty or null input', () => {
    expect(ai.simpleParse('').intent).toBe('unknown');
    expect(ai.simpleParse(null).intent).toBe('unknown');
    expect(ai.simpleParse(undefined).intent).toBe('unknown');
  });

  test('should be case insensitive', () => {
    const result1 = ai.simpleParse('ЗАПИСАТЬСЯ ЗАВТРА');
    const result2 = ai.simpleParse('отменить abc123');
    const result3 = ai.simpleParse('СКОЛЬКО СТОИТ');
    
    expect(result1.intent).toBe('booking');
    expect(result2.intent).toBe('cancel');
    expect(result3.intent).toBe('faq');
  });

  test('aiParse should work same as simpleParse', async () => {
    const text = 'хочу записаться завтра';
    const simple = ai.simpleParse(text);
    const aiResult = await ai.aiParse(text);
    
    expect(aiResult).toEqual(simple);
  });
});

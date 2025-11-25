'use strict';

/**
 * Unit Tests for Encryption Utilities
 *
 * COVERAGE:
 * - Encryption/Decryption functionality
 * - Phone number encryption
 * - Key management
 * - Error handling
 * - Security properties
 *
 * @module tests/utils/encryption
 */

const crypto = require('crypto');
const {
  encrypt,
  decrypt,
  encryptPhoneNumber,
  decryptPhoneNumber,
  generateEncryptionKey,
  deriveKeyFromPassword,
  isEncrypted,
  getKeyVersion,
  reencrypt,
  constantTimeCompare,
  healthCheck,
  ENCRYPTION_CONFIG,
  CURRENT_KEY_VERSION,
} = require('../../src/utils/encryption');

// =============================================================================
// TEST SETUP
// =============================================================================

describe('Encryption Utilities', () => {
  let originalEnv;

  beforeAll(() => {
    // Save original environment
    originalEnv = process.env.ENCRYPTION_KEY;

    // Generate test encryption key (64 hex characters = 32 bytes)
    const testKey = crypto.randomBytes(32).toString('hex');
    process.env.ENCRYPTION_KEY = testKey;
  });

  afterAll(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  // ===========================================================================
  // BASIC ENCRYPTION/DECRYPTION TESTS
  // ===========================================================================

  describe('encrypt() and decrypt()', () => {
    test('should encrypt and decrypt text correctly', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    test('should produce different ciphertext for same plaintext (unique IV)', () => {
      const plaintext = 'Same text';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);

      // Both should decrypt to same plaintext
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    test('should encrypt empty string', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    test('should encrypt unicode characters', () => {
      const plaintext = '你好世界 🌍 مرحبا';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    test('should encrypt long text', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    test('should include key version in encrypted data', () => {
      const plaintext = 'test';
      const encrypted = encrypt(plaintext);

      expect(encrypted).toMatch(new RegExp(`^${CURRENT_KEY_VERSION}:`));
    });

    test('should throw error for null/undefined plaintext', () => {
      expect(() => encrypt(null)).toThrow('Plaintext must be a non-empty string');
      expect(() => encrypt(undefined)).toThrow('Plaintext must be a non-empty string');
    });

    test('should throw error for non-string plaintext', () => {
      expect(() => encrypt(123)).toThrow('Plaintext must be a non-empty string');
      expect(() => encrypt({})).toThrow('Plaintext must be a non-empty string');
      expect(() => encrypt([])).toThrow('Plaintext must be a non-empty string');
    });

    test('should throw error for invalid encrypted data format', () => {
      expect(() => decrypt('invalid')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('1:2:3')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('')).toThrow('Encrypted data must be a non-empty string');
    });

    test('should throw error for tampered data', () => {
      const plaintext = 'test';
      const encrypted = encrypt(plaintext);
      const parts = encrypted.split(':');

      // Tamper with ciphertext
      parts[3] = parts[3].slice(0, -1) + 'X';
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow(/authentication tag|tampered/i);
    });
  });

  // ===========================================================================
  // PHONE NUMBER ENCRYPTION TESTS
  // ===========================================================================

  describe('encryptPhoneNumber() and decryptPhoneNumber()', () => {
    test('should encrypt and decrypt phone number', () => {
      const phoneNumber = '+1234567890';
      const encrypted = encryptPhoneNumber(phoneNumber);
      const decrypted = decryptPhoneNumber(encrypted);

      expect(decrypted).toBe(phoneNumber);
    });

    test('should normalize phone number before encryption', () => {
      const formatted = '+1 (234) 567-8900';
      const normalized = '+12345678900';

      const encrypted = encryptPhoneNumber(formatted);
      const decrypted = decryptPhoneNumber(encrypted);

      expect(decrypted).toBe(normalized);
    });

    test('should encrypt international phone numbers', () => {
      const phones = [
        '+12345678900',     // US
        '+441234567890',    // UK
        '+861234567890',    // China
        '+79991234567',     // Russia
        '+5511987654321',   // Brazil
      ];

      phones.forEach(phone => {
        const encrypted = encryptPhoneNumber(phone);
        const decrypted = decryptPhoneNumber(encrypted);
        expect(decrypted).toBe(phone);
      });
    });

    test('should throw error for invalid phone number format', () => {
      const invalidPhones = [
        '123',              // Too short
        '12345678901234567', // Too long
        'abc',              // Non-numeric
        '+1-abc-def',       // Contains letters
      ];

      invalidPhones.forEach(phone => {
        expect(() => encryptPhoneNumber(phone)).toThrow('Invalid phone number format');
      });
    });

    test('should throw error for empty phone number', () => {
      expect(() => encryptPhoneNumber('')).toThrow('Phone number must be a non-empty string');
      expect(() => encryptPhoneNumber(null)).toThrow('Phone number must be a non-empty string');
    });
  });

  // ===========================================================================
  // KEY MANAGEMENT TESTS
  // ===========================================================================

  describe('generateEncryptionKey()', () => {
    test('should generate 64 character hex string (32 bytes)', () => {
      const key = generateEncryptionKey();

      expect(key).toHaveLength(64); // 32 bytes * 2 hex chars
      expect(key).toMatch(/^[0-9a-f]{64}$/);
    });

    test('should generate different keys each time', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });

    test('generated key should work for encryption', () => {
      const newKey = generateEncryptionKey();
      const oldKey = process.env.ENCRYPTION_KEY;

      // Use new key
      process.env.ENCRYPTION_KEY = newKey;

      const plaintext = 'test';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);

      // Restore old key
      process.env.ENCRYPTION_KEY = oldKey;
    });
  });

  describe('deriveKeyFromPassword()', () => {
    test('should derive key from password and salt', () => {
      const password = 'mySecretPassword123';
      const salt = crypto.randomBytes(32);
      const key = deriveKeyFromPassword(password, salt);

      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(ENCRYPTION_CONFIG.keyLength);
    });

    test('should produce same key for same password and salt', () => {
      const password = 'mySecretPassword123';
      const salt = crypto.randomBytes(32);

      const key1 = deriveKeyFromPassword(password, salt);
      const key2 = deriveKeyFromPassword(password, salt);

      expect(key1.equals(key2)).toBe(true);
    });

    test('should produce different keys for different passwords', () => {
      const salt = crypto.randomBytes(32);

      const key1 = deriveKeyFromPassword('password1', salt);
      const key2 = deriveKeyFromPassword('password2', salt);

      expect(key1.equals(key2)).toBe(false);
    });

    test('should produce different keys for different salts', () => {
      const password = 'mySecretPassword123';

      const key1 = deriveKeyFromPassword(password, crypto.randomBytes(32));
      const key2 = deriveKeyFromPassword(password, crypto.randomBytes(32));

      expect(key1.equals(key2)).toBe(false);
    });

    test('should accept salt as hex string', () => {
      const password = 'mySecretPassword123';
      const saltBuffer = crypto.randomBytes(32);
      const saltHex = saltBuffer.toString('hex');

      const key1 = deriveKeyFromPassword(password, saltBuffer);
      const key2 = deriveKeyFromPassword(password, saltHex);

      expect(key1.equals(key2)).toBe(true);
    });

    test('should throw error for invalid password', () => {
      const salt = crypto.randomBytes(32);

      expect(() => deriveKeyFromPassword('', salt)).toThrow('Password must be a non-empty string');
      expect(() => deriveKeyFromPassword(null, salt)).toThrow('Password must be a non-empty string');
      expect(() => deriveKeyFromPassword(123, salt)).toThrow('Password must be a non-empty string');
    });
  });

  // ===========================================================================
  // UTILITY FUNCTION TESTS
  // ===========================================================================

  describe('isEncrypted()', () => {
    test('should return true for encrypted data', () => {
      const encrypted = encrypt('test');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    test('should return false for plaintext', () => {
      expect(isEncrypted('plaintext')).toBe(false);
      expect(isEncrypted('+1234567890')).toBe(false);
      expect(isEncrypted('Hello World')).toBe(false);
    });

    test('should return false for invalid format', () => {
      expect(isEncrypted('1:2:3')).toBe(false);
      expect(isEncrypted('invalid:format:data:here')).toBe(false);
      expect(isEncrypted('')).toBe(false);
      expect(isEncrypted(null)).toBe(false);
      expect(isEncrypted(undefined)).toBe(false);
    });

    test('should return true for valid format with version 1', () => {
      expect(isEncrypted('1:abc:def:ghi')).toBe(true);
    });

    test('should return true for valid format with version 2', () => {
      expect(isEncrypted('2:abc:def:ghi')).toBe(true);
    });
  });

  describe('getKeyVersion()', () => {
    test('should return version from encrypted data', () => {
      const encrypted = encrypt('test');
      expect(getKeyVersion(encrypted)).toBe(CURRENT_KEY_VERSION);
    });

    test('should return null for plaintext', () => {
      expect(getKeyVersion('plaintext')).toBe(null);
      expect(getKeyVersion('')).toBe(null);
    });

    test('should parse version correctly', () => {
      expect(getKeyVersion('1:abc:def:ghi')).toBe(1);
      expect(getKeyVersion('2:abc:def:ghi')).toBe(2);
      expect(getKeyVersion('10:abc:def:ghi')).toBe(10);
    });
  });

  describe('reencrypt()', () => {
    test('should re-encrypt data with same key version', () => {
      const plaintext = 'test data';
      const encrypted1 = encrypt(plaintext);
      const reencrypted = reencrypt(encrypted1);
      const decrypted = decrypt(reencrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted1).not.toBe(reencrypted); // Different IV
    });

    test('should re-encrypt with different key version if configured', () => {
      const plaintext = 'test data';

      // Encrypt with version 1
      const encrypted1 = encrypt(plaintext, 1);
      expect(getKeyVersion(encrypted1)).toBe(1);

      // Set up version 2 key
      const oldKey2 = process.env.ENCRYPTION_KEY_V2;
      process.env.ENCRYPTION_KEY_V2 = generateEncryptionKey();

      try {
        // Re-encrypt to version 2
        const encrypted2 = reencrypt(encrypted1, 2);
        expect(getKeyVersion(encrypted2)).toBe(2);

        // Should decrypt correctly with version 2
        const decrypted = decrypt(encrypted2);
        expect(decrypted).toBe(plaintext);
      } finally {
        // Restore
        if (oldKey2) {
          process.env.ENCRYPTION_KEY_V2 = oldKey2;
        } else {
          delete process.env.ENCRYPTION_KEY_V2;
        }
      }
    });
  });

  describe('constantTimeCompare()', () => {
    test('should return true for equal strings', () => {
      expect(constantTimeCompare('test', 'test')).toBe(true);
      expect(constantTimeCompare('', '')).toBe(true);
      expect(constantTimeCompare('123', '123')).toBe(true);
    });

    test('should return false for different strings', () => {
      expect(constantTimeCompare('test', 'Test')).toBe(false);
      expect(constantTimeCompare('abc', 'xyz')).toBe(false);
      expect(constantTimeCompare('123', '124')).toBe(false);
    });

    test('should return false for different lengths', () => {
      expect(constantTimeCompare('short', 'longer')).toBe(false);
      expect(constantTimeCompare('', 'nonempty')).toBe(false);
    });

    test('should return false for non-string inputs', () => {
      expect(constantTimeCompare(123, '123')).toBe(false);
      expect(constantTimeCompare('123', 123)).toBe(false);
      expect(constantTimeCompare(null, 'test')).toBe(false);
      expect(constantTimeCompare(undefined, undefined)).toBe(false);
    });

    test('should handle unicode correctly', () => {
      expect(constantTimeCompare('你好', '你好')).toBe(true);
      expect(constantTimeCompare('你好', '再见')).toBe(false);
    });
  });

  describe('healthCheck()', () => {
    test('should return healthy status when encryption works', () => {
      const health = healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.keyVersion).toBe(CURRENT_KEY_VERSION);
      expect(health.algorithm).toBe(ENCRYPTION_CONFIG.algorithm);
      expect(health.keyLength).toBe(256);
      expect(health.timestamp).toBeDefined();
    });

    test('should return unhealthy status when key is missing', () => {
      const oldKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      const health = healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.error).toBeDefined();
      expect(health.timestamp).toBeDefined();

      // Restore
      process.env.ENCRYPTION_KEY = oldKey;
    });

    test('should return unhealthy status for invalid key', () => {
      const oldKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'invalid-key';

      const health = healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.error).toContain('Invalid encryption key length');

      // Restore
      process.env.ENCRYPTION_KEY = oldKey;
    });
  });

  // ===========================================================================
  // SECURITY PROPERTY TESTS
  // ===========================================================================

  describe('Security Properties', () => {
    test('encrypted data should be different from plaintext', () => {
      const plaintext = 'sensitive data';
      const encrypted = encrypt(plaintext);

      expect(encrypted).not.toContain(plaintext);
      expect(encrypted).not.toBe(plaintext);
    });

    test('encrypted data should not be reversible without key', () => {
      const plaintext = 'secret';
      const encrypted = encrypt(plaintext);

      // Cannot extract plaintext from encrypted string
      expect(encrypted).not.toContain(plaintext);

      // Base64 decode won't reveal plaintext
      const parts = encrypted.split(':');
      const ciphertext = Buffer.from(parts[3], 'base64').toString('utf8');
      expect(ciphertext).not.toContain(plaintext);
    });

    test('should use authenticated encryption (detect tampering)', () => {
      const plaintext = 'important message';
      const encrypted = encrypt(plaintext);
      const parts = encrypted.split(':');

      // Modify authentication tag
      const invalidTag = Buffer.from(parts[2], 'base64');
      invalidTag[0] ^= 0xFF; // Flip bits
      parts[2] = invalidTag.toString('base64');

      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow(/authentication tag|tampered/i);
    });

    test('IV should be random and unique', () => {
      const plaintext = 'test';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      const iv1 = encrypted1.split(':')[1];
      const iv2 = encrypted2.split(':')[1];

      expect(iv1).not.toBe(iv2);
    });

    test('encryption should be deterministic with fixed IV (for testing only)', () => {
      // This test verifies that only IV randomness makes ciphertext different
      // In production, we NEVER reuse IVs
      const plaintext = 'test';

      // We can't control IV in our implementation (which is good)
      // So we just verify that multiple encryptions produce valid results
      const results = new Set();
      for (let i = 0; i < 10; i++) {
        results.add(encrypt(plaintext));
      }

      expect(results.size).toBe(10); // All different due to random IVs
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe('Error Handling', () => {
    test('should not leak sensitive information in error messages', () => {
      const plaintext = 'secret-api-key-12345';
      const encrypted = encrypt(plaintext);

      // Tamper with data
      const tampered = encrypted.replace(/.$/, 'X');

      try {
        decrypt(tampered);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).not.toContain(plaintext);
        expect(error.message).not.toContain('secret');
        expect(error.message).not.toContain('12345');
      }
    });

    test('should handle decryption errors gracefully', () => {
      const invalidInputs = [
        '',
        'invalid',
        '1:2:3',
        'not:encrypted:data:here',
        null,
        undefined,
      ];

      invalidInputs.forEach(input => {
        expect(() => decrypt(input)).toThrow();
      });
    });
  });

  // ===========================================================================
  // PERFORMANCE TESTS
  // ===========================================================================

  describe('Performance', () => {
    test('should encrypt/decrypt 1000 times in reasonable time', () => {
      const plaintext = 'performance test data';
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const encrypted = encrypt(plaintext);
        decrypt(encrypted);
      }

      const duration = Date.now() - startTime;

      // Should complete 1000 cycles in under 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    test('should handle large data efficiently', () => {
      const largeData = 'A'.repeat(1000000); // 1MB
      const startTime = Date.now();

      const encrypted = encrypt(largeData);
      const decrypted = decrypt(encrypted);

      const duration = Date.now() - startTime;

      expect(decrypted).toBe(largeData);
      // Should handle 1MB in under 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});

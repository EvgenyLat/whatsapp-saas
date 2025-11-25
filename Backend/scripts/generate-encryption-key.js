#!/usr/bin/env node
'use strict';

/**
 * Encryption Key Generator
 *
 * Generates cryptographically secure encryption keys for use with
 * AES-256-GCM encryption.
 *
 * USAGE:
 * node scripts/generate-encryption-key.js
 *
 * @module scripts/generate-encryption-key
 */

const crypto = require('crypto');

console.log('='.repeat(80));
console.log('ENCRYPTION KEY GENERATOR');
console.log('='.repeat(80));
console.log('');

// Generate encryption key
const encryptionKey = crypto.randomBytes(32).toString('hex');
console.log('ENCRYPTION_KEY (AES-256-GCM):');
console.log(encryptionKey);
console.log('');

// Generate admin token
const adminToken = crypto.randomBytes(32).toString('base64');
console.log('ADMIN_TOKEN (Base64):');
console.log(adminToken);
console.log('');

// Generate current timestamp
const timestamp = new Date().toISOString();
console.log('ENCRYPTION_KEY_CREATED_AT:');
console.log(timestamp);
console.log('');

// Generate .env snippet
console.log('='.repeat(80));
console.log('Add to your .env file:');
console.log('='.repeat(80));
console.log('');
console.log(`# Generated on ${timestamp}`);
console.log(`ENCRYPTION_KEY=${encryptionKey}`);
console.log(`ENCRYPTION_KEY_CREATED_AT=${timestamp}`);
console.log(`ADMIN_TOKEN=${adminToken}`);
console.log('');

console.log('='.repeat(80));
console.log('SECURITY REMINDERS:');
console.log('='.repeat(80));
console.log('1. NEVER commit these keys to version control');
console.log('2. Store in AWS Secrets Manager for production');
console.log('3. Use different keys for each environment');
console.log('4. Rotate keys every 6-12 months');
console.log('5. Keep old keys for decryption during rotation');
console.log('='.repeat(80));

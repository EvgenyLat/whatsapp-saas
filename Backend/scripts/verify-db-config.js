#!/usr/bin/env node

/**
 * Database Connection Pool Configuration Verification Script
 *
 * Purpose: Verify database connection pool configuration is correctly set
 *          for production load (500+ concurrent users)
 *
 * Usage:
 *   node scripts/verify-db-config.js
 *   node scripts/verify-db-config.js --environment=production
 *   npm run verify:db-config
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - Configuration errors found
 *   2 - Critical configuration errors (blocking production)
 */

'use strict';

const path = require('path');
const dotenv = require('dotenv');

// Parse command line arguments
const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith('--environment='));
const environment = envArg ? envArg.split('=')[1] : process.env.NODE_ENV || 'development';

// Load environment configuration
const envFile = environment === 'production' ? '.env.production' : '.env';
const envPath = path.resolve(__dirname, '..', envFile);

console.log('='.repeat(80));
console.log('Database Connection Pool Configuration Verification');
console.log('='.repeat(80));
console.log(`Environment: ${environment}`);
console.log(`Config file: ${envPath}`);
console.log('');

// Load .env file
try {
  dotenv.config({ path: envPath });
  console.log('✅ Environment file loaded successfully');
} catch (error) {
  console.error('❌ Failed to load environment file:', error.message);
  process.exit(2);
}

// Configuration thresholds based on load testing results
const THRESHOLDS = {
  development: {
    DB_CONNECTION_LIMIT: { min: 10, recommended: 20, max: 30 },
    DB_POOL_TIMEOUT: { min: 10, recommended: 20, max: 30 },
    DB_STATEMENT_CACHE_SIZE: { min: 50, recommended: 100, max: 200 },
    DB_QUERY_TIMEOUT: { min: 5000, recommended: 10000, max: 30000 },
    DB_SLOW_QUERY_THRESHOLD: { min: 500, recommended: 1000, max: 5000 },
  },
  production: {
    DB_CONNECTION_LIMIT: { min: 40, recommended: 50, max: 100, critical: 50 },
    DB_POOL_TIMEOUT: { min: 20, recommended: 30, max: 60, critical: 30 },
    DB_STATEMENT_CACHE_SIZE: { min: 100, recommended: 200, max: 500, critical: 200 },
    DB_QUERY_TIMEOUT: { min: 5000, recommended: 10000, max: 30000 },
    DB_SLOW_QUERY_THRESHOLD: { min: 500, recommended: 1000, max: 5000 },
  }
};

const thresholds = THRESHOLDS[environment === 'production' ? 'production' : 'development'];

// Get configuration values
const config = {
  DB_CONNECTION_LIMIT: parseInt(process.env.DB_CONNECTION_LIMIT) || 0,
  DB_POOL_TIMEOUT: parseInt(process.env.DB_POOL_TIMEOUT) || 0,
  DB_STATEMENT_CACHE_SIZE: parseInt(process.env.DB_STATEMENT_CACHE_SIZE) || 0,
  DB_QUERY_TIMEOUT: parseInt(process.env.DB_QUERY_TIMEOUT) || 0,
  DB_SLOW_QUERY_THRESHOLD: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD) || 0,
};

// Verification results
const results = {
  passed: [],
  warnings: [],
  errors: [],
  critical: []
};

console.log('\n' + '─'.repeat(80));
console.log('Configuration Values');
console.log('─'.repeat(80));

// Check each configuration value
Object.keys(config).forEach(key => {
  const value = config[key];
  const threshold = thresholds[key];

  if (!threshold) return;

  const status = [];
  let severity = 'passed';

  // Check if value is set
  if (value === 0 || isNaN(value)) {
    status.push('NOT SET');
    severity = 'error';
    results.errors.push({
      key,
      message: `${key} is not set or invalid`,
      recommendation: `Set ${key}=${threshold.recommended}`
    });
  }
  // Check if below minimum
  else if (value < threshold.min) {
    status.push('TOO LOW');
    severity = 'error';
    results.errors.push({
      key,
      message: `${key}=${value} is below minimum (${threshold.min})`,
      recommendation: `Increase to at least ${threshold.recommended}`
    });
  }
  // Check if above maximum
  else if (value > threshold.max) {
    status.push('TOO HIGH');
    severity = 'warning';
    results.warnings.push({
      key,
      message: `${key}=${value} exceeds maximum (${threshold.max})`,
      recommendation: `Decrease to ${threshold.recommended} or verify resource availability`
    });
  }
  // Check if below recommended (production critical check)
  else if (environment === 'production' && threshold.critical && value < threshold.critical) {
    status.push('BELOW CRITICAL THRESHOLD');
    severity = 'critical';
    results.critical.push({
      key,
      message: `${key}=${value} is below critical threshold for production (${threshold.critical})`,
      recommendation: `Increase to ${threshold.critical} immediately`,
      impact: 'System will fail at peak load (500+ concurrent users)'
    });
  }
  // Check if below recommended (warning)
  else if (value < threshold.recommended) {
    status.push('BELOW RECOMMENDED');
    severity = 'warning';
    results.warnings.push({
      key,
      message: `${key}=${value} is below recommended value (${threshold.recommended})`,
      recommendation: `Consider increasing to ${threshold.recommended}`
    });
  }
  // All good
  else {
    status.push('OK');
    results.passed.push({ key, value });
  }

  // Print status
  const icon = severity === 'passed' ? '✅' :
               severity === 'warning' ? '⚠️' :
               severity === 'critical' ? '🔴' : '❌';

  console.log(`${icon} ${key}: ${value || 'NOT SET'} ${status.length > 0 ? `(${status.join(', ')})` : ''}`);

  if (value && value >= threshold.min && value <= threshold.max) {
    console.log(`   Range: ${threshold.min} - ${threshold.max}, Recommended: ${threshold.recommended}`);
  }
});

// Check DATABASE_URL
console.log('\n' + '─'.repeat(80));
console.log('Database Connection');
console.log('─'.repeat(80));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log('❌ DATABASE_URL: NOT SET');
  results.errors.push({
    key: 'DATABASE_URL',
    message: 'DATABASE_URL is not set',
    recommendation: 'Set DATABASE_URL to PostgreSQL connection string'
  });
} else {
  console.log('✅ DATABASE_URL: SET');

  // Check for SSL mode in production
  if (environment === 'production' && !databaseUrl.includes('sslmode=require')) {
    console.log('⚠️  WARNING: sslmode=require not found in DATABASE_URL');
    results.warnings.push({
      key: 'DATABASE_URL',
      message: 'SSL mode not enforced',
      recommendation: 'Add sslmode=require to DATABASE_URL for production'
    });
  }
}

// Summary
console.log('\n' + '='.repeat(80));
console.log('Verification Summary');
console.log('='.repeat(80));

console.log(`\n✅ Passed: ${results.passed.length}`);
if (results.warnings.length > 0) {
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
}
if (results.errors.length > 0) {
  console.log(`❌ Errors: ${results.errors.length}`);
}
if (results.critical.length > 0) {
  console.log(`🔴 Critical: ${results.critical.length}`);
}

// Print details
if (results.critical.length > 0) {
  console.log('\n' + '🔴'.repeat(40));
  console.log('CRITICAL ISSUES (BLOCKING PRODUCTION)');
  console.log('🔴'.repeat(40));
  results.critical.forEach((issue, index) => {
    console.log(`\n${index + 1}. ${issue.message}`);
    console.log(`   Recommendation: ${issue.recommendation}`);
    console.log(`   Impact: ${issue.impact}`);
  });
}

if (results.errors.length > 0) {
  console.log('\n' + '─'.repeat(80));
  console.log('ERRORS');
  console.log('─'.repeat(80));
  results.errors.forEach((error, index) => {
    console.log(`\n${index + 1}. ${error.message}`);
    console.log(`   Recommendation: ${error.recommendation}`);
  });
}

if (results.warnings.length > 0) {
  console.log('\n' + '─'.repeat(80));
  console.log('WARNINGS');
  console.log('─'.repeat(80));
  results.warnings.forEach((warning, index) => {
    console.log(`\n${index + 1}. ${warning.message}`);
    console.log(`   Recommendation: ${warning.recommendation}`);
  });
}

// Final verdict
console.log('\n' + '='.repeat(80));

if (results.critical.length > 0) {
  console.log('🔴 VERDICT: CRITICAL ISSUES - DO NOT DEPLOY TO PRODUCTION');
  console.log('='.repeat(80));
  console.log('\nFix critical issues before deploying to production.');
  console.log('Reference: Backend/tests/load/FINAL_LOAD_TEST_REPORT.md');
  console.log('Action Plan: LOAD_TEST_ACTION_PLAN.md');
  console.log('\n');
  process.exit(2);
}

if (results.errors.length > 0) {
  console.log('❌ VERDICT: CONFIGURATION ERRORS');
  console.log('='.repeat(80));
  console.log('\nFix configuration errors before proceeding.');
  console.log('\n');
  process.exit(1);
}

if (results.warnings.length > 0) {
  console.log('⚠️  VERDICT: WARNINGS PRESENT');
  console.log('='.repeat(80));
  console.log('\nConfiguration is valid but could be optimized.');
  console.log('Review warnings above for recommendations.');
  console.log('\n');
  process.exit(0);
}

console.log('✅ VERDICT: ALL CHECKS PASSED');
console.log('='.repeat(80));
console.log('\nDatabase connection pool is correctly configured.');
console.log(`System is ready for ${environment} deployment.`);
console.log('\n');
process.exit(0);

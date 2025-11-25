#!/usr/bin/env node

const http = require('http');

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000;

async function checkBackend(attempt = 1) {
  return new Promise((resolve) => {
    const url = new URL('/api/health', BACKEND_URL);

    console.log(`[${attempt}/${MAX_RETRIES}] Checking backend at ${url}...`);

    const req = http.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Backend is healthy!');
          try {
            const health = JSON.parse(data);
            console.log('Backend status:', health.status);
            console.log('Services:', health.services);
          } catch (e) {
            // Ignore parse errors
          }
          resolve(true);
        } else {
          console.log(`❌ Backend returned status ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Backend not reachable: ${err.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log('❌ Backend timeout');
      resolve(false);
    });
  });
}

async function verifyBackend() {
  for (let i = 1; i <= MAX_RETRIES; i++) {
    const isHealthy = await checkBackend(i);

    if (isHealthy) {
      process.exit(0);
    }

    if (i < MAX_RETRIES) {
      console.log(`Retrying in ${RETRY_DELAY / 1000}s...\n`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }

  console.error('\n❌ Backend verification failed after', MAX_RETRIES, 'attempts');
  console.error('\nPlease ensure backend is running:');
  console.error('  cd backend && npm run dev\n');
  process.exit(1);
}

verifyBackend();

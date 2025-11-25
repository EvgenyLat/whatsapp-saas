#!/usr/bin/env node

const { spawn } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');

const BACKEND_DIR = join(__dirname, '..', '..', 'Backend');
const FRONTEND_DIR = join(__dirname, '..');

function runCommand(command, args, cwd, label) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: 'pipe',
      shell: true,
    });

    proc.stdout.on('data', (data) => {
      console.log(`[${label}] ${data.toString().trim()}`);
    });

    proc.stderr.on('data', (data) => {
      console.error(`[${label}] ${data.toString().trim()}`);
    });

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} exited with code ${code}`));
    });
  });
}

async function startDevelopment() {
  console.log('🚀 Starting WhatsApp SaaS Platform...\n');

  // Check if backend exists
  if (!existsSync(BACKEND_DIR)) {
    console.error('❌ Backend directory not found:', BACKEND_DIR);
    console.error('\nPlease ensure the backend directory exists and is properly set up.');
    process.exit(1);
  }

  // Start backend
  console.log('Starting backend...');
  const backend = spawn('npm', ['run', 'dev'], {
    cwd: BACKEND_DIR,
    stdio: 'pipe',
    shell: true,
  });

  backend.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });

  backend.stderr.on('data', (data) => {
    console.error(`[Backend] ${data.toString().trim()}`);
  });

  // Wait for backend to start
  console.log('Waiting for backend to be ready...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Verify backend
  try {
    await runCommand('node', ['scripts/verify-backend.js'], FRONTEND_DIR, 'Verify');
  } catch (err) {
    console.error('\n❌ Backend verification failed. Shutting down...');
    backend.kill();
    process.exit(1);
  }

  // Start frontend
  console.log('\nStarting frontend...');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: FRONTEND_DIR,
    stdio: 'inherit',
    shell: true,
  });

  // Handle shutdown
  const shutdown = () => {
    console.log('\n\nShutting down...\n');
    backend.kill();
    frontend.kill();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startDevelopment().catch((err) => {
  console.error('\n❌ Development startup failed:', err.message);
  process.exit(1);
});

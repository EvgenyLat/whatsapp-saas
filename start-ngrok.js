// Simple ngrok launcher script
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Try to find ngrok executable
const potentialPaths = [
  path.join(process.env.APPDATA || '', 'npm/node_modules/ngrok/bin/ngrok.exe'),
  path.join(process.env.LOCALAPPDATA || '', 'npm/node_modules/ngrok/bin/ngrok.exe'),
  path.join(process.env.PROGRAMFILES || '', 'nodejs/node_modules/ngrok/bin/ngrok.exe'),
  path.join(process.env.LOCALAPPDATA || '', 'Microsoft/WindowsApps/ngrok.exe'),
];

console.log('Searching for ngrok executable...\n');

// Direct path to ngrok from npm global install
const ngrokBinPath = require('path').join(
  process.env.APPDATA || '',
  'npm/node_modules/ngrok/bin/ngrok'
);

let ngrokPath = ngrokBinPath;
let ngrokArgs = ['http', '3000', '--log=stdout'];

for (const testPath of potentialPaths) {
  try {
    if (fs.existsSync(testPath)) {
      ngrokPath = testPath;
      ngrokArgs = ['http', '3000', '--log=stdout'];
      console.log(`✓ Found ngrok at: ${testPath}\n`);
      break;
    }
  } catch (err) {
    // Continue searching
  }
}

console.log(`Using command: ${ngrokPath} ${ngrokArgs.join(' ')}\n`);
console.log('Starting ngrok tunnel on port 3000...\n');
console.log('========================================');
console.log('Press Ctrl+C to stop');
console.log('========================================\n');

const ngrok = spawn(ngrokPath, ngrokArgs, {
  stdio: 'inherit',
  shell: true,
  windowsHide: false,
});

ngrok.on('error', (err) => {
  console.error('Failed to start ngrok:', err.message);
  process.exit(1);
});

ngrok.on('exit', (code) => {
  console.log(`\nngrok exited with code ${code}`);
  process.exit(code);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\nStopping ngrok...');
  ngrok.kill();
  process.exit(0);
});

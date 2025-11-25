// WhatsApp SaaS - ngrok Programmatic Launcher
// Uses @ngrok/ngrok npm package for reliable cross-platform support

const ngrok = require('@ngrok/ngrok');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, 'Backend', '.env');
let verifyToken = 'dev-webhook-verify-token';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^WHATSAPP_VERIFY_TOKEN=(.+)$/m);
  if (match) {
    verifyToken = match[1];
  }
}

// ngrok authtoken from environment
const NGROK_AUTHTOKEN = '34WMRpsYbfD5Pwot68KXi1lyVFJ_42ao7z6gUXEnkRqy3JccW';

console.log('========================================');
console.log('WhatsApp SaaS - ngrok Tunnel Setup');
console.log('========================================\n');

console.log('Starting ngrok tunnel on port 3000...\n');

// Start ngrok tunnel
(async function() {
  try {
    const listener = await ngrok.connect({
      addr: 3000,
      authtoken: NGROK_AUTHTOKEN,
    });

    const publicUrl = listener.url();
    const webhookUrl = `${publicUrl}/api/v1/whatsapp/webhook`;

    console.log('\n========================================');
    console.log('ngrok Tunnel Active!');
    console.log('========================================\n');
    console.log(`Public URL:     ${publicUrl}`);
    console.log(`Webhook URL:    ${webhookUrl}\n`);
    console.log('ngrok Dashboard: http://localhost:4040');
    console.log('Backend Health:  http://localhost:3000/api/v1/whatsapp/health\n');
    console.log('========================================');
    console.log('Next Steps:');
    console.log('========================================\n');
    console.log('1. COPY the Webhook URL above\n');
    console.log('2. CONFIGURE Meta Developer Console:');
    console.log('   a. Go to: https://developers.facebook.com/apps/');
    console.log('   b. Select your WhatsApp app');
    console.log('   c. Click "WhatsApp" > "Configuration"');
    console.log('   d. Edit Webhook URL\n');
    console.log('3. ENTER these values:');
    console.log(`   Callback URL:  ${webhookUrl}`);
    console.log(`   Verify Token:  ${verifyToken}\n`);
    console.log('4. CLICK "Verify and Save"\n');
    console.log('5. SUBSCRIBE to events:');
    console.log('   - messages');
    console.log('   - message_status\n');
    console.log('========================================');
    console.log('Testing:');
    console.log('========================================\n');
    console.log('Test verification:');
    console.log(`  curl "${webhookUrl}?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=test123"\n`);
    console.log('Expected: test123\n');
    console.log('Monitor requests:');
    console.log('  http://localhost:4040\n');
    console.log('========================================');
    console.log('Keep this terminal open!');
    console.log('Press Ctrl+C to stop ngrok');
    console.log('========================================\n');

    // Keep running
    process.on('SIGINT', async () => {
      console.log('\n\nStopping ngrok...');
      await listener.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('\nFailed to start ngrok:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  }
})();

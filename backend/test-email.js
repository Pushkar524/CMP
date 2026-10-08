const emailService = require('./src/services/EmailService');
const config = require('./src/config/env');

async function runTest() {
  console.log('====================================================');
  console.log('📧 SCLIP Real-Time Email Service Verification');
  console.log('====================================================');
  console.log(`Provider:       ${config.email.provider}`);
  console.log(`Resend API Key: ${config.email.resendApiKey ? config.email.resendApiKey.slice(0, 6) + '...' + config.email.resendApiKey.slice(-4) : 'Not configured'}`);
  console.log(`From Address:   ${config.email.resendFrom}`);
  console.log('----------------------------------------------------');

  const targetEmail = process.argv[2] || 'delivered@resend.dev';
  console.log(`Sending verification email to: ${targetEmail}`);

  if (targetEmail === 'delivered@resend.dev') {
    console.log('💡 Note: Using Resend simulated recipient (delivered@resend.dev).');
    console.log('   To send to your real email, run: node test-email.js your-email@example.com\n');
  }

  try {
    const result = await emailService.sendTestEmail({ to: targetEmail });
    console.log('----------------------------------------------------');
    console.log('✅ Email Dispatched Successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('----------------------------------------------------');
    console.error('❌ Failed to dispatch email:');
    console.error(err.message || err);
    console.log('====================================================');
    process.exit(1);
  }
}

runTest();

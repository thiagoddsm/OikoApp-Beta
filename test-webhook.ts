require('dotenv').config({ path: '.env.local' });

async function runWebhook() {
  const payload = {
    messages: [
      {
        from: '5521989001302',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: {
            id: 'channel_link',
            title: '🔗 - Pelo Link'
          }
        }
      }
    ]
  };

  // We can just call handleGcReportIncomingMessage directly to see if it crashes
  const { handleGcReportIncomingMessage } = require('./src/lib/gc-report-bot');
  try {
    const res = await handleGcReportIncomingMessage(payload.messages[0].from, payload.messages[0].interactive.button_reply.title, 'button', { buttonId: payload.messages[0].interactive.button_reply.id });
    console.log('Result:', res);
  } catch (e) {
    console.error('Error:', e);
  }
}
runWebhook();

require('dotenv').config({ path: '.env.local' });
import { getWhatsAppClient } from './src/lib/whatsapp';

async function test() {
  const whatsapp = await getWhatsAppClient();
  await whatsapp.sendMessage({ type: 'text', body: { to: '21989001302', text: 'Testando...' }});
}
test().catch(console.error);

require('dotenv').config({ path: '.env.local' });
import { getWhatsAppClient } from './src/lib/whatsapp';

async function testPoll() {
  const whatsapp = await getWhatsAppClient();
  try {
    const res = await whatsapp.sendMessage({
      type: 'poll',
      body: {
        to: '5521989001302',
        name: 'Teste de Enquete 8 opções',
        selectableCount: 8,
        options: ['1','2','3','4','5','6','7','8']
      }
    });
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('Erro:', e.message || e);
  }
}
testPoll();

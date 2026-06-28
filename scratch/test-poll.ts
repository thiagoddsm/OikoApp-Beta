import { getWhatsAppClient } from '../src/lib/whatsapp';

async function main() {
  const whatsapp = await getWhatsAppClient();
  const to = '5521989001302';
  
  console.log('Enviando enquete de teste para', to);
  await whatsapp.sendMessage({
    type: 'poll',
    body: {
      to,
      name: 'Enquete de Teste Webhook',
      options: ['Opção 1', 'Opção 2', 'Opção 3'],
      selectableCount: 3
    }
  });
  console.log('Enquete enviada! Vote nela e aguarde 1 minuto para checarmos o webhook.');
}

main().catch(console.error);

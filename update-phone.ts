require('dotenv').config({ path: '.env.local' });
import { getAdminDb } from './src/lib/firebase-admin';
import { startGcReportSession } from './src/lib/gc-report-bot';

async function main() {
  const db = getAdminDb();
  const liderId = '9Sm2pIH1zIOj9k8D8EcLS3bkKad2';
  
  // Atualiza o telefone dele para o número real
  await db.collection('users').doc(liderId).update({
    phone: '21989001302'
  });
  console.log('Telefone atualizado no DB!');

  // Dispara o bot de relatório de GC pra ele de novo pra ele ver chegando
  const cellId = 'b66qh1pDGJOWVcYo8EVR';
  console.log('Disparando bot para o novo numero...');
  await startGcReportSession(cellId, '21989001302', false, { userId: liderId, name: 'Thiago Dias de Souza Moura', role: 'lider' });
  console.log('Bot disparado!');
}
main().catch(console.error);

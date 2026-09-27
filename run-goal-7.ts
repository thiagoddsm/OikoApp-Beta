require('dotenv').config({ path: '.env.local' });
import { getAdminDb } from './src/lib/firebase-admin';
import { submitSolicitacao } from './src/app/public/conectar/actions';

async function main() {
  const db = getAdminDb();
  const cellId = 'b66qh1pDGJOWVcYo8EVR';
  
  console.log('1. Registrando Visitante Teste Notificacao...');
  const res1 = await submitSolicitacao({
    name: 'Visitante Teste Notificação',
    phone: '21999993333',
    email: 'visitante3@goal.com',
    intentType: 'GC',
    bairro: 'Icaraí',
    intentDetails: {
      celulaId: cellId,
      observacoes: 'Quero visitar esse GC'
    },
    entryPoint: 'PUBLIC_LINK'
  });
  console.log('Res1:', res1);

}
main().catch(console.error);

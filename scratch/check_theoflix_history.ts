import { getAdminDb } from '../src/lib/firebase-admin';

async function checkTheoflixHistory() {
  const db = getAdminDb();
  
  // Buscar se há registros de Fernanda na collection 'processed_webhooks', 'notifications_responses', 'event_registrations'
  const userId = 'VH1wiIQR0xsxv0zSjVEL';
  const email = 'fernandahorsth.adv@gmail.com'; // Exemplo fictício ou vamos procurar por email nos cadastros

  // Primeiro buscar o email de Fernanda Horsth no doc do user
  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  const userEmail = userSnap.data()?.email || '';
  console.log("Email de Fernanda Horsth no Firestore:", userEmail);

  // Procurar na collection registers de presenca se existe alguma vinculada ao seu userId
  const registrationsSnap = await db.collection('event_registrations')
    .where('userId', '==', userId)
    .get();

  console.log(`\nInscrições em eventos ('event_registrations') encontradas: ${registrationsSnap.size}`);
  for (const doc of registrationsSnap.docs) {
    console.log(`- Doc: ${doc.id} | Evento:`, JSON.stringify(doc.data(), null, 2));
  }
}

checkTheoflixHistory().catch(console.error);

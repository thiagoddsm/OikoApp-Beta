const dotenv = require('dotenv');
const admin = require('firebase-admin');

dotenv.config();

async function run() {
  let configData = null;
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    const db = admin.firestore();
    const configSnap = await db.collection('config').doc('notifications').get();
    if (configSnap.exists) {
      configData = configSnap.data();
    }
  } catch (error) {
    console.warn('Erro ao carregar configurações:', error.message);
  }

  const evolutionUrl = configData?.evolutionUrl || 'https://api.ibmanha.com.br';
  const evolutionInstance = configData?.evolutionInstance || 'IBM';
  const evolutionKey = configData?.evolutionKey || '554C767EA3D2-4221-AB6A-C126C68A657E';

  const to = '5521989001302';
  const evUrl = `${evolutionUrl.replace(/\/$/, '')}/message/sendPoll/${evolutionInstance}`;
  const evData = {
      number: to,
      name: 'Enquete de Teste GC',
      selectableCount: 1,
      values: ['Opção A', 'Opção B']
  };

  console.log('Enviando para:', evUrl);
  console.log('Payload:', JSON.stringify(evData, null, 2));

  try {
      const res = await fetch(evUrl, {
          method: 'POST',
          headers: { 'apikey': evolutionKey, 'Content-Type': 'application/json' },
          body: JSON.stringify(evData)
      });
      const json = await res.json();
      console.log(`Resposta HTTP: ${res.status} ${res.statusText}`);
      console.log('Retorno:', JSON.stringify(json, null, 2));
  } catch (e) {
      console.error('Erro de requisição:', e);
  }
}

run();

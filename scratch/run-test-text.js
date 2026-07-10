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

  const wameServer = configData?.serverUrl || process.env.WHATSAPP_SERVER_URL || 'https://us.api-wa.me';
  const wameKey = configData?.instanceKey || process.env.WHATSAPP_INSTANCE_KEY || '';

  const to = '5521989001302';
  const url = `${wameServer.replace(/\/$/, '')}/${wameKey}/message/text`;
  const payload = {
      to: to,
      text: 'Mensagem de Teste Oiko Studio (Texto Comum)'
  };

  console.log('Enviando para:', url);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
      const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });
      const json = await res.json();
      console.log(`Resposta HTTP: ${res.status} ${res.statusText}`);
      console.log('Retorno:', JSON.stringify(json, null, 2));
  } catch (e) {
      console.error('Erro de requisição:', e);
  }
}

run();

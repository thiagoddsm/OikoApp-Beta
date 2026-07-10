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

  const baseUrl = evolutionUrl.replace(/\/$/, '');
  
  // Test 1: Fetch instances details
  try {
    const url = `${baseUrl}/instance/fetchInstances?instanceName=${evolutionInstance}`;
    console.log('Testando fetchInstances:', url);
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'accept': '*/*', 'apikey': evolutionKey }
    });
    console.log(`Resposta fetchInstances HTTP: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log('Resultado fetchInstances:', JSON.stringify(data, null, 2));
    } else {
      console.log('Falha ao rodar fetchInstances:', await res.text());
    }
  } catch (e) {
    console.error('Erro no fetchInstances:', e.message);
  }
}

run();

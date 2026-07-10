const dotenv = require('dotenv');
const path = require('path');
const admin = require('firebase-admin');

// Load environment variables from the workspace folder
dotenv.config();

async function checkConnections() {
  console.log('--- VERIFICAÇÃO DAS APIS DO BOT ---');

  // 1. Initializing Firebase Admin to read Firestore configs
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
      console.log('Configurações recuperadas do Firestore com sucesso!');
    } else {
      console.log('Configurações não encontradas no Firestore, usando fallback .env.');
    }
  } catch (error) {
    console.warn('Erro ao carregar configurações do Firestore:', error.message);
  }

  // Configurations
  const wameServer = configData?.serverUrl || process.env.WHATSAPP_SERVER_URL || 'https://us.api-wa.me';
  const wameKey = configData?.instanceKey || process.env.WHATSAPP_INSTANCE_KEY || '';
  const evolutionUrl = configData?.evolutionUrl || 'https://api.ibmanha.com.br';
  const evolutionInstance = configData?.evolutionInstance || 'IBM';
  const evolutionKey = configData?.evolutionKey || '554C767EA3D2-4221-AB6A-C126C68A657E';

  console.log('\n--- 1. VERIFICANDO CONEXÃO WAME (api-wa.me) ---');
  console.log(`URL: ${wameServer}`);
  console.log(`Instance Key: ${wameKey ? wameKey.substring(0, 5) + '...' : 'NÃO CONFIGURADA'}`);

  if (wameKey) {
    try {
      const url = `${wameServer.replace(/\/$/, '')}/${wameKey}/instance`;
      const res = await fetch(url, { method: 'GET' });
      console.log(`Resposta HTTP: ${res.status} ${res.statusText}`);
      if (res.ok) {
        const data = await res.json();
        console.log('Detalhes da Instância WAME:', JSON.stringify(data, null, 2));
      } else {
        const text = await res.text();
        console.error('Erro na resposta do WAME:', text);
      }
    } catch (err) {
      console.error('Erro ao conectar ao WAME:', err.message);
    }
  } else {
    console.log('Ignorando teste WAME: chave ausente.');
  }

  console.log('\n--- 2. VERIFICANDO CONEXÃO EVOLUTION API ---');
  console.log(`URL: ${evolutionUrl}`);
  console.log(`Instance: ${evolutionInstance}`);
  console.log(`API Key: ${evolutionKey ? evolutionKey.substring(0, 5) + '...' : 'NÃO CONFIGURADA'}`);

  try {
    const url = `${evolutionUrl.replace(/\/$/, '')}/instance/connectionState/${evolutionInstance}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'accept': '*/*', 'apikey': evolutionKey }
    });
    console.log(`Resposta HTTP: ${res.status} ${res.statusText}`);
    if (res.ok) {
      const data = await res.json();
      console.log('Detalhes do Estado de Conexão Evolution:', JSON.stringify(data, null, 2));
    } else {
      const text = await res.text();
      console.error('Erro na resposta da Evolution API:', text);
    }
  } catch (err) {
    console.error('Erro ao conectar à Evolution API:', err.message);
  }
}

checkConnections();

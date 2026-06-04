const { getAdminDb } = require('../src/lib/firebase-admin');

async function checkDoc() {
  try {
    const db = getAdminDb();
    console.log('Buscando documento no Firestore...');
    const docRef = db.collection('system_settings').doc('finance');
    const snap = await docRef.get();
    
    if (!snap.exists) {
      console.log('Documento system_settings/finance NÃO existe no Firestore.');
      return;
    }
    
    const data = snap.data();
    console.log('Documento encontrado com sucesso!');
    console.log('dueDays:', data.dueDays);
    console.log('asaasBaseUrl:', data.asaasBaseUrl);
    console.log('asaasWebhookToken:', data.asaasWebhookToken);
    console.log('asaasApiKey (Existe?):', !!data.asaasApiKey);
    if (data.asaasApiKey) {
      console.log('asaasApiKey (Primeiros 10 chars):', data.asaasApiKey.substring(0, 10));
    }
  } catch (error) {
    console.error('Erro no script de diagnóstico:', error);
  }
}

checkDoc();

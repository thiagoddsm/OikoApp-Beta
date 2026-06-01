// Executar com: node scratch/cleanup-test-reports.js
require('dotenv').config();
const admin = require('firebase-admin');

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let app;

try {
  if (serviceAccountKey) {
    let cleanKey = serviceAccountKey.trim();
    if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
      cleanKey = cleanKey.slice(1, -1);
    }
    const sa = JSON.parse(cleanKey);
    app = admin.initializeApp({
      credential: admin.credential.cert(sa),
      projectId: sa.project_id || 'studio-1424813022-71754'
    });
  } else {
    app = admin.initializeApp({
      projectId: 'studio-1424813022-71754',
      credential: admin.credential.applicationDefault()
    });
  }
} catch (e) {
  console.error("Firebase Admin initialization error:", e);
}

const db = admin.firestore();

async function runCleanup() {
  console.log('=== Iniciando Limpeza de Registros de Teste (GC Report Bot) ===');
  
  const cleanBatch = db.batch();
  let operationCount = 0;

  // 1. Limpar logs de reunião de teste
  const logsSnap = await db.collection('reuniao_logs').where('isTestData', '==', true).get();
  console.log(`- Encontrados ${logsSnap.size} reuniao_logs para limpeza.`);
  logsSnap.forEach(d => {
    cleanBatch.delete(d.ref);
    operationCount++;
  });

  // 2. Limpar presenças históricas de teste
  const presSnap = await db.collection('presencas_historico').where('isTestData', '==', true).get();
  console.log(`- Encontrados ${presSnap.size} presencas_historico para limpeza.`);
  presSnap.forEach(d => {
    cleanBatch.delete(d.ref);
    operationCount++;
  });

  // 3. Limpar sessões do bot de teste
  const sessionsSnap = await db.collection('gc_report_sessions').where('isTestData', '==', true).get();
  console.log(`- Encontrados ${sessionsSnap.size} gc_report_sessions para limpeza.`);
  sessionsSnap.forEach(d => {
    cleanBatch.delete(d.ref);
    operationCount++;
  });

  if (operationCount > 0) {
    await cleanBatch.commit();
    console.log(`=== Sucesso! ${operationCount} registros de teste deletados com sucesso. ===`);
  } else {
    console.log('=== Nenhum registro de teste encontrado para limpeza. ===');
  }
}

runCleanup().catch(console.error);

import { getAdminDb } from '../src/lib/firebase-admin';

async function main() {
  const db = getAdminDb();
  
  // Buscar os últimos 20 logs de debug ordenados por data
  const snapshot = await db.collection('gc_bot_debug')
    .orderBy('receivedAt', 'desc')
    .limit(20)
    .get();
  
  console.log("=== ÚLTIMOS 20 LOGS GERAIS DO WEBHOOK ===");
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`[${data.receivedAt?.toDate().toISOString()}] Phone: ${data.fromPhone} | Type: ${data.responseType} | Text: "${data.text}"`);
    console.log(` -> fromMe: ${data.fromMe} | rawKeys: ${data.rawKeys}`);
    console.log(` -> Payload:`, JSON.stringify(data.payload));
    console.log("-----------------------------------------");
  });
}

main().catch(console.error);

import { getAdminDb } from './src/lib/firebase-admin';

async function run() {
  const db = getAdminDb();
  const snapshot = await db.collection('gc_bot_debug').orderBy('receivedAt', 'desc').limit(10).get();
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`[${data.receivedAt.toDate().toISOString()}] type=${data.responseType} text=${data.text}`);
    console.log(`  payload: ${JSON.stringify(data.payload)}`);
  });
}

run().catch(console.error);

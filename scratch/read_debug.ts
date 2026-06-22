import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./src/lib/firebase-service-account.json', 'utf-8'));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

async function run() {
  const snapshot = await db.collection('gc_bot_debug').orderBy('timestamp', 'desc').limit(5).get();
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log("-----");
    console.log("Type:", data.responseType, "Text:", data.text);
    console.log("RAW:", data.rawWebhook);
  });
}
run().catch(console.error);

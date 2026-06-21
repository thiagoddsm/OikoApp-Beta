const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./src/lib/firebase-service-account.json', 'utf-8'));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

async function run() {
  const snapshot = await db.collection('gc_bot_debug').orderBy('timestamp', 'desc').limit(20).get();
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log("-----");
    console.log("Time:", data.timestamp.toDate().toISOString());
    console.log("FromPhone:", data.fromPhone);
    console.log("Type:", data.responseType, "Text:", data.text);
    const rawWebhook = data.rawWebhook;
    try {
      const parsed = JSON.parse(rawWebhook);
      const msgObj = parsed.data?.message || parsed.data;
      console.log("MsgID:", msgObj?.key?.id || msgObj?.id);
      console.log("Event:", parsed.event);
    } catch(e) { console.log("RAW:", rawWebhook); }
  });
}
run().catch(console.error);

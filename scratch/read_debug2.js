require('dotenv').config({ path: './.env' });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let sa = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (sa && sa.startsWith("'") && sa.endsWith("'")) {
  sa = sa.slice(1, -1);
}
if (!sa) {
  console.error("No FIREBASE_SERVICE_ACCOUNT_KEY");
  process.exit(1);
}

const serviceAccount = JSON.parse(sa);

try {
  initializeApp({
    credential: cert(serviceAccount)
  });
} catch (e) {
  if (e.code !== 'app/duplicate-app') throw e;
}

const db = getFirestore();

async function run() {
  const snapshot = await db.collection('gc_bot_debug').orderBy('receivedAt', 'desc').limit(10).get();
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log("-----");
    console.log("Time:", data.receivedAt?.toDate()?.toISOString());
    console.log("FromPhone:", data.fromPhone);
    console.log("Type:", data.responseType, "Text:", data.text);
    console.log("Payload:", JSON.stringify(data.payload));
  });
}

run().catch(console.error);

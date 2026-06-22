require('dotenv').config({ path: '.env' });
const admin = require('firebase-admin');

let certStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (certStr.startsWith("'") && certStr.endsWith("'")) {
  certStr = certStr.slice(1, -1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(certStr))
});

const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('gc_bot_debug').orderBy('timestamp', 'desc').limit(10).get();
  snapshot.forEach(doc => {
    console.log("=== WEBHOOK LOG ===");
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

run().catch(console.error);

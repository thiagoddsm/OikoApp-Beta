require('dotenv').config();
const admin = require('firebase-admin');

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env');
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  console.log('Fetching strategic_events...');
  const snap = await db.collection('strategic_events').get();
  
  console.log(`Found ${snap.size} events:`);
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`- ID: ${doc.id} | Name: ${data.eventName} | Date: "${data.date}" | Status: ${data.status}`);
  });
}

run().catch(console.error);

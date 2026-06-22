require('dotenv').config({ path: './.env' });
const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  const snap = await db.collection('gc_bot_debug')
    .orderBy('receivedAt', 'desc')
    .limit(50)
    .get();
  
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`Time: ${data.receivedAt ? data.receivedAt.toDate() : 'N/A'}`);
    console.log(`Phone: ${data.fromPhone}`);
    console.log(`Text: ${data.text}`);
    console.log(`Type: ${data.responseType}`);
    console.log(`Keys: ${data.rawKeys}`);
    if (data.responseType === 'poll' || data.rawKeys.includes('update')) {
       console.log(`Raw: ${JSON.stringify(data, null, 2)}`);
    }
    console.log('---');
  });
  
  process.exit(0);
}

run();

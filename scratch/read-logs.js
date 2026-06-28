require('dotenv').config({path: '.env'});
const admin = require('firebase-admin');
const keyStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!keyStr) { console.error('No key'); process.exit(1); }
const key = JSON.parse(keyStr.startsWith("'") ? keyStr.slice(1,-1) : keyStr);
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();
async function run() {
  const snaps = await db.collection('gc_bot_debug').orderBy('receivedAt', 'desc').limit(100).get();
  snaps.forEach(doc => {
    const d = doc.data();
      if (d.responseType === 'poll') {
          console.log('POLL:', d.fromPhone, d.rawKeys, JSON.stringify(d.rawPollUpdate));
      }
  });
}
run();

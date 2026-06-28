require('dotenv').config({path: '.env'});
const admin = require('firebase-admin');
const keyStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const key = JSON.parse(keyStr.startsWith("'") ? keyStr.slice(1,-1) : keyStr);
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();
async function run() {
  const snaps = await db.collection('gc_bot_debug').orderBy('receivedAt', 'desc').limit(5).get();
  snaps.forEach(doc => {
    const d = doc.data();
    d.receivedAt = d.receivedAt?.toDate();
    console.log('EVENT:', d.event, 'FROM:', d.fromPhone, 'TYPE:', d.responseType);
    console.log(JSON.stringify(d, null, 2));
  });
}
run();

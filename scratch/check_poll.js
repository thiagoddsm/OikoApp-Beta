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
  const snapshot = await db.collection('gc_sessions').where('phone', '==', '5521989001302').get();
  if (snapshot.empty) {
    console.log("No session found");
    return;
  }
  snapshot.forEach(doc => {
    console.log("Session:", doc.id);
    console.log("Poll Selections:", JSON.stringify(doc.data().pollSelections, null, 2));
    console.log("Attendance:", JSON.stringify(doc.data().attendance, null, 2));
  });
}

run().catch(console.error);

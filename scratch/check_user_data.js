const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config({ path: '.env' });

async function runCheck() {
  const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!saKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not defined in .env');
    process.exit(1);
  }

  const sa = JSON.parse(saKey);
  console.log(`Connecting to project: ${sa.project_id}`);

  let app;
  if (!getApps().length) {
    app = initializeApp({ credential: cert(sa) });
  } else {
    app = getApps()[0];
  }

  const db = getFirestore(app);
  const uid = '9Sm2pIH1zIOj9k8D8EcLS3bkKad2';

  console.log(`--- Fetching user document for UID: ${uid} ---`);
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      console.log('✓ User Doc found:', JSON.stringify(userDoc.data(), null, 2));
    } else {
      console.log('✗ User Doc NOT found in "users" collection!');
    }
  } catch (error) {
    console.error('Error fetching user:', error);
  }
}

runCheck().catch(console.error);

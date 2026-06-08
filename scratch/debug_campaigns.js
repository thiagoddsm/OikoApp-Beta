require('dotenv').config();
const admin = require('firebase-admin');

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env');
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  console.log('Fetching notification campaigns via Admin SDK...');
  const snap = await db.collection('notification_campaigns').get();
  
  console.log(`Found ${snap.size} campaigns:\n`);
  
  snap.forEach(doc => {
    const c = doc.data();
    console.log(`Campaign ID: ${doc.id}`);
    console.log(`Class: ${c.className} (${c.classId})`);
    console.log(`Status: ${c.status}`);
    console.log(`Sent: ${c.sentCount} | Failed: ${c.failedCount} | Total: ${c.totalCount}`);
    
    const failures = (c.recipients || []).filter(r => r.status === 'failed');
    if (failures.length > 0) {
      console.log('Failures detail:');
      failures.forEach((f, idx) => {
        console.log(`  [${idx + 1}] Student: ${f.name} | Phone: ${f.phone} | Error: ${f.error}`);
      });
    }
    console.log('-'.repeat(50));
  });
}

run().catch(console.error);

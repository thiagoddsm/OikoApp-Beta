const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config();

let sa = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  }
} catch (e) {}

if (!admin.apps.length) {
  if (sa) {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  } else {
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oiko-app-beta',
    });
  }
}

const db = admin.firestore();

async function run() {
  console.log('=== ULTIMAS COBRANCAS ASAAS (asaasPayments) ===');
  const snap1 = await db.collection('asaasPayments').limit(10).get();
  snap1.docs.forEach(doc => {
    const d = doc.data();
    console.log(`[ID: ${doc.id}] Status: ${d.status} | AsaasStatus: ${d.asaasStatus} | ExternalRef: ${d.externalReference} | Description: ${d.description}`);
  });

  console.log('\n=== ULTIMOS WEBHOOKS PROCESSADOS (processed_webhooks) ===');
  const snap2 = await db.collection('processed_webhooks').limit(10).get();
  snap2.docs.forEach(doc => {
    console.log(`[ID: ${doc.id}] ->`, doc.data());
  });

  console.log('\n=== ULTIMAS MENSALIDADES (tuition_fees) ===');
  const snap3 = await db.collection('tuition_fees').limit(10).get();
  snap3.docs.forEach(doc => {
    const d = doc.data();
    console.log(`[ID: ${doc.id}] Student: ${d.studentName} | Course: ${d.courseName} | Status: ${d.status} | AsaasPayId: ${d.asaasPaymentId}`);
  });
}

run().catch(console.error);

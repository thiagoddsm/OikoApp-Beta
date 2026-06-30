const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config({ path: '.env' });

async function runTest() {
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

  console.log('--- Checking worship_plans ---');
  try {
    const plansSnap = await db.collection('worship_plans').limit(5).get();
    console.log(`Successfully connected. Found ${plansSnap.size} plans.`);
    plansSnap.forEach(doc => {
      console.log(`Plan ID: ${doc.id}, Title: ${doc.data().title}, tenantId: ${doc.data().tenantId}`);
    });
  } catch (error) {
    console.error('Error fetching worship_plans:', error);
  }

  console.log('--- Checking worship_templates ---');
  try {
    const templatesSnap = await db.collection('worship_templates').limit(5).get();
    console.log(`Successfully connected. Found ${templatesSnap.size} templates.`);
    templatesSnap.forEach(doc => {
      console.log(`Template ID: ${doc.id}, Name: ${doc.data().name}`);
    });
  } catch (error) {
    console.error('Error fetching worship_templates:', error);
  }
}

runTest().catch(console.error);

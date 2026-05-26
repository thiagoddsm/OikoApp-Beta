const dotenv = require('dotenv');
dotenv.config();

const admin = require('firebase-admin');

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error("FIREBASE_SERVICE_ACCOUNT_KEY not found");
  process.exit(1);
}

let sa = JSON.parse(serviceAccountKey);

admin.initializeApp({
  credential: admin.credential.cert(sa),
  projectId: sa.project_id
});

const db = admin.firestore();

async function run() {
  console.log("Listing tenants:");
  const tenantsSnap = await db.collection('tenants').get();
  tenantsSnap.forEach(doc => {
    console.log(`Tenant ID: ${doc.id} | Name: ${doc.data().name}`);
  });

  console.log("Listing churches:");
  const churchesSnap = await db.collection('churches').get();
  churchesSnap.forEach(doc => {
    console.log(`Church ID: ${doc.id} | Name: ${doc.data().name} | TenantId: ${doc.data().tenantId}`);
  });
}

run().catch(console.error);

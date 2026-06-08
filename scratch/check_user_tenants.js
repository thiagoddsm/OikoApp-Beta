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
  console.log("=== LISTANDO USERS ===");
  const usersSnap = await db.collection('users').get();
  usersSnap.forEach(doc => {
    const data = doc.data();
    console.log(`UID: ${doc.id} | Nome: ${data.name} | E-mail: ${data.email} | Role: ${data.hierarchy?.role}`);
  });

  console.log("\n=== LISTANDO USER_TENANTS ===");
  const userTenantsSnap = await db.collection('userTenants').get();
  userTenantsSnap.forEach(doc => {
    const data = doc.data();
    console.log(`UID: ${doc.id} | Tenant: ${data.tenantId} | Role: ${data.role} | E-mail: ${data.email}`);
  });
}

run().catch(console.error);

import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function countUsers() {
  let app;
  if (!getApps().length) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    app = initializeApp({ credential: cert(sa) });
  } else {
    app = getApps()[0];
  }

  const db = getFirestore(app);
  
  const allUsers = await db.collection('users').get();
  console.log(`Total users in DB: ${allUsers.size}`);

  const tenantCounts: any = {};
  allUsers.forEach(doc => {
    const t = doc.data().tenantId || 'NO_TENANT';
    tenantCounts[t] = (tenantCounts[t] || 0) + 1;
  });

  console.log("Tenant counts:", tenantCounts);
}

countUsers().catch(console.error);

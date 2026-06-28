import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function fixTenantId() {
  let app;
  if (!getApps().length) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.error("Missing FIREBASE_SERVICE_ACCOUNT_KEY");
      process.exit(1);
    }
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    app = initializeApp({ credential: cert(sa) });
  } else {
    app = getApps()[0];
  }

  const db = getFirestore(app);
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('tenantId', '==', 'tenant_default').get();
  
  let updatedCount = 0;
  let batch = db.batch();
  let currentBatchSize = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.tenantId === 'tenant_default') {
      batch.update(doc.ref, { tenantId: 'w3m93SHQeBRhiDnt7208' });
      updatedCount++;
      currentBatchSize++;

      if (currentBatchSize >= 400) {
        await batch.commit();
        batch = db.batch();
        currentBatchSize = 0;
      }
    }
  }

  if (currentBatchSize > 0) {
    await batch.commit();
  }

  console.log(`Updated ${updatedCount} users with missing tenantId`);
}

fixTenantId().catch(console.error);

import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function checkTenantId() {
  let app;
  if (!getApps().length) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    app = initializeApp({ credential: cert(sa) });
  } else {
    app = getApps()[0];
  }

  const db = getFirestore(app);
  
  // Find Cleusa
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('name', '==', 'Cleusa Maria Fermiano').get();
  
  snapshot.forEach(doc => {
    console.log(`Cleusa has tenantId: ${doc.data().tenantId}`);
  });

  // Also let's check one of the missing students.
  // Get the class
  const classSnapshot = await db.collection('classes').where('courseId', '==', 'eO9qvIpV2h772uJVqOrL').get();
  classSnapshot.forEach(doc => {
    console.log(`Class ${doc.data().name} has ${doc.data().students?.length} students.`);
  });
}

checkTenantId().catch(console.error);

import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function verifyStudents() {
  let app;
  if (!getApps().length) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    app = initializeApp({ credential: cert(sa) });
  } else {
    app = getApps()[0];
  }

  const db = getFirestore(app);
  
  // Find class "Abril de 2026" for course "eO9qvIpV2h772uJVqOrL"
  const classSnapshot = await db.collection('classes').where('courseId', '==', 'eO9qvIpV2h772uJVqOrL').get();
  let targetClass = null;
  classSnapshot.forEach(doc => {
    if (doc.data().name === 'Abril de 2026') {
      targetClass = { id: doc.id, ...doc.data() };
    }
  });

  if (!targetClass) {
    console.log("Class not found");
    return;
  }

  console.log(`Found class: ${targetClass.name} with ${targetClass.students?.length} students`);
  
  const studentIds = targetClass.students || [];
  let foundInUsers = 0;
  let missingInUsers = 0;
  let wrongTenant = 0;

  console.log("Starting loop over " + studentIds.length + " students");
  for (const id of studentIds) {
    try {
      const userDoc = await db.collection('users').doc(id).get();
      if (userDoc.exists) {
        foundInUsers++;
        const tId = userDoc.data()?.tenantId;
        if (tId !== 'w3m93SHQeBRhiDnt7208') {
          wrongTenant++;
          console.log(`User ${id} has wrong tenant: ${tId}`);
        }
      } else {
        missingInUsers++;
        console.log(`User ${id} does not exist in users collection!`);
      }
    } catch (e) {
      console.log(`Error on id ${id}:`, e);
    }
  }

  console.log(`Summary: ${foundInUsers} found, ${missingInUsers} missing, ${wrongTenant} with wrong tenant.`);
}

verifyStudents().catch(console.error);

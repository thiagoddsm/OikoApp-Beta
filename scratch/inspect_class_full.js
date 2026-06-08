// Executar com: node scratch/inspect_class_full.js
require('dotenv').config();
const admin = require('firebase-admin');

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let app;
try {
  if (serviceAccountKey) {
    let cleanKey = serviceAccountKey.trim();
    if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
      cleanKey = cleanKey.slice(1, -1);
    }
    const sa = JSON.parse(cleanKey);
    app = admin.initializeApp({
      credential: admin.credential.cert(sa),
      projectId: sa.project_id || 'studio-1424813022-71754'
    });
  } else {
    app = admin.initializeApp({
      projectId: 'studio-1424813022-71754',
      credential: admin.credential.applicationDefault()
    });
  }
} catch (e) {
  console.error("Firebase Admin initialization error:", e);
}

const db = admin.firestore();

async function run() {
  const classId = 'BrlTKwGAGLUT7xJ4usG5';
  const snap = await db.collection('classes').doc(classId).get();
  if (!snap.exists) {
    console.log(`Class ${classId} not found.`);
    return;
  }
  console.log(JSON.stringify(snap.data(), null, 2));
}

run().catch(console.error);

require('dotenv').config();
const admin = require('firebase-admin');

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let app;
if (serviceAccountKey) {
  let cleanKey = serviceAccountKey.trim();
  if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
    cleanKey = cleanKey.slice(1, -1);
  }
  const sa = JSON.parse(cleanKey);
  app = admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId: sa.project_id
  }, 'prod');
} else {
  app = admin.initializeApp({
    projectId: 'studio-8044285263-a0cc3',
    credential: admin.credential.applicationDefault()
  }, 'prod');
}

const db = admin.firestore(app);

async function run() {
  const classId = 'BrITKwGAGLUT7xJ4usG5';
  const snap = await db.collection('classes').doc(classId).get();
  if (!snap.exists) {
    console.log(`Class ${classId} not found in production.`);
    return;
  }
  const cls = snap.data();
  console.log("Production attendance dates:", (cls.attendance || []).map(a => a.date).sort());
}

run().catch(console.error);

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
  const snap = await db.collection('pedagogical_logs').get();
  console.log(`Found ${snap.size} total pedagogical logs in production:`);
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`- ID: ${doc.id}`);
    console.log(`  classId: ${data.classId}`);
    console.log(`  dateStr: ${data.dateStr}`);
    console.log(`  date:`, data.date?.toDate?.() || data.date);
    console.log(`  content_taught: ${data.content_taught}`);
  });
}

run().catch(console.error);

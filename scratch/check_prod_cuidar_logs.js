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
  const classIds = ['w3q7qjHhLNs9D8m2a9K0', 'BrITKwGAGLUT7xJ4usG5'];
  for (const cid of classIds) {
    const cSnap = await db.collection('classes').doc(cid).get();
    if (!cSnap.exists) {
      console.log(`Class ${cid} not found`);
      continue;
    }
    const cData = cSnap.data();
    console.log(`\n================= CLASS: ${cData.name} (${cid}) =================`);
    console.log(`Attendance dates:`, (cData.attendance || []).map(a => a.date).sort());

    const logsSnap = await db.collection('pedagogical_logs').where('classId', '==', cid).get();
    console.log(`Pedagogical logs: ${logsSnap.size}`);
    logsSnap.forEach(ldoc => {
      const l = ldoc.data();
      console.log(`  - DateStr: ${l.dateStr} | content: ${l.content_taught}`);
    });
  }
}

run().catch(console.error);

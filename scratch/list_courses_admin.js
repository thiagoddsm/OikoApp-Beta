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
  console.log("Project ID:", sa.project_id);
  const snap = await db.collection('courses').get();
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`Course ID: ${doc.id} | Name: ${data.name} | Linked: ${data.linkedTheoflixId || '(none)'}`);
  });
}

run().catch(console.error);

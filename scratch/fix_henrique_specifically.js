const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
require('dotenv').config({ path: '.env' });

async function migrateHenrique() {
  const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!saKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not defined in .env');
    process.exit(1);
  }

  const sa = JSON.parse(saKey);
  console.log(`Connecting to project: ${sa.project_id}`);

  let app;
  if (!getApps().length) {
    app = initializeApp({ credential: cert(sa) });
  } else {
    app = getApps()[0];
  }

  const db = getFirestore(app);
  const henriqueUid = 'X0DGGWIn2oUOHlASByEAdn2KCc43';

  console.log(`Fetching user Henrique (ID: ${henriqueUid})...`);
  const userRef = db.collection('users').doc(henriqueUid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    console.error('User Henrique not found!');
    return;
  }

  const data = userDoc.data();
  console.log('✓ Found Henrique:', data.name || data.email);

  const updates = {};
  const targetCourses = ['crescer', 'cuidar', 'membros', 'imersao'];
  let hasUpdates = false;

  for (const courseId of targetCourses) {
    if (data[courseId] && typeof data[courseId] === 'object') {
      console.log(`Found root-level course "${courseId}"...`);
      const progressMap = data[courseId];
      for (const [episodeId, watched] of Object.entries(progressMap)) {
        if (watched === true) {
          updates[`journey.theoflixProgress.${courseId}.${episodeId}`] = true;
          console.log(`  - Episode: ${episodeId} -> journey.theoflixProgress.${courseId}.${episodeId}`);
        }
      }
      updates[courseId] = FieldValue.delete();
      hasUpdates = true;
    }
  }

  if (hasUpdates) {
    console.log('Updating document...');
    await userRef.update(updates);
    console.log('✓ Henrique progress migrated successfully!');
  } else {
    console.log('No root-level progress maps found for Henrique. Checking if already migrated...');
    console.log('Current journey progress:', JSON.stringify(data.journey?.theoflixProgress || {}, null, 2));
  }
}

migrateHenrique().catch(console.error);

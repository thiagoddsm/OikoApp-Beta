const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
require('dotenv').config({ path: '.env' });

async function migrateJourneyProgress() {
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
  
  const targetCourses = ['crescer', 'cuidar', 'membros', 'imersao'];
  
  console.log('Fetching users...');
  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} users. Analyzing journey course progress...`);

  let migratedCount = 0;

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const userId = doc.id;
    const updates = {};
    let hasUpdates = false;

    // Check if the user has a "journey" map
    if (data.journey && typeof data.journey === 'object') {
      const journey = data.journey;

      for (const courseId of targetCourses) {
        // If the progress map is directly inside data.journey (e.g., journey.cuidar)
        if (journey[courseId] && typeof journey[courseId] === 'object') {
          console.log(`Found journey-level course "${courseId}" for user ${data.name || userId} (${userId})`);
          
          const progressMap = journey[courseId];
          for (const [episodeId, watched] of Object.entries(progressMap)) {
            if (watched === true) {
              updates[`journey.theoflixProgress.${courseId}.${episodeId}`] = true;
            }
          }
          
          // Remove the deprecated field path journey.<courseId>
          updates[`journey.${courseId}`] = FieldValue.delete();
          hasUpdates = true;
        }
      }
    }

    if (hasUpdates) {
      console.log(`Migrating progress for user ${data.name || userId}...`);
      await db.collection('users').doc(userId).update(updates);
      console.log(`✓ User ${data.name || userId} migrated successfully!`);
      migratedCount++;
    }
  }

  console.log(`\n=== Migration finished! Migrated ${migratedCount} users. ===`);
}

migrateJourneyProgress().catch(console.error);

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config({ path: '.env' });

async function migrateProgress() {
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
  
  // As coleções do TheoFlix conhecidas
  const targetCourses = ['crescer', 'cuidar', 'membros', 'imersao'];
  
  console.log('Fetching users...');
  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} users. Analyzing root-level TheoFlix progress...`);

  let migratedCount = 0;

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const userId = doc.id;
    const updates = {};
    let hasUpdates = false;

    // Verificar se existem chaves de cursos TheoFlix na raiz do documento
    for (const courseId of targetCourses) {
      if (data[courseId] && typeof data[courseId] === 'object') {
        console.log(`Found root-level course "${courseId}" for user ${data.name || userId} (${userId})`);
        
        // Preparar para migrar os dados para dentro de journey.theoflixProgress
        const progressMap = data[courseId];
        for (const [episodeId, watched] of Object.entries(progressMap)) {
          if (watched === true) {
            updates[`journey.theoflixProgress.${courseId}.${episodeId}`] = true;
          }
        }
        
        // Preparar a remoção do campo na raiz (usando FieldValue.delete() ou sobrescrevendo)
        // No Firestore node-sdk, podemos usar a remoção do campo
        const FieldValue = require('firebase-admin/firestore').FieldValue;
        updates[courseId] = FieldValue.delete();
        hasUpdates = true;
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

migrateProgress().catch(console.error);

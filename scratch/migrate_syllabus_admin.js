const dotenv = require('dotenv');
dotenv.config();

const admin = require('firebase-admin');

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error("FIREBASE_SERVICE_ACCOUNT_KEY not found in .env");
  process.exit(1);
}

let sa;
try {
  let cleanKey = serviceAccountKey.trim();
  if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
    cleanKey = cleanKey.slice(1, -1);
  }
  sa = JSON.parse(cleanKey);
} catch (e) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(sa),
  projectId: sa.project_id
});

const db = admin.firestore();

async function run() {
  console.log('=== Crescer Syllabus Migration (Admin SDK) ===\n');

  const courseRef = db.collection('courses').doc('0p9aolpCoHzGrnnue4nP');
  const courseSnap = await courseRef.get();
  
  if (!courseSnap.exists) {
    console.error('Course not found!');
    process.exit(1);
  }

  const course = courseSnap.data();
  const syllabus = course.syllabus || [];

  console.log('Current state:');
  syllabus.forEach((s, idx) => {
    console.log(`  [${idx}] "${s.title}" → requiredVideoIds: ${JSON.stringify(s.theoflixRequiredVideoIds || [])}`);
  });

  // Apply corrections
  const newSyllabus = syllabus.map((s, idx) => {
    if (idx === 2) {
      console.log(`\n✏️  Fixing index 2: changing requiredVideoIds from ${JSON.stringify(s.theoflixRequiredVideoIds)} to ["3"]`);
      return { ...s, theoflixRequiredVideoIds: ['3'] };
    }
    if (idx === 3) {
      console.log(`✏️  Fixing index 3: changing requiredVideoIds from ${JSON.stringify(s.theoflixRequiredVideoIds)} to ["4"]`);
      return { ...s, theoflixRequiredVideoIds: ['4'] };
    }
    return s;
  });

  console.log('\nApplying update...');
  await courseRef.update({ syllabus: newSyllabus });

  console.log('\n✅ Migration applied! Verifying...');
  const verifySnap = await courseRef.get();
  const verifySyllabus = verifySnap.data().syllabus || [];
  console.log('\nNew state:');
  verifySyllabus.forEach((s, idx) => {
    console.log(`  [${idx}] "${s.title}" → requiredVideoIds: ${JSON.stringify(s.theoflixRequiredVideoIds || [])}`);
  });

  console.log('\n🎉 Migration complete!');
  process.exit(0);
}

run().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

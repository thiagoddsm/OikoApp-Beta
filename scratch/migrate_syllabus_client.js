/**
 * migrate_syllabus_client.js
 * 
 * Usa Firebase Client SDK (sem Admin) para corrigir o syllabus do curso Crescer.
 * Usa autenticação anônima ou de usuário para cumprir as regras de segurança.
 * 
 * Regra atual: match /{document=**} { allow read, write: if isAuthenticated(); }
 * Então precisamos estar autenticados.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  "projectId": "studio-1424813022-71754",
  "appId": "1:989586605112:web:66250f4d31e88166a212cd",
  "storageBucket": "studio-1424813022-71754.firebasestorage.app",
  "apiKey": "AIzaSyAOSAJ0WPPXAxbSMtiq7UZxkjzE6vizVq8",
  "authDomain": "studio-1424813022-71754.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "989586605112"
};

// Admin credentials - replace with yours
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Please set ADMIN_EMAIL and ADMIN_PASSWORD env vars.');
  console.error('Run: $env:ADMIN_EMAIL="seu@email.com"; $env:ADMIN_PASSWORD="suasenha"; node scratch/migrate_syllabus_client.js');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
  console.log('=== Crescer Syllabus Migration (Client SDK) ===\n');
  
  // Sign in
  console.log(`Signing in as ${ADMIN_EMAIL}...`);
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('✅ Signed in!\n');
  
  // Get course
  const courseRef = doc(db, 'courses', '0p9aolpCoHzGrnnue4nP');
  const courseSnap = await getDoc(courseRef);
  if (!courseSnap.exists()) {
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
  await updateDoc(courseRef, { syllabus: newSyllabus });
  
  console.log('\n✅ Migration applied! Verifying...');
  const verifySnap = await getDoc(courseRef);
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

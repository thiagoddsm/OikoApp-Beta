const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
  // Remove aspas simples externas se houver
  const cleanJson = rawKey.startsWith("'") && rawKey.endsWith("'") 
    ? rawKey.slice(1, -1) 
    : rawKey;
  serviceAccount = JSON.parse(cleanJson);
} else {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY não encontrada no .env");
}

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  const coursesSnap = await db.collection('courses').get();
  coursesSnap.forEach(doc => {
    const data = doc.data();
    if (data.name?.toLowerCase().includes('crescer') || doc.id === 'crescer') {
      console.log('--- CURSO FISICO ---');
      console.log('ID:', doc.id);
      console.log('Nome:', data.name);
      console.log('Syllabus:', JSON.stringify(data.syllabus, null, 2));
    }
  });

  const theoflixCoursesSnap = await db.collection('theoflix_courses').get();
  theoflixCoursesSnap.forEach(doc => {
    const data = doc.data();
    if (data.title?.toLowerCase().includes('crescer') || doc.id === 'crescer') {
      console.log('--- CURSO THEOFLIX ---');
      console.log('ID:', doc.id);
      console.log('Titulo:', data.title);
      console.log('Episodes:', JSON.stringify(data.episodes, null, 2));
    }
  });
}

run().catch(console.error);

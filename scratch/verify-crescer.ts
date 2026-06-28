import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./api-wa.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  const coursesSnap = await db.collection('courses').get();
  coursesSnap.forEach(doc => {
    const data = doc.data();
    if (data.name?.toLowerCase().includes('crescer') || doc.id === 'crescer') {
      console.log('Curso Encontrado:', doc.id, data.name);
      console.log('Syllabus:', JSON.stringify(data.syllabus, null, 2));
    }
  });

  const theoflixCoursesSnap = await db.collection('theoflix_courses').get();
  theoflixCoursesSnap.forEach(doc => {
    const data = doc.data();
    if (data.title?.toLowerCase().includes('crescer') || doc.id === 'crescer') {
      console.log('Theoflix Course:', doc.id, data.title);
      console.log('Episodes:', JSON.stringify(data.episodes, null, 2));
    }
  });
}

run().catch(console.error);

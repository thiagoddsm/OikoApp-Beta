import { getAdminDb } from '../src/lib/firebase-admin';

async function checkTheoflixCoursesConfig() {
  const db = getAdminDb();
  
  // Buscar os dados do theoflix da collection theoflix_courses
  const coursesSnap = await db.collection('theoflix_courses').get();
  console.log("=== Coleção theoflix_courses ===");
  for (const doc of coursesSnap.docs) {
    const course = doc.data();
    console.log(`\nCurso ID: ${doc.id} | Nome: ${course.title || course.name}`);
    console.log("Episodes:", (course.episodes || []).map((e: any, idx: number) => `[${idx}] ${e.title} -> Key: ${e.youtubeId || e.title.replace(/\s+/g, '_')}`));
  }
}

checkTheoflixCoursesConfig().catch(console.error);

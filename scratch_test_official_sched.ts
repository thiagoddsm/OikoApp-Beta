import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getAdminDb } from './src/lib/firebase-admin';
import { getResolvedSchedule } from './src/contexts/volunteering-context';

async function main() {
  const db = getAdminDb();
  const clsDoc = await db.collection('classes').doc('DZ3zq50D7A4kvjIQiLWl').get();
  const courseDoc = await db.collection('courses').doc('jza1G4EoPXTrpL8nkfCL').get();
  const cls = { id: clsDoc.id, ...clsDoc.data() };
  const course = { id: courseDoc.id, ...courseDoc.data() };

  console.log('Class data:', cls);
  console.log('Course data:', course.name, course.syllabus);

  const res = getResolvedSchedule(cls as any, course as any);
  console.log('Resolved schedule from volunteering-context:', res);
}

main().catch(console.error);

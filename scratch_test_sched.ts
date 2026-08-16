import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getAdminDb } from './src/lib/firebase-admin';

// Simular getResolvedSchedule
import { parseISO, addDays, isAfter, isBefore, format, getDay } from 'date-fns';

function getResolvedSchedule(cls: any, course: any) {
  const syllabus = course?.syllabus || [];
  const schedule: any[] = [];
  if (!cls.startDate || !cls.endDate) return schedule;

  const start = parseISO(cls.startDate);
  const end = parseISO(cls.endDate);
  let current = start;
  let index = 0;

  while (!isAfter(current, end) && index < (syllabus.length || 20)) {
    const dateStr = format(current, 'yyyy-MM-dd');
    schedule.push({
      dateStr,
      syllabusItem: syllabus[index] || { title: `Aula ${index + 1}` }
    });
    current = addDays(current, 7);
    index++;
  }
  return schedule;
}

async function main() {
  const db = getAdminDb();
  const clsDoc = await db.collection('classes').doc('DZ3zq50D7A4kvjIQiLWl').get();
  const courseDoc = await db.collection('courses').doc('jza1G4EoPXTrpL8nkfCL').get();
  const cls = { id: clsDoc.id, ...clsDoc.data() };
  const course = { id: courseDoc.id, ...courseDoc.data() };

  console.log('CLASS:', cls.name, cls.cycle, 'Students:', cls.students);
  console.log('COURSE:', course.name, course.ebdTrack);
  const sched = getResolvedSchedule(cls, course);
  console.log('SCHEDULE:', sched.length, sched);

  // Verificar todas as classes de Trilho Teológico
  const coursesSnap = await db.collection('courses').where('ebdTrack', '==', 'teologico').get();
  const teoCourses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log('Cursos Teológicos:', teoCourses.map(c => c.name));

  const classesSnap = await db.collection('classes').get();
  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const teoClasses = classes.filter(c => teoCourses.some(tc => tc.id === c.courseId));
  console.log('\n--- TURMAS DO TRILHO TEOLOGICO ---');
  teoClasses.forEach(tc => {
    console.log(tc.id, tc.name, 'Course:', teoCourses.find(c => c.id === tc.courseId)?.name, 'Cycle:', tc.cycle, 'Students:', tc.students);
  });
}

main().catch(console.error);

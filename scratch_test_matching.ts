import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getAdminDb } from './src/lib/firebase-admin';

async function main() {
  const db = getAdminDb();
  const reqsSnap = await db.collection('enrollment_requests').get();
  const enrollmentRequests = reqsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const usersSnap = await db.collection('users').get();
  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const userMap = new Map();
  users.forEach(u => userMap.set(u.id, u));

  // Simular o enrollmentDateMap EXATO que deve ser construído
  // O enrollmentDateMap DEVE ser ESPECÍFICO por aluno e curso!
  const enrollmentDateMap = new Map();

  enrollmentRequests.forEach((r: any) => {
    let d: Date | null = null;
    if (r.createdAt?.toDate) d = r.createdAt.toDate();
    else if (r.createdAt?.seconds) d = new Date(r.createdAt.seconds * 1000);
    else if (r.createdAt) {
      try { d = new Date(r.createdAt); } catch {}
    }
    if (!d) return;

    // Chaves que identificam o aluno
    const studentKeys: string[] = [];
    if (r.volunteerId) studentKeys.push(String(r.volunteerId));
    if (r.userId) studentKeys.push(String(r.userId));
    if (r.email) studentKeys.push(`email:${String(r.email).trim().toLowerCase()}`);
    if (r.phone) {
      const cleanPhone = String(r.phone).replace(/\D/g, '');
      if (cleanPhone) studentKeys.push(`phone:${cleanPhone}`);
    }
    if (r.name) studentKeys.push(`name:${String(r.name).trim().toLowerCase()}`);

    studentKeys.forEach(sKey => {
      // 1. Chave composta ESPECÍFICA do curso: `${sKey}_${courseId}`
      if (r.courseId) {
        const compositeKey = `${sKey}_${r.courseId}`;
        if (!enrollmentDateMap.has(compositeKey) || d! > enrollmentDateMap.get(compositeKey)!) {
          enrollmentDateMap.set(compositeKey, d!);
        }
      }
    });
  });

  const enrollmentDateStart = '2026-08-09';
  const enrollmentDateEnd = '2026-08-30';

  const isEnrollmentDateInRange = (studentId: string, courseId?: string) => {
    if (!enrollmentDateStart && !enrollmentDateEnd) return true;

    const u = userMap.get(studentId);
    let date: Date | null = null;

    if (courseId) {
      // 1. Por ID + courseId
      if (enrollmentDateMap.has(`${studentId}_${courseId}`)) {
        date = enrollmentDateMap.get(`${studentId}_${courseId}`)!;
      }
      // 2. Por Email + courseId
      if (!date && u?.email) {
        const emailKey = `email:${String(u.email).trim().toLowerCase()}`;
        if (enrollmentDateMap.has(`${emailKey}_${courseId}`)) {
          date = enrollmentDateMap.get(`${emailKey}_${courseId}`)!;
        }
      }
      // 3. Por Telefone + courseId
      if (!date && (u?.phone || u?.whatsapp)) {
        const cleanPhone = String(u.phone || u.whatsapp || '').replace(/\D/g, '');
        if (cleanPhone && enrollmentDateMap.has(`phone:${cleanPhone}_${courseId}`)) {
          date = enrollmentDateMap.get(`phone:${cleanPhone}_${courseId}`)!;
        }
      }
      // 4. Por Nome + courseId
      if (!date && u?.name) {
        const nameKey = `name:${String(u.name).trim().toLowerCase()}`;
        if (enrollmentDateMap.has(`${nameKey}_${courseId}`)) {
          date = enrollmentDateMap.get(`${nameKey}_${courseId}`)!;
        }
      }
      // 5. Por user.journey.enrolledAt[courseId]
      if (!date && u?.journey?.enrolledAt?.[courseId]) {
        const val = u.journey.enrolledAt[courseId];
        if (val?.toDate) date = val.toDate();
        else if (val?.seconds) date = new Date(val.seconds * 1000);
        else { try { date = new Date(val); } catch {} }
      }
    }

    if (!date) return false;

    const cleanDate = date.toISOString().split('T')[0];
    if (enrollmentDateStart && cleanDate < enrollmentDateStart) return false;
    if (enrollmentDateEnd && cleanDate > enrollmentDateEnd) return false;
    return true;
  };

  console.log('--- TESTANDO ALUNOS NO PERIODO 09/08 A 30/08 ---');
  // Buscar todas as turmas de cursos teologicos
  const coursesSnap = await db.collection('courses').where('ebdTrack', '==', 'teologico').get();
  const teoCourses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const classesSnap = await db.collection('classes').get();
  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const matchingResults: any[] = [];
  classes.forEach((cls: any) => {
    const course = teoCourses.find(c => c.id === cls.courseId);
    if (!course) return;
    (cls.students || []).forEach((stId: string) => {
      const inRange = isEnrollmentDateInRange(stId, course.id);
      if (inRange) {
        const u = userMap.get(stId);
        matchingResults.push({
          studentName: u?.name,
          courseName: course.name,
          className: cls.name
        });
      }
    });
  });

  console.log('RESULTADOS ENCONTRADOS:');
  console.table(matchingResults);
}

main().catch(console.error);

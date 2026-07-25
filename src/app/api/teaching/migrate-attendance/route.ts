import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/server-auth';
import { Timestamp } from 'firebase-admin/firestore';
import { ServerAuditService } from '@/lib/services/audit-service';

export const runtime = 'nodejs';

/**
 * Migration Route (Etapa 9): Converts legacy `classes.attendance` arrays
 * into normalized `class_sessions`, `class_session_attendance` and `student_course_module_progress`.
 */
export async function POST(req: NextRequest) {
  const { context, errorResponse } = await requireAuth(req, ['admin', 'coordenador', 'pastor_senior']);
  if (errorResponse) return errorResponse;

  try {
    const db = getAdminDb();
    const classesSnap = await db.collection('classes').get();
    const coursesSnap = await db.collection('courses').get();

    const courseMap = new Map();
    coursesSnap.docs.forEach(doc => courseMap.set(doc.id, doc.data()));

    let migratedSessions = 0;
    let migratedAttendanceRecords = 0;
    let migratedModuleProgress = 0;

    for (const classDoc of classesSnap.docs) {
      const classData = classDoc.data();
      const attendanceList = classData.attendance || [];
      if (attendanceList.length === 0) continue;

      const courseData = courseMap.get(classData.courseId);
      const isDisCourse = (courseData?.schoolId === 'dis' || courseData?.programId === 'dis' || (courseData?.name || '').toLowerCase().includes('libras'));
      const syllabus = courseData?.syllabus || [];

      for (let idx = 0; idx < attendanceList.length; idx++) {
        const record = attendanceList[idx];
        const dateStr = record.date;
        if (!dateStr) continue;

        const safeSessionKey = `${classDoc.id}_${dateStr}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        const sessionRef = db.collection('class_sessions').doc(safeSessionKey);

        const moduleItem = syllabus[idx] || { id: `mod_${idx + 1}`, title: `Aula ${idx + 1}` };

        await sessionRef.set({
          classId: classDoc.id,
          courseId: classData.courseId,
          tenantId: classData.tenantId || context.tenantId,
          dateStr,
          date: Timestamp.fromDate(new Date(dateStr.split('T')[0])),
          cycle: classData.cycle || null,
          moduleId: moduleItem.id,
          moduleTitle: moduleItem.title || null,
          teacherId: classData.teacherId || null,
          status: 'completed',
          migratedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }, { merge: true });

        migratedSessions++;

        const presentSet = new Set<string>(record.presentStudentIds || []);
        const onlineSet = new Set<string>(record.onlineStudentIds || []);
        const repositionsSet = new Set<string>((record.repositions || []).map((r: any) => r.studentId));
        const allStudents = new Set([...(classData.students || []), ...presentSet, ...onlineSet, ...repositionsSet]);

        const batch = db.batch();

        for (const studentId of allStudents) {
          const attendanceRef = db.collection('class_session_attendance').doc(`${safeSessionKey}_${studentId}`);
          const isPresent = presentSet.has(studentId);
          const isOnline = onlineSet.has(studentId);
          const isRepo = repositionsSet.has(studentId);

          let status = 'absent';
          if (isRepo) status = 'makeup';
          else if (isOnline) status = 'online';
          else if (isPresent) status = 'present';

          batch.set(attendanceRef, {
            sessionId: safeSessionKey,
            classId: classDoc.id,
            courseId: classData.courseId,
            tenantId: classData.tenantId || context.tenantId,
            studentId,
            status,
            migratedAt: Timestamp.now(),
            recordedAt: Timestamp.now(),
          }, { merge: true });

          migratedAttendanceRecords++;

          if (isDisCourse && (isPresent || isOnline || isRepo)) {
            const progressRef = db.collection('student_course_module_progress').doc(
              `${studentId}_${classData.courseId}_${moduleItem.id}`.replace(/[^a-zA-Z0-9_-]/g, '_')
            );
            batch.set(progressRef, {
              studentId,
              courseId: classData.courseId,
              classId: classDoc.id,
              tenantId: classData.tenantId || context.tenantId,
              moduleId: moduleItem.id,
              moduleTitle: moduleItem.title || null,
              completed: true,
              completionType: isRepo ? 'makeup' : 'attendance',
              lastSessionId: safeSessionKey,
              migratedAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            }, { merge: true });
            migratedModuleProgress++;
          }
        }

        await batch.commit();
      }
    }

    await ServerAuditService.record({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'MIGRATE_HISTORICAL_ATTENDANCE',
      resourceType: 'class_sessions',
      requestId: context.requestId,
      metadata: { migratedSessions, migratedAttendanceRecords, migratedModuleProgress }
    });

    return NextResponse.json({
      success: true,
      message: 'Migração de chamadas históricas concluída com sucesso.',
      stats: {
        migratedSessions,
        migratedAttendanceRecords,
        migratedModuleProgress
      }
    });
  } catch (error: any) {
    console.error('[Attendance Migration] Erro na migração:', error);
    return NextResponse.json({ error: 'Erro ao executar migração histórica de chamadas.' }, { status: 500 });
  }
}

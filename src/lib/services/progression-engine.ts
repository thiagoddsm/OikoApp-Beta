import { AcademicEnrollment, AcademicEvent } from '../programs/enrollment-types';
import { TeachingTrack } from '../programs/track-types';

export interface PromotionResult {
  promotedCount: number;
  newEnrollments: AcademicEnrollment[];
  updatedEnrollments: AcademicEnrollment[];
}

/**
 * Checks if a student satisfies all prerequisites for a target course.
 */
export function checkCoursePrerequisitesSatisfied(params: {
  studentEnrollments: AcademicEnrollment[];
  prerequisiteCourseIds?: string[];
}): { satisfied: boolean; missingCourseIds: string[] } {
  const { studentEnrollments, prerequisiteCourseIds = [] } = params;

  if (prerequisiteCourseIds.length === 0) {
    return { satisfied: true, missingCourseIds: [] };
  }

  const completedCourseIds = new Set(
    studentEnrollments
      .filter(e => e.status === 'concluida' || e.status === 'promovida')
      .map(e => e.courseId)
  );

  const missingCourseIds = prerequisiteCourseIds.filter(id => !completedCourseIds.has(id));

  return {
    satisfied: missingCourseIds.length === 0,
    missingCourseIds
  };
}

/**
 * Promotes an entire cohort class to a target next class/level in 1 click.
 */
export function promoteClassCohort(params: {
  currentEnrollments: AcademicEnrollment[];
  targetClassId: string;
  targetCourseId: string;
  targetClassName: string;
  promotedByUserId: string;
  promotedByUserName?: string;
  observation?: string;
}): PromotionResult {
  const {
    currentEnrollments,
    targetClassId,
    targetCourseId,
    targetClassName,
    promotedByUserId,
    promotedByUserName,
    observation
  } = params;

  const nowIso = new Date().toISOString();
  const updatedEnrollments: AcademicEnrollment[] = [];
  const newEnrollments: AcademicEnrollment[] = [];

  currentEnrollments.forEach(oldEnrollment => {
    if (oldEnrollment.status !== 'ativa') return;

    // 1. Log promotion event on old enrollment
    const promoEvent: AcademicEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      eventType: 'PROMOTED',
      fromClassId: oldEnrollment.classId,
      toClassId: targetClassId,
      date: nowIso,
      byUserId: promotedByUserId,
      byUserName: promotedByUserName,
      observation: observation || `Promovido para a turma ${targetClassName}`
    };

    const updatedOld: AcademicEnrollment = {
      ...oldEnrollment,
      status: 'promovida',
      completedAt: nowIso,
      events: [...(oldEnrollment.events || []), promoEvent]
    };
    updatedEnrollments.push(updatedOld);

    // 2. Create new active enrollment for target level/class
    const enrolledEvent: AcademicEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      eventType: 'ENROLLED',
      fromClassId: oldEnrollment.classId,
      toClassId: targetClassId,
      date: nowIso,
      byUserId: promotedByUserId,
      byUserName: promotedByUserName,
      observation: `Matrícula gerada via promoção de turma`
    };

    const newEnrollment: AcademicEnrollment = {
      id: `enr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      tenantId: oldEnrollment.tenantId,
      studentId: oldEnrollment.studentId,
      studentName: oldEnrollment.studentName,
      studentEmail: oldEnrollment.studentEmail,
      programId: oldEnrollment.programId,
      academicCycleId: oldEnrollment.academicCycleId,
      trackId: oldEnrollment.trackId,
      courseId: targetCourseId,
      classId: targetClassId,
      status: 'ativa',
      enrolledAt: nowIso,
      financial: oldEnrollment.financial ? { ...oldEnrollment.financial } : undefined,
      events: [enrolledEvent]
    };
    newEnrollments.push(newEnrollment);
  });

  return {
    promotedCount: updatedEnrollments.length,
    newEnrollments,
    updatedEnrollments
  };
}

export interface DisClassSession {
  id: string;
  classId: string;
  className: string;
  courseId: string;
  courseName: string;
  cycle?: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  moduleId?: string;
  moduleTitle?: string;
  teacherId?: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  isExtraSession?: boolean;
  isMakeupOnly?: boolean;
}

/**
 * Calculates resolved sessions for a DIS class based on schedule, overrides, holidays and syllabus modules.
 */
export function getResolvedDisSessions(classData: any, courseData?: any): DisClassSession[] {
  if (!classData) return [];

  const sessions: DisClassSession[] = [];
  const syllabus = courseData?.syllabus || [];
  const startDate = classData.startDate;
  const endDate = classData.endDate || startDate;

  if (!startDate) return [];

  const start = new Date(startDate);
  const end = new Date(endDate);
  const holidays = new Set(classData.holidayDates || []);
  let moduleIndex = 0;

  let current = new Date(start);
  while (current <= end && current <= new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)) {
    const dateStr = current.toISOString().split('T')[0];

    // Check holiday
    if (!holidays.has(dateStr)) {
      const moduleItem = syllabus[moduleIndex] || { id: `mod_${moduleIndex + 1}`, title: `Aula ${moduleIndex + 1}` };

      const override = classData.scheduleOverrides?.[dateStr];
      const isCancelled = override?.status === 'cancelled';

      sessions.push({
        id: `${classData.id}_${dateStr}`,
        classId: classData.id,
        className: classData.name || 'Turma DIS',
        courseId: classData.courseId,
        courseName: courseData?.name || 'Curso DIS',
        cycle: classData.cycle,
        dateStr,
        startTime: override?.startTime || classData.startTime || '19:00',
        endTime: override?.endTime || classData.endTime || '21:00',
        moduleId: moduleItem.id,
        moduleTitle: moduleItem.title,
        teacherId: override?.teacherId || classData.teacherId,
        status: isCancelled ? 'cancelled' : 'scheduled'
      });

      if (!isCancelled) {
        moduleIndex++;
      }
    }

    // Advance 7 days if weekly, 14 if biweekly, 1 day if single
    const daysToAdd = classData.frequency === 'quinzenal' ? 14 : classData.frequency === 'semanal' ? 7 : 1;
    current.setDate(current.getDate() + daysToAdd);
  }

  // Include Extra Sessions if specified
  if (Array.isArray(classData.extraSessions)) {
    classData.extraSessions.forEach((extra: any) => {
      sessions.push({
        id: `${classData.id}_${extra.date}_extra`,
        classId: classData.id,
        className: classData.name || 'Turma DIS',
        courseId: classData.courseId,
        courseName: courseData?.name || 'Curso DIS',
        cycle: classData.cycle,
        dateStr: extra.date,
        startTime: extra.startTime || '19:00',
        endTime: extra.endTime || '21:00',
        moduleId: extra.syllabusId || 'extra',
        moduleTitle: 'Aula Extra / Reposição',
        teacherId: classData.teacherId,
        status: 'scheduled',
        isExtraSession: true,
        isMakeupOnly: Boolean(extra.isRepositionOnly)
      });
    });
  }

  return sessions.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}

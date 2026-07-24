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

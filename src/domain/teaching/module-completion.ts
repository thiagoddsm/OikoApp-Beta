import { getModuleIndexForDate } from '@/contexts/volunteering-context';

export interface ModuleCompletionResult {
  isDone: boolean;
  isRepo: boolean;
  isOnline: boolean;
  isManual: boolean;
  data?: any;
}

export interface ModuleCompletionParams {
  studentId: string;
  studentEmail?: string;
  studentJourney?: any;
  course: any;
  modIndex: number;
  modId: string | number;
  modules: any[];
  courseClasses: any[];
  quizAttempts?: any[];
  isMembership?: boolean;
}

/**
 * Funções auxiliares de checagem isolada por tipo de regra
 */
export function hasAttendance(params: ModuleCompletionParams): any {
  const { studentId, modIndex, course, courseClasses } = params;
  const studentClass = courseClasses.find(c => c.students?.includes(studentId));
  if (!studentClass) return null;

  return studentClass.attendance?.find((att: any) => {
    const isPresent = att.presentStudentIds?.includes(studentId) || att.onlineStudentIds?.includes(studentId);
    if (!isPresent) return false;
    const dateModIndex = getModuleIndexForDate(att.date, studentClass, course?.syllabus || []);
    return dateModIndex === modIndex;
  }) || null;
}

export function hasReposition(params: ModuleCompletionParams, hasRegularAttendance: boolean): any {
  if (hasRegularAttendance) return null;
  const { studentId, modIndex, course, courseClasses } = params;
  const otherClasses = courseClasses.filter(c => !c.students?.includes(studentId));

  for (const otherClass of otherClasses) {
    const foundAtt = otherClass.attendance?.find((att: any) => {
      if (getModuleIndexForDate(att.date, otherClass, course?.syllabus || []) === modIndex) {
        return att.repositions?.some((r: any) => r.studentId === studentId);
      }
      return false;
    });
    if (foundAtt) return foundAtt;
  }

  return null;
}

export function hasTheoflixCompletion(params: ModuleCompletionParams): boolean {
  const { studentId, studentEmail, studentJourney, course, modIndex, modules, quizAttempts } = params;
  const moduleTheoflixId = modules[modIndex]?.theoflixCourseId;
  const targetTheoflixIds = [
    course?.id,
    course?.linkedTheoflixId,
    moduleTheoflixId
  ].filter(Boolean) as string[];

  const currentModTitle = (modules[modIndex]?.title || '').toLowerCase().trim();

  // A. Checar Quizzes Aprovados
  const hasApprovedQuiz = targetTheoflixIds.length > 0 && quizAttempts?.some((att: any) => {
    const matchesUser = att.userId === studentId || (att.userEmail && studentEmail && att.userEmail.toLowerCase() === studentEmail.toLowerCase());
    if (!matchesUser || att.approved === false) return false;

    const attCourseId = (att.courseId || '').toLowerCase();
    const matchesCourse = targetTheoflixIds.some(id => id && attCourseId === id.toLowerCase());
    if (!matchesCourse) return false;

    const attSyllabusId = att.syllabusId || att.episodeSyllabusId;
    const targetSyllabusId = modules[modIndex]?.id;

    if (attSyllabusId && targetSyllabusId && attSyllabusId === targetSyllabusId) {
      return true;
    }

    if (moduleTheoflixId && attCourseId === moduleTheoflixId.toLowerCase()) {
      return true;
    }

    const attEpTitle = (att.episodeTitle || '').toLowerCase().trim();
    if (currentModTitle && attEpTitle && currentModTitle === attEpTitle) {
      return true;
    }

    return false;
  });

  // B. Checar Progresso com Agregação (every)
  const hasTheoflixUserProgress = targetTheoflixIds.length > 0 && targetTheoflixIds.some(tId => {
    if (!tId) return false;
    const currentMod = modules[modIndex] as any;
    const targetSyllabusId = currentMod?.id;

    const requiredVideoIds = currentMod?.theoflixRequiredVideoIds as string[] | undefined;
    if (requiredVideoIds && requiredVideoIds.length > 0) {
      const attMap = studentJourney?.theoflixAttendance?.[tId] || studentJourney?.theoflixAttendance?.[tId.toLowerCase()];
      const progMap = studentJourney?.theoflixProgress?.[tId] || studentJourney?.theoflixProgress?.[tId.toLowerCase()];

      return requiredVideoIds.every(vId => {
        const isAttDone = attMap?.[vId] === true || attMap?.[`module${parseInt(vId) + 1}`] === true;
        const isProgDone = progMap && typeof progMap === 'object' && (progMap[vId] === true || Object.keys(progMap).some(k => k.includes(vId)));
        return isAttDone || isProgDone;
      });
    }

    const attMap = studentJourney?.theoflixAttendance?.[tId] || studentJourney?.theoflixAttendance?.[tId.toLowerCase()];
    if (attMap) {
      if (targetSyllabusId && attMap[targetSyllabusId] === true) return true;
      if (moduleTheoflixId && attMap[moduleTheoflixId] === true) return true;
    }

    const progMap = studentJourney?.theoflixProgress?.[tId] || studentJourney?.theoflixProgress?.[tId.toLowerCase()];
    if (progMap && typeof progMap === 'object') {
      if (targetSyllabusId && progMap[targetSyllabusId] === true) return true;
      if (moduleTheoflixId && progMap[moduleTheoflixId] === true) return true;
    }
    return false;
  });

  return Boolean(hasApprovedQuiz || hasTheoflixUserProgress);
}

export function hasManualApproval(params: ModuleCompletionParams): boolean {
  const { studentJourney, isMembership, modId, course } = params;
  return isMembership 
    ? !!(studentJourney?.memberCourseProgress?.[`module${modId}`]) 
    : !!(studentJourney?.courseProgress?.[course?.id]?.[`module${modId}`]);
}

/**
 * Função principal pura de avaliação do módulo
 */
export function getModuleCompletion(params: ModuleCompletionParams): ModuleCompletionResult {
  const regularAttendance = hasAttendance(params);
  const repositionAttendance = hasReposition(params, Boolean(regularAttendance));
  const isTheoflixEadDone = hasTheoflixCompletion(params);
  const isManualDone = hasManualApproval(params);

  const isRegularDone = Boolean(regularAttendance);
  const isOnlineAttendance = Boolean(regularAttendance?.isOnline);
  const isOnlineDone = Boolean(isTheoflixEadDone || isOnlineAttendance);

  return {
    isDone: !!(isRegularDone || repositionAttendance || isTheoflixEadDone || isManualDone),
    isRepo: !!(!isRegularDone && repositionAttendance),
    isOnline: isOnlineDone,
    isManual: !!(isManualDone && !isRegularDone && !repositionAttendance && !isOnlineDone),
    data: regularAttendance || repositionAttendance
  };
}

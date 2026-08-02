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
 * Evaluators de requisitos de módulo (Requirement Evaluators)
 */
export function evaluateAttendanceRequirement(params: ModuleCompletionParams): any {
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

export function evaluateRepositionRequirement(params: ModuleCompletionParams, hasRegularAttendance: boolean): any {
  if (hasRegularAttendance) return null;
  const { studentId, modIndex, course, courseClasses } = params;
  const otherClasses = courseClasses.filter(c => !c.students?.includes(studentId));

  for (const otherClass of otherClasses) {
    const foundAtt = otherClass.attendance?.find((att: any) => {
      if (getModuleIndexForDate(att.date, otherClass, course?.syllabus || []) === modIndex) {
        const isPresentInOther = att.presentStudentIds?.includes(studentId) || att.onlineStudentIds?.includes(studentId);
        const isExplicitRepo = att.repositions?.some((r: any) => r.studentId === studentId);
        return isPresentInOther || isExplicitRepo;
      }
      return false;
    });
    if (foundAtt) return foundAtt;
  }

  return null;
}

export function evaluateTheoflixRequirement(params: ModuleCompletionParams): boolean {
  const { studentId, studentEmail, studentJourney, course, modIndex, modules, quizAttempts } = params;
  const moduleTheoflixId = modules[modIndex]?.theoflixCourseId;
  const targetTheoflixIds = [
    course?.id,
    course?.linkedTheoflixId,
    course?.name,
    course?.ebdTrack,
    moduleTheoflixId,
    'crescer',
    'discipular'
  ].filter(Boolean).map(id => String(id).toLowerCase().trim());

  const currentModTitle = (modules[modIndex]?.title || '').toLowerCase().trim();
  const currentModDesc = (modules[modIndex]?.description || '').toLowerCase().trim();

  // A. Checar Quizzes Aprovados
  const hasApprovedQuiz = targetTheoflixIds.length > 0 && quizAttempts?.some((att: any) => {
    const matchesUser = att.userId === studentId || (att.userEmail && studentEmail && att.userEmail.toLowerCase() === studentEmail.toLowerCase());
    if (!matchesUser || att.approved === false) return false;

    const attCourseId = (att.courseId || '').toLowerCase().trim();
    const matchesCourse = targetTheoflixIds.some(id => id && (attCourseId === id || id.includes(attCourseId) || attCourseId.includes(id)));
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
    if (currentModTitle && attEpTitle && (currentModTitle.includes(attEpTitle) || attEpTitle.includes(currentModTitle))) {
      return true;
    }

    if (currentModDesc && attEpTitle && currentModDesc.includes(attEpTitle)) {
      return true;
    }

    // Match por indice de aula (ex: Aula 1 -> modIndex 0)
    if (att.episodeIndex !== undefined && Number(att.episodeIndex) === modIndex) {
      return true;
    }
    if (att.moduleIndex !== undefined && Number(att.moduleIndex) === modIndex) {
      return true;
    }
    if (modIndex === 0 && (attEpTitle.includes('aula 1') || attEpTitle.includes('aula 01') || attEpTitle.includes('ponto de partida') || attEpTitle.includes('identidade'))) {
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

export function evaluateManualApprovalRequirement(params: ModuleCompletionParams): boolean {
  const { studentJourney, isMembership, modId, course } = params;
  
  // 1. Nova Fonte de Verdade: retroactiveApprovals
  const key = isMembership ? `module${modId}` : `${course?.id}_module${modId}`;
  const isRetroactiveApproved = !!(
    studentJourney?.retroactiveApprovals?.[key] ||
    studentJourney?.retroactiveApprovals?.[`module${modId}`] ||
    studentJourney?.retroactiveApprovals?.[modId]
  );
  if (isRetroactiveApproved) return true;

  // 2. Fallback de Segurança Legado (Preservado para dados antigos do Eklesia/Histórico)
  return isMembership 
    ? !!(studentJourney?.memberCourseProgress?.[`module${modId}`] || studentJourney?.memberCourseProgress?.[modId]) 
    : !!(studentJourney?.courseProgress?.[course?.id]?.[`module${modId}`] || studentJourney?.courseProgress?.[course?.id]?.[modId]);
}

// Aliases para retrocompatibilidade
export const hasAttendance = evaluateAttendanceRequirement;
export const hasReposition = evaluateRepositionRequirement;
export const hasTheoflixCompletion = evaluateTheoflixRequirement;
export const hasManualApproval = evaluateManualApprovalRequirement;

/**
 * Orquestrador Principal do Domínio de Ensino
 */
export function getModuleCompletion(params: ModuleCompletionParams): ModuleCompletionResult {
  const regularAttendance = evaluateAttendanceRequirement(params);
  const repositionAttendance = evaluateRepositionRequirement(params, Boolean(regularAttendance));
  const isTheoflixEadDone = evaluateTheoflixRequirement(params);
  const isManualDone = evaluateManualApprovalRequirement(params);

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

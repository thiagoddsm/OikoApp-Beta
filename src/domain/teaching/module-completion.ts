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

  for (const aClass of courseClasses) {
    const foundAtt = aClass.attendance?.find((att: any) => {
      // 1. Checar se a data bate com o modIndex desta turma (presença direta ou repo explícita)
      const dateModIndex = getModuleIndexForDate(att.date, aClass, course?.syllabus || []);
      const isPresent = att.presentStudentIds?.includes(studentId) || att.onlineStudentIds?.includes(studentId);
      const isExplicitRepo = att.repositions?.some((r: any) => r.studentId === studentId);

      if (dateModIndex === modIndex && (isPresent || isExplicitRepo)) {
        return true;
      }

      // 2. Checar se há reposição explícita com moduleIndex ou syllabusId apontando para este módulo
      // Bug #1 fix: retorna false explicitamente quando repoForMod não existe,
      // evitando que o .find() continue iterando e retorne um att de data diferente.
      const repoForMod = att.repositions?.find((r: any) => {
        if (r.studentId !== studentId) return false;
        if (r.moduleIndex !== undefined && Number(r.moduleIndex) === modIndex) return true;
        if (r.syllabusId && course?.syllabus) {
          const sIdx = course.syllabus.findIndex((s: any) => s.id === r.syllabusId);
          if (sIdx === modIndex) return true;
        }
        return false;
      });

      if (repoForMod) return true;

      // Nenhuma condição satisfeita para este registro — continuar o .find()
      return false;
    });

    if (foundAtt) return foundAtt;

    // 3. Checar extraSessions desta turma
    const repoSessions = (aClass.extraSessions || []).filter((s: any) => s.isRepositionOnly);
    for (const rs of repoSessions) {
      const rsModIndex = rs.syllabusId 
        ? (course?.syllabus || []).findIndex((item: any) => item.id === rs.syllabusId)
        : -1;
      if (rsModIndex !== -1 && rsModIndex !== modIndex) continue;

      const rsStr = rs.startTime ? `${rs.date}T${rs.startTime}` : `${rs.date}-extra`;
      const rsAtt = (aClass.attendance || []).find((a: any) => a.date === rsStr || a.date === rs.date || a.date?.startsWith(rs.date));
      if (rsAtt?.presentStudentIds?.includes(studentId) || rsAtt?.onlineStudentIds?.includes(studentId) || rsAtt?.repositions?.some((r: any) => r.studentId === studentId)) {
        return rsAtt;
      }
    }
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
    moduleTheoflixId
  ].filter(Boolean).map(id => String(id).toLowerCase().trim());

  if (targetTheoflixIds.length === 0) return false;

  const currentModTitle = (modules[modIndex]?.title || '').toLowerCase().trim();
  const currentModDesc = (modules[modIndex]?.description || '').toLowerCase().trim();

  // A. Checar Quizzes Aprovados
  const hasApprovedQuiz = quizAttempts?.some((att: any) => {
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

    const attEpTitle = (att.episodeTitle || '').toLowerCase().trim();
    if (currentModTitle && attEpTitle && (currentModTitle.includes(attEpTitle) || attEpTitle.includes(currentModTitle))) {
      return true;
    }

    if (currentModDesc && attEpTitle && currentModDesc.includes(attEpTitle)) {
      return true;
    }

    if (att.episodeIndex !== undefined && Number(att.episodeIndex) === modIndex) {
      return true;
    }
    if (att.moduleIndex !== undefined && Number(att.moduleIndex) === modIndex) {
      return true;
    }

    return false;
  });

  if (hasApprovedQuiz) return true;

  // B. Checar Progresso do Usuário no TheoFlix
  const hasTheoflixUserProgress = targetTheoflixIds.some(tId => {
    if (!tId) return false;
    const currentMod = modules[modIndex] as any;
    const targetSyllabusId = currentMod?.id;
    const modIdxStr1 = modIndex.toString();

    const requiredVideoIds = currentMod?.theoflixRequiredVideoIds as string[] | undefined;
    if (requiredVideoIds && requiredVideoIds.length > 0) {
      const attMap = studentJourney?.theoflixAttendance?.[tId] || studentJourney?.theoflixAttendance?.[tId.toLowerCase()];
      const progMap = studentJourney?.theoflixProgress?.[tId] || studentJourney?.theoflixProgress?.[tId.toLowerCase()];

      return requiredVideoIds.every(vId => {
        const isYoutubeId = !/^\d+$/.test(vId);
        if (isYoutubeId) {
          const isAttDone = attMap?.[vId] === true;
          const isProgDone = progMap && typeof progMap === 'object' && (
            progMap[vId] === true || 
            progMap[vId]?.completed === true
          );
          return isAttDone || isProgDone;
        }

        const modNumStr = (parseInt(vId) + 1).toString();
        const isAttDone = attMap?.[vId] === true || attMap?.[modNumStr] === true || attMap?.[`module${modNumStr}`] === true;
        const isProgDone = progMap && typeof progMap === 'object' && (
          progMap[vId] === true || 
          progMap[vId]?.completed === true || 
          (currentMod?.youtubeId && progMap[currentMod.youtubeId]?.completed === true)
        );
        return isAttDone || isProgDone;
      });
    }

    const attMap = studentJourney?.theoflixAttendance?.[tId] || studentJourney?.theoflixAttendance?.[tId.toLowerCase()];
    if (attMap && typeof attMap === 'object') {
      if (targetSyllabusId && attMap[targetSyllabusId] === true) return true;
      const episodeYoutubeId = (currentMod as any)?.youtubeId;
      if (episodeYoutubeId && attMap[episodeYoutubeId] === true) return true;
      if (attMap[modIdxStr1] === true || attMap[`module${modIndex + 1}`] === true) return true;
    }

    const progMap = studentJourney?.theoflixProgress?.[tId] || studentJourney?.theoflixProgress?.[tId.toLowerCase()];
    if (progMap && typeof progMap === 'object') {
      if (targetSyllabusId && (progMap[targetSyllabusId] === true || progMap[targetSyllabusId]?.completed === true)) return true;
      const episodeYoutubeId = (currentMod as any)?.youtubeId;
      if (episodeYoutubeId && (progMap[episodeYoutubeId] === true || progMap[episodeYoutubeId]?.completed === true)) return true;
      if (progMap[modIdxStr1] === true || progMap[modIdxStr1]?.completed === true || progMap[`module${modIndex + 1}`] === true) return true;
    }
    return false;
  });

  return Boolean(hasApprovedQuiz || hasTheoflixUserProgress);
}

export function evaluateManualApprovalRequirement(params: ModuleCompletionParams): boolean {
  const { studentJourney, isMembership, modId, course } = params;
  if (!modId) return false;

  const rawModIdStr = modId.toString();
  const cleanModId = rawModIdStr.startsWith('module') ? rawModIdStr.replace(/^module/, '') : rawModIdStr;
  
  if (isMembership) {
    const isRetroactiveApproved = !!(
      studentJourney?.retroactiveApprovals?.[`module${cleanModId}`] ||
      studentJourney?.retroactiveApprovals?.[cleanModId] ||
      studentJourney?.retroactiveApprovals?.[rawModIdStr] ||
      studentJourney?.retroactiveApprovals?.[`pertencer_module${cleanModId}`] ||
      studentJourney?.retroactiveApprovals?.[`membros_module${cleanModId}`] ||
      studentJourney?.retroactiveApprovals?.[`pertencer_${rawModIdStr}`] ||
      studentJourney?.retroactiveApprovals?.[`membros_${rawModIdStr}`]
    );
    if (isRetroactiveApproved) return true;

    return !!(
      studentJourney?.memberCourseProgress?.[`module${cleanModId}`] || 
      studentJourney?.memberCourseProgress?.[cleanModId] ||
      studentJourney?.memberCourseProgress?.[rawModIdStr]
    );
  }

  // Curso Regular (ex: Discipular, etc.)
  const courseId = course?.id;
  if (!courseId) return false;

  const isRetroactiveApproved = !!(
    studentJourney?.retroactiveApprovals?.[`${courseId}_module${cleanModId}`] ||
    studentJourney?.retroactiveApprovals?.[`${courseId}_${cleanModId}`] ||
    studentJourney?.retroactiveApprovals?.[`${courseId}_${rawModIdStr}`]
  );
  if (isRetroactiveApproved) return true;

  return !!(
    studentJourney?.courseProgress?.[courseId]?.[`module${cleanModId}`] || 
    studentJourney?.courseProgress?.[courseId]?.[cleanModId] ||
    studentJourney?.courseProgress?.[courseId]?.[rawModIdStr]
  );
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

  const isOnlineAttendance = Boolean(regularAttendance && Array.isArray(regularAttendance.onlineStudentIds) && regularAttendance.onlineStudentIds.includes(params.studentId));
  const isPresentAttendance = Boolean(regularAttendance && Array.isArray(regularAttendance.presentStudentIds) && regularAttendance.presentStudentIds.includes(params.studentId));
  
  const isRegularDone = Boolean(isPresentAttendance || isOnlineAttendance);
  const isOnlineDone = Boolean(!isPresentAttendance && (isTheoflixEadDone || isOnlineAttendance));

  return {
    isDone: !!(isRegularDone || repositionAttendance || isTheoflixEadDone || isManualDone),
    isRepo: !!(!isRegularDone && repositionAttendance),
    isOnline: isOnlineDone,
    isManual: !!(isManualDone && !isRegularDone && !repositionAttendance && !isOnlineDone),
    data: regularAttendance || repositionAttendance
  };
}

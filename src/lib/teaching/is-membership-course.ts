/**
 * Utilitário centralizado para detectar se um curso é um "Curso de Membros/Pertencer".
 * Suporta flag explícita (grantsMembership / isMembershipPrerequisite) e fallback textual retrocompatível.
 */
export function isMembershipCourse(course: any): boolean {
  if (!course) return false;

  // 1. Verificação explícita prioritária
  if (course.grantsMembership === true || course.isMembershipPrerequisite === true) {
    return true;
  }
  if (course.grantsMembership === false && course.isMembershipPrerequisite === false) {
    return false;
  }

  // 2. Fallbacks textuais históricos (retrocompatibilidade)
  const id = (course.id || '').toLowerCase();
  const name = (course.name || '').toLowerCase();
  const linkedTheoflixId = (course.linkedTheoflixId || '').toLowerCase();
  const schoolId = (course.schoolId || '').toLowerCase();
  const programId = (course.programId || '').toLowerCase();
  const ministry = (course.ministry || '').toLowerCase();
  const ministryName = (course.ministryName || '').toLowerCase();

  return (
    id === 'pertencer' ||
    id === 'membros' ||
    linkedTheoflixId === 'membros' ||
    schoolId === 'lumine' ||
    programId === 'lumine' ||
    /^(pertencer|curso de membro|curso para novos membros|membros|membresia)/i.test(name) ||
    ministryName.includes('lumine') ||
    ministryName.includes('ebd') ||
    ministry.includes('lumine')
  );
}

/**
 * Verifica se um usuário já concluiu qualquer curso de membresia (equivalência de ciclo anterior)
 * ou se já possui status oficial de membro consolidado.
 */
export function hasCompletedMembershipCourse(user: any, allCourses: any[] = []): boolean {
  if (!user) return false;

  // Se já é membro oficial da igreja
  if (user.integrationStatus === 'membro' || user.isMember === true || user.membroAntigo === 'sim') {
    return true;
  }

  // Verifica status dos cursos na jornada
  const courseStatus = user.journey?.courseStatus || {};
  for (const [cId, status] of Object.entries(courseStatus)) {
    const s = String(status || '').toLowerCase();
    if (s === 'approved' || s === 'completed' || s === 'apto') {
      if (cId === 'pertencer' || cId === 'membros') return true;
      const courseObj = allCourses.find(c => c.id === cId);
      if (courseObj && isMembershipCourse(courseObj)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Verifica se o pré-requisito de um curso está satisfeito pelo usuário,
 * aplicando equivalência inteligente caso o pré-requisito seja um curso de membresia.
 */
export function isPrerequisiteSatisfied(
  targetCourse: any, 
  user: any, 
  allCourses: any[] = []
): { satisfied: boolean; prerequisiteCourseName?: string } {
  if (!targetCourse?.prerequisiteCourseId) {
    return { satisfied: true };
  }

  const prereqCourse = allCourses.find(c => c.id === targetCourse.prerequisiteCourseId);
  const prereqName = prereqCourse?.name || (prereqCourse as any)?.title || 'Pré-requisito';

  if (!user) {
    return { satisfied: false, prerequisiteCourseName: prereqName };
  }

  const courseStatus = user.journey?.courseStatus || {};

  // 1. Se tem aprovação direta no ID exato do pré-requisito
  const exactStatus = String(courseStatus[targetCourse.prerequisiteCourseId] || '').toLowerCase();
  if (exactStatus === 'approved' || exactStatus === 'completed' || exactStatus === 'apto') {
    return { satisfied: true, prerequisiteCourseName: prereqName };
  }

  // 2. Regra de equivalência de Membresia: Se o pré-requisito for um curso de membros/pertencer,
  // aceita caso o aluno já tenha feito qualquer versão do Pertencer ou já seja membro oficial.
  if (prereqCourse && isMembershipCourse(prereqCourse)) {
    if (hasCompletedMembershipCourse(user, allCourses)) {
      return { satisfied: true, prerequisiteCourseName: prereqName };
    }
  }

  return { satisfied: false, prerequisiteCourseName: prereqName };
}

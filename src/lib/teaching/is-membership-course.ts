/**
 * Utilitário centralizado para detectar se um curso é um "Curso de Membros/Pertencer".
 * Usar em todos os componentes para garantir critério único e consistente.
 */
export function isMembershipCourse(course: any): boolean {
  if (!course) return false;
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

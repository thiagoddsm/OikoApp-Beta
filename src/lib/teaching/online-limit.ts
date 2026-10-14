export type OnlineCreditReason = 'in_person_only' | 'online_limit';

export interface OnlineCreditResult {
  allowed: boolean;
  reason?: OnlineCreditReason;
  onlineCount: number;
  maxAllowed: number;
  totalLessons: number;
}

/**
 * Decide se uma NOVA aula assistida online (TheoFlix) pode gerar presença para o aluno,
 * de acordo com a política de modalidade do curso/turma.
 *
 * - Sem turma física / política flexível ou online-only: sempre permitido.
 * - Exceção aprovada pela coordenação: sempre permitido.
 * - Somente presencial: bloqueado.
 * - Híbrido: bloqueado quando as aulas online já creditadas atingiram o máximo permitido
 *   (maxPercentage do curso, padrão 50%, aplicado sobre o total de aulas do curso).
 *
 * `alreadyCredited` evita bloquear quem apenas reassiste uma aula que já tinha crédito.
 */
export function evaluateOnlineCredit(params: {
  classData?: any | null;
  courseData?: any | null;
  studentId: string;
  alreadyCredited?: boolean;
}): OnlineCreditResult {
  const { classData, courseData, studentId, alreadyCredited } = params;

  const open: OnlineCreditResult = { allowed: true, onlineCount: 0, maxAllowed: Infinity, totalLessons: 0 };
  if (!classData || !courseData || alreadyCredited) return open;

  const policy = classData.attendancePolicyOverride || courseData.attendancePolicy;
  const mode = policy?.mode || 'flexible';
  if (mode !== 'hybrid' && mode !== 'in_person_only') return open;

  if (classData.onlineExceptions?.[studentId]?.status === 'approved') return open;

  const records: any[] = classData.attendance || [];
  const onlineCount = records.filter(
    (a) => a?.onlineStudentIds?.includes(studentId) && !a?.presentStudentIds?.includes(studentId)
  ).length;

  const totalLessons = courseData.syllabus?.length || records.length || 0;

  if (mode === 'in_person_only') {
    return { allowed: false, reason: 'in_person_only', onlineCount, maxAllowed: 0, totalLessons };
  }

  const maxPct = policy?.online?.maxPercentage ?? 50;
  const maxAllowed = Math.floor((totalLessons * maxPct) / 100);

  if (onlineCount >= maxAllowed) {
    return { allowed: false, reason: 'online_limit', onlineCount, maxAllowed, totalLessons };
  }
  return { allowed: true, onlineCount, maxAllowed, totalLessons };
}

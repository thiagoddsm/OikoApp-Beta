import { type Class, type Course, type CourseAttendancePolicy, type OnlineException } from '@/contexts/volunteering-context';

export type AttendanceStatus =
  | 'eligible'                      // Frequência total atingida e atende à política de modalidades (em andamento)
  | 'approved'                      // Frequência total atingida e atende à política de modalidades (turma concluída)
  | 'insufficient_attendance'       // Frequência total abaixo do mínimo exigido pelo curso
  | 'exceeds_online_limit'          // Frequência total ok, mas excedeu o limite máximo de aulas online
  | 'exceeds_in_person_limit'       // Frequência total ok, mas não atingiu o mínimo de aulas presenciais
  | 'exception_pending'             // Fora da política de modalidade, com exceção aguardando aprovação
  | 'exception_approved'            // Fora da política de modalidade, com exceção aprovada pela coordenação
  | 'exception_rejected';           // Fora da política de modalidade, com exceção rejeitada

export interface AttendanceEvaluation {
  studentId: string;
  totalLessons: number;
  lessonsConducted: number;
  inPersonCount: number;
  onlineCount: number;
  repositionsCount: number;
  totalPresent: number;
  absencesCount: number;

  totalRate: number;      // % Frequência Total sobre aulas realizadas
  onlineRate: number;     // % Frequência Online sobre aulas realizadas
  inPersonRate: number;   // % Frequência Presencial sobre aulas realizadas
  absencesRate: number;   // % Faltas sobre aulas realizadas

  minimumAttendanceRequired: number;
  meetsMinimumAttendance: boolean;

  meetsOnlinePolicy: boolean;
  meetsInPersonPolicy: boolean;
  meetsModePolicy: boolean;

  hasException: boolean;
  exception?: OnlineException;
  hasApprovedException: boolean;

  eligible: boolean;      // meetsMinimumAttendance && (meetsModePolicy || hasApprovedException)
  status: AttendanceStatus;
  statusLabel: string;
  statusDescription: string;
  statusBadgeVariant: 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' | 'info';
}

export interface EvaluateStudentAttendanceParams {
  classData: Class;
  courseData?: Course | null;
  studentId: string;
  validSessionDates?: string[]; // Datas das aulas válidas no cronograma
  isLessonDateInRange?: (dateStr: string) => boolean; // Filtro opcional por período
  exception?: OnlineException | null;
}

/**
 * Motor Único e Centralizador de Cálculo de Frequência e Política de Modalidades do Oiko
 */
export function evaluateStudentAttendance({
  classData,
  courseData,
  studentId,
  validSessionDates,
  isLessonDateInRange,
  exception
}: EvaluateStudentAttendanceParams): AttendanceEvaluation {
  // 1. Extração da Política de Frequência (com suporte a override na Turma)
  const policy: CourseAttendancePolicy = classData.attendancePolicyOverride || 
                                        courseData?.attendancePolicy || 
                                        { mode: 'flexible' };

  const minimumAttendanceRequired = (courseData?.minAttendanceApproval !== undefined && courseData?.minAttendanceApproval !== null)
    ? Number(courseData.minAttendanceApproval)
    : 75;

  const mode = policy.mode || 'flexible';

  // 2. Resolução das Aulas e Presenças
  let inPersonCount = 0;
  let onlineCount = 0;
  let repositionsCount = 0;
  let absencesCount = 0;
  let lessonsConducted = 0;

  const attendanceRecords = classData.attendance || [];
  const validDatesSet = validSessionDates ? new Set(validSessionDates) : null;

  attendanceRecords.forEach(att => {
    if (!att.date) return;
    if (validDatesSet && !validDatesSet.has(att.date)) return;
    if (isLessonDateInRange && !isLessonDateInRange(att.date)) return;

    lessonsConducted++;

    const isPresentPhysical = Array.isArray(att.presentStudentIds) && att.presentStudentIds.includes(studentId);
    const isPresentOnline = Array.isArray(att.onlineStudentIds) && att.onlineStudentIds.includes(studentId);
    const repoMatch = (att.repositions || []).find((r: any) => r.studentId === studentId);

    // REGRA DETERMINÍSTICA: No máximo 1 presença por aula por aluno
    if (isPresentPhysical) {
      inPersonCount++;
    } else if (isPresentOnline) {
      onlineCount++;
    } else if (repoMatch) {
      repositionsCount++;
      if ((repoMatch as any)?.type === 'online') {
        onlineCount++;
      } else {
        inPersonCount++;
      }
    } else {
      absencesCount++;
    }
  });

  const totalPresent = inPersonCount + onlineCount;
  const totalLessons = validSessionDates ? validSessionDates.length : Math.max(lessonsConducted, 1);

  // 3. Cálculo de Percentuais com Denominador Correto (Aulas Realizadas)
  const denominator = lessonsConducted > 0 ? lessonsConducted : 1;
  const totalRate = lessonsConducted > 0 ? Math.round((totalPresent / denominator) * 100) : 100;
  const onlineRate = lessonsConducted > 0 ? Math.round((onlineCount / denominator) * 100) : 0;
  const inPersonRate = lessonsConducted > 0 ? Math.round((inPersonCount / denominator) * 100) : 0;
  const absencesRate = lessonsConducted > 0 ? Math.round((absencesCount / denominator) * 100) : 0;

  // 4. Avaliação das Regras de Frequência Total
  const meetsMinimumAttendance = totalRate >= minimumAttendanceRequired;

  // 5. Avaliação da Política de Modalidades
  let meetsOnlinePolicy = true;
  let meetsInPersonPolicy = true;

  if (mode === 'in_person_only') {
    // Somente Presencial: online máximo = 0%
    meetsOnlinePolicy = onlineCount === 0;
    meetsInPersonPolicy = true;
  } else if (mode === 'online_only') {
    // Somente Online: 100% online permitido, presencial não exigido
    meetsOnlinePolicy = true;
    meetsInPersonPolicy = true;
  } else if (mode === 'flexible') {
    // Flexível: Qualquer proporção é aceita
    meetsOnlinePolicy = true;
    meetsInPersonPolicy = true;
  } else if (mode === 'hybrid') {
    // Híbrido: limites configuráveis
    const maxOnline = policy.online?.maxPercentage ?? 50;
    const minOnline = policy.online?.minPercentage ?? 0;
    const minInPerson = policy.inPerson?.minPercentage ?? 50;
    const maxInPerson = policy.inPerson?.maxPercentage ?? 100;

    meetsOnlinePolicy = onlineRate <= maxOnline && onlineRate >= minOnline;
    meetsInPersonPolicy = inPersonRate >= minInPerson && inPersonRate <= maxInPerson;
  }

  const meetsModePolicy = meetsOnlinePolicy && meetsInPersonPolicy;

  // 6. Resolução da Exceção
  const resolvedException = exception || classData.onlineExceptions?.[studentId] || undefined;
  const hasException = !!resolvedException;
  const exceptionStatus = resolvedException?.status;
  const hasApprovedException = exceptionStatus === 'approved';

  // 7. Determinação do Status e Elegibilidade
  // ATENÇÃO: A exceção NUNCA anula faltas (meetsMinimumAttendance é obrigatório)
  let status: AttendanceStatus = 'eligible';
  let statusLabel = 'Elegível';
  let statusDescription = 'Dentro das regras de frequência e modalidade';
  let statusBadgeVariant: 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' | 'info' = 'info';

  const isClassCompleted = classData.status === 'completed';

  if (!meetsMinimumAttendance) {
    status = 'insufficient_attendance';
    statusLabel = 'Frequência Insuficiente';
    statusDescription = `Frequência atual (${totalRate}%) abaixo do mínimo exigido (${minimumAttendanceRequired}%)`;
    statusBadgeVariant = 'destructive';
  } else if (meetsModePolicy) {
    if (isClassCompleted) {
      status = 'approved';
      statusLabel = 'Formado';
      statusDescription = 'Curso concluído com sucesso';
      statusBadgeVariant = 'success';
    } else {
      status = 'eligible';
      statusLabel = 'Elegível';
      statusDescription = 'Dentro das metas de presença e modalidade';
      statusBadgeVariant = 'info';
    }
  } else {
    // Não atende à política de modalidade
    if (hasApprovedException) {
      status = 'exception_approved';
      statusLabel = 'Aprovado por Exceção';
      statusDescription = 'Exceção de modalidade online/presencial aprovada pela coordenação';
      statusBadgeVariant = 'success';
    } else if (exceptionStatus === 'pending') {
      status = 'exception_pending';
      statusLabel = 'Exceção Pendente';
      statusDescription = 'Solicitação de exceção aguardando análise da coordenação';
      statusBadgeVariant = 'warning';
    } else if (exceptionStatus === 'rejected') {
      status = 'exception_rejected';
      statusLabel = 'Exceção Rejeitada';
      statusDescription = 'Solicitação de exceção rejeitada pela coordenação';
      statusBadgeVariant = 'destructive';
    } else {
      if (!meetsOnlinePolicy) {
        status = 'exceeds_online_limit';
        statusLabel = 'Excede Limite Online';
        statusDescription = `Carga online (${onlineRate}%) acima do limite máximo permitido`;
        statusBadgeVariant = 'warning';
      } else {
        status = 'exceeds_in_person_limit';
        statusLabel = 'Presencial Insuficiente';
        statusDescription = `Carga presencial (${inPersonRate}%) abaixo do mínimo exigido`;
        statusBadgeVariant = 'warning';
      }
    }
  }

  const eligible = meetsMinimumAttendance && (meetsModePolicy || hasApprovedException);

  return {
    studentId,
    totalLessons,
    lessonsConducted,
    inPersonCount,
    onlineCount,
    repositionsCount,
    totalPresent,
    absencesCount,
    totalRate,
    onlineRate,
    inPersonRate,
    absencesRate,
    minimumAttendanceRequired,
    meetsMinimumAttendance,
    meetsOnlinePolicy,
    meetsInPersonPolicy,
    meetsModePolicy,
    hasException,
    exception: resolvedException,
    hasApprovedException,
    eligible,
    status,
    statusLabel,
    statusDescription,
    statusBadgeVariant
  };
}

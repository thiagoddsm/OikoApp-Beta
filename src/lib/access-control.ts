/**
 * access-control.ts
 * Engine central de verificação de permissões e controle de escopo hierárquico.
 * 
 * Regras:
 * - Admin / Pastor Sênior: Acesso total.
 * - Líder de GC, Líder em Treinamento, Secretário de GC: Acesso aos participantes do seu próprio GC.
 * - Líder de Área: Acesso aos seus Líderes de GC e métricas consolidadas da Área (sem devassar os membros comuns).
 * - Líder de Serviço / Voluntariado: Acesso total às ferramentas de escalas, voluntários e ordem de culto.
 * - Professor & Secretário de Curso: Acesso às turmas e alunos dos cursos em que estão vinculados.
 * - Membro / Visitante: Apenas seu próprio perfil.
 */

export type UserRole = 
  | 'admin'
  | 'pastor_senior'
  | 'pastor'
  | 'area_leader'
  | 'gc_leader'
  | 'gc_training_leader'
  | 'gc_secretary'
  | 'service_leader'
  | 'teacher'
  | 'course_secretary'
  | 'member'
  | 'visitor';

export interface UserAccessProfile {
  id: string;
  role?: UserRole | string;
  roles?: string[];
  cellId?: string;
  areaId?: string;
  redeId?: string;
  permissions?: string[];
}

const ADMIN_ROLES = new Set(['admin', 'pastor_senior', 'pastor', 'administrator', 'master']);

/**
 * Verifica se o usuário atual tem perfil administrativo / pastoral sênior.
 */
export function isAdminOrPastor(user: UserAccessProfile | null | undefined): boolean {
  if (!user) return false;
  if (user.roles?.some(r => ADMIN_ROLES.has(r))) return true;
  return !!user.role && ADMIN_ROLES.has(user.role);
}

/**
 * Verifica se o usuário pode visualizar os dados/ficha de uma pessoa específica.
 */
export function canViewPerson(
  currentUser: UserAccessProfile | null | undefined,
  targetUser: UserAccessProfile | null | undefined
): boolean {
  if (!currentUser || !targetUser) return false;

  // 1. Admin/Pastor pode ver todos
  if (isAdminOrPastor(currentUser)) return true;

  // 2. É o próprio usuário (self)
  if (currentUser.id === targetUser.id) return true;

  // 3. Líderes e Secretários de GC
  const isGCLeader = currentUser.role === 'gc_leader' || currentUser.roles?.includes('gc_leader');
  const isGCTraining = currentUser.role === 'gc_training_leader' || currentUser.roles?.includes('gc_training_leader');
  const isGCSecretary = currentUser.role === 'gc_secretary' || currentUser.roles?.includes('gc_secretary');

  if ((isGCLeader || isGCTraining || isGCSecretary) && currentUser.cellId) {
    // Pertencem à mesma célula?
    if (currentUser.cellId === targetUser.cellId) {
      // Regra especial: Líder em treinamento NÃO pode bisbilhotar outros líderes em treinamento de mesmo nível
      if (isGCTraining) {
        const targetIsTrainingLeader = targetUser.role === 'gc_training_leader' || targetUser.roles?.includes('gc_training_leader');
        if (targetIsTrainingLeader && targetUser.id !== currentUser.id) {
          return false;
        }
      }
      return true;
    }
  }

  // 4. Líder de Área (Coordenador)
  const isAreaLeader = currentUser.role === 'area_leader' || currentUser.roles?.includes('area_leader');
  if (isAreaLeader && currentUser.areaId) {
    // Pode ver se a pessoa for um Líder de GC sob sua supervisão na mesma Área
    const targetIsGCLeader = targetUser.role === 'gc_leader' || targetUser.roles?.includes('gc_leader');
    if (currentUser.areaId === targetUser.areaId && targetIsGCLeader) {
      return true;
    }
    // Não visualiza participantes comuns do GC
    return false;
  }

  return false;
}

/**
 * Verifica se o usuário pode visualizar anotações pastorais de uma pessoa.
 */
export function canViewPastoralNotes(
  currentUser: UserAccessProfile | null | undefined,
  targetUser: UserAccessProfile | null | undefined,
  isConfidential: boolean = false
): boolean {
  if (!currentUser || !targetUser) return false;

  // Anotações confidenciais: APENAS Admin/Pastor
  if (isConfidential) {
    return isAdminOrPastor(currentUser);
  }

  // Anotações padrão: Admin/Pastor ou Líder do GC da pessoa
  if (isAdminOrPastor(currentUser)) return true;

  const isGCLeader = currentUser.role === 'gc_leader' || currentUser.roles?.includes('gc_leader');
  if (isGCLeader && currentUser.cellId && currentUser.cellId === targetUser.cellId) {
    return true;
  }

  return false;
}

/**
 * Verifica se o usuário pode lançar relatórios de reunião do GC.
 */
export function canSubmitGCReport(
  currentUser: UserAccessProfile | null | undefined,
  cellId: string
): boolean {
  if (!currentUser) return false;
  if (isAdminOrPastor(currentUser)) return true;

  const isGCLeader = currentUser.role === 'gc_leader' || currentUser.roles?.includes('gc_leader');
  const isGCTraining = currentUser.role === 'gc_training_leader' || currentUser.roles?.includes('gc_training_leader');
  const isGCSecretary = currentUser.role === 'gc_secretary' || currentUser.roles?.includes('gc_secretary');

  if ((isGCLeader || isGCTraining || isGCSecretary) && currentUser.cellId === cellId) {
    return true;
  }

  return false;
}

/**
 * Verifica se o usuário pode gerenciar um curso (Professor ou Secretário de Curso).
 */
export function canManageCourse(
  currentUser: UserAccessProfile | null | undefined,
  course: { teachers?: string[]; supportTeam?: string[]; instructorId?: string } | null | undefined
): boolean {
  if (!currentUser || !course) return false;
  if (isAdminOrPastor(currentUser)) return true;

  const currentUid = currentUser.id;

  // Verifica se o usuário está listado como Professor/Instrutor ou na Equipe de Apoio do Curso
  if (course.instructorId === currentUid) return true;
  if (course.teachers?.includes(currentUid)) return true;
  if (course.supportTeam?.includes(currentUid)) return true;

  const isTeacher = currentUser.role === 'teacher' || currentUser.roles?.includes('teacher');
  const isCourseSecretary = currentUser.role === 'course_secretary' || currentUser.roles?.includes('course_secretary');

  if (isTeacher || isCourseSecretary) {
    if (course.teachers?.includes(currentUid) || course.supportTeam?.includes(currentUid)) {
      return true;
    }
  }

  return false;
}

/**
 * Verifica se o usuário pode acessar ferramentas do módulo de Serviço/Voluntariado.
 */
export function canAccessVolunteering(currentUser: UserAccessProfile | null | undefined): boolean {
  if (!currentUser) return false;
  if (isAdminOrPastor(currentUser)) return true;

  const isServiceLeader = currentUser.role === 'service_leader' || currentUser.roles?.includes('service_leader');
  if (isServiceLeader) return true;

  if (currentUser.permissions?.some(p => p.startsWith('servico_'))) return true;

  return false;
}

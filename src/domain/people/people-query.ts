export interface PersonalFilter {
  integrationStatus?: string;
  gender?: string;
  maritalStatus?: string;
  isBaptized?: 'all' | 'yes' | 'no';
  birthMonth?: string;
  ageMin?: number | string;
  ageMax?: number | string;
  tag?: string;
}

export interface JourneyFilter {
  proximoPasso?: string; // 'all' | 'batismo' | 'gc' | 'voluntariado' | 'congregar' | 'aconselhamento'
  proximoPassoStatus?: 'all' | 'pending' | 'completed';
  caminhadaInicio?: string; // 'all' | 'conversao' | 'reconciliacao' | 'transferencia' | 'conhecendo'
  igrejaAntiga?: string;
  comoConheceu?: string;
  nomeConvidou?: string;
}

export interface GcFilter {
  hasGc?: 'all' | 'yes' | 'no';
  cellId?: string;
  redeId?: string;
  areaId?: string;
  role?: string;
}

export interface MinistryFilter {
  isVolunteer?: 'all' | 'yes' | 'no';
  serviceAreaId?: string;
  teamId?: string;
}

export interface TeachingFilter {
  membresiaCompleted?: 'all' | 'yes' | 'no';
  hasCourse?: 'all' | 'yes' | 'no';
  courseId?: string;
}

export interface CompletenessFilter {
  missingPhone?: boolean;
  missingPhoto?: boolean;
  missingAddress?: boolean;
  missingCpf?: boolean;
  missingBirthDate?: boolean;
  missingMaritalStatus?: boolean;
}

export interface LocationFilter {
  bairro?: string;
  cidade?: string;
}

export interface PeopleQueryFilter {
  searchTerm?: string;
  personal?: PersonalFilter;
  journey?: JourneyFilter;
  gc?: GcFilter;
  ministry?: MinistryFilter;
  teaching?: TeachingFilter;
  completeness?: CompletenessFilter;
  location?: LocationFilter;
}

export interface ReportPreset {
  id: string;
  label: string;
  description: string;
  icon?: string;
  filters: PeopleQueryFilter;
}

export const REPORT_PRESETS: ReportPreset[] = [
  {
    id: 'pastoral_counseling_pending',
    label: 'Atendimento Pastoral Pendente',
    description: 'Pessoas que solicitaram aconselhamento pastoral e ainda não foram atendidas',
    filters: {
      journey: { proximoPasso: 'aconselhamento', proximoPassoStatus: 'pending' }
    }
  },
  {
    id: 'desires_baptism_pending',
    label: 'Querem se Batizar (Pendente)',
    description: 'Pessoas que solicitaram batismo e aguardam conclusão',
    filters: {
      journey: { proximoPasso: 'batismo', proximoPassoStatus: 'pending' }
    }
  },
  {
    id: 'desires_gc_pending',
    label: 'Querem Entrar em GC (Pendente)',
    description: 'Pessoas que manifestaram desejo de entrar em um GC',
    filters: {
      journey: { proximoPasso: 'gc', proximoPassoStatus: 'pending' }
    }
  },
  {
    id: 'without_gc',
    label: 'Membros sem GC',
    description: 'Membros ou novos convertidos sem vínculo com célula',
    filters: {
      gc: { hasGc: 'no' }
    }
  },
  {
    id: 'volunteers_without_membresia',
    label: 'Voluntários sem Membresia',
    description: 'Voluntários ativos sem conclusão do curso de membresia',
    filters: {
      ministry: { isVolunteer: 'yes' },
      teaching: { membresiaCompleted: 'no' }
    }
  },
  {
    id: 'birthdays_this_month',
    label: 'Aniversariantes do Mês',
    description: 'Membros que fazem aniversário no mês atual',
    filters: {
      personal: { birthMonth: String(new Date().getMonth() + 1) }
    }
  },
  {
    id: 'incomplete_contacts',
    label: 'Cadastros Incompletos',
    description: 'Registros sem telefone válido ou sem foto de perfil',
    filters: {
      completeness: { missingPhone: true, missingPhoto: true }
    }
  }
];

export function calculateAge(birthDateStr?: string | Date): number | null {
  if (!birthDateStr) return null;
  const birth = typeof birthDateStr === 'string' ? new Date(birthDateStr) : birthDateStr;
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function searchPeople(users: any[], queryFilter: PeopleQueryFilter, cells: any[] = [], serviceAreas: any[] = [], teams: any[] = []): any[] {
  if (!users || !Array.isArray(users)) return [];

  const {
    searchTerm,
    personal = {},
    journey = {},
    gc = {},
    ministry = {},
    teaching = {},
    completeness = {},
    location = {}
  } = queryFilter;

  const normalize = (str: any) =>
    String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const term = normalize(searchTerm);

  return users.filter(user => {
    if (!user) return false;

    // Search Term Filter
    if (term) {
      const name = normalize(user.name);
      const email = normalize(user.email);
      const phone = normalize(user.phone);
      const cpf = normalize(user.cpf);
      const matchesSearch = name.includes(term) || email.includes(term) || phone.includes(term) || cpf.includes(term);
      if (!matchesSearch) return false;
    }

    // A. Personal Filters
    if (personal.integrationStatus && personal.integrationStatus !== 'all') {
      const status = user.integrationStatus || 'nao_alcancado';
      if (status !== personal.integrationStatus) return false;
    }

    if (personal.gender && personal.gender !== 'all') {
      const userGender = normalize(user.gender || user.sexo);
      if (userGender !== normalize(personal.gender)) return false;
    }

    if (personal.maritalStatus && personal.maritalStatus !== 'all') {
      const userMarital = normalize(user.maritalStatus || user.estadoCivil);
      if (userMarital !== normalize(personal.maritalStatus)) return false;
    }

    if (personal.isBaptized && personal.isBaptized !== 'all') {
      const isBaptizedUser = user.batizado === 'sim' || user.isBaptized === true || user.batizado === true;
      if (personal.isBaptized === 'yes' && !isBaptizedUser) return false;
      if (personal.isBaptized === 'no' && isBaptizedUser) return false;
    }

    if (personal.birthMonth && personal.birthMonth !== 'all') {
      const birthStr = user.birthDate || user.dataNascimento || user.birthdate;
      if (!birthStr) return false;
      const bDate = new Date(birthStr);
      if (isNaN(bDate.getTime())) return false;
      const month = String(bDate.getMonth() + 1);
      if (month !== String(personal.birthMonth)) return false;
    }

    if (personal.ageMin !== undefined && personal.ageMin !== '') {
      const age = calculateAge(user.birthDate || user.dataNascimento || user.birthdate);
      if (age === null || age < Number(personal.ageMin)) return false;
    }

    if (personal.ageMax !== undefined && personal.ageMax !== '') {
      const age = calculateAge(user.birthDate || user.dataNascimento || user.birthdate);
      if (age === null || age > Number(personal.ageMax)) return false;
    }

    if (personal.tag && personal.tag !== 'all') {
      if (!Array.isArray(user.tags) || !user.tags.includes(personal.tag)) return false;
    }

    // B. Journey & Connection Filters ("Próximos passos" / Desejos)
    if (journey.proximoPasso && journey.proximoPasso !== 'all') {
      const passos = Array.isArray(user.proximosPassos) ? user.proximosPassos : (Array.isArray(user.decisao) ? user.decisao : []);
      if (!passos.includes(journey.proximoPasso)) return false;

      const concluidos = Array.isArray(user.proximosPassosConcluidos) ? user.proximosPassosConcluidos : [];
      const isCompleted = concluidos.includes(journey.proximoPasso);

      if (journey.proximoPassoStatus === 'pending' && isCompleted) return false;
      if (journey.proximoPassoStatus === 'completed' && !isCompleted) return false;
    } else if (journey.proximoPassoStatus && journey.proximoPassoStatus !== 'all') {
      const passos = Array.isArray(user.proximosPassos) ? user.proximosPassos : (Array.isArray(user.decisao) ? user.decisao : []);
      if (passos.length === 0) return false;
      const concluidos = Array.isArray(user.proximosPassosConcluidos) ? user.proximosPassosConcluidos : [];

      if (journey.proximoPassoStatus === 'pending') {
        const hasPending = passos.some((p: string) => !concluidos.includes(p));
        if (!hasPending) return false;
      } else if (journey.proximoPassoStatus === 'completed') {
        const allCompleted = passos.every((p: string) => concluidos.includes(p));
        if (!allCompleted) return false;
      }
    }

    if (journey.caminhadaInicio && journey.caminhadaInicio !== 'all') {
      if (user.caminhadaInicio !== journey.caminhadaInicio) return false;
    }

    if (journey.igrejaAntiga && journey.igrejaAntiga.trim()) {
      const val = normalize(user.igrejaAntiga);
      if (!val.includes(normalize(journey.igrejaAntiga))) return false;
    }

    if (journey.comoConheceu && journey.comoConheceu.trim()) {
      const val = normalize(user.comoConheceu);
      if (!val.includes(normalize(journey.comoConheceu))) return false;
    }

    if (journey.nomeConvidou && journey.nomeConvidou.trim()) {
      const val = normalize(user.nomeConvidou);
      if (!val.includes(normalize(journey.nomeConvidou))) return false;
    }

    // C. GC Filters
    const hasGcUser = !!(user.hierarchy?.celulaId || user.celulaId || user.cellId);
    if (gc.hasGc && gc.hasGc !== 'all') {
      if (gc.hasGc === 'yes' && !hasGcUser) return false;
      if (gc.hasGc === 'no' && hasGcUser) return false;
    }

    if (gc.cellId && gc.cellId !== 'all') {
      const userCellId = user.hierarchy?.celulaId || user.celulaId || user.cellId;
      if (userCellId !== gc.cellId) return false;
    }

    if (gc.redeId && gc.redeId !== 'all') {
      const userCellId = user.hierarchy?.celulaId || user.celulaId || user.cellId;
      const userCell = cells.find(c => c.id === userCellId);
      if (!userCell || userCell.redeId !== gc.redeId) return false;
    }

    if (gc.areaId && gc.areaId !== 'all') {
      const userCellId = user.hierarchy?.celulaId || user.celulaId || user.cellId;
      const userCell = cells.find(c => c.id === userCellId);
      if (!userCell || userCell.areaId !== gc.areaId) return false;
    }

    if (gc.role && gc.role !== 'all') {
      const userRole = user.hierarchy?.role || user.role;
      const isLider = userRole === 'lider' || user.isLiderGc === true || cells.some(c => c.liderId === user.id || c.liderCasalId === user.id);
      const isCoLider = userRole === 'colider' || userRole === 'lider_treinamento' || user.isCoLider === true || cells.some(c => c.coLiderIds?.includes(user.id) || c.coLideres?.some((cl: any) => cl.id === user.id || cl.casalId === user.id));
      const isSupervisor = userRole === 'supervisor' || cells.some(c => c.supervisorId === user.id);

      if (gc.role === 'lider' && !isLider) return false;
      if (gc.role === 'colider' && !isCoLider) return false;
      if (gc.role === 'supervisor' && !isSupervisor) return false;
    }

    // D. Ministry / Volunteer Filters
    const isVolunteerUser = user.isVolunteer === true || user.serviceStatus === 'serving' || (Array.isArray(user.serviceAreaIds) && user.serviceAreaIds.length > 0) || !!user.serviceAreaId || !!user.areaOfServiceId;
    if (ministry.isVolunteer && ministry.isVolunteer !== 'all') {
      if (ministry.isVolunteer === 'yes' && !isVolunteerUser) return false;
      if (ministry.isVolunteer === 'no' && isVolunteerUser) return false;
    }

    if (ministry.serviceAreaId && ministry.serviceAreaId !== 'all') {
      const targetArea = serviceAreas.find(sa => sa.id === ministry.serviceAreaId || sa.name === ministry.serviceAreaId);
      const areaId = targetArea?.id || ministry.serviceAreaId;
      const areaName = targetArea?.name || ministry.serviceAreaId;
      const cleanTargetId = normalize(areaId);
      const cleanTargetName = normalize(areaName);

      const matches = (val?: string) => {
        if (!val) return false;
        const v = normalize(val);
        return v === cleanTargetId || v === cleanTargetName;
      };

      let areaMatches = false;
      if (Array.isArray(user.serviceAreaIds) && user.serviceAreaIds.some((id: string) => matches(id))) areaMatches = true;
      if (Array.isArray(user.volunteeringAreas) && user.volunteeringAreas.some((id: string) => matches(id))) areaMatches = true;
      if (matches(user.serviceAreaId)) areaMatches = true;
      if (matches(user.areaOfServiceId)) areaMatches = true;
      if (matches(user.areaId)) areaMatches = true;

      if (user.serviceTeamId || user.teamId) {
        const userTeam = teams.find(t => t.id === user.serviceTeamId || t.id === user.teamId);
        if (userTeam && (matches(userTeam.areaId) || matches(userTeam.serviceAreaId))) areaMatches = true;
      }

      if (!areaMatches) return false;
    }

    if (ministry.teamId && ministry.teamId !== 'all') {
      const userTeamId = user.serviceTeamId || user.teamId;
      if (userTeamId !== ministry.teamId) return false;
    }

    // E. Teaching Filters
    if (teaching.membresiaCompleted && teaching.membresiaCompleted !== 'all') {
      const isMembresiaDone = user.journey?.courseStatus?.['membresia'] === 'approved' || user.integrationStatus === 'membro';
      if (teaching.membresiaCompleted === 'yes' && !isMembresiaDone) return false;
      if (teaching.membresiaCompleted === 'no' && isMembresiaDone) return false;
    }

    if (teaching.hasCourse && teaching.hasCourse !== 'all') {
      const hasCourseUser = !!(user.journey?.courseStatus && Object.keys(user.journey.courseStatus).length > 0);
      if (teaching.hasCourse === 'yes' && !hasCourseUser) return false;
      if (teaching.hasCourse === 'no' && hasCourseUser) return false;
    }

    if (teaching.courseId && teaching.courseId !== 'all') {
      const courseStatus = user.journey?.courseStatus?.[teaching.courseId];
      if (!courseStatus) return false;
    }

    // F. Completeness Filters (Quality Checks)
    if (completeness.missingPhone) {
      const hasPhone = !!(user.phone && String(user.phone).replace(/\D/g, '').length >= 8);
      if (hasPhone) return false;
    }

    if (completeness.missingPhoto) {
      const hasPhoto = !!(user.profilePicture || user.photoURL || user.avatar);
      if (hasPhoto) return false;
    }

    if (completeness.missingAddress) {
      const hasAddress = !!(user.address || user.endereco || user.bairro);
      if (hasAddress) return false;
    }

    if (completeness.missingCpf) {
      const hasCpf = !!(user.cpf && String(user.cpf).replace(/\D/g, '').length >= 11);
      if (hasCpf) return false;
    }

    if (completeness.missingBirthDate) {
      const hasBirth = !!(user.birthDate || user.dataNascimento || user.birthdate);
      if (hasBirth) return false;
    }

    if (completeness.missingMaritalStatus) {
      const hasMarital = !!(user.maritalStatus || user.estadoCivil);
      if (hasMarital) return false;
    }

    // G. Location Filters
    if (location.bairro && location.bairro !== 'all') {
      const userBairro = normalize(user.bairro || user.address?.bairro || user.endereco?.bairro);
      if (!userBairro.includes(normalize(location.bairro))) return false;
    }

    if (location.cidade && location.cidade !== 'all') {
      const userCidade = normalize(user.cidade || user.address?.cidade || user.endereco?.cidade);
      if (!userCidade.includes(normalize(location.cidade))) return false;
    }

    return true;
  });
}

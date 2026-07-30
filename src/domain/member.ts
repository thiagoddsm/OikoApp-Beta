import { Timestamp } from 'firebase/firestore';

export type User = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  integrationStatus?: string;
  sexo?: string;
  escolaridade?: string;
  profissao?: string;
  dataNascimento?: string;
  estadoCivil?: string;
  address?: {
    street?: string;
    cep?: string;
    location?: any;
  };
  hierarchy?: {
    role?: string;
    celulaId?: string;
    supervisorId?: string;
  };
  serviceStatus?: 'serving' | 'not_serving';
  serviceAreaId?: string;
  serviceAreaIds?: string[];
  serviceTeamId?: string;
  eligibleEventIds?: string[];
  blockedDates?: string[];
  lastServedDate?: Timestamp;
  isTeacher?: boolean;
  taughtCourseIds?: string[];
  financialStatus?: string;
  batizado?: 'sim' | 'nao';
  dataBatismo?: string;
  gcId?: string;
  igrejaBatismo?: string;
  membroAntigo?: 'sim' | 'nao';
  igrejaAntiga?: string;
  decisao?: string[];
  initialStatus?: string;
  dataDecisao?: string;
  absenceCount?: number;
  familyMembers?: { name: string; relation: string; userId?: string }[];
  journey?: {
    stageProgress?: Record<string, any>;
    memberCourseProgress?: Record<string, boolean>;
    theoflixProgress?: Record<string, Record<string, boolean>>;
    courseStatus?: Record<string, 'pending' | 'approved' | 'rejected'>;
  };
};

export type Member = User & {
  // Dados exclusivos e restritos do Tenant local
  tenantId?: string;
  cpf?: string;
  cpfCnpj?: string;
};


'use client';

import React, { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { format, addWeeks, addMonths, parseISO } from 'date-fns';
import { useFirebase, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, doc, Timestamp, addDoc, where, writeBatch } from 'firebase/firestore';
import { GCProvider, useGC } from './GCContext';
import { VolunteerProvider, useVolunteer } from './VolunteerContext';
import { TeachingProvider, useTeaching } from './TeachingContext';

export type User = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
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
    redeId?: string;
    areaId?: string;
  };
  serviceStatus?: 'serving' | 'not_serving';
  serviceAreaId?: string;
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

export type AreaOfService = {
  id: string;
  name: string;
  leaderId?: string;
  leaderContact?: string;
};

export type Team = {
  id: string;
  name: string;
};

export type VolunteeringEvent = {
  id: string;
  name: string;
  time: string;
  date?: string;
  frequency?: 'semanal' | 'pontual';
  dayOfWeek?: string;
  requiredAreas?: { areaId: string; quantity: number }[];
  room?: string;
};

export type ReservationCategory = {
  id: string;
  name: string;
  color?: string;
};

export type Room = {
  id: string;
  name: string;
};

export type RoomReservation = {
  id: string;
  eventName: string;
  requesterId: string;
  rooms: string[];
  startDateTime: Timestamp;
  endDateTime: Timestamp;
  recurrenceEndDate?: Timestamp;
  notes?: string;
  equipmentNotes?: string;
  kitchenUsage?: boolean;
  requiredPatrimonyIds?: string[];
  status: 'pending' | 'approved' | 'rejected';
  frequency?: 'pontual' | 'semanal' | 'quinzenal' | 'mensal';
  dayOfWeek?: string;
  weekOfMonth?: '1' | '2' | '3' | '4' | 'last';
  createdAt?: Timestamp;
  categoryId?: string;
};

export type Course = {
  id: string;
  name: string;
  description: string;
  ministryName: string;
  responsibleId?: string;
  type?: 'trilho' | 'eletivo';
  ebdTrack?: 'teologico' | 'biblico' | 'discipulado';
  linkedTheoflixId?: string;
  minAttendanceApproval?: number;
  syllabus?: { id: string; title: string; description: string; theoflixCourseId?: string }[];
  requiresMemberStatus?: boolean;
  requiresBaptism?: boolean;
  prerequisiteCourseId?: string;
  imageUrl?: string;
  sortOrder?: number;
};

export type SavedSchedule = {
  id: string;
  areaId: string;
  month: string;
  schedule: {
    date: string;
    eventName: string;
    areaId: string;
    teamId: string | null;
    teamName: string | null;
    memberIds: string[];
  }[];
};

export type Class = {
  id: string;
  courseId: string;
  name: string;
  teacherId: string;
  students: string[];
  maxStudents?: number;
  frequency: 'pontual' | 'semanal' | 'quinzenal' | 'mensal';
  startDate: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  dayOfWeek?: string;
  weekOfMonth?: '1' | '2' | '3' | '4' | 'last';
  locationId?: string;
  holidayDates?: string[];
  extraDates?: string[]; // Mantido para retrocompatibilidade
  extraSessions?: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    syllabusId?: string;
    isRepositionOnly?: boolean;
  }[];
  registrationDeadline?: string;
  attendance?: { 
    date: string; 
    presentStudentIds: string[]; 
    onlineStudentIds?: string[];
    repositions?: { studentId: string; date: string }[];
    isRepositionOnly?: boolean;
    lessonNotes?: Record<string, string>;
  }[];
  grades?: { studentId: string; assessmentName: string; grade: number }[];
  materials?: { title: string; url: string; description?: string }[];
  scheduleOverrides?: Record<string, {
    syllabusId?: string;
    teacherId?: string;
    isCancelled?: boolean;
    notes?: string;
    originalDate?: string;
  }>;
};

export type Area = { id: string; nome: string; liderId: string; redeId: string; };
export type Cell = { id: string; nome: string; liderId: string; areaId: string; redeId: string; membros: string[] };
export type Rede = { id: string; nome: string; liderId: string; pastorId: string; };

export const weekDayMap: Record<string, number> = {
    'domingo': 0,
    'segunda': 1,
    'terca': 2,
    'quarta': 3,
    'quinta': 4,
    'sexta': 5,
    'sabado': 6
};

export function getModuleIndexForDate(dateStr: string, classData: any, syllabus: any[] = []): number {
    if (!classData || !classData.startDate || !dateStr) return -1;
    
    // Normalizar dateStr para apenas YYYY-MM-DD para comparação de calendário regular
    const dateOnly = dateStr.split('T')[0];

    // 1. Verificar se é uma aula extra (novo modelo)
    // Tentar match exato com data e hora primeiro
    let extraSession = classData.extraSessions?.find((s: any) => `${s.date}T${s.startTime}` === dateStr);
    
    // Se não achou, tentar match apenas com a data
    if (!extraSession) {
        extraSession = classData.extraSessions?.find((s: any) => s.date === dateOnly);
    }

    if (extraSession?.syllabusId) {
        return syllabus.findIndex((s: any) => s.id === extraSession.syllabusId);
    }

    // 2. Verificar se existe override para esta data específica
    const overrides = classData.scheduleOverrides || {};
    if (overrides[dateOnly]) {
        const ov = overrides[dateOnly];
        if (ov.isCancelled) return -1;
        if (ov.syllabusId) {
            return syllabus.findIndex((s: any) => s.id === ov.syllabusId);
        }
    }


    // 3. Lógica de recorrência padrão
    const start = parseISO(classData.startDate);
    const end = classData.endDate ? parseISO(classData.endDate) : addMonths(start, 6); // Aumentado para 6 meses de busca
    const holidaySet = new Set(classData.holidayDates || []);

    let current = start;
    let safe = 0;
    let currentIndex = 0;

    if (classData.frequency && classData.frequency !== 'pontual') {
        while (safe++ < 300) { // Aumentado limite de segurança
            const dStr = format(current, 'yyyy-MM-dd');
            
            // Pular feriado sem override
            if (holidaySet.has(dStr) && !overrides[dStr]) {
                current = addWeeks(current, classData.frequency === 'quinzenal' ? 2 : 1);
                continue;
            }

            // Se for a data procurada e não estiver cancelada por override
            if (dStr === dateOnly) {
                const ov = overrides[dStr];
                if (ov?.isCancelled) return -1;
                return currentIndex;
            }

            // Incrementar índice do syllabus apenas para aulas válidas
            if (!overrides[dStr]?.isCancelled) {
                currentIndex++;
            }

            current = addWeeks(current, classData.frequency === 'quinzenal' ? 2 : 1);
            if (current > end && dStr > dateOnly) break;
        }
    } else {
        // Se for pontual, apenas a data de início conta
        return format(start, 'yyyy-MM-dd') === dateOnly ? 0 : -1;
    }

    return -1;
}


export type EnrollmentRequest = {
  id: string;
  courseId: string;
  classId?: string;
  name: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
};

export type PedagogicalLog = {
  id: string;
  classId: string;
  date: Timestamp;
  content_taught: string;
  student_performance: number;
  observations: string;
  dateStr?: string;
};

export type WavePayment = {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  month: string;
  status: 'paid' | 'pending' | 'overdue';
  splits?: { teacher: number; wave: number; ibm: number; admin: number };
};

export type DisPayment = {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  month: string;
  status: 'paid' | 'pending' | 'overdue';
  contaAzulInvoiceId?: string;
};

export type WavePlan = { id: string; name: string; price: number };
export type DisPlan = { id: string; name: string; price: number };
export type WaveExpense = { id: string; description: string; amount: number; date: Timestamp; receiptUrl?: string };

export type FinancialTransaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: Timestamp;
  description: string;
  status: 'paid' | 'pending';
  memberId?: string;
  paymentMethod?: string;
};

export type FinanceRequest = {
  id: string;
  requesterName: string;
  email: string;
  phone?: string;
  category: string;
  description: string;
  amount: number;
  objective: 'reembolso' | 'pagamento' | 'prestacao_contas';
  pixKey?: string;
  dueDate?: string;
  purchaseLink?: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  rejectionReason?: string;
  createdAt: Timestamp;
  attachmentUrl?: string;
};

interface VolunteeringContextType {
  users: User[];
  serviceAreas: AreaOfService[];
  teams: Team[];
  events: VolunteeringEvent[];
  rooms: Room[];
  reservations: RoomReservation[];
  strategicEvents: any[];
  courses: Course[];
  classes: Class[];
  enrollmentRequests: EnrollmentRequest[];
  pedagogicalLogs: PedagogicalLog[];
  wavePayments: WavePayment[];
  disPayments: DisPayment[];
  wavePlans: WavePlan[];
  disPlans: DisPlan[];
  waveExpenses: WaveExpense[];
  theoflixCourses: any[];
  financialTransactions: FinancialTransaction[];
  financeRequests: FinanceRequest[];
  savedSchedules: SavedSchedule[];
  reservationCategories: ReservationCategory[];
  cells: Cell[];
  areas: Area[];
  redes: Rede[];
  isLoading: boolean;
  addArea: (data: Omit<AreaOfService, 'id'>) => Promise<void>;
  updateArea: (id: string, data: Partial<AreaOfService>) => Promise<void>;
  deleteArea: (id: string) => Promise<void>;
  addTeam: (data: Omit<Team, 'id'>) => Promise<void>;
  updateTeam: (id: string, data: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  addEvent: (data: Omit<VolunteeringEvent, 'id'>) => Promise<void>;
  updateEvent: (id: string, data: Partial<VolunteeringEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  addRoom: (data: Omit<Room, 'id'>) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;
  addReservationCategory: (data: Omit<ReservationCategory, 'id'>) => Promise<void>;
  deleteReservationCategory: (id: string) => Promise<void>;
  addReservation: (data: Omit<RoomReservation, 'id'>) => Promise<void>;
  updateReservation: (id: string, data: Partial<RoomReservation>) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;
  updateVolunteer: (id: string, data: any) => Promise<void>;
  addUser: (data: any) => Promise<string>;
  addCourse: (data: any) => Promise<void>;
  addClass: (data: any) => Promise<void>;
  updateClass: (id: string, data: any) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  enrollStudent: (studentId: string, courseId: string, classId?: string) => Promise<void>;
  addPedagogicalLog: (data: any) => Promise<void>;
  addWavePayment: (data: any) => Promise<void>;
  updateWavePayment: (id: string, data: any) => Promise<void>;
  deleteWavePayment: (id: string) => Promise<void>;
  addDisPayment: (data: any) => Promise<void>;
  updateDisPayment: (id: string, data: any) => Promise<void>;
  deleteDisPayment: (id: string) => Promise<void>;
  addWavePlan: (data: any) => Promise<void>;
  updateWavePlan: (id: string, data: any) => Promise<void>;
  deleteWavePlan: (id: string) => Promise<void>;
  addDisPlan: (data: any) => Promise<void>;
  updateDisPlan: (id: string, data: any) => Promise<void>;
  deleteDisPlan: (id: string) => Promise<void>;
  addWaveExpense: (data: any) => Promise<void>;
  updateWaveExpense: (id: string, data: any) => Promise<void>;
  deleteWaveExpense: (id: string) => Promise<void>;
  addFinancialTransaction: (data: any) => Promise<void>;
  updateFinancialTransaction: (id: string, data: any) => Promise<void>;
  deleteFinancialTransaction: (id: string) => Promise<void>;
  addFinanceRequest: (data: any) => Promise<void>;
  updateFinanceRequest: (id: string, data: any) => Promise<void>;
  deleteFinanceRequest: (id: string) => Promise<void>;
  addEnrollmentRequest: (data: any) => Promise<void>;
  approveEnrollmentRequest: (requestId: string, classId: string) => Promise<void>;
  updateEnrollmentRequest: (requestId: string, data: any) => Promise<void>;
  deleteEnrollmentRequest: (requestId: string) => Promise<void>;
  markAttendanceByTheoflix: (userId: string, courseId: string, episodeIndex: number, lessonNotes?: string) => Promise<void>;
  saveSchedule: (data: any) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
}

const VolunteeringContext = createContext<VolunteeringContextType | undefined>(undefined);

export function VolunteeringProvider({ children }: { children: ReactNode }) {
  return (
    <GCProvider>
      <VolunteerProvider>
        <TeachingProvider>
          <VolunteeringInnerProvider>
            {children}
          </VolunteeringInnerProvider>
        </TeachingProvider>
      </VolunteerProvider>
    </GCProvider>
  );
}

function VolunteeringInnerProvider({ children }: { children: ReactNode }) {
  const { firestore, user, auth, isUserLoading } = useFirebase();

  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.pathname.includes('/public/') || window.location.pathname.includes('/calendario')) && auth && !user && !isUserLoading) {
      const { initiateAnonymousSignIn } = require('@/firebase/non-blocking-login');
      initiateAnonymousSignIn(auth);
    }
  }, [auth, user, isUserLoading]);

  // Consumindo sub-contextos especializados
  const gc = useGC();
  const volunteer = useVolunteer();
  const teaching = useTeaching();

  // Resolvendo Tenant do Usuário
  const { data: userTenant, isLoading: loadingRole } = useDoc<any>(user ? `userTenants/${user.uid}` : null);
  const tenantId = userTenant?.tenantId || 'ibm';
  const role = userTenant?.role || 'member';
  const isAdmin = !loadingRole && (userTenant !== undefined || !user) && (role === 'admin' || role === 'pastor_senior');

  const { data: accessProfile, isLoading: loadingProfile } = useDoc<any>(user && role ? `access_profiles/${role}` : null);
  const permissions = useMemo(() => accessProfile?.permissions || {}, [accessProfile?.permissions]);
  const can = (permId: string, action = 'view') => isAdmin || !!permissions?.[permId]?.[action];
  const roleResolved = !!userTenant;

  const isAnonymous = user?.isAnonymous;
  const isPublicRoute = typeof window !== 'undefined' && (window.location.pathname.includes('/public/') || window.location.pathname.includes('/calendario'));
  const shouldLoadPublicData = isAnonymous || isPublicRoute;

  // Consultas específicas não-especializadas
  const usersQ = useMemoFirebase(() => (firestore && user && roleResolved && (can('pessoas_list') || can('teaching_courses', 'view_students') || can('teaching_wave', 'view_teacher_area') || can('teaching_dis', 'view_teacher_area'))) ? query(collection(firestore, 'users')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const financialTransactionsQ = useMemoFirebase(() => (firestore && user && roleResolved && can('ministerial_finance')) ? query(collection(firestore, 'financial_transactions')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const financeRequestsQ = useMemoFirebase(() => (firestore && user && roleResolved && can('ministerial_finance')) ? query(collection(firestore, 'finance_requests')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const strategicEventsQ = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    if (shouldLoadPublicData || roleResolved) {
      return query(collection(firestore, 'strategic_events'));
    }
    return null;
  }, [firestore, user, roleResolved, shouldLoadPublicData]);

  const { data: users, isLoading: lu } = useCollection<User>(usersQ);
  const { data: financialTransactions, isLoading: lft } = useCollection<FinancialTransaction>(financialTransactionsQ);
  const { data: financeRequests, isLoading: lfr } = useCollection<FinanceRequest>(financeRequestsQ);
  const { data: strategicEvents, isLoading: lse } = useCollection<any>(strategicEventsQ);

  const isLoading = gc.isLoading || volunteer.isLoading || teaching.isLoading || loadingRole || loadingProfile || (user ? lu : false) || lft || lfr || lse;

  const value = useMemo(() => ({
    users: users || [],
    financialTransactions: financialTransactions || [],
    financeRequests: financeRequests || [],
    strategicEvents: strategicEvents || [],
    
    // Sub-context GC
    cells: gc.cells,
    areas: gc.areas,
    redes: gc.redes,

    // Sub-context Volunteer
    serviceAreas: volunteer.serviceAreas,
    teams: volunteer.teams,
    events: volunteer.events,
    rooms: volunteer.rooms,
    reservations: volunteer.reservations,
    reservationCategories: volunteer.reservationCategories,
    savedSchedules: volunteer.savedSchedules,

    // Sub-context Teaching
    courses: teaching.courses,
    classes: teaching.classes,
    enrollmentRequests: teaching.enrollmentRequests,
    pedagogicalLogs: teaching.pedagogicalLogs,
    wavePayments: teaching.wavePayments,
    disPayments: teaching.disPayments,
    wavePlans: teaching.wavePlans,
    disPlans: teaching.disPlans,
    waveExpenses: teaching.waveExpenses,
    theoflixCourses: teaching.theoflixCourses,

    isLoading,

    // Actions delegadas
    addArea: volunteer.addArea,
    updateArea: volunteer.updateArea,
    deleteArea: volunteer.deleteArea,
    addTeam: volunteer.addTeam,
    updateTeam: volunteer.updateTeam,
    deleteTeam: volunteer.deleteTeam,
    addEvent: volunteer.addEvent,
    updateEvent: volunteer.updateEvent,
    deleteEvent: volunteer.deleteEvent,
    addRoom: volunteer.addRoom,
    deleteRoom: volunteer.deleteRoom,
    addReservationCategory: volunteer.addReservationCategory,
    deleteReservationCategory: volunteer.deleteReservationCategory,
    addReservation: volunteer.addReservation,
    updateReservation: volunteer.updateReservation,
    deleteReservation: volunteer.deleteReservation,
    saveSchedule: volunteer.saveSchedule,
    deleteSchedule: volunteer.deleteSchedule,

    addCourse: teaching.addCourse,
    addClass: teaching.addClass,
    updateClass: teaching.updateClass,
    deleteClass: teaching.deleteClass,
    enrollStudent: teaching.enrollStudent,
    addPedagogicalLog: teaching.addPedagogicalLog,
    addWavePayment: teaching.addWavePayment,
    updateWavePayment: teaching.updateWavePayment,
    deleteWavePayment: teaching.deleteWavePayment,
    addDisPayment: teaching.addDisPayment,
    updateDisPayment: teaching.updateDisPayment,
    deleteDisPayment: teaching.deleteDisPayment,
    addWavePlan: teaching.addWavePlan,
    updateWavePlan: teaching.updateWavePlan,
    deleteWavePlan: teaching.deleteWavePlan,
    addDisPlan: teaching.addDisPlan,
    updateDisPlan: teaching.updateDisPlan,
    deleteDisPlan: teaching.deleteDisPlan,
    addWaveExpense: teaching.addWaveExpense,
    updateWaveExpense: teaching.updateWaveExpense,
    deleteWaveExpense: teaching.deleteWaveExpense,
    addEnrollmentRequest: teaching.addEnrollmentRequest,
    approveEnrollmentRequest: teaching.approveEnrollmentRequest,
    updateEnrollmentRequest: teaching.updateEnrollmentRequest,
    deleteEnrollmentRequest: teaching.deleteEnrollmentRequest,
    markAttendanceByTheoflix: teaching.markAttendanceByTheoflix,

    addFinancialTransaction: async (data: any) => { await addDoc(collection(firestore!, 'financial_transactions'), data); },
    updateFinancialTransaction: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'financial_transactions', id), data); },
    deleteFinancialTransaction: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'financial_transactions', id)); },
    addFinanceRequest: async (data: any) => { await addDoc(collection(firestore!, 'finance_requests'), data); },
    updateFinanceRequest: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'finance_requests', id), data); },
    deleteFinanceRequest: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'finance_requests', id)); },

    updateVolunteer: async (id: string, data: any) => { 
      await updateDocumentNonBlocking(doc(firestore!, 'users', id), data); 
      
      const memberRef = doc(firestore!, 'tenants', tenantId, 'members', id);
      const updates: any = {};
      if (data.name !== undefined) {
        const parts = data.name.trim().split(/\s+/);
        updates['basic.firstName'] = parts[0];
        updates['basic.lastName'] = parts.slice(1).join(' ') || '';
      }
      if (data.phone !== undefined) updates['contact.phone'] = data.phone;
      if (data.email !== undefined) updates['contact.email'] = data.email;
      if (data.cpf !== undefined) updates['basic.cpf'] = data.cpf;
      if (data.sexo !== undefined) updates['basic.sexo'] = data.sexo;
      if (data.dataNascimento !== undefined) updates['basic.dataNascimento'] = data.dataNascimento;
      if (data.batizado !== undefined) updates['ministerial.batizado'] = data.batizado;
      if (data.integrationStatus !== undefined) updates['ministerial.integrationStatus'] = data.integrationStatus;
      if (data.serviceStatus !== undefined) updates['services.serviceStatus'] = data.serviceStatus;
      if (data.serviceAreaId !== undefined) updates['services.serviceAreaId'] = data.serviceAreaId;
      if (data.serviceTeamId !== undefined) updates['services.serviceTeamId'] = data.serviceTeamId;
      
      if (Object.keys(updates).length > 0) {
        await updateDocumentNonBlocking(memberRef, updates);
      }
    },
    addUser: async (data: any) => {
      const res = await addDoc(collection(firestore!, 'users'), { ...data, createdAt: Timestamp.now() });
      const studentId = res.id;

      const batch = writeBatch(firestore!);
      
      const userTenantData = {
        tenantId: tenantId,
        slug: tenantId,
        role: 'member',
        email: data.email || '',
        updatedAt: Timestamp.now()
      };
      batch.set(doc(firestore!, 'userTenants', studentId), userTenantData);

      const tenantUserData = {
        email: data.email || '',
        role: 'member',
        permissions: [],
        status: 'active',
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      batch.set(doc(firestore!, 'tenants', tenantId, 'users', studentId), tenantUserData);

      const nameParts = (data.name || 'Novo Usuário').trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      const memberData = {
        id: studentId,
        tenantId: tenantId,
        basic: {
          firstName: firstName,
          lastName: lastName,
          cpf: data.cpf || '',
          sexo: data.sexo || '',
          dataNascimento: data.dataNascimento || '',
          avatar: data.avatar || '',
          photoURL: data.photoURL || '',
        },
        contact: {
          phone: data.phone || '',
          email: data.email || ''
        },
        ministerial: {
          batizado: data.batizado || 'nao',
          integrationStatus: data.integrationStatus || 'nao_alcancado',
        },
        services: {
          serviceStatus: data.serviceStatus || 'not_serving',
        },
        family: {
          familyMembers: [],
        },
        journey: {},
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      batch.set(doc(firestore!, 'tenants', tenantId, 'members', studentId), memberData);

      await batch.commit();
      return studentId;
    },
  }), [users, gc, volunteer, teaching, strategicEvents, isLoading, firestore, tenantId]);

  return (
    <VolunteeringContext.Provider value={value}>
      {children}
    </VolunteeringContext.Provider>
  );
}

export function useVolunteering() {
  const context = useContext(VolunteeringContext);
  if (context === undefined) {
    throw new Error('useVolunteering must be used within a VolunteeringProvider');
  }
  return context;
}

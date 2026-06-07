
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { format, addWeeks, addMonths, parseISO } from 'date-fns';
import { useFirebase, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, doc, Timestamp, addDoc, where, getDoc } from 'firebase/firestore';

export type User = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  integrationStatus?: string;
  cpf?: string;
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
    repositions?: { studentId: string; date: string; dateStr?: string }[];
    isRepositionOnly?: boolean;
    lessonNotes?: string;
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
  volunteerId?: string;
};

export type PedagogicalLog = {
  id: string;
  classId: string;
  date: Timestamp;
  content_taught: string;
  student_performance: number;
  observations: string;
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
  approveEnrollmentRequest: (requestId: string, classId: string) => Promise<void>;
  updateEnrollmentRequest: (requestId: string, data: any) => Promise<void>;
  deleteEnrollmentRequest: (requestId: string) => Promise<void>;
  markAttendanceByTheoflix: (userId: string, courseId: string, episodeIndex: number, lessonNotes?: string) => Promise<void>;
  saveSchedule: (data: any) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
}

const VolunteeringContext = createContext<VolunteeringContextType | undefined>(undefined);

export function VolunteeringProvider({ children }: { children: ReactNode }) {
  const { firestore, user, auth, isUserLoading } = useFirebase();

  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.pathname.includes('/public/') || window.location.pathname.includes('/calendario')) && auth && !user && !isUserLoading) {
      const { initiateAnonymousSignIn } = require('@/firebase/non-blocking-login');
      initiateAnonymousSignIn(auth);
    }
  }, [auth, user, isUserLoading]);

  const { data: userData, isLoading: loadingRole } = useDoc<{ hierarchy?: { role?: string }; }>(user ? `users/${user.uid}` : null);

  // Wait until we actually know the role before running role-sensitive queries.
  // isAdmin defaults to false while loading which causes query flip-flop → Firestore assertion crash.
  const roleResolved = !loadingRole && (userData !== undefined || !user);
  const isAdmin = roleResolved && (userData?.hierarchy?.role === 'admin' || userData?.hierarchy?.role === 'pastor_senior');
  
  const roleId = userData?.hierarchy?.role;
  const { data: accessProfile, isLoading: loadingProfile } = useDoc<any>(user && roleId ? `access_profiles/${roleId}` : null);
  const permissions = useMemo(() => accessProfile?.permissions || {}, [accessProfile?.permissions]);

  // Helper to check permission
  const can = (permId: string, action = 'view') => isAdmin || !!permissions?.[permId]?.[action];

  const isAnonymous = user?.isAnonymous;
  const isPublicRoute = typeof window !== 'undefined' && (window.location.pathname.includes('/public/') || window.location.pathname.includes('/calendario'));
  const shouldLoadPublicData = isAnonymous || isPublicRoute;

  // Queries sensíveis que exigem login e papel adequado (só rodam após papel ser conhecido)
  const usersQ = useMemoFirebase(() => (firestore && user && roleResolved && (can('pessoas_list') || can('teaching_courses', 'view_students') || can('teaching_wave', 'view_teacher_area') || can('teaching_dis', 'view_teacher_area'))) ? query(collection(firestore, 'users')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const serviceAreasQ = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    if (shouldLoadPublicData || (roleResolved && can('servico_areas'))) {
      return query(collection(firestore, 'areas_of_service'));
    }
    return null;
  }, [firestore, user, roleResolved, isAdmin, permissions, shouldLoadPublicData]);
  const teamsQ = useMemoFirebase(() => (firestore && user && roleResolved && can('servico_teams')) ? query(collection(firestore, 'teams')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const eventsQ = useMemoFirebase(() => (firestore && user && roleResolved && can('servico_events')) ? query(collection(firestore, 'volunteering_events')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const reservationsQ = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    if (shouldLoadPublicData || (roleResolved && can('ministerial_reservations'))) {
      return query(collection(firestore, 'room_reservations'));
    }
    return null;
  }, [firestore, user, roleResolved, isAdmin, permissions, shouldLoadPublicData]);
  const enrollmentRequestsQ = useMemoFirebase(() => (firestore && user && roleResolved && can('teaching_courses')) ? query(collection(firestore, 'enrollment_requests')) : null, [firestore, user, roleResolved, isAdmin, permissions]);

  const pedagogicalLogsQ = useMemoFirebase(() => {
    if (!firestore || !user || !roleResolved) return null;
    if (can('teaching_courses')) return query(collection(firestore, 'pedagogical_logs'));
    return null;
  }, [firestore, user, roleResolved, isAdmin, permissions]);

  const wavePlansQ = useMemoFirebase(() => (firestore && user && roleResolved) ? query(collection(firestore, 'wave_plans')) : null, [firestore, user, roleResolved]);
  const disPlansQ = useMemoFirebase(() => (firestore && user && roleResolved) ? query(collection(firestore, 'dis_plans')) : null, [firestore, user, roleResolved]);

  // Pagamentos: apenas admins. Alunos buscam diretamente no StudentDashboard.
  const wavePaymentsQ = useMemoFirebase(() => (firestore && user && roleResolved && can('teaching_wave', 'view_finance')) ? query(collection(firestore, 'wave_payments')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const disPaymentsQ = useMemoFirebase(() => (firestore && user && roleResolved && can('teaching_dis', 'view_finance')) ? query(collection(firestore, 'dis_payments')) : null, [firestore, user, roleResolved, isAdmin, permissions]);

  const waveExpensesQ = useMemoFirebase(() => (firestore && user && roleResolved && can('teaching_wave', 'view_finance')) ? query(collection(firestore, 'wave_expenses')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const financialTransactionsQ = useMemoFirebase(() => (firestore && user && roleResolved && can('ministerial_finance')) ? query(collection(firestore, 'financial_transactions')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const financeRequestsQ = useMemoFirebase(() => (firestore && user && roleResolved && can('ministerial_finance')) ? query(collection(firestore, 'finance_requests')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const savedSchedulesQ = useMemoFirebase(() => (firestore && user && roleResolved && can('servico_schedule')) ? query(collection(firestore, 'saved_schedules')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const roomsQ = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    if (shouldLoadPublicData || (roleResolved && can('ministerial_reservations'))) {
      return query(collection(firestore, 'rooms'));
    }
    return null;
  }, [firestore, user, roleResolved, isAdmin, permissions, shouldLoadPublicData]);
  const strategicEventsQ = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    if (shouldLoadPublicData || roleResolved) {
      return query(collection(firestore, 'strategic_events'));
    }
    return null;
  }, [firestore, user, roleResolved, shouldLoadPublicData]);
  const theoflixCoursesQ = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'theoflix_courses')) : null, [firestore, user]);
  const reservationCategoriesQ = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    if (shouldLoadPublicData || (roleResolved && can('ministerial_reservations'))) {
      return query(collection(firestore, 'reservation_categories'));
    }
    return null;
  }, [firestore, user, roleResolved, isAdmin, permissions, shouldLoadPublicData]);
  
  // GC Hierarchy Queries (Exige login para respeitar as regras do Firestore)
  const cellsQ = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'cells')) : null, [firestore, user]);
  const gcAreasQ = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'areas')) : null, [firestore, user]);
  const redesQ = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'redes')) : null, [firestore, user]);

  // Queries públicas necessárias para matrículas
  const coursesQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
  const classesQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'classes')) : null, [firestore]);

  const { data: users, isLoading: lu } = useCollection<User>(usersQ);
  const { data: serviceAreas, isLoading: la } = useCollection<AreaOfService>(serviceAreasQ);
  const { data: teams, isLoading: lt } = useCollection<Team>(teamsQ);
  const { data: events, isLoading: le } = useCollection<VolunteeringEvent>(eventsQ);
  const { data: rooms, isLoading: lr } = useCollection<Room>(roomsQ);
  const { data: reservations, isLoading: lres } = useCollection<RoomReservation>(reservationsQ);
  const { data: strategicEvents, isLoading: lse } = useCollection<any>(strategicEventsQ);
  const { data: courses, isLoading: lco } = useCollection<Course>(coursesQ);
  const { data: classes, isLoading: lcl } = useCollection<Class>(classesQ);
  const { data: enrollmentRequests, isLoading: ler } = useCollection<EnrollmentRequest>(enrollmentRequestsQ);
  const { data: pedagogicalLogs, isLoading: lpl } = useCollection<PedagogicalLog>(pedagogicalLogsQ);
  const { data: wavePayments, isLoading: lwp } = useCollection<WavePayment>(wavePaymentsQ);
  const { data: disPayments, isLoading: ldp } = useCollection<DisPayment>(disPaymentsQ);
  const { data: wavePlans, isLoading: lwpn } = useCollection<WavePlan>(wavePlansQ);
  const { data: disPlans, isLoading: ldpn } = useCollection<DisPlan>(disPlansQ);
  const { data: waveExpenses, isLoading: lwe } = useCollection<WaveExpense>(waveExpensesQ);
  const { data: reservationCategories = [], isLoading: loadingCategories } = useCollection<ReservationCategory>(reservationCategoriesQ);
  const { data: theoflixCourses = [], isLoading: loadingTheoflix } = useCollection<any>(theoflixCoursesQ);
  const { data: financialTransactions, isLoading: lft } = useCollection<FinancialTransaction>(financialTransactionsQ);
  const { data: financeRequests, isLoading: lfr } = useCollection<FinanceRequest>(financeRequestsQ);
  const { data: savedSchedules, isLoading: lss } = useCollection<SavedSchedule>(savedSchedulesQ);
  const { data: cells, isLoading: lce } = useCollection<Cell>(cellsQ);
  const { data: gcAreas, isLoading: lga } = useCollection<Area>(gcAreasQ);
  const { data: redes, isLoading: lre } = useCollection<Rede>(redesQ);

  const isLoading = loadingRole || loadingProfile || (user ? lu : false) || la || lt || le || (user ? lr : false) || lres || lse || lco || lcl || ler || lpl || lwp || ldp || lwpn || ldpn || lwe || loadingCategories || (user ? loadingTheoflix : false) || lft || lfr || lss || lce || lga || lre;

  const value = useMemo(() => ({
    users: users || [],
    serviceAreas: serviceAreas || [],
    teams: teams || [],
    events: events || [],
    rooms: rooms || [],
    reservations: reservations || [],
    strategicEvents: strategicEvents || [],
    courses: courses || [],
    classes: classes || [],
    enrollmentRequests: enrollmentRequests || [],
    pedagogicalLogs: pedagogicalLogs || [],
    wavePayments: wavePayments || [],
    disPayments: disPayments || [],
    wavePlans: wavePlans || [],
    disPlans: disPlans || [],
    waveExpenses: waveExpenses || [],
    theoflixCourses: theoflixCourses || [],
    financialTransactions: financialTransactions || [],
    financeRequests: financeRequests || [],
    savedSchedules: savedSchedules || [],
    reservationCategories: reservationCategories || [],
    cells: cells || [],
    areas: gcAreas || [],
    redes: redes || [],
    isLoading,
    addArea: async (data: any) => { await addDoc(collection(firestore!, 'areas_of_service'), data); },
    updateArea: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'areas_of_service', id), data); },
    deleteArea: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'areas_of_service', id)); },
    addTeam: async (data: any) => { await addDoc(collection(firestore!, 'teams'), data); },
    updateTeam: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'teams', id), data); },
    deleteTeam: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'teams', id)); },
    addEvent: async (data: any) => { await addDoc(collection(firestore!, 'volunteering_events'), data); },
    updateEvent: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'volunteering_events', id), data); },
    deleteEvent: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'volunteering_events', id)); },
    addRoom: async (data: any) => { await addDoc(collection(firestore!, 'rooms'), data); },
    deleteRoom: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'rooms', id)); },
    addReservationCategory: async (data: any) => { await addDoc(collection(firestore!, 'reservation_categories'), data); },
    deleteReservationCategory: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'reservation_categories', id)); },
    addReservation: async (data: any) => { await addDoc(collection(firestore!, 'room_reservations'), data); },
    updateReservation: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'room_reservations', id), data); },
    deleteReservation: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'room_reservations', id)); },
    updateVolunteer: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'users', id), data); },
    addUser: async (data: any) => {
      const res = await addDoc(collection(firestore!, 'users'), { ...data, createdAt: Timestamp.now() });
      return res.id;
    },
    addCourse: async (data: any) => { await addDoc(collection(firestore!, 'courses'), data); },
    addClass: async (data: any) => {
      const res = await addDoc(collection(firestore!, 'classes'), data);
      if (data.locationId && data.locationId !== 'the_school' && data.locationId !== 'null') {
        const roomObj = (rooms || []).find(r => r.id === data.locationId);
        await addDoc(collection(firestore!, 'room_reservations'), {
          eventName: `Aulas: ${data.name}`,
          rooms: [roomObj?.name || 'Sala'],
          startDateTime: Timestamp.fromDate(new Date(`${data.startDate}T${data.startTime}`)),
          endDateTime: Timestamp.fromDate(new Date(`${data.startDate}T${data.endTime}`)),
          recurrenceEndDate: data.endDate ? Timestamp.fromDate(new Date(`${data.endDate}T23:59:59`)) : null,
          frequency: data.frequency,
          dayOfWeek: data.dayOfWeek,
          weekOfMonth: data.weekOfMonth,
          status: 'approved',
          requesterId: 'system',
          id: `class_res_${res.id}`,
          createdAt: Timestamp.now()
        });
      }
    },
    updateClass: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'classes', id), data); },
    deleteClass: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'classes', id)); },
    enrollStudent: async (studentId: string, courseId: string, classId?: string) => {
      if (classId) {
        const classRef = doc(firestore!, 'classes', classId);
        const cls = (classes || []).find(c => c.id === classId);
        if (cls && !cls.students.includes(studentId)) {
          await updateDocumentNonBlocking(classRef, { students: [...cls.students, studentId] });
        }
      } else {
        // Se não passou classId, tenta encontrar se há apenas UMA turma para este curso
        const relevantClasses = (classes || []).filter(c => c.courseId === courseId);
        if (relevantClasses.length === 1) {
            const cls = relevantClasses[0];
            if (!cls.students.includes(studentId)) {
                await updateDocumentNonBlocking(doc(firestore!, 'classes', cls.id), { students: [...cls.students, studentId] });
            }
        }
        // Se houver mais de uma, não faz nada (o usuário deve selecionar no UI)
      }
    },
    addPedagogicalLog: async (data: any) => { await addDoc(collection(firestore!, 'pedagogical_logs'), data); },
    addWavePayment: async (data: any) => { await addDoc(collection(firestore!, 'wave_payments'), data); },
    updateWavePayment: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'wave_payments', id), data); },
    deleteWavePayment: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'wave_payments', id)); },
    addDisPayment: async (data: any) => { await addDoc(collection(firestore!, 'dis_payments'), data); },
    updateDisPayment: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'dis_payments', id), data); },
    deleteDisPayment: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'dis_payments', id)); },
    addWavePlan: async (data: any) => { await addDoc(collection(firestore!, 'wave_plans'), data); },
    updateWavePlan: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'wave_plans', id), data); },
    deleteWavePlan: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'wave_plans', id)); },
    addDisPlan: async (data: any) => { await addDoc(collection(firestore!, 'dis_plans'), data); },
    updateDisPlan: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'dis_plans', id), data); },
    deleteDisPlan: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'dis_plans', id)); },
    addWaveExpense: async (data: any) => { await addDoc(collection(firestore!, 'wave_expenses'), data); },
    updateWaveExpense: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'wave_expenses', id), data); },
    deleteWaveExpense: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'wave_expenses', id)); },
    addFinancialTransaction: async (data: any) => { await addDoc(collection(firestore!, 'financial_transactions'), data); },
    updateFinancialTransaction: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'financial_transactions', id), data); },
    deleteFinancialTransaction: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'financial_transactions', id)); },
    addFinanceRequest: async (data: any) => { await addDoc(collection(firestore!, 'finance_requests'), data); },
    updateFinanceRequest: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'finance_requests', id), data); },
    deleteFinanceRequest: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'finance_requests', id)); },
    approveEnrollmentRequest: async (requestId: string, classId: string) => {
      const req = (enrollmentRequests || []).find(r => r.id === requestId);
      if (!req) return;
      const targetClass = (classes || []).find(c => c.id === classId);
      if (!targetClass) return;

      let studentId = (users || []).find(u => u.email === req.email || u.phone === req.phone)?.id;
      if (!studentId) {
        const newUser = await addDoc(collection(firestore!, 'users'), {
          name: req.name, email: req.email, phone: req.phone, integrationStatus: 'nao_alcancado', createdAt: Timestamp.now()
        });
        studentId = newUser.id;
      }

      await updateDocumentNonBlocking(doc(firestore!, 'classes', classId), { students: [...targetClass.students, studentId] });
      await updateDocumentNonBlocking(doc(firestore!, 'enrollment_requests', requestId), { status: 'approved' });
    },
    updateEnrollmentRequest: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'enrollment_requests', id), data); },
    deleteEnrollmentRequest: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'enrollment_requests', id)); },
    markAttendanceByTheoflix: async (userId: string, theoflixCourseId: string, episodeIndex: number, lessonNotes?: string) => {
      // Find physical courses linked to this theoflixCourseId
      const linkedCourses = (courses || []).filter(c => 
         c.id === theoflixCourseId || 
         c.linkedTheoflixId === theoflixCourseId || 
         c.syllabus?.some((s: any) => s.theoflixCourseId === theoflixCourseId)
      );
      const linkedCourseIds = linkedCourses.map(c => c.id);

      // Find classes where user is enrolled for these physical courses
      const relevantClasses = (classes || []).filter(c => 
         linkedCourseIds.includes(c.courseId) && c.students?.includes(userId)
      );

      for (const cls of relevantClasses) {
        const physicalCourse = linkedCourses.find(c => c.id === cls.courseId);
        const syllabus = physicalCourse?.syllabus || [];
        
        // Find which syllabus module requires this episode
        const episodeIdxStr = episodeIndex.toString();
        let targetSyllabusIndex = -1;
        
        const hybridIndex = syllabus.findIndex((mod: any) => 
            mod.theoflixCourseId === theoflixCourseId && 
            mod.theoflixRequiredVideoIds?.includes(episodeIdxStr)
        );

        if (hybridIndex !== -1) {
            targetSyllabusIndex = hybridIndex;
        } else if (physicalCourse?.id === theoflixCourseId || physicalCourse?.linkedTheoflixId === theoflixCourseId) {
            targetSyllabusIndex = episodeIndex;
        }

        if (targetSyllabusIndex === -1) continue;
        // Build the projected schedule to accurately find the date for this episode
        const items: any[] = [];
        if (cls && cls.startDate) {
            const start = parseISO(cls.startDate);
            const holidaySet = new Set(cls.holidayDates || []);
            const overrides = cls.scheduleOverrides || {};
            
            let currentDate = start;
            let syllabusIndex = 0;
            let safeCounter = 0;
            const targetCount = syllabus.length > 0 ? syllabus.length : 12;

            while (items.length < targetCount && safeCounter < 200) {
                safeCounter++;
                const dateStr = format(currentDate, 'yyyy-MM-dd');
                
                if (holidaySet.has(dateStr) && !overrides[dateStr]) {
                    currentDate = addWeeks(currentDate, cls.frequency === 'quinzenal' ? 2 : 1);
                    continue;
                }

                const override = overrides[dateStr];
                if (override?.isCancelled) {
                    currentDate = addWeeks(currentDate, cls.frequency === 'quinzenal' ? 2 : 1);
                    continue;
                }

                const originalIdx = override?.syllabusId ? syllabus.findIndex(s => s.id === override.syllabusId) : syllabusIndex;
                items.push({ dateStr, syllabusOriginalIndex: originalIdx });
                
                syllabusIndex++;
                currentDate = addWeeks(currentDate, cls.frequency === 'quinzenal' ? 2 : 1);
            }

            Object.entries(overrides).forEach(([dateStr, override]: [string, any]) => {
                if (override.isCancelled) return;
                if (items.find(i => i.dateStr === dateStr)) return;
                const originalIdx = override.syllabusId ? syllabus.findIndex(s => s.id === override.syllabusId) : -1;
                items.push({ dateStr, syllabusOriginalIndex: originalIdx });
            });

            const extraSessions = cls.extraSessions || [];
            extraSessions.forEach((session: any) => {
                if (items.find(i => i.dateStr === session.date)) return;
                const originalIdx = session.syllabusId ? syllabus.findIndex(s => s.id === session.syllabusId) : -1;
                items.push({ dateStr: session.date, syllabusOriginalIndex: originalIdx });
            });
            
            items.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
        }
        
        const matchedItem = items.find((i: any) => i.syllabusOriginalIndex === targetSyllabusIndex);
        if (!matchedItem) continue;

        // Validar se todos os vídeos exigidos para este módulo foram assistidos
        const mod = syllabus[targetSyllabusIndex] as any;
        const requiredVideoIds = mod?.theoflixRequiredVideoIds || [];
        if (requiredVideoIds.length > 0) {
          const userRef = doc(firestore!, 'users', userId);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.data() as any;
          const userProgress = userData?.journey?.theoflixProgress?.[theoflixCourseId] || {};
          
          const currentTheoflixCourse = theoflixCourses?.find((tc: any) => tc.id === theoflixCourseId);
          const episodes = currentTheoflixCourse?.episodes || [];
          
          const allWatched = requiredVideoIds.every((reqIndexStr: string) => {
            const reqIndex = parseInt(reqIndexStr, 10);
            const reqEpisode = episodes[reqIndex];
            if (!reqEpisode) return false;
            const reqEpKey = reqEpisode.youtubeId || reqEpisode.title.replace(/\s+/g, '_');
            return userProgress[reqEpKey] === true || reqIndex === episodeIndex;
          });
          
          if (!allWatched) {
            continue;
          }
        }
        
        const targetDate = matchedItem.dateStr;
        const existingAttendance = cls.attendance || [];
        const recordIdx = existingAttendance.findIndex((a: any) => a.date === targetDate);
        const notes = lessonNotes?.trim();

        if (recordIdx > -1) {
          const record = existingAttendance[recordIdx];
          let changed = false;
          // Adiciona userId à lista online se ainda não estiver
          if (!record.onlineStudentIds?.includes(userId)) {
            record.onlineStudentIds = [...(record.onlineStudentIds || []), userId];
            changed = true;
          }
          // Salva/atualiza as anotações (sempre, para permitir edição)
          if (notes) {
            record.lessonNotes = { ...((record.lessonNotes || {}) as any), [userId]: notes };
            changed = true;
          }
          if (changed) {
            await updateDocumentNonBlocking(doc(firestore!, 'classes', cls.id), { attendance: existingAttendance });
          }
        } else {
          const newRecord: any = { date: targetDate, presentStudentIds: [], onlineStudentIds: [userId] };
          if (notes) newRecord.lessonNotes = { [userId]: notes };
          existingAttendance.push(newRecord);
          await updateDocumentNonBlocking(doc(firestore!, 'classes', cls.id), { attendance: existingAttendance });
        }
      }
    },
    saveSchedule: async (data: any) => {
      const id = `${data.areaId}_${data.month}`;
      await setDocumentNonBlocking(doc(firestore!, 'saved_schedules', id), data);
    },
    deleteSchedule: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'saved_schedules', id)); },
  }), [users, serviceAreas, gcAreas, cells, redes, teams, events, rooms, reservations, reservationCategories, courses, classes, enrollmentRequests, pedagogicalLogs, wavePayments, disPayments, wavePlans, disPlans, waveExpenses, theoflixCourses, financialTransactions, financeRequests, savedSchedules, isLoading, firestore]);

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

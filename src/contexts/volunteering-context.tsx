'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, Timestamp, addDoc } from 'firebase/firestore';

export type User = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  integrationStatus?: string;
  serviceStatus?: 'serving' | 'not_serving';
  serviceAreaId?: string;
  serviceTeamId?: string;
  eligibleEventIds?: string[];
  blockedDates?: string[];
  lastServedDate?: Timestamp;
  isTeacher?: boolean;
  taughtCourseIds?: string[];
  financialStatus?: string;
  journey?: {
    stageProgress?: Record<string, any>;
    memberCourseProgress?: Record<string, boolean>;
    theoflixProgress?: Record<string, Record<string, boolean>>;
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
  extraDates?: string[];
  attendance?: { date: string; presentStudentIds: string[]; onlineStudentIds?: string[] }[];
  grades?: { studentId: string; assessmentName: string; grade: number }[];
  materials?: { title: string; url: string; description?: string }[];
};

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
  contaAzulSync?: boolean;
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
  createdAt: Timestamp;
};

interface VolunteeringContextType {
  users: User[];
  areas: AreaOfService[];
  teams: Team[];
  events: VolunteeringEvent[];
  rooms: Room[];
  reservations: RoomReservation[];
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
  addReservation: (data: Omit<RoomReservation, 'id'>) => Promise<void>;
  updateReservation: (id: string, data: Partial<RoomReservation>) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;
  updateVolunteer: (id: string, data: Partial<User>) => Promise<void>;
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
  markAttendanceByTheoflix: (userId: string, courseId: string, episodeIndex: number) => Promise<void>;
  saveSchedule: (data: any) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
}

const VolunteeringContext = createContext<VolunteeringContextType | undefined>(undefined);

export function VolunteeringProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();

  const usersQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const areasQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'areas_of_service')) : null, [firestore]);
  const teamsQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'teams')) : null, [firestore]);
  const eventsQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'volunteering_events')) : null, [firestore]);
  const roomsQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'rooms')) : null, [firestore]);
  const reservationsQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'room_reservations')) : null, [firestore]);
  const coursesQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
  const classesQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'classes')) : null, [firestore]);
  const enrollmentRequestsQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'enrollment_requests')) : null, [firestore]);
  const pedagogicalLogsQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'pedagogical_logs')) : null, [firestore]);
  const wavePaymentsQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'wave_payments')) : null, [firestore]);
  const disPaymentsQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'dis_payments')) : null, [firestore]);
  const wavePlansQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'wave_plans')) : null, [firestore]);
  const disPlansQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'dis_plans')) : null, [firestore]);
  const waveExpensesQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'wave_expenses')) : null, [firestore]);
  const theoflixCoursesQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'theoflix_courses')) : null, [firestore]);
  const financialTransactionsQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'financial_transactions')) : null, [firestore]);
  const financeRequestsQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'finance_requests')) : null, [firestore]);

  const { data: users, isLoading: lu } = useCollection<User>(usersQ);
  const { data: areas, isLoading: la } = useCollection<AreaOfService>(areasQ);
  const { data: teams, isLoading: lt } = useCollection<Team>(teamsQ);
  const { data: events, isLoading: le } = useCollection<VolunteeringEvent>(eventsQ);
  const { data: rooms, isLoading: lr } = useCollection<Room>(roomsQ);
  const { data: reservations, isLoading: lres } = useCollection<RoomReservation>(reservationsQ);
  const { data: courses, isLoading: lco } = useCollection<Course>(coursesQ);
  const { data: classes, isLoading: lcl } = useCollection<Class>(classesQ);
  const { data: enrollmentRequests, isLoading: ler } = useCollection<EnrollmentRequest>(enrollmentRequestsQ);
  const { data: pedagogicalLogs, isLoading: lpl } = useCollection<PedagogicalLog>(pedagogicalLogsQ);
  const { data: wavePayments, isLoading: lwp } = useCollection<WavePayment>(wavePaymentsQ);
  const { data: disPayments, isLoading: ldp } = useCollection<DisPayment>(disPaymentsQ);
  const { data: wavePlans, isLoading: lwpn } = useCollection<WavePlan>(wavePlansQ);
  const { data: disPlans, isLoading: ldpn } = useCollection<DisPlan>(disPlansQ);
  const { data: waveExpenses, isLoading: lwe } = useCollection<WaveExpense>(waveExpensesQ);
  const { data: theoflixCourses, isLoading: ltc } = useCollection<any>(theoflixCoursesQ);
  const { data: financialTransactions, isLoading: lft } = useCollection<FinancialTransaction>(financialTransactionsQ);
  const { data: financeRequests, isLoading: lfr } = useCollection<FinanceRequest>(financeRequestsQ);

  const isLoading = lu || la || lt || le || lr || lres || lco || lcl || ler || lpl || lwp || ldp || lwpn || ldpn || lwe || ltc || lft || lfr;

  const value = useMemo(() => ({
    users: users || [],
    areas: areas || [],
    teams: teams || [],
    events: events || [],
    rooms: rooms || [],
    reservations: reservations || [],
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
    isLoading,
    addArea: (data: any) => addDocumentNonBlocking(collection(firestore!, 'areas_of_service'), data),
    updateArea: (id: string, data: any) => updateDocumentNonBlocking(doc(firestore!, 'areas_of_service', id), data),
    deleteArea: (id: string) => deleteDocumentNonBlocking(doc(firestore!, 'areas_of_service', id)),
    addTeam: (data: any) => addDocumentNonBlocking(collection(firestore!, 'teams'), data),
    updateTeam: (id: string, data: any) => updateDocumentNonBlocking(doc(firestore!, 'teams', id), data),
    deleteTeam: (id: string) => deleteDocumentNonBlocking(doc(firestore!, 'teams', id)),
    addEvent: (data: any) => addDocumentNonBlocking(collection(firestore!, 'volunteering_events'), data),
    updateEvent: (id: string, data: any) => updateDocumentNonBlocking(doc(firestore!, 'volunteering_events', id), data),
    deleteEvent: (id: string) => deleteDocumentNonBlocking(doc(firestore!, 'volunteering_events', id)),
    addRoom: (data: any) => addDocumentNonBlocking(collection(firestore!, 'rooms'), data),
    deleteRoom: (id: string) => deleteDocumentNonBlocking(doc(firestore!, 'rooms', id)),
    addReservation: (data: any) => addDocumentNonBlocking(collection(firestore!, 'room_reservations'), data),
    updateReservation: (id: string, data: any) => updateDocumentNonBlocking(doc(firestore!, 'room_reservations', id), data),
    deleteReservation: (id: string) => deleteDocumentNonBlocking(doc(firestore!, 'room_reservations', id)),
    updateVolunteer: (id: string, data: any) => updateDocumentNonBlocking(doc(firestore!, 'users', id), data),
    addUser: async (data: any) => {
        const res = await addDoc(collection(firestore!, 'users'), { ...data, createdAt: Timestamp.now() });
        return res.id;
    },
    addCourse: (data: any) => addDocumentNonBlocking(collection(firestore!, 'courses'), data),
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
    updateClass: (id: string, data: any) => updateDocumentNonBlocking(doc(firestore!, 'classes', id), data),
    deleteClass: (id: string) => deleteDocumentNonBlocking(doc(firestore!, 'classes', id)),
    enrollStudent: async (studentId: string, courseId: string, classId?: string) => {
        if (classId) {
            const classRef = doc(firestore!, 'classes', classId);
            const cls = (classes || []).find(c => c.id === classId);
            if (cls && !cls.students.includes(studentId)) {
                await updateDocumentNonBlocking(classRef, { students: [...cls.students, studentId] });
            }
        } else {
            const relevantClasses = (classes || []).filter(c => c.courseId === courseId);
            for (const cls of relevantClasses) {
                if (!cls.students.includes(studentId)) {
                    await updateDocumentNonBlocking(doc(firestore!, 'classes', cls.id), { students: [...cls.students, studentId] });
                }
            }
        }
    },
    addPedagogicalLog: (data: any) => addDocumentNonBlocking(collection(firestore!, 'pedagogical_logs'), data),
    addWavePayment: (data: any) => addDocumentNonBlocking(collection(firestore!, 'wave_payments'), data),
    updateWavePayment: (id: string, data: any) => updateDocumentNonBlocking(doc(firestore!, 'wave_payments', id), data),
    deleteWavePayment: (id: string) => deleteDocumentNonBlocking(doc(firestore!, 'wave_payments', id)),
    addDisPayment: (data: any) => addDocumentNonBlocking(collection(firestore!, 'dis_payments'), data),
    updateDisPayment: (id: string, data: any) => updateDocumentNonBlocking(doc(firestore!, 'dis_payments', id), data),
    deleteDisPayment: (id: string) => deleteDocumentNonBlocking(doc(firestore!, 'dis_payments', id)),
    addWavePlan: (data: any) => addDocumentNonBlocking(collection(firestore!, 'wave_plans'), data),
    updateWavePlan: (id: string, data: any) => updateDocumentNonBlocking(doc(firestore!, 'wave_plans', id), data),
    deleteWavePlan: (id: string) => deleteDocumentNonBlocking(doc(firestore!, 'wave_plans', id)),
    addDisPlan: (data: any) => addDocumentNonBlocking(collection(firestore!, 'dis_plans'), data),
    updateDisPlan: (id: string, data: any) => updateDocumentNonBlocking(doc(firestore!, 'dis_plans', id), data),
    deleteDisPlan: (id: string) => deleteDocumentNonBlocking(doc(firestore!, 'dis_plans', id)),
    addWaveExpense: (data: any) => addDocumentNonBlocking(collection(firestore!, 'wave_expenses'), data),
    updateWaveExpense: (id: string, data: any) => updateDocumentNonBlocking(doc(firestore!, 'wave_expenses', id), data),
    deleteWaveExpense: (id: string) => deleteDocumentNonBlocking(doc(firestore!, 'wave_expenses', id)),
    addFinancialTransaction: (data: any) => addDocumentNonBlocking(collection(firestore!, 'financial_transactions'), data),
    updateFinancialTransaction: (id: string, data: any) => updateDocumentNonBlocking(doc(firestore!, 'financial_transactions', id), data),
    deleteFinancialTransaction: (id: string) => deleteDocumentNonBlocking(doc(firestore!, 'financial_transactions', id)),
    addFinanceRequest: (data: any) => addDocumentNonBlocking(collection(firestore!, 'finance_requests'), data),
    updateFinanceRequest: (id: string, data: any) => updateDocumentNonBlocking(doc(firestore!, 'finance_requests', id), data),
    deleteFinanceRequest: (id: string) => deleteDocumentNonBlocking(doc(firestore!, 'finance_requests', id)),
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
    updateEnrollmentRequest: (id: string, data: any) => updateDocumentNonBlocking(doc(firestore!, 'enrollment_requests', id), data),
    deleteEnrollmentRequest: (id: string) => deleteDocumentNonBlocking(doc(firestore!, 'enrollment_requests', id)),
    markAttendanceByTheoflix: async (userId: string, courseId: string, episodeIndex: number) => {
        const relevantClasses = (classes || []).filter(c => c.courseId === courseId && c.students.includes(userId));
        for (const cls of relevantClasses) {
            const today = new Date().toISOString().split('T')[0];
            const existingAttendance = cls.attendance || [];
            const recordIdx = existingAttendance.findIndex(a => a.date === today);
            if (recordIdx > -1) {
                const record = existingAttendance[recordIdx];
                if (!record.onlineStudentIds?.includes(userId)) {
                    record.onlineStudentIds = [...(record.onlineStudentIds || []), userId];
                    await updateDocumentNonBlocking(doc(firestore!, 'classes', cls.id), { attendance: existingAttendance });
                }
            } else {
                existingAttendance.push({ date: today, presentStudentIds: [], onlineStudentIds: [userId] });
                await updateDocumentNonBlocking(doc(firestore!, 'classes', cls.id), { attendance: existingAttendance });
            }
        }
    },
    saveSchedule: (data: any) => {
        const id = `${data.areaId}_${data.month}`;
        return setDocumentNonBlocking(doc(firestore!, 'saved_schedules', id), data);
    },
    deleteSchedule: (id: string) => deleteDocumentNonBlocking(doc(firestore!, 'saved_schedules', id)),
  }), [users, areas, teams, events, rooms, reservations, courses, classes, enrollmentRequests, pedagogicalLogs, wavePayments, disPayments, wavePlans, disPlans, waveExpenses, theoflixCourses, financialTransactions, financeRequests, isLoading, firestore]);

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


'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import { useFirebase, useCollection, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, Timestamp, query, orderBy, getDoc, updateDoc, arrayUnion, getDocs, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format, addWeeks, isBefore, parseISO, addMonths } from 'date-fns';

// --- TYPES ---
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

export type User = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  isTeacher?: boolean;
  taughtCourseIds?: string[];
  serviceStatus?: 'serving' | 'not_serving';
  serviceAreaId?: string;
  serviceTeamId?: string;
  eligibleEventIds?: string[];
  blockedDates?: string[];
  lastServedDate?: Timestamp;
  financialStatus?: 'active' | 'blocked' | 'delinquent';
  absenceCount?: number;
  integrationStatus?: string;
  journey?: {
      memberCourseProgress?: Record<string, boolean>;
      courseStatus?: Record<string, string>;
      stageProgress?: Record<string, any>;
      theoflixProgress?: Record<string, Record<string, boolean>>;
  }
}

export type VolunteeringEvent = {
  id: string;
  name: string;
  frequency: 'semanal' | 'pontual';
  time: string;
  dayOfWeek?: string;
  date?: string;
  room?: string;
  requiredAreas?: { areaId: string; quantity: number }[];
}

export type Room = {
    id: string;
    name: string;
};

export type Course = {
  id: string;
  name: string;
  ministryName: string;
  description?: string;
  type?: 'trilho' | 'eletivo';
  ebdTrack?: 'teologico' | 'biblico' | 'discipulado';
  linkedTheoflixId?: string;
};

// TheoFlix Course Type
export type TheoflixCourse = {
    id: string;
    title: string;
    image?: string;
    episodes: { title: string; youtubeId: string; duration?: string }[];
};

export type Class = {
  id: string;
  courseId: string;
  name: string;
  teacherId: string;
  students: string[];
  frequency: 'pontual' | 'semanal' | 'quinzenal' | 'mensal';
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  dayOfWeek?: string;
  weekOfMonth?: '1' | '2' | '3' | '4' | 'last' | '5';
  locationId?: string;
  holidayDates?: string[];
  attendance?: { date: string; presentStudentIds: string[] }[];
  grades?: { studentId: string, assessmentName: string, grade: number }[];
  materials?: { title: string; url: string; description?: string }[];
};

export type PedagogicalLog = {
    id: string;
    classId: string;
    date: Timestamp;
    content_taught: string;
    student_performance: number;
    observations: string;
};

export type RoomReservation = {
    id: string;
    eventName: string;
    requesterId: string;
    rooms: string[];
    startDateTime: any;
    endDateTime: any;
    recurrenceEndDate?: any;
    status: 'pending' | 'approved' | 'rejected';
    notes?: string;
    equipmentNotes?: string;
    kitchenUsage?: boolean;
    requiredPatrimonyIds?: string[];
    createdAt: any;
    frequency: 'pontual' | 'semanal' | 'quinzenal' | 'mensal';
    dayOfWeek?: string;
    weekOfMonth?: '1' | '2' | '3' | '4' | 'last' | '5';
}

export type SavedSchedule = {
  id: string;
  areaId: string;
  month: string;
  schedule: any;
}

export type WavePlan = {
  id: string;
  name: string;
  price: number;
}

export type WavePayment = {
  id: string;
  userId: string;
  planId: string;
  month: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  splits?: {
    wave: number;
    teacher: number;
    ibm: number;
    admin: number;
  }
}

export type WaveExpense = {
    id: string;
    description: string;
    amount: number;
    date: Timestamp;
    receiptUrl?: string;
}

export type DisPlan = {
  id: string;
  name: string;
  price: number;
}

export type DisPayment = {
  id: string;
  userId: string;
  planId: string;
  month: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  contaAzulInvoiceId?: string;
}

export type EnrollmentRequest = {
    id: string;
    userId: string;
    name: string;
    email?: string;
    phone: string;
    courseId: string;
    classId?: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: Timestamp;
};

export type FinancialTransaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: Timestamp;
  description: string;
  status: 'paid' | 'pending';
  memberId?: string;
  paymentMethod?: 'PIX' | 'Dinheiro' | 'Cartão' | 'Transferência';
  contaAzulSync?: boolean;
}

type AreaData = Omit<AreaOfService, 'id'>;
type TeamData = Omit<Team, 'id'>;
type RoomData = Omit<Room, 'id'>;
type EventData = Omit<VolunteeringEvent, 'id'>;
type ReservationData = Omit<RoomReservation, 'id'>;
type SavedScheduleData = Omit<SavedSchedule, 'id'>;
type WavePlanData = Omit<WavePlan, 'id'>;
type WavePaymentData = Omit<WavePayment, 'id'>;
type WaveExpenseData = Omit<WaveExpense, 'id'>;
type DisPlanData = Omit<DisPlan, 'id'>;
type DisPaymentData = Omit<DisPayment, 'id'>;
type PedagogicalLogData = Omit<PedagogicalLog, 'id'>;
type ClassData = Omit<Class, 'id'>;
type EnrollmentRequestData = Omit<EnrollmentRequest, 'id'>;
type FinancialTransactionData = Omit<FinancialTransaction, 'id'>;

interface VolunteeringContextType {
  areas: AreaOfService[];
  users: User[];
  teams: Team[];
  rooms: Room[];
  events: VolunteeringEvent[];
  courses: Course[];
  theoflixCourses: TheoflixCourse[];
  classes: Class[];
  pedagogicalLogs: PedagogicalLog[];
  reservations: RoomReservation[];
  savedSchedules: SavedSchedule[];
  wavePlans: WavePlan[];
  wavePayments: WavePayment[];
  waveExpenses: WaveExpense[];
  disPlans: DisPlan[];
  disPayments: DisPayment[];
  enrollmentRequests: EnrollmentRequest[];
  financialTransactions: FinancialTransaction[];
  isLoading: boolean;
  
  addArea: (data: AreaData) => Promise<void>;
  updateArea: (id: string, data: Partial<AreaData>) => Promise<void>;
  deleteArea: (id: string) => Promise<void>;
  addTeam: (data: TeamData) => Promise<void>;
  updateTeam: (id: string, data: Partial<TeamData>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  addRoom: (data: RoomData) => Promise<void>;
  updateRoom: (id: string, data: Partial<RoomData>) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;
  addEvent: (data: EventData) => Promise<void>;
  updateEvent: (id: string, data: Partial<EventData>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  addReservation: (data: ReservationData) => Promise<void>;
  updateReservation: (id: string, data: Partial<ReservationData>) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;
  addUser: (data: Partial<User>) => Promise<string>;
  updateVolunteer: (id: string, data: Partial<User>) => Promise<void>;
  saveSchedule: (data: SavedScheduleData) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  addClass: (data: ClassData) => Promise<void>;
  updateClass: (id: string, data: Partial<ClassData>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  addWavePlan: (data: WavePlanData) => Promise<void>;
  updateWavePlan: (id: string, data: Partial<WavePlanData>) => Promise<void>;
  deleteWavePlan: (id: string) => Promise<void>;
  addWavePayment: (data: WavePaymentData) => Promise<void>;
  updateWavePayment: (id: string, data: Partial<WavePaymentData>) => Promise<void>;
  deleteWavePayment: (id: string) => Promise<void>;
  addWaveExpense: (data: WaveExpenseData) => Promise<void>;
  updateWaveExpense: (id: string, data: Partial<WaveExpenseData>) => Promise<void>;
  deleteWaveExpense: (id: string) => Promise<void>;
  addDisPlan: (data: DisPlanData) => Promise<void>;
  updateDisPlan: (id: string, data: Partial<DisPlanData>) => Promise<void>;
  deleteDisPlan: (id: string) => Promise<void>;
  addDisPayment: (data: DisPaymentData) => Promise<void>;
  updateDisPayment: (id: string, data: Partial<DisPaymentData>) => Promise<void>;
  deleteDisPayment: (id: string) => Promise<void>;
  addPedagogicalLog: (data: PedagogicalLogData) => Promise<void>;
  updatePedagogicalLog: (id: string, data: Partial<PedagogicalLogData>) => Promise<void>;
  deletePedagogicalLog: (id: string) => Promise<void>;
  updateEnrollmentRequest: (id: string, data: Partial<EnrollmentRequestData>) => Promise<void>;
  deleteEnrollmentRequest: (id: string) => Promise<void>;
  approveEnrollmentRequest: (requestId: string, classId?: string) => Promise<void>;
  enrollStudent: (studentId: string, courseId: string, specificClassId?: string) => Promise<void>;
  addFinancialTransaction: (data: FinancialTransactionData) => Promise<void>;
  updateFinancialTransaction: (id: string, data: Partial<FinancialTransactionData>) => Promise<void>;
  deleteFinancialTransaction: (id: string) => Promise<void>;
  markAttendanceByTheoflix: (userId: string, theoflixCourseId: string, episodeIndex: number) => Promise<void>;
}

const weekDayMap: Record<string, number> = {
    "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3,
    "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6
};

const VolunteeringContext = createContext<VolunteeringContextType | undefined>(undefined);

export function VolunteeringProvider({ children }: { children: React.ReactNode }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const areasQuery = useMemoFirebase(() => firestore ? collection(firestore, 'areas_of_service') : null, [firestore]);
  const teamsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'teams') : null, [firestore]);
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const eventsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'volunteering_events') : null, [firestore]);
  const roomsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'rooms') : null, [firestore]);
  const coursesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'courses') : null, [firestore]);
  const theoflixCoursesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'theoflix_courses') : null, [firestore]);
  const classesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
  const pedagogicalLogsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'pedagogical_logs') : null, [firestore]);
  const reservationsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'room_reservations') : null, [firestore]);
  const savedSchedulesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'saved_schedules') : null, [firestore]);
  const wavePlansQuery = useMemoFirebase(() => firestore ? collection(firestore, 'wave_plans') : null, [firestore]);
  const wavePaymentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'wave_payments') : null, [firestore]);
  const waveExpensesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'wave_expenses') : null, [firestore]);
  const disPlansQuery = useMemoFirebase(() => firestore ? collection(firestore, 'dis_plans') : null, [firestore]);
  const disPaymentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'dis_payments') : null, [firestore]);
  const enrollmentRequestsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'enrollment_requests') : null, [firestore]);
  
  const financialTransactionsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'financial_transactions'), orderBy('date', 'desc')) : null, 
    [firestore]
  );

  const { data: areas, isLoading: loadingAreas } = useCollection<AreaOfService>(areasQuery);
  const { data: teams, isLoading: loadingTeams } = useCollection<Team>(teamsQuery);
  const { data: users, isLoading: loadingUsers } = useCollection<User>(usersQuery);
  const { data: events, isLoading: loadingEvents } = useCollection<VolunteeringEvent>(eventsQuery);
  const { data: rooms, isLoading: loadingRooms } = useCollection<Room>(roomsQuery);
  const { data: courses, isLoading: loadingCourses } = useCollection<Course>(coursesQuery);
  const { data: theoflixCourses, isLoading: loadingTheoflix } = useCollection<TheoflixCourse>(theoflixCoursesQuery);
  const { data: classes, isLoading: loadingClasses } = useCollection<Class>(classesQuery);
  const { data: pedagogicalLogs, isLoading: loadingPedagogicalLogs } = useCollection<PedagogicalLog>(pedagogicalLogsQuery);
  const { data: reservations, isLoading: loadingReservations } = useCollection<RoomReservation>(reservationsQuery);
  const { data: savedSchedules, isLoading: loadingSavedSchedules } = useCollection<SavedSchedule>(savedSchedulesQuery);
  const { data: wavePlans, isLoading: loadingWavePlans } = useCollection<WavePlan>(wavePlansQuery);
  const { data: wavePayments, isLoading: loadingWavePayments } = useCollection<WavePayment>(wavePaymentsQuery);
  const { data: waveExpenses, isLoading: loadingWaveExpenses } = useCollection<WaveExpense>(waveExpensesQuery);
  const { data: disPlans, isLoading: loadingDisPlans } = useCollection<DisPlan>(disPlansQuery);
  const { data: disPayments, isLoading: loadingDisPayments } = useCollection<DisPayment>(disPaymentsQuery);
  const { data: enrollmentRequests, isLoading: loadingEnrollments } = useCollection<EnrollmentRequest>(enrollmentRequestsQuery);
  const { data: financialTransactions, isLoading: loadingFinances } = useCollection<FinancialTransaction>(financialTransactionsQuery);

  const isLoading = loadingAreas || loadingTeams || loadingUsers || loadingEvents || loadingRooms || loadingCourses || loadingTheoflix || loadingClasses || loadingPedagogicalLogs || loadingReservations || loadingSavedSchedules || loadingWavePlans || loadingWavePayments || loadingWaveExpenses || loadingDisPlans || loadingDisPayments || loadingEnrollments || loadingFinances;

  const createCrudFunctions = <T extends {id: string}>(collectionName: string, itemType: string) => {
      const addItem = async (data: Omit<T, 'id'>) => {
          if (!firestore) return;
          await addDocumentNonBlocking(collection(firestore, collectionName), data);
          toast({ title: 'Sucesso', description: `${itemType} cadastrado(a).` });
      };

      const updateItem = async (id: string, data: Partial<Omit<T, 'id'>>) => {
          if(!firestore) return;
          const itemDoc = doc(firestore, collectionName, id);
          await updateDocumentNonBlocking(itemDoc, data);
          toast({ title: 'Sucesso', description: `${itemType} atualizado(a).` });
      };

      const deleteItem = async (id: string) => {
          if(!firestore) return;
          const itemDoc = doc(firestore, collectionName, id);
          await deleteDocumentNonBlocking(itemDoc);
          toast({ title: 'Sucesso', description: `${itemType} removido(a) do sistema.` });
      };
      
      return { addItem, updateItem, deleteItem };
  };

  const { addItem: addArea, updateItem: updateArea, deleteItem: deleteArea } = createCrudFunctions<AreaOfService>('areas_of_service', 'Área');
  const { addItem: addTeam, updateItem: updateTeam, deleteItem: deleteTeam } = createCrudFunctions<Team>('teams', 'Equipe');
  const { addItem: addRoom, updateItem: updateRoom, deleteItem: deleteRoom } = createCrudFunctions<Room>('rooms', 'Ambiente');
  const { addItem: addReservation, updateItem: updateReservation, deleteItem: deleteReservation } = createCrudFunctions<RoomReservation>('room_reservations', 'Reserva');
  const { deleteItem: deleteSchedule } = createCrudFunctions<SavedSchedule>('saved_schedules', 'Escala Salva');
  
  const { addItem: addWavePlan, updateItem: updateWavePlan, deleteItem: deleteWavePlan } = createCrudFunctions<WavePlan>('wave_plans', 'Plano Wave');
  const { addItem: addWaveExpense, updateItem: updateWaveExpense, deleteItem: deleteWaveExpense } = createCrudFunctions<WaveExpense>('wave_expenses', 'Despesa Wave');
  const { addItem: addPedagogicalLog, updateItem: updatePedagogicalLog, deleteItem: deletePedagogicalLog } = createCrudFunctions<PedagogicalLog>('pedagogical_logs', 'Registro Pedagógico');
  const { addItem: addDisPlan, updateItem: updateDisPlan, deleteItem: deleteDisPlan } = createCrudFunctions<DisPlan>('dis_plans', 'Plano DIS');
  const { addItem: addDisPayment, updateItem: updateDisPayment, deleteItem: deleteDisPayment } = createCrudFunctions<DisPayment>('dis_payments', 'Pagamento DIS');
  const { updateItem: updateEnrollmentRequest, deleteItem: deleteEnrollmentRequest } = createCrudFunctions<EnrollmentRequest>('enrollment_requests', 'Solicitação');
  const { addItem: addFinancialTransaction, updateItem: updateFinancialTransaction, deleteItem: deleteFinancialTransaction } = createCrudFunctions<FinancialTransaction>('financial_transactions', 'Transação Financeira');
  
  const { deleteItem: deleteWavePayment } = createCrudFunctions<WavePayment>('wave_payments', 'Pagamento Wave');

  const addEvent = async (data: EventData) => {
    if(!firestore || !user) return;
    const eventsCollection = collection(firestore, 'volunteering_events');
    const newEventRef = doc(eventsCollection);
    const batch = writeBatch(firestore);
    
    batch.set(newEventRef, data);

    // Reserva automática de sala para o evento
    if (data.time && data.room) {
        const reservationsCollection = collection(firestore, 'room_reservations');
        
        let startDateTime: Timestamp;
        let endDateTime: Timestamp;

        if (data.frequency === 'semanal' && data.dayOfWeek) {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            startDateTime = Timestamp.fromDate(new Date(`${startOfToday.toISOString().split('T')[0]}T${data.time}`));
            endDateTime = Timestamp.fromDate(new Date(startDateTime.toDate().getTime() + 2 * 60 * 60 * 1000));
        } else if (data.date) {
            startDateTime = Timestamp.fromDate(new Date(`${data.date}T${data.time}`));
            endDateTime = Timestamp.fromDate(new Date(startDateTime.toDate().getTime() + 2 * 60 * 60 * 1000));
        } else {
            await batch.commit();
            toast({ title: 'Sucesso', description: `Evento "${data.name}" criado (sem reserva).` });
            return;
        }

        batch.set(doc(reservationsCollection), {
            eventName: data.name,
            requesterId: user.uid,
            rooms: [data.room],
            startDateTime,
            endDateTime,
            status: 'approved',
            frequency: data.frequency || 'pontual',
            dayOfWeek: data.dayOfWeek || '',
            notes: `Reserva automática criada a partir do evento: ${data.name}`,
            createdAt: Timestamp.now(),
        });
    }
    
    await batch.commit();
    toast({ title: 'Sucesso', description: `Evento "${data.name}" criado.` });
  };
  
  const updateEvent = async (id: string, data: Partial<EventData>) => {
    if(!firestore) return;
    await updateDocumentNonBlocking(doc(firestore, 'volunteering_events', id), data);
    toast({ title: 'Sucesso', description: `Evento atualizado.` });
  };
  
  const deleteEvent = async (id: string) => {
    if(!firestore) return;
    await deleteDocumentNonBlocking(doc(firestore, 'volunteering_events', id));
    toast({ title: 'Sucesso', description: 'O evento foi excluído.' });
  };

  const addUser = async (data: Partial<User>) => {
    if (!firestore) throw new Error('Firestore not available');
    const col = collection(firestore, 'users');
    const docRef = await addDocumentNonBlocking(col, {
        ...data,
        createdAt: Timestamp.now(),
        integrationStatus: data.integrationStatus || 'nao_alcancado',
    });
    return docRef.id;
  };

  const updateVolunteer = async (id: string, data: Partial<User>) => {
    if (!firestore) return;
    await updateDocumentNonBlocking(doc(firestore, 'users', id), data);
    toast({ title: 'Sucesso', description: `Perfil do membro atualizado.` });
  };
  
  const saveSchedule = async (data: SavedScheduleData) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'saved_schedules', `${data.areaId}_${data.month}`);
    await setDocumentNonBlocking(docRef, data, { merge: true });
    const batch = writeBatch(firestore);
    data.schedule.forEach(item => {
        const itemDate = Timestamp.fromDate(new Date(item.date.split('/').reverse().join('-') + 'T12:00:00'));
        item.memberIds.forEach((memberId: string) => {
            batch.update(doc(firestore, 'users', memberId), { lastServedDate: itemDate });
        });
    });
    await batch.commit();
    toast({ title: 'Sucesso', description: 'Escala salva e das de serviço atualizadas.' });
  };

  const syncClassWithReservation = (batch: any, classId: string, classFullData: any) => {
    if (!firestore || !user) return;
    
    const reservationId = `class_res_${classId}`;
    const reservationRef = doc(firestore, 'room_reservations', reservationId);

    if (!classFullData.locationId || classFullData.locationId === 'the_school' || classFullData.locationId === '') {
        batch.delete(reservationRef);
        return;
    }

    const roomName = rooms?.find(r => r.id === classFullData.locationId)?.name || 'Ambiente IBM';
    const courseName = courses?.find(c => c.id === classFullData.courseId)?.name || 'Curso';

    try {
        if (!classFullData.startDate || !classFullData.startTime) {
            console.warn("Sincronização de reserva ignorada: faltam dados de data/hora na turma.");
            return;
        }

        const startDateTime = Timestamp.fromDate(new Date(`${classFullData.startDate}T${classFullData.startTime}`));
        const endDateTime = Timestamp.fromDate(new Date(`${classFullData.startDate}T${classFullData.endTime || classFullData.startTime}`));
        const recurrenceEndDate = classFullData.endDate ? Timestamp.fromDate(new Date(`${classFullData.endDate}T23:59:59`)) : null;

        const reservationData = {
            eventName: `Turma: ${classFullData.name} (${courseName})`,
            requesterId: user.uid,
            rooms: [roomName],
            startDateTime,
            endDateTime,
            recurrenceEndDate,
            status: 'approved',
            frequency: classFullData.frequency || 'pontual',
            dayOfWeek: classFullData.dayOfWeek || '',
            weekOfMonth: classFullData.weekOfMonth || '',
            notes: `Reserva automática gerada pela gestão de turmas.`,
            createdAt: Timestamp.now(),
        };

        batch.set(reservationRef, reservationData, { merge: true });
    } catch (e) {
        console.error("Erro ao sincronizar reserva de sala para turma:", e);
    }
  };

  const addClass = async (data: ClassData) => {
    if (!firestore) return;
    const classRef = doc(collection(firestore, 'classes'));
    const batch = writeBatch(firestore);
    
    batch.set(classRef, data);
    syncClassWithReservation(batch, classRef.id, data);
    
    await batch.commit();
    toast({ title: 'Sucesso', description: 'Turma criada e sala reservada.' });
  };

  const updateClass = async (id: string, data: Partial<ClassData>) => {
    if(!firestore) return;
    
    try {
        const classDocRef = doc(firestore, 'classes', id);
        const classSnap = await getDoc(classDocRef);
        
        if (!classSnap.exists()) {
            throw new Error("Turma não encontrada");
        }

        const classFullData = { ...classSnap.data(), ...data };
        const batch = writeBatch(firestore);
        
        batch.update(classDocRef, data);
        syncClassWithReservation(batch, id, classFullData);
        
        await batch.commit();
        toast({ title: 'Sucesso', description: 'Turma e reserva atualizadas.' });
    } catch (error) {
        console.error("Erro ao atualizar turma:", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao atualizar turma.' });
    }
  };

  const deleteClass = async (id: string) => {
    if(!firestore) return;
    const classDoc = doc(firestore, 'classes', id);
    const reservationDoc = doc(firestore, 'room_reservations', `class_res_${id}`);
    const batch = writeBatch(firestore);
    
    batch.delete(classDoc);
    batch.delete(reservationDoc);
    
    await batch.commit();
    toast({ title: 'Sucesso', description: 'Turma e reserva removidas.' });
  };

  const calculateSplits = (totalAmount: number) => ({
      teacher: totalAmount * 0.4,
      wave: totalAmount * 0.3,
      ibm: totalAmount * 0.2,
      admin: totalAmount * 0.1,
  });

  const addWavePayment = async (data: WavePaymentData) => {
      if (!firestore) return;
      const splits = calculateSplits(data.amount);
      await addDocumentNonBlocking(collection(firestore, 'wave_payments'), { ...data, splits });
      toast({ title: 'Sucesso', description: 'Pagamento Wave registrado.' });
  };

  const updateWavePayment = async (id: string, data: Partial<WavePaymentData>) => {
      if (!firestore) return;
      let updateData = { ...data };
      if (data.amount) updateData = { ...updateData, splits: calculateSplits(data.amount) } as any;
      await updateDocumentNonBlocking(doc(firestore, 'wave_payments', id), updateData);
      toast({ title: 'Sucesso', description: 'Pagamento Wave atualizado.' });
  };

  const enrollStudent = async (studentId: string, courseId: string, specificClassId?: string) => {
    if (!firestore) return;
    
    const course = courses.find(c => c.id === courseId);
    if (!course) throw new Error("Curso não encontrado");

    const studentUser = users.find(u => u.id === studentId);
    const isMemberCourse = course.name.toLowerCase().includes('membro') || course.name.toLowerCase().includes('pertencer') || course.name.toLowerCase().includes('integração');
    
    // BLOCK RULE: "Cidade" members cannot enroll in membership courses.
    if (isMemberCourse && studentUser?.integrationStatus === 'nao_alcancado') {
        throw new Error("Membros no estágio 'Cidade' precisam de uma decisão registrada para fazer este curso.");
    }

    const batch = writeBatch(firestore);
    const currentMonth = new Date().toISOString().slice(0, 7);

    // 1. Matrícula em todas as disciplinas (classes) se for Curso de Membro
    if (isMemberCourse) {
        const classesSnap = await getDocs(query(collection(firestore, 'classes'), where('courseId', '==', courseId)));
        classesSnap.forEach(clsDoc => {
            batch.update(clsDoc.ref, { students: arrayUnion(studentId) });
        });
    } else if (specificClassId) {
        // Matrícula em turma única para outros cursos
        batch.update(doc(firestore, 'classes', specificClassId), { students: arrayUnion(studentId) });
    }

    // 2. Gerar fatura se for curso pago (Wave ou DIS)
    if (course.ministryName.toLowerCase().includes('wave')) {
        const defaultPlan = (wavePlans && wavePlans.length > 0) ? wavePlans[0] : null;
        if (defaultPlan) {
            const paymentRef = doc(collection(firestore, 'wave_payments'));
            const amount = defaultPlan.price;
            batch.set(paymentRef, {
                userId: studentId,
                planId: defaultPlan.id,
                month: currentMonth,
                amount,
                status: 'pending',
                splits: calculateSplits(amount),
                createdAt: Timestamp.now()
            });
        }
    } else if (course.ministryName.toLowerCase() === 'dis') {
        const defaultPlan = (disPlans && disPlans.length > 0) ? disPlans[0] : null;
        if (defaultPlan) {
            const paymentRef = doc(collection(firestore, 'dis_payments'));
            batch.set(paymentRef, {
                userId: studentId,
                planId: defaultPlan.id,
                month: currentMonth,
                amount: defaultPlan.price,
                status: 'pending',
                createdAt: Timestamp.now()
            });
        }
    }
    
    await batch.commit();
  };

  const approveEnrollmentRequest = async (requestId: string, classId?: string) => {
    if (!firestore) return;
    const request = enrollmentRequests.find(r => r.id === requestId);
    if (!request) return;

    const userId = request.userId;
    const courseId = request.courseId;

    try {
        // Utiliza a lógica centralizada de ciclo
        await enrollStudent(userId, courseId, classId);

        // Atualiza status da solicitação
        const requestRef = doc(firestore, 'enrollment_requests', requestId);
        await updateDoc(requestRef, { status: 'approved', classId: classId || '' });

        toast({ title: 'Matrícula Efetivada', description: 'O aluno foi matriculado no ciclo de disciplinas.' });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Erro na Aprovação', description: e.message });
    }
  };

  /**
   * Identifica turmas presenciais vinculadas e lança presença baseada no vídeo assistido.
   */
  const markAttendanceByTheoflix = async (userId: string, theoflixCourseId: string, episodeIndex: number) => {
    if (!firestore || !userId || !theoflixCourseId) return;

    // 1. Encontrar cursos físicos que vinculam este Theoflix
    const linkedPhysicalCourses = courses.filter(c => c.linkedTheoflixId === theoflixCourseId);
    if (linkedPhysicalCourses.length === 0) return;

    const physicalCourseIds = linkedPhysicalCourses.map(c => c.id);

    // 2. Encontrar turmas desses cursos onde o usuário é aluno
    const userClasses = classes.filter(cls => 
        physicalCourseIds.includes(cls.courseId) && 
        cls.students?.includes(userId)
    );

    if (userClasses.length === 0) return;

    const batch = writeBatch(firestore);
    let syncCount = 0;

    userClasses.forEach(cls => {
        // 3. Calcular datas da turma
        if (!cls.startDate) return;
        const occurrences: string[] = [];
        const start = parseISO(cls.startDate);
        const end = cls.endDate ? parseISO(cls.endDate) : addMonths(start, 6);
        const targetDay = cls.dayOfWeek ? weekDayMap[cls.dayOfWeek] : -1;
        const holidays = new Set(cls.holidayDates || []);

        let current = start;
        let safe = 0;
        while ((isBefore(current, end) || format(current, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) && safe++ < 100) {
            let matches = false;
            if (cls.frequency === 'semanal') matches = targetDay === -1 || current.getDay() === targetDay;
            else if (cls.frequency === 'quinzenal') matches = (Math.floor((current.getTime() - start.getTime()) / (7*24*60*60*1000)) % 2 === 0) && (targetDay === -1 || current.getDay() === targetDay);
            else if (cls.frequency === 'mensal') {
                const week = Math.ceil(current.getDate() / 7);
                const isLast = current.getDate() > (new Date(current.getFullYear(), current.getMonth()+1, 0).getDate() - 7);
                matches = (cls.weekOfMonth === 'last' && isLast) || (week.toString() === cls.weekOfMonth);
                matches = matches && current.getDay() === targetDay;
            } else if (cls.frequency === 'pontual') {
                matches = true;
            }

            const dateStr = format(current, 'yyyy-MM-dd');
            if (matches && !holidays.has(dateStr)) occurrences.push(dateStr);
            if (cls.frequency === 'pontual') break;
            current = addWeeks(current, 1);
        }

        // 4. Se o índice do vídeo existe no calendário físico, lançar presença
        const targetDate = occurrences[episodeIndex];
        if (targetDate) {
            const existingAttendance = cls.attendance || [];
            const recordIdx = existingAttendance.findIndex(a => a.date === targetDate);
            
            if (recordIdx > -1) {
                if (!existingAttendance[recordIdx].presentStudentIds.includes(userId)) {
                    existingAttendance[recordIdx].presentStudentIds.push(userId);
                    batch.update(doc(firestore, 'classes', cls.id), { attendance: existingAttendance });
                    syncCount++;
                }
            } else {
                existingAttendance.push({ date: targetDate, presentStudentIds: [userId] });
                batch.update(doc(firestore, 'classes', cls.id), { attendance: existingAttendance });
                syncCount++;
            }
        }
    });

    if (syncCount > 0) {
        await batch.commit();
        toast({ 
            title: "Presença Híbrida!", 
            description: `Sua participação física na aula ${episodeIndex + 1} foi validada via TheoFlix.` 
        });
    }
  };

  const value = useMemo(() => ({
    areas: areas || [],
    teams: teams || [],
    users: users || [],
    events: events || [],
    rooms: rooms || [],
    courses: courses || [],
    theoflixCourses: theoflixCourses || [],
    classes: classes || [],
    pedagogicalLogs: pedagogicalLogs || [],
    reservations: reservations || [],
    savedSchedules: savedSchedules || [],
    wavePlans: wavePlans || [],
    wavePayments: wavePayments || [],
    waveExpenses: waveExpenses || [],
    disPlans: disPlans || [],
    disPayments: disPayments || [],
    enrollmentRequests: enrollmentRequests || [],
    financialTransactions: financialTransactions || [],
    isLoading,
    addArea,
    updateArea,
    deleteArea,
    addTeam,
    updateTeam,
    deleteTeam,
    addRoom,
    updateRoom,
    deleteRoom,
    addEvent,
    updateEvent,
    deleteEvent,
    addReservation,
    updateReservation,
    deleteReservation,
    addUser,
    updateVolunteer,
    saveSchedule,
    deleteSchedule,
    addClass,
    updateClass,
    deleteClass,
    addWavePlan,
    updateWavePlan,
    deleteWavePlan,
    addWavePayment,
    updateWavePayment,
    deleteWavePayment,
    addWaveExpense,
    updateWaveExpense,
    deleteWaveExpense,
    addDisPlan,
    updateDisPlan,
    deleteDisPlan,
    addDisPayment,
    updateDisPayment,
    deleteDisPayment,
    addPedagogicalLog,
    updatePedagogicalLog,
    deletePedagogicalLog,
    updateEnrollmentRequest,
    deleteEnrollmentRequest,
    approveEnrollmentRequest,
    enrollStudent,
    addFinancialTransaction,
    updateFinancialTransaction,
    deleteFinancialTransaction,
    markAttendanceByTheoflix,
  }), [
    areas, teams, users, events, rooms, courses, theoflixCourses, classes, pedagogicalLogs, reservations, 
    savedSchedules, wavePlans, wavePayments, waveExpenses, disPlans, disPayments, 
    enrollmentRequests, financialTransactions, isLoading, firestore, user
  ]);

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

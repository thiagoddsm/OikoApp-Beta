
'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import { useFirebase, useCollection, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, Timestamp, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
  type?: 'basic' | 'complete';
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
  locationId?: string;
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
    status: 'pending' | 'approved' | 'rejected';
    notes?: string;
    equipmentNotes?: string;
    kitchenUsage?: boolean;
    requiredPatrimonyIds?: string[];
    createdAt: any;
    frequency: 'pontual' | 'semanal' | 'quinzenal' | 'mensal';
    dayOfWeek?: string;
    weekOfMonth?: '1' | '2' | '3' | '4' | 'last';
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
  updateClass: (id: string, data: Partial<ClassData>) => Promise<void>;
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
  addFinancialTransaction: (data: FinancialTransactionData) => Promise<void>;
  updateFinancialTransaction: (id: string, data: Partial<FinancialTransactionData>) => Promise<void>;
  deleteFinancialTransaction: (id: string) => Promise<void>;
}

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

  const isLoading = loadingAreas || loadingTeams || loadingUsers || loadingEvents || loadingRooms || loadingCourses || loadingClasses || loadingPedagogicalLogs || loadingReservations || loadingSavedSchedules || loadingWavePlans || loadingWavePayments || loadingWaveExpenses || loadingDisPlans || loadingDisPayments || loadingEnrollments || loadingFinances;

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
  const { updateItem: updateClass } = createCrudFunctions<Class>('classes', 'Turma');
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
    if (data.date && data.time && data.room) {
        const reservationsCollection = collection(firestore, 'room_reservations');
        const startDateTime = Timestamp.fromDate(new Date(`${data.date}T${data.time}`));
        const endDateTime = Timestamp.fromDate(new Date(startDateTime.toDate().getTime() + 2 * 60 * 60 * 1000));
        batch.set(doc(reservationsCollection), {
            eventName: data.name,
            requesterId: user.uid,
            rooms: [data.room],
            startDateTime,
            endDateTime,
            status: 'approved',
            frequency: 'pontual',
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

  const value = useMemo(() => ({
    areas: areas || [],
    teams: teams || [],
    users: users || [],
    events: events || [],
    rooms: rooms || [],
    courses: courses || [],
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
    updateClass,
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
    addFinancialTransaction,
    updateFinancialTransaction,
    deleteFinancialTransaction,
  }), [
    areas, teams, users, events, rooms, courses, classes, pedagogicalLogs, reservations, 
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

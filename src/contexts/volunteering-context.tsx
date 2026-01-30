
'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import { useFirebase, useCollection, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, Timestamp } from 'firebase/firestore';
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
  isTeacher?: boolean;
  taughtCourseIds?: string[];
  serviceStatus?: 'serving' | 'not_serving';
  serviceAreaId?: string;
  serviceTeamId?: string;
  eligibleEventIds?: string[];
  blockedDates?: string[];
  lastServedDate?: Timestamp; // "YYYY-MM-DD"
  financialStatus?: 'active' | 'blocked' | 'delinquent';
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
    startDateTime: any; // Using `any` to be compatible with Firestore Timestamp
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
  month: string; // "YYYY-MM"
  schedule: any; // The actual schedule data
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
  month: string; // "YYYY-MM"
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


type AreaData = Omit<AreaOfService, 'id'>;
type TeamData = Omit<Team, 'id'>;
type RoomData = Omit<Room, 'id'>;
type EventData = Omit<VolunteeringEvent, 'id'>;
type ReservationData = Omit<RoomReservation, 'id'>;
type SavedScheduleData = Omit<SavedSchedule, 'id'>;
type WavePlanData = Omit<WavePlan, 'id'>;
type WavePaymentData = Omit<WavePayment, 'id'>;
type WaveExpenseData = Omit<WaveExpense, 'id'>;
type PedagogicalLogData = Omit<PedagogicalLog, 'id'>;


// --- CONTEXT DEFINITION ---
interface VolunteeringContextType {
  // State
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
  isLoading: boolean;
  
  // Functions for Areas
  addArea: (data: AreaData) => Promise<void>;
  updateArea: (id: string, data: Partial<AreaData>) => Promise<void>;
  deleteArea: (id: string) => Promise<void>;

  // Functions for Teams
  addTeam: (data: TeamData) => Promise<void>;
  updateTeam: (id: string, data: Partial<TeamData>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  
  // Functions for Rooms
  addRoom: (data: RoomData) => Promise<void>;
  updateRoom: (id: string, data: Partial<RoomData>) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;

  // Functions for Events
  addEvent: (data: EventData) => Promise<void>;
  updateEvent: (id: string, data: Partial<EventData>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  
  // Functions for Reservations
  addReservation: (data: ReservationData) => Promise<void>;
  updateReservation: (id: string, data: Partial<ReservationData>) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;
  
  // Functions for Volunteers
  updateVolunteer: (id: string, data: Partial<User>) => Promise<void>;
  
  // Functions for Schedules
  saveSchedule: (data: SavedScheduleData) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;

  // Functions for Wave
  addWavePlan: (data: WavePlanData) => Promise<void>;
  updateWavePlan: (id: string, data: Partial<WavePlanData>) => Promise<void>;
  deleteWavePlan: (id: string) => Promise<void>;
  addWavePayment: (data: WavePaymentData) => Promise<void>;
  updateWavePayment: (id: string, data: Partial<WavePaymentData>) => Promise<void>;
  deleteWavePayment: (id: string) => Promise<void>;
  addWaveExpense: (data: WaveExpenseData) => Promise<void>;
  updateWaveExpense: (id: string, data: Partial<WaveExpenseData>) => Promise<void>;
  deleteWaveExpense: (id: string) => Promise<void>;
  
  // Functions for Pedagogical Logs
  addPedagogicalLog: (data: PedagogicalLogData) => Promise<void>;
  updatePedagogicalLog: (id: string, data: Partial<PedagogicalLogData>) => Promise<void>;
  deletePedagogicalLog: (id: string) => Promise<void>;
}

const VolunteeringContext = createContext<VolunteeringContextType | undefined>(undefined);

// --- PROVIDER COMPONENT ---
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


  const isLoading = loadingAreas || loadingTeams || loadingUsers || loadingEvents || loadingRooms || loadingCourses || loadingClasses || loadingPedagogicalLogs || loadingReservations || loadingSavedSchedules || loadingWavePlans || loadingWavePayments || loadingWaveExpenses;

  // --- GENERIC CRUD FUNCTIONS ---
  const createCrudFunctions = <T extends {id: string}>(collectionName: string, itemType: string) => {
      const collectionRef = firestore ? collection(firestore, collectionName) : null;
      
      const addItem = async (data: Omit<T, 'id'>) => {
          if (!collectionRef) return;
          addDocumentNonBlocking(collectionRef, data);
          toast({ title: 'Sucesso', description: `${itemType} será criado(a).` });
      };

      const updateItem = async (id: string, data: Partial<Omit<T, 'id'>>) => {
          if(!firestore) return;
          const itemDoc = doc(firestore, collectionName, id);
          updateDocumentNonBlocking(itemDoc, data);
          toast({ title: 'Sucesso', description: `${itemType} será atualizado(a).` });
      };

      const deleteItem = async (id: string) => {
          if(!firestore) return;
          const itemDoc = doc(firestore, collectionName, id);
          deleteDocumentNonBlocking(itemDoc);
          toast({ title: 'Sucesso', description: `${itemType} será excluído(a).` });
      };
      
      return { addItem, updateItem, deleteItem };
  };

  const { addItem: addArea, updateItem: updateArea, deleteItem: deleteArea } = createCrudFunctions<AreaOfService>('areas_of_service', 'Área');
  const { addItem: addTeam, updateItem: updateTeam, deleteItem: deleteTeam } = createCrudFunctions<Team>('teams', 'Equipe');
  const { addItem: addRoom, updateItem: updateRoom, deleteItem: deleteRoom } = createCrudFunctions<Room>('rooms', 'Ambiente');
  const { addItem: addReservation, updateItem: updateReservation, deleteItem: deleteReservation } = createCrudFunctions<RoomReservation>('room_reservations', 'Reserva');
  const { addItem: _, updateItem: __, deleteItem: deleteSchedule } = createCrudFunctions<SavedSchedule>('saved_schedules', 'Escala Salva');
  const { addItem: addWavePlan, updateItem: updateWavePlan, deleteItem: deleteWavePlan } = createCrudFunctions<WavePlan>('wave_plans', 'Plano Wave');
  const { addItem: addWaveExpense, updateItem: updateWaveExpense, deleteItem: deleteWaveExpense } = createCrudFunctions<WaveExpense>('wave_expenses', 'Despesa Wave');
  const { addItem: addPedagogicalLog, updateItem: updatePedagogicalLog, deleteItem: deletePedagogicalLog } = createCrudFunctions<PedagogicalLog>('pedagogical_logs', 'Registro Pedagógico');


  // --- CUSTOM EVENT FUNCTIONS ---
  const addEvent = async (data: EventData) => {
    if(!firestore || !user) return;
    const eventsCollection = collection(firestore, 'volunteering_events');
    const newEventRef = doc(eventsCollection);
    
    const batch = writeBatch(firestore);
    batch.set(newEventRef, data);
    
    // If it's a specific (pontual) event with a room, create a reservation
    if (data.date && data.time && data.room) {
        const reservationsCollection = collection(firestore, 'room_reservations');
        const startDateTime = Timestamp.fromDate(new Date(`${data.date}T${data.time}`));
        const endDateTime = Timestamp.fromDate(new Date(startDateTime.toDate().getTime() + 2 * 60 * 60 * 1000)); // default 2h duration
        
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
    toast({ title: 'Sucesso', description: `Evento "${data.name}" criado e reserva de sala (se aplicável) efetuada.` });
  };
  
  const updateEvent = async (id: string, data: Partial<EventData>) => {
    if(!firestore || !user) return;
    const eventDoc = doc(firestore, 'volunteering_events', id);
    // Here we use updateDocumentNonBlocking because we don't have batch support in non-blocking yet
    updateDocumentNonBlocking(eventDoc, data);
    toast({ title: 'Sucesso', description: `Evento será atualizado.` });
  };
  
  const deleteEvent = async (id: string) => {
    if(!firestore) return;
    const eventDoc = doc(firestore, 'volunteering_events', id);
    deleteDocumentNonBlocking(eventDoc);
    toast({ title: 'Sucesso', description: 'O evento será excluído.' });
  };

  // --- VOLUNTEER FUNCTIONS ---
  const updateVolunteer = async (id: string, data: Partial<User>) => {
    if (!firestore) return;
    const userDoc = doc(firestore, 'users', id);
    updateDocumentNonBlocking(userDoc, data);
    toast({ title: 'Sucesso', description: `O status de serviço do membro será atualizado.` });
  };
  
  // --- SAVED SCHEDULE FUNCTIONS ---
  const saveSchedule = async (data: SavedScheduleData) => {
    if (!firestore) return;
    const scheduleId = `${data.areaId}_${data.month}`;
    const scheduleDoc = doc(firestore, 'saved_schedules', scheduleId);
    setDocumentNonBlocking(scheduleDoc, data, { merge: true });

    // After saving, update the lastServedDate for each volunteer
    const batch = writeBatch(firestore);
    const volunteerLastServed: Record<string, Timestamp> = {};

    data.schedule.forEach(item => {
        const itemDate = Timestamp.fromDate(new Date(item.date.split('/').reverse().join('-') + 'T12:00:00'));
        item.memberIds.forEach((memberId: string) => {
            if (!volunteerLastServed[memberId] || itemDate > volunteerLastServed[memberId]) {
                volunteerLastServed[memberId] = itemDate;
            }
        });
    });

    for (const [userId, lastDate] of Object.entries(volunteerLastServed)) {
        const userDocRef = doc(firestore, 'users', userId);
        batch.update(userDocRef, { lastServedDate: lastDate });
    }

    await batch.commit();

    toast({ title: 'Sucesso', description: 'A escala foi salva e as datas de último serviço foram atualizadas.' });
  };

  // --- WAVE PAYMENT FUNCTIONS ---
  const calculateSplits = (totalAmount: number) => ({
      teacher: totalAmount * 0.4,
      wave: totalAmount * 0.3,
      ibm: totalAmount * 0.2,
      admin: totalAmount * 0.1,
  });

  const addWavePayment = async (data: WavePaymentData) => {
      if (!firestore) return;
      const collectionRef = collection(firestore, 'wave_payments');
      const splits = calculateSplits(data.amount);
      const dataWithSplits = { ...data, splits };
      addDocumentNonBlocking(collectionRef, dataWithSplits);
      toast({ title: 'Sucesso', description: 'Pagamento será registrado.' });
  };

  const updateWavePayment = async (id: string, data: Partial<WavePaymentData>) => {
      if (!firestore) return;
      const itemDoc = doc(firestore, 'wave_payments', id);
      let dataWithSplits: Partial<WavePaymentData> & { splits?: any } = { ...data };
      if (data.amount) {
          const splits = calculateSplits(data.amount);
          dataWithSplits.splits = splits;
      }
      updateDocumentNonBlocking(itemDoc, dataWithSplits);
      toast({ title: 'Sucesso', description: 'Pagamento será atualizado.' });
  };

  const { deleteItem: deleteWavePayment } = createCrudFunctions<WavePayment>('wave_payments', 'Pagamento Wave');

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
    updateVolunteer,
    saveSchedule,
    deleteSchedule,
    addWavePlan,
    updateWavePlan,
    deleteWavePlan,
    addWavePayment,
    updateWavePayment,
    deleteWavePayment,
    addWaveExpense,
    updateWaveExpense,
    deleteWaveExpense,
    addPedagogicalLog,
    updatePedagogicalLog,
    deletePedagogicalLog,
  }), [areas, teams, users, events, rooms, courses, classes, pedagogicalLogs, reservations, savedSchedules, wavePlans, wavePayments, waveExpenses, isLoading]);

  return (
    <VolunteeringContext.Provider value={value}>
      {children}
    </VolunteeringContext.Provider>
  );
}

// --- HOOK ---
export function useVolunteering() {
  const context = useContext(VolunteeringContext);
  if (context === undefined) {
    throw new Error('useVolunteering must be used within a VolunteeringProvider');
  }
  return context;
}

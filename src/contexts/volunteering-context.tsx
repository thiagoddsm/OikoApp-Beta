
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
  serviceStatus?: 'serving' | 'not_serving';
  serviceAreaId?: string;
  serviceTeamId?: string;
  eligibleEventIds?: string[];
  blockedDates?: string[];
  lastServedDate?: Timestamp; // "YYYY-MM-DD"
}

export type VolunteeringEvent = {
  id: string;
  name: string;
  time: string;
  date?: string;
  room?: string;
  requiredAreas?: { areaId: string; quantity: number }[];
}

export type Room = {
    id: string;
    name: string;
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


type AreaData = Omit<AreaOfService, 'id'>;
type TeamData = Omit<Team, 'id'>;
type RoomData = Omit<Room, 'id'>;
type EventData = Omit<VolunteeringEvent, 'id'>;
type ReservationData = Omit<RoomReservation, 'id'>;
type SavedScheduleData = Omit<SavedSchedule, 'id'>;


// --- CONTEXT DEFINITION ---
interface VolunteeringContextType {
  // State
  areas: AreaOfService[];
  users: User[];
  teams: Team[];
  rooms: Room[];
  events: VolunteeringEvent[];
  reservations: RoomReservation[];
  savedSchedules: SavedSchedule[];
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
  const reservationsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'room_reservations') : null, [firestore]);
  const savedSchedulesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'saved_schedules') : null, [firestore]);

  const { data: areas, isLoading: loadingAreas } = useCollection<AreaOfService>(areasQuery);
  const { data: teams, isLoading: loadingTeams } = useCollection<Team>(teamsQuery);
  const { data: users, isLoading: loadingUsers } = useCollection<User>(usersQuery);
  const { data: events, isLoading: loadingEvents } = useCollection<VolunteeringEvent>(eventsQuery);
  const { data: rooms, isLoading: loadingRooms } = useCollection<Room>(roomsQuery);
  const { data: reservations, isLoading: loadingReservations } = useCollection<RoomReservation>(reservationsQuery);
  const { data: savedSchedules, isLoading: loadingSavedSchedules } = useCollection<SavedSchedule>(savedSchedulesQuery);


  const isLoading = loadingAreas || loadingTeams || loadingUsers || loadingEvents || loadingRooms || loadingReservations || loadingSavedSchedules;

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

  const value = useMemo(() => ({
    areas: areas || [],
    teams: teams || [],
    users: users || [],
    rooms: rooms || [],
    events: events || [],
    reservations: reservations || [],
    savedSchedules: savedSchedules || [],
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
  }), [areas, teams, users, rooms, events, reservations, savedSchedules, isLoading]);

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

    

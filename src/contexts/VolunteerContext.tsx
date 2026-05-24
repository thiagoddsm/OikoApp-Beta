'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase, useDoc, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, addDoc, Timestamp } from 'firebase/firestore';

export interface AreaOfService {
  id: string;
  name: string;
  leaderId?: string;
  leaderContact?: string;
}

export interface Team {
  id: string;
  name: string;
}

export interface VolunteeringEvent {
  id: string;
  name: string;
  time: string;
  date?: string;
  frequency?: 'semanal' | 'pontual';
  dayOfWeek?: string;
  requiredAreas?: { areaId: string; quantity: number }[];
  room?: string;
}

export interface ReservationCategory {
  id: string;
  name: string;
  color?: string;
}

export interface Room {
  id: string;
  name: string;
}

export interface RoomReservation {
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
}

export interface SavedSchedule {
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
}

export interface VolunteerContextType {
  serviceAreas: AreaOfService[];
  teams: Team[];
  events: VolunteeringEvent[];
  rooms: Room[];
  reservations: RoomReservation[];
  reservationCategories: ReservationCategory[];
  savedSchedules: SavedSchedule[];
  isLoading: boolean;

  addArea: (data: any) => Promise<void>;
  updateArea: (id: string, data: any) => Promise<void>;
  deleteArea: (id: string) => Promise<void>;
  addTeam: (data: any) => Promise<void>;
  updateTeam: (id: string, data: any) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  addEvent: (data: any) => Promise<void>;
  updateEvent: (id: string, data: any) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  addRoom: (data: any) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;
  addReservationCategory: (data: any) => Promise<void>;
  deleteReservationCategory: (id: string) => Promise<void>;
  addReservation: (data: any) => Promise<void>;
  updateReservation: (id: string, data: any) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;
  saveSchedule: (data: any) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
}

const VolunteerContext = createContext<VolunteerContextType | undefined>(undefined);

export function VolunteerProvider({ children }: { children: ReactNode }) {
  const { firestore, user } = useFirebase();

  // Obter tenant, perfil e permissões
  const { data: userTenant } = useDoc<any>(user ? `userTenants/${user.uid}` : null);
  const tenantId = userTenant?.tenantId || 'ibm';
  const role = userTenant?.role || 'member';
  const isAdmin = role === 'admin' || role === 'pastor_senior';

  const { data: accessProfile } = useDoc<any>(user && role ? `access_profiles/${role}` : null);
  const permissions = accessProfile?.permissions || {};
  
  const can = (permId: string, action = 'view') => isAdmin || !!permissions?.[permId]?.[action];
  const roleResolved = !!userTenant;

  // Consultas Firestore
  const serviceAreasQ = useMemoFirebase(() => (firestore && user && roleResolved && can('servico_areas')) ? query(collection(firestore, 'areas_of_service')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const teamsQ = useMemoFirebase(() => (firestore && user && roleResolved && can('servico_teams')) ? query(collection(firestore, 'teams')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const eventsQ = useMemoFirebase(() => (firestore && user && roleResolved && can('servico_events')) ? query(collection(firestore, 'volunteering_events')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const reservationsQ = useMemoFirebase(() => (firestore && user && roleResolved && can('ministerial_reservations')) ? query(collection(firestore, 'room_reservations')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const savedSchedulesQ = useMemoFirebase(() => (firestore && user && roleResolved && can('servico_schedule')) ? query(collection(firestore, 'saved_schedules')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const roomsQ = useMemoFirebase(() => (firestore && user && roleResolved && can('ministerial_reservations')) ? query(collection(firestore, 'rooms')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const reservationCategoriesQ = useMemoFirebase(() => (firestore && user && roleResolved && can('ministerial_reservations')) ? query(collection(firestore, 'reservation_categories')) : null, [firestore, user, roleResolved, isAdmin, permissions]);

  const { data: serviceAreas, isLoading: lsa } = useCollection<AreaOfService>(serviceAreasQ);
  const { data: teams, isLoading: lt } = useCollection<Team>(teamsQ);
  const { data: events, isLoading: le } = useCollection<VolunteeringEvent>(eventsQ);
  const { data: reservations, isLoading: lr } = useCollection<RoomReservation>(reservationsQ);
  const { data: savedSchedules, isLoading: lss } = useCollection<SavedSchedule>(savedSchedulesQ);
  const { data: rooms, isLoading: lrm } = useCollection<Room>(roomsQ);
  const { data: reservationCategories, isLoading: lrc } = useCollection<ReservationCategory>(reservationCategoriesQ);

  const isLoading = lsa || lt || le || lr || lss || lrm || lrc;

  const actions = useMemo(() => ({
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
    saveSchedule: async (data: any) => {
      if (data.id) {
        await updateDocumentNonBlocking(doc(firestore!, 'saved_schedules', data.id), data);
      } else {
        await addDoc(collection(firestore!, 'saved_schedules'), data);
      }
    },
    deleteSchedule: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'saved_schedules', id)); },
  }), [firestore]);

  const value = useMemo(() => ({
    serviceAreas: serviceAreas || [],
    teams: teams || [],
    events: events || [],
    rooms: rooms || [],
    reservations: reservations || [],
    reservationCategories: reservationCategories || [],
    savedSchedules: savedSchedules || [],
    isLoading,
    ...actions
  }), [serviceAreas, teams, events, rooms, reservations, reservationCategories, savedSchedules, isLoading, actions]);

  return (
    <VolunteerContext.Provider value={value}>
      {children}
    </VolunteerContext.Provider>
  );
}

export function useVolunteer() {
  const context = useContext(VolunteerContext);
  if (context === undefined) {
    throw new Error('useVolunteer must be used within a VolunteerProvider');
  }
  return context;
}

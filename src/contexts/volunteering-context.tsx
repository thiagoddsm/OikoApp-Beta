
'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import { useFirebase, useCollection, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, getDocs, query, where, arrayRemove } from 'firebase/firestore';
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
}

export type VolunteeringEvent = {
  id: string;
  name: string;
  frequency: 'semanal' | 'pontual';
  time: string;
  dayOfWeek?: string;
  date?: string;
  requiredAreas?: { areaId: string; quantity: number }[];
}

type AreaData = Omit<AreaOfService, 'id'>;
type TeamData = Omit<Team, 'id'>;
type EventData = Omit<VolunteeringEvent, 'id'>;


// --- CONTEXT DEFINITION ---
interface VolunteeringContextType {
  // State
  areas: AreaOfService[];
  users: User[];
  teams: Team[];
  events: VolunteeringEvent[];
  isLoading: boolean;
  
  // Functions for Areas
  addArea: (data: AreaData) => Promise<void>;
  updateArea: (id: string, data: Partial<AreaData>) => Promise<void>;
  deleteArea: (id: string) => Promise<void>;

  // Functions for Teams
  addTeam: (data: TeamData) => Promise<void>;
  updateTeam: (id: string, data: Partial<TeamData>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;

  // Functions for Events
  addEvent: (data: EventData) => Promise<void>;
  updateEvent: (id: string, data: Partial<EventData>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

const VolunteeringContext = createContext<VolunteeringContextType | undefined>(undefined);

// --- PROVIDER COMPONENT ---
export function VolunteeringProvider({ children }: { children: React.ReactNode }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const { data: areas, isLoading: loadingAreas } = useCollection<AreaOfService>('areas_of_service');
  const { data: teams, isLoading: loadingTeams } = useCollection<Team>('teams');
  const { data: users, isLoading: loadingUsers } = useCollection<User>('users');
  const { data: events, isLoading: loadingEvents } = useCollection<VolunteeringEvent>('volunteering_events');


  const isLoading = loadingAreas || loadingTeams || loadingUsers || loadingEvents;

  // --- AREA FUNCTIONS ---
  const addArea = async (data: AreaData) => {
    if(!firestore) return;
    const areasCollection = collection(firestore, 'areas_of_service');
    addDocumentNonBlocking(areasCollection, data);
    toast({ title: 'Sucesso', description: `Área "${data.name}" será criada.` });
  };

  const updateArea = async (id: string, data: Partial<AreaData>) => {
    if(!firestore) return;
    const areaDoc = doc(firestore, 'areas_of_service', id);
    updateDocumentNonBlocking(areaDoc, data);
    toast({ title: 'Sucesso', description: `Área "${data.name}" será atualizada.` });
  };
  
  const deleteArea = async (areaId: string) => {
    if (!firestore) return;
    
    // This logic is temporarily disabled to prevent permission errors.
    
    const batch = writeBatch(firestore);
    const areaRef = doc(firestore, 'areas_of_service', areaId);
    batch.delete(areaRef);

    try {
        await batch.commit();
        toast({ title: 'Sucesso', description: 'A área de serviço foi excluída.' });
    } catch (error) {
        console.error("Failed to delete area:", error);
        toast({ title: 'Erro', description: 'Não foi possível excluir a área. Verifique o console.', variant: 'destructive' });
    }
  };

  // --- TEAM FUNCTIONS ---
  const addTeam = async (data: TeamData) => {
    if(!firestore) return;
    const teamsCollection = collection(firestore, 'teams');
    addDocumentNonBlocking(teamsCollection, data);
    toast({ title: 'Sucesso', description: `Equipe "${data.name}" será criada.` });
  };

  const updateTeam = async (id: string, data: Partial<TeamData>) => {
    if(!firestore) return;
    const teamDoc = doc(firestore, 'teams', id);
    updateDocumentNonBlocking(teamDoc, data);
    toast({ title: 'Sucesso', description: `Equipe será atualizada.` });
  };

  const deleteTeam = async (id: string) => {
    if(!firestore) return;
    const teamDoc = doc(firestore, 'teams', id);
    deleteDocumentNonBlocking(teamDoc);
    toast({ title: 'Sucesso', description: 'A equipe será excluída.' });
  };
  
  // --- EVENT FUNCTIONS ---
  const addEvent = async (data: EventData) => {
    if(!firestore) return;
    const eventsCollection = collection(firestore, 'volunteering_events');
    addDocumentNonBlocking(eventsCollection, data);
    toast({ title: 'Sucesso', description: `Evento "${data.name}" será criado.` });
  };
  
  const updateEvent = async (id: string, data: Partial<EventData>) => {
    if(!firestore) return;
    const eventDoc = doc(firestore, 'volunteering_events', id);
    updateDocumentNonBlocking(eventDoc, data);
    toast({ title: 'Sucesso', description: `Evento será atualizado.` });
  };
  
  const deleteEvent = async (id: string) => {
    if(!firestore) return;
    const eventDoc = doc(firestore, 'volunteering_events', id);
    deleteDocumentNonBlocking(eventDoc);
    toast({ title: 'Sucesso', description: 'O evento será excluído.' });
  };

  const value = useMemo(() => ({
    areas: areas || [],
    teams: teams || [],
    users: users || [],
    events: events || [],
    isLoading,
    addArea,
    updateArea,
    deleteArea,
    addTeam,
    updateTeam,
    deleteTeam,
    addEvent,
    updateEvent,
    deleteEvent,
  }), [areas, teams, users, events, isLoading]);

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


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

type AreaData = Omit<AreaOfService, 'id'>;
type TeamData = Omit<Team, 'id'>;


// --- CONTEXT DEFINITION ---
interface VolunteeringContextType {
  // State
  areas: AreaOfService[];
  users: User[];
  teams: Team[];
  isLoading: boolean;
  
  // Functions for Areas
  addArea: (data: AreaData) => Promise<void>;
  updateArea: (id: string, data: AreaData) => Promise<void>;
  deleteArea: (id: string) => Promise<void>;

  // Functions for Teams
  addTeam: (data: TeamData) => Promise<void>;
  updateTeam: (id: string, data: Partial<TeamData>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
}

const VolunteeringContext = createContext<VolunteeringContextType | undefined>(undefined);

// --- PROVIDER COMPONENT ---
export function VolunteeringProvider({ children }: { children: React.ReactNode }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const { data: areas, isLoading: loadingAreas } = useCollection<AreaOfService>('areas_of_service');
  const { data: teams, isLoading: loadingTeams } = useCollection<Team>('teams');
  const { data: users, isLoading: loadingUsers } = useCollection<User>('users');


  const isLoading = loadingAreas || loadingTeams || loadingUsers;

  // --- AREA FUNCTIONS ---
  const addArea = async (data: AreaData) => {
    if(!firestore) return;
    const areasCollection = collection(firestore, 'areas_of_service');
    addDocumentNonBlocking(areasCollection, data);
    toast({ title: 'Sucesso', description: `Área "${data.name}" será criada.` });
  };

  const updateArea = async (id: string, data: AreaData) => {
    if(!firestore) return;
    const areaDoc = doc(firestore, 'areas_of_service', id);
    updateDocumentNonBlocking(areaDoc, data);
    toast({ title: 'Sucesso', description: `Área "${data.name}" será atualizada.` });
  };
  
  const deleteArea = async (areaId: string) => {
    if (!firestore) return;
    
    const areaRef = doc(firestore, 'areas_of_service', areaId);
    deleteDocumentNonBlocking(areaRef);
    
    toast({ title: 'Sucesso', description: 'A área de serviço será excluída.' });
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


  const value = useMemo(() => ({
    areas: areas || [],
    teams: teams || [],
    users: users || [],
    isLoading,
    addArea,
    updateArea,
    deleteArea,
    addTeam,
    updateTeam,
    deleteTeam,
  }), [areas, teams, users, isLoading]);

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

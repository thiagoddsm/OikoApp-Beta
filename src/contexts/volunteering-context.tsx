
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
  areaIds: string[];
};

export type User = {
    id: string;
    name: string;
    phone?: string;
    email?: string;
}

type AreaData = Omit<AreaOfService, 'id'>;


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
    if (!firestore || !teams) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Dados das equipes ainda não carregados.' });
        return;
    }
    const batch = writeBatch(firestore);

    // This is the logic for removing the area from the 'areas' array in each user document,
    // which seems to be what was described in the "ScaleMaster" explanation.
    // However, the current data model for 'User' in backend.json doesn't have an 'areas' array.
    // I will implement the logic for teams, as that is the current data model.
    // If the User model is updated, this logic should be updated as well.
    const usersWithAreaQuery = query(collection(firestore, 'users'), where('areas', 'array-contains', areaId));
     try {
        const userSnapshot = await getDocs(usersWithAreaQuery);
        userSnapshot.forEach(userDoc => {
            const userRef = doc(firestore, 'users', userDoc.id);
            batch.update(userRef, { areas: arrayRemove(areaId) });
        });
    } catch (error) {
        console.error("Error querying users for area deletion:", error);
    }


    // 1. Remove the areaId from all teams that have it
    teams.forEach(team => {
        if (team.areaIds?.includes(areaId)) {
            const teamRef = doc(firestore, 'teams', team.id);
            const updatedAreaIds = team.areaIds.filter(id => id !== areaId);
            batch.update(teamRef, { areaIds: updatedAreaIds });
        }
    });

    // 2. Delete the area itself
    const areaRef = doc(firestore, 'areas_of_service', areaId);
    batch.delete(areaRef);

    try {
        await batch.commit();
        toast({ title: 'Sucesso', description: 'Área excluída e desvinculada de equipes e usuários.' });
    } catch (error) {
        console.error("Error deleting area and updating teams: ", error);
        toast({ variant: 'destructive', title: 'Erro na Exclusão', description: 'Não foi possível concluir a operação.' });
    }
  };


  const value = useMemo(() => ({
    areas: areas || [],
    teams: teams || [],
    users: users || [],
    isLoading,
    addArea,
    updateArea,
    deleteArea,
    addTeam: async () => {}, // Placeholder
    updateTeam: async () => {}, // Placeholder
    deleteTeam: async () => {}, // Placeholder
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

    
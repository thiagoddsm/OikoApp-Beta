
'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import { useFirebase, useCollection, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

// --- TYPES ---
export type AreaOfService = {
  id: string;
  name: string;
};

export type Team = {
  id: string;
  name: string;
  areaIds: string[];
};

// --- CONTEXT DEFINITION ---
interface VolunteeringContextType {
  // State
  areas: AreaOfService[];
  teams: Team[];
  isLoading: boolean;
  
  // Functions for Areas
  addArea: (name: string) => Promise<void>;
  updateArea: (id: string, name: string) => Promise<void>;
  deleteArea: (id: string) => Promise<void>;
  
  // Functions for Teams
  addTeam: (teamData: { name: string; areaIds: string[] }) => Promise<void>;
  updateTeam: (id: string, teamData: { name: string; areaIds: string[] }) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
}

const VolunteeringContext = createContext<VolunteeringContextType | undefined>(undefined);

// --- PROVIDER COMPONENT ---
export function VolunteeringProvider({ children }: { children: React.ReactNode }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const { data: areas, isLoading: loadingAreas } = useCollection<AreaOfService>('areas_of_service');
  const { data: teams, isLoading: loadingTeams } = useCollection<Team>('teams');

  const isLoading = loadingAreas || loadingTeams;

  // --- AREA FUNCTIONS ---
  const addArea = async (name: string) => {
    const areasCollection = collection(firestore, 'areas_of_service');
    addDocumentNonBlocking(areasCollection, { name });
    toast({ title: 'Sucesso', description: `Área "${name}" será criada.` });
  };

  const updateArea = async (id: string, name: string) => {
    const areaDoc = doc(firestore, 'areas_of_service', id);
    updateDocumentNonBlocking(areaDoc, { name });
    toast({ title: 'Sucesso', description: `Área "${name}" será atualizada.` });
  };
  
  const deleteArea = async (areaId: string) => {
    if (!teams) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Dados das equipes ainda não carregados.' });
        return;
    }
    const batch = writeBatch(firestore);

    // 1. Remove the areaId from all teams that have it
    teams.forEach(team => {
        if (team.areaIds.includes(areaId)) {
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
        toast({ title: 'Sucesso', description: 'Área excluída e equipes desvinculadas.' });
    } catch (error) {
        console.error("Error deleting area and updating teams: ", error);
        toast({ variant: 'destructive', title: 'Erro na Exclusão', description: 'Não foi possível concluir a operação.' });
    }
  };


  // --- TEAM FUNCTIONS ---
  const addTeam = async (teamData: { name: string; areaIds: string[] }) => {
    const teamsCollection = collection(firestore, 'teams');
    addDocumentNonBlocking(teamsCollection, teamData);
    toast({ title: 'Sucesso', description: `Equipe "${teamData.name}" será criada.` });
  };

  const updateTeam = async (id: string, teamData: { name: string; areaIds: string[] }) => {
    const teamDoc = doc(firestore, 'teams', id);
    updateDocumentNonBlocking(teamDoc, teamData);
    toast({ title: 'Sucesso', description: `Equipe "${teamData.name}" será atualizada.` });
  };

  const deleteTeam = async (id: string) => {
    const teamDoc = doc(firestore, 'teams', id);
    deleteDocumentNonBlocking(teamDoc);
    toast({ title: 'Sucesso', description: 'A equipe será excluída.' });
  };


  const value = useMemo(() => ({
    areas: areas || [],
    teams: teams || [],
    isLoading,
    addArea,
    updateArea,
    deleteArea,
    addTeam,
    updateTeam,
    deleteTeam,
  }), [areas, teams, isLoading]);

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

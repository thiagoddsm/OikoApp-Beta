'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useFirebase, useCollection, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';

// --- Types ---
type AreaOfService = {
  id: string;
  name: string;
};

type Team = {
  id: string;
  name: string;
  members: string[];
  areaIds: string[];
};

interface VolunteeringContextType {
  areas: AreaOfService[];
  teams: Team[];
  isLoading: boolean;
  addArea: (area: Omit<AreaOfService, 'id'>) => Promise<void>;
  updateArea: (id: string, data: Partial<AreaOfService>) => Promise<void>;
  deleteArea: (id: string) => Promise<void>;
  addTeam: (team: Omit<Team, 'id'>) => Promise<void>;
  updateTeam: (id: string, data: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
}

// --- Context ---
const VolunteeringContext = createContext<VolunteeringContextType | undefined>(undefined);

// --- Provider ---
interface VolunteeringProviderProps {
  children: ReactNode;
}

export function VolunteeringProvider({ children }: VolunteeringProviderProps) {
  const { firestore } = useFirebase();

  const { data: areas, isLoading: isLoadingAreas } = useCollection<AreaOfService>('areas_of_service');
  const { data: teams, isLoading: isLoadingTeams } = useCollection<Team>('teams');

  const isLoading = isLoadingAreas || isLoadingTeams;

  // --- Area Functions ---
  const addArea = async (area: Omit<AreaOfService, 'id'>) => {
    if (!firestore) throw new Error("Firestore is not available");
    const collRef = collection(firestore, 'areas_of_service');
    await addDocumentNonBlocking(collRef, area);
  };

  const updateArea = async (id: string, data: Partial<AreaOfService>) => {
    if (!firestore) throw new Error("Firestore is not available");
    const docRef = doc(firestore, 'areas_of_service', id);
    await updateDocumentNonBlocking(docRef, data);
  };

  const deleteArea = async (id: string) => {
    if (!firestore) throw new Error("Firestore is not available");
    
    // Smart Delete Logic from "ScaleMaster"
    const batch = writeBatch(firestore);

    // 1. Find all teams associated with this area
    const teamsQuery = query(collection(firestore, 'teams'), where('areaIds', 'array-contains', id));
    const teamsSnapshot = await getDocs(teamsQuery);

    // 2. For each team, remove the areaId from its areaIds array
    teamsSnapshot.forEach(teamDoc => {
      const teamData = teamDoc.data() as Team;
      const updatedAreaIds = teamData.areaIds.filter(areaId => areaId !== id);
      batch.update(teamDoc.ref, { areaIds: updatedAreaIds });
    });

    // 3. Delete the area document itself
    const areaDocRef = doc(firestore, 'areas_of_service', id);
    batch.delete(areaDocRef);

    // 4. Commit the atomic batch
    await batch.commit();
  };

  // --- Team Functions ---
  const addTeam = async (team: Omit<Team, 'id'>) => {
    if (!firestore) throw new Error("Firestore is not available");
    const collRef = collection(firestore, 'teams');
    await addDocumentNonBlocking(collRef, team);
  };

  const updateTeam = async (id: string, data: Partial<Team>) => {
    if (!firestore) throw new Error("Firestore is not available");
    const docRef = doc(firestore, 'teams', id);
    await updateDocumentNonBlocking(docRef, data);
  };

  const deleteTeam = async (id: string) => {
    if (!firestore) throw new Error("Firestore is not available");
    const docRef = doc(firestore, 'teams', id);
    await deleteDocumentNonBlocking(docRef);
  };

  const value = {
    areas: areas || [],
    teams: teams || [],
    isLoading,
    addArea,
    updateArea,
    deleteArea,
    addTeam,
    updateTeam,
    deleteTeam,
  };

  return (
    <VolunteeringContext.Provider value={value}>
      {children}
    </VolunteeringContext.Provider>
  );
}

// --- Hook ---
export const useVolunteering = (): VolunteeringContextType => {
  const context = useContext(VolunteeringContext);
  if (context === undefined) {
    throw new Error('useVolunteering must be used within a VolunteeringProvider');
  }
  return context;
};

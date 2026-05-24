'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query } from 'firebase/firestore';

export interface Area {
  id: string;
  nome: string;
  liderId: string;
  redeId: string;
}

export interface Cell {
  id: string;
  nome: string;
  liderId: string;
  areaId: string;
  redeId: string;
  membros: string[];
}

export interface Rede {
  id: string;
  nome: string;
  liderId: string;
  pastorId: string;
}

export interface GCContextType {
  cells: Cell[];
  areas: Area[];
  redes: Rede[];
  isLoading: boolean;
}

const GCContext = createContext<GCContextType | undefined>(undefined);

export function GCProvider({ children }: { children: ReactNode }) {
  const { firestore, user } = useFirebase();

  // Obter tenant e papel
  const { data: userTenant } = useDoc<any>(user ? `userTenants/${user.uid}` : null);
  const tenantId = userTenant?.tenantId || 'ibm';

  // Usando coleções legadas para compatibilidade até migração total das coleções de GC
  const cellsQ = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'cells')) : null, [firestore, user]);
  const gcAreasQ = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'areas')) : null, [firestore, user]);
  const redesQ = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'redes')) : null, [firestore, user]);

  const { data: cells, isLoading: loadingCells } = useCollection<Cell>(cellsQ);
  const { data: gcAreas, isLoading: loadingAreas } = useCollection<Area>(gcAreasQ);
  const { data: redes, isLoading: loadingRedes } = useCollection<Rede>(redesQ);

  const isLoading = loadingCells || loadingAreas || loadingRedes;

  const value = useMemo(() => ({
    cells: cells || [],
    areas: gcAreas || [],
    redes: redes || [],
    isLoading,
  }), [cells, gcAreas, redes, isLoading]);

  return (
    <GCContext.Provider value={value}>
      {children}
    </GCContext.Provider>
  );
}

export function useGC() {
  const context = useContext(GCContext);
  if (context === undefined) {
    throw new Error('useGC must be used within a GCProvider');
  }
  return context;
}

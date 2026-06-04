
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Map as MapIcon, Loader2 } from "lucide-react";
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { MapView } from '@/components/gc/map-view';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type Cell = {
  id: string;
  nome: string;
  liderId: string;
  redeId?: string;
  areaId?: string;
  address?: {
      street: string;
      lat?: number;
      lng?: number;
  }
};

type User = {
  id: string;
  name: string;
};

type Rede = {
  id: string;
  nome: string;
  cor?: string;
};

type Area = {
  id: string;
  nome: string;
  redeId?: string;
};

// Acessa a API key do ambiente, que é segura para ser usada no lado do cliente pois foi prefixada com NEXT_PUBLIC_
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function MapPage() {
  const { firestore } = useFirebase();

  const [filterRedeId, setFilterRedeId] = useState('');
  const [filterAreaId, setFilterAreaId] = useState('');

  const cellsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'cells')) : null, [firestore]);
  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const redesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'redes')) : null, [firestore]);
  const areasQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'areas')) : null, [firestore]);

  const { data: cells, isLoading: isLoadingCells } = useCollection<Cell>(cellsQuery);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  const { data: redes, isLoading: isLoadingRedes } = useCollection<Rede>(redesQuery);
  const { data: areas, isLoading: isLoadingAreas } = useCollection<Area>(areasQuery);

  const isLoading = isLoadingCells || isLoadingUsers || isLoadingRedes || isLoadingAreas;

  const filteredAreas = useMemo(() =>
    filterRedeId ? (areas || []).filter(a => a.redeId === filterRedeId) : (areas || []),
    [filterRedeId, areas]
  );

  const filteredCells = useMemo(() => {
    return (cells || []).filter(cell => {
      if (filterRedeId && cell.redeId !== filterRedeId) return false;
      if (filterAreaId && cell.areaId !== filterAreaId) return false;
      return true;
    });
  }, [cells, filterRedeId, filterAreaId]);

  const clearFilters = () => {
    setFilterRedeId('');
    setFilterAreaId('');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapIcon className="size-5" />
              Mapa das Células
            </CardTitle>
            <CardDescription>
              Visualize a localização de todas as células em um mapa interativo.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={filterRedeId || '__all'} onValueChange={v => { setFilterRedeId(v === '__all' ? '' : v); setFilterAreaId(''); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todas as Redes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todas as Redes</SelectItem>
                {redes?.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterAreaId || '__all'} onValueChange={v => setFilterAreaId(v === '__all' ? '' : v)} disabled={filteredAreas.length === 0}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todas as Áreas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todas as Áreas</SelectItem>
                {filteredAreas.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
              </SelectContent>
            </Select>

            {(filterRedeId || filterAreaId) && (
              <Button variant="ghost" onClick={clearFilters} className="text-xs text-muted-foreground hover:text-destructive h-9 px-3">
                Limpar Filtros
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Carregando dados do mapa...</p>
          </div>
        ) : (
          <div className="h-[600px] w-full rounded-lg overflow-hidden border">
             <MapView cells={filteredCells} users={users || []} redes={redes || []} apiKey={apiKey} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

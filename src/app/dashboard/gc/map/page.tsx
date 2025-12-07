
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Map as MapIcon, Loader2 } from "lucide-react";
import { useCollection } from '@/firebase/firestore/use-collection';
import { MapView } from '@/components/gc/map-view';

type Cell = {
  id: string;
  nome: string;
  liderId: string;
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

// Acessa a API key do ambiente, que é segura para ser usada no lado do cliente pois foi prefixada com NEXT_PUBLIC_
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function MapPage() {
  const { data: cells, isLoading: isLoadingCells } = useCollection<Cell>('cells');
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>('users');

  const isLoading = isLoadingCells || isLoadingUsers;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapIcon className="size-5" />
          Mapa das Células
        </CardTitle>
        <CardDescription>
          Visualize a localização de todas as células em um mapa interativo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Carregando dados do mapa...</p>
          </div>
        ) : (
          <div className="h-[600px] w-full rounded-lg overflow-hidden border">
             <MapView cells={cells || []} users={users || []} apiKey={apiKey} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

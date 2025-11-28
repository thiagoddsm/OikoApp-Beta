
'use client';

import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

type Cell = {
  id: string;
  nome: string;
  liderId: string;
  address?: {
    street: string;
    lat?: number;
    lng?: number;
  };
};

type User = {
  id: string;
  name: string;
};

interface MapViewProps {
  cells: Cell[];
  users: User[];
  apiKey?: string;
}

export function MapView({ cells, users, apiKey }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const userMap = new Map(users.map(u => [u.id, u]));

  useEffect(() => {
    if (!apiKey || !mapRef.current || !window.google || !window.google.maps) {
      return;
    }

    const initMap = async () => {
      const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

      const map = new Map(mapRef.current!, {
        center: { lat: -14.235, lng: -51.9253 }, // Center of Brazil
        zoom: 4,
        mapId: 'CONECTA_GC_MAP_ID',
      });

      const infoWindow = new google.maps.InfoWindow();

      cells.forEach(cell => {
        if (cell.address?.lat && cell.address?.lng) {
          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: cell.address.lat, lng: cell.address.lng },
            title: cell.nome,
          });

          marker.addListener('click', () => {
            const leaderName = userMap.get(cell.liderId)?.name || 'Líder não encontrado';
            infoWindow.setContent(`
              <div style="font-family: sans-serif;">
                <h3 style="margin: 0; font-weight: bold;">${cell.nome}</h3>
                <p style="margin: 4px 0 0;">Líder: ${leaderName}</p>
                <p style="margin: 4px 0 0; font-size: 0.8em;">${cell.address?.street}</p>
              </div>
            `);
            infoWindow.open(map, marker);
          });
        }
      });
    };

    initMap();

  }, [cells, users, userMap, apiKey]);

  if (!apiKey) {
      return (
          <div className="flex flex-col items-center justify-center h-full bg-muted/50 p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-destructive mb-4" />
              <h3 className="font-bold text-lg text-destructive">API Key não configurada</h3>
              <p className="text-sm text-muted-foreground">
                  A chave da API do Google Maps não foi encontrada. Por favor, adicione sua chave ao arquivo <code className="bg-destructive/20 p-1 rounded">.env</code> como <code className="bg-destructive/20 p-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> para exibir o mapa.
              </p>
          </div>
      )
  }

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

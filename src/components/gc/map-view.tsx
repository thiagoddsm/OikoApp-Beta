
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
  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  useEffect(() => {
    const win = window as any;
    if (!apiKey || !mapRef.current || !win.google || !win.google.maps) {
      return;
    }

    const initMap = async () => {
      try {
        const { Map } = await win.google.maps.importLibrary("maps");
        const { AdvancedMarkerElement } = await win.google.maps.importLibrary("marker");

        const map = new Map(mapRef.current!, {
          center: { lat: -14.235, lng: -51.9253 }, // Center of Brazil
          zoom: 4,
          mapId: 'CONECTA_GC_MAP_ID',
        });

        const infoWindow = new win.google.maps.InfoWindow();

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
                <div style="font-family: sans-serif; color: #333; padding: 10px;">
                  <h3 style="margin: 0; font-weight: bold; color: #6750A4;">${cell.nome}</h3>
                  <p style="margin: 4px 0 0; font-size: 13px;">Líder: <strong>${leaderName}</strong></p>
                  <p style="margin: 4px 0 0; font-size: 11px; color: #666;">${cell.address?.street}</p>
                </div>
              `);
              infoWindow.open(map, marker);
            });
          }
        });
      } catch (err) {
        console.error("Error loading Google Maps:", err);
      }
    };

    initMap();

  }, [cells, userMap, apiKey]);

  if (!apiKey) {
      return (
          <div className="flex flex-col items-center justify-center h-full bg-muted/50 p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-destructive mb-4" />
              <h3 className="font-bold text-lg text-destructive">API Key não configurada</h3>
              <p className="text-sm text-muted-foreground">
                  A chave da API do Google Maps não foi encontrada. Adicione <code className="bg-destructive/20 p-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> para exibir o mapa.
              </p>
          </div>
      )
  }

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

// Hook defined inside component used here, ensuring useMemo is available
import { useMemo } from 'react';

'use client';

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { MapPin, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';

type Cell = {
  id: string;
  nome: string;
  liderId: string;
  redeId?: string;
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

type Rede = {
  id: string;
  nome: string;
  cor?: string;
};

interface MapViewProps {
  cells: Cell[];
  users: User[];
  redes?: Rede[];
  apiKey?: string;
}

function getDeterministicColor(str: string, name?: string): string {
  if (name) {
    const normalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes('vermelh')) return '#EF4444'; // Red
    if (normalized.includes('verd')) return '#10B981'; // Green
    if (normalized.includes('laranj')) return '#F97316'; // Orange
    if (normalized.includes('amarel')) return '#F59E0B'; // Yellow
    if (normalized.includes('azul')) return '#3B82F6'; // Blue
    if (normalized.includes('rosa')) return '#EC4899'; // Pink
    if (normalized.includes('rox') || normalized.includes('violet') || normalized.includes('indig')) return '#8B5CF6'; // Purple/Violet/Indigo
    if (normalized.includes('cian') || normalized.includes('turquesa')) return '#06B6D4'; // Cyan
    if (normalized.includes('marrom') || normalized.includes('castanh')) return '#78350F'; // Brown
    if (normalized.includes('cinz') || normalized.includes('grafit')) return '#6B7280'; // Gray
    if (normalized.includes('pret')) return '#0F172A'; // Black/Slate
  }

  const presets = [
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#3B82F6', // Blue
    '#06B6D4', // Cyan
    '#14B8A6', // Teal
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#F97316', // Orange
    '#EF4444', // Red
    '#EC4899', // Pink
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % presets.length;
  return presets[index];
}

declare global {
  interface Window {
    initGoogleMaps?: () => void;
  }
}

// Guard em nível de módulo — sobrevive ao StrictMode double-mount
let _mapsLoadPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (_mapsLoadPromise) return _mapsLoadPromise;

  _mapsLoadPromise = new Promise((resolve, reject) => {
    if ((window as any).google?.maps) {
      resolve();
      return;
    }

    window.initGoogleMaps = () => {
      resolve();
      delete window.initGoogleMaps;
    };

    // Remove script antigo se existir (troca de key em dev)
    const existing = document.getElementById('gmap-script');
    if (existing) {
      existing.remove();
    }

    const s = document.createElement('script');
    s.id = 'gmap-script';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=places&callback=initGoogleMaps`;
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      _mapsLoadPromise = null; // Permite retry
      reject(new Error(
        'Falha ao carregar o Google Maps. Verifique se a API Key é válida e se a "Maps JavaScript API" está ativada no Google Cloud Console.'
      ));
    };
    document.head.appendChild(s);
  });

  return _mapsLoadPromise;
}

async function geocodeAddress(address: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&region=br&language=pt-BR`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' && data.results[0]) {
      const loc = data.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng };
    }
    return null;
  } catch {
    return null;
  }
}

export function MapView({ cells, users, redes, apiKey }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const { firestore } = useFirebase();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [geocodingCount, setGeocodingCount] = useState(0);
  const [geocodingTotal, setGeocodingTotal] = useState(0);

  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  const redeMap = useMemo(() => new Map((redes || []).map(r => [r.id, r])), [redes]);
  const cellsWithCoords = useMemo(() => cells.filter(c => c.address?.lat && c.address?.lng), [cells]);
  const cellsNeedingGeocode = useMemo(() => cells.filter(c => c.address?.street && !c.address?.lat), [cells]);

  const initMap = useCallback(async () => {
    if (!apiKey || !mapRef.current) return;

    try {
      await loadGoogleMaps(apiKey);
    } catch (e: any) {
      setErrorMsg(e.message);
      setStatus('error');
      return;
    }

    const g = (window as any).google.maps;
    const allCells = [...cellsWithCoords];

    // Geocodificar células sem coordenadas
    if (cellsNeedingGeocode.length > 0 && firestore) {
      setGeocodingTotal(cellsNeedingGeocode.length);
      let done = 0;
      for (const cell of cellsNeedingGeocode) {
        const coords = await geocodeAddress(cell.address!.street, apiKey);
        done++;
        setGeocodingCount(done);
        if (coords) {
          allCells.push({ ...cell, address: { ...cell.address!, ...coords } });
          // Salvar coordenadas no Firestore para não geocodificar novamente
          try {
            await updateDoc(doc(firestore, 'cells', cell.id), {
              'address.lat': coords.lat,
              'address.lng': coords.lng,
            });
          } catch {}
        }
      }
    }

    if (!mapRef.current) return;

    const center = allCells[0]?.address?.lat
      ? { lat: allCells[0].address.lat!, lng: allCells[0].address.lng! }
      : { lat: -22.9068, lng: -43.1729 }; // Rio de Janeiro como fallback

    const map = new g.Map(mapRef.current, {
      center,
      zoom: allCells.length > 0 ? 13 : 5,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    const bounds = new g.LatLngBounds();
    const infoWindow = new g.InfoWindow();

    allCells.forEach(cell => {
      if (!cell.address?.lat || !cell.address?.lng) return;
      const pos = { lat: cell.address.lat, lng: cell.address.lng };
      bounds.extend(pos);

      const cellRede = cell.redeId ? redeMap.get(cell.redeId) : undefined;
      const redeColor = cellRede?.cor || (cell.redeId ? getDeterministicColor(cell.redeId, cellRede?.nome) : '#7C3AED');

      const marker = new g.Marker({
        map,
        position: pos,
        title: cell.nome,
        icon: {
          path: g.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: redeColor,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        const leader = userMap.get(cell.liderId);
        infoWindow.setContent(`
          <div style="font-family:system-ui,sans-serif;padding:12px 14px;min-width:200px">
            <p style="margin:0 0 6px;font-weight:800;color:${redeColor};font-size:15px;display:flex;align-items:center;gap:6px">
              <span style="width:10px;height:10px;border-radius:50%;background-color:${redeColor};display:inline-block"></span>
              ${cell.nome}
            </p>
            <p style="margin:4px 0;font-size:12px;color:#444">👤 <b>Líder:</b> ${leader?.name || '—'}</p>
            ${cellRede ? `<p style="margin:4px 0;font-size:12px;color:#444">🌐 <b>Rede:</b> ${cellRede.nome}</p>` : ''}
            <p style="margin:4px 0;font-size:11px;color:#888;border-top:1px solid #eee;padding-top:6px;margin-top:6px">📍 ${cell.address?.street || ''}</p>
          </div>
        `);
        infoWindow.open(map, marker);
      });
    });

    if (allCells.length > 1) map.fitBounds(bounds);
    setStatus('ready');
    setGeocodingTotal(0);
    setGeocodingCount(0);
  }, [apiKey, cellsWithCoords, cellsNeedingGeocode, userMap, redeMap, firestore]);

  useEffect(() => {
    setStatus('loading');
    initMap();
  }, [initMap]);

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/50 p-8 text-center gap-3">
        <MapPin className="h-10 w-10 text-destructive opacity-40" />
        <h3 className="font-bold text-destructive">API Key não configurada</h3>
        <p className="text-sm text-muted-foreground">Adicione <code className="bg-muted px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> no <code>.env</code></p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full font-sans">
      {/* Overlay de loading / geocodificação */}
      {status === 'loading' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          {geocodingTotal > 0 ? (
            <>
              <p className="font-bold text-slate-700">Geocodificando endereços...</p>
              <p className="text-sm text-muted-foreground">{geocodingCount} / {geocodingTotal} processados</p>
              <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(geocodingCount / geocodingTotal) * 100}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground font-medium">Carregando mapa...</p>
          )}
        </div>
      )}

      {/* Tela de erro */}
      {status === 'error' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-red-50 gap-4 p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive opacity-70" />
          <div>
            <h3 className="font-bold text-destructive mb-1">Erro ao carregar mapa</h3>
            <p className="text-sm text-muted-foreground max-w-sm">{errorMsg}</p>
          </div>
          <button
            onClick={() => { setStatus('loading'); initMap(); }}
            className="flex items-center gap-2 text-sm font-bold text-primary hover:underline"
          >
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </button>
        </div>
      )}

      {/* O mapa em si */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Legenda de Redes */}
      {status === 'ready' && redes && redes.length > 0 && (
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-4 text-xs font-semibold text-slate-700 border border-slate-100 max-w-[200px] max-h-60 overflow-y-auto z-10 space-y-2">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Redes</h4>
          <div className="space-y-2">
            {redes.map(rede => {
              const color = rede.cor || getDeterministicColor(rede.id, rede.nome);
              return (
                <div key={rede.id} className="flex items-center gap-2.5">
                  <span 
                    className="w-3 h-3 rounded-full border border-white shadow-sm inline-block shrink-0" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate text-slate-800 font-semibold">{rede.nome}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legenda de Células */}
      {status === 'ready' && (
        <div className="absolute bottom-6 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-md px-4 py-2 text-xs font-medium text-slate-700 border">
          <span className="font-black text-primary">{cellsWithCoords.length + cellsNeedingGeocode.length}</span>
          {' '}de{' '}
          <span className="font-black">{cells.length}</span>
          {' '}células no mapa
        </div>
      )}
    </div>
  );
}

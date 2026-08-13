'use client';

import React, { useState, useEffect } from 'react';
import { initializeFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { VSMultitrackPlayer, VsData } from '@/components/vs/vs-multitrack-player';
import { Badge } from '@/components/ui/badge';
import { Headphones, Sparkles, Volume2 } from 'lucide-react';

const { firestore } = initializeFirebase();

export default function VSBandaPublicPage() {
  const [currentSong, setCurrentSong] = useState<VsData | null>(null);
  const [setlistSongs, setSetlistSongs] = useState<VsData[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [externalIsPlaying, setExternalIsPlaying] = useState<boolean | undefined>(undefined);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!firestore) return;
      try {
        const qCatalog = query(collection(firestore, 'vs_catalog'), orderBy('createdAt', 'desc'));
        const snapCatalog = await getDocs(qCatalog);
        const catalogData = snapCatalog.docs.map((d) => ({ id: d.id, ...d.data() } as VsData));

        const qPlans = query(collection(firestore, 'worship_plans'), orderBy('createdAt', 'desc'));
        const snapPlans = await getDocs(qPlans);
        let worshipSetlist: VsData[] = [];

        if (!snapPlans.empty) {
          const planData = snapPlans.docs[0].data();
          if (Array.isArray(planData.items)) {
            const songItems = planData.items.filter((i: any) => i.type === 'song');
            worshipSetlist = songItems.map((item: any) => {
              const matchedVs = catalogData.find(
                (vs) => (item.vsId && vs.id === item.vsId) || vs.title.toLowerCase().trim() === item.title.toLowerCase().trim()
              );
              return {
                id: matchedVs?.id || `worship_${item.id}`,
                title: item.title,
                artist: item.arrangement || matchedVs?.artist || '',
                bpm: item.bpm || matchedVs?.bpm || 120,
                key: item.key || matchedVs?.key || 'C',
                timeSignature: matchedVs?.timeSignature || '4/4',
                tracks: matchedVs?.tracks && matchedVs.tracks.length > 0 ? matchedVs.tracks : [
                  { trackId: 'click', label: 'Clique (Metrônomo)', defaultPan: -1.0, defaultVolume: 1.0 },
                  { trackId: 'guide', label: 'Guia (Voz Regência)', defaultPan: 1.0, defaultVolume: 1.0 },
                  { trackId: 'backing', label: 'Playback / Instrumental', defaultPan: 0.0, defaultVolume: 1.0 },
                  { trackId: 'extra1', label: 'Teclados / Pads', defaultPan: 0.0, defaultVolume: 0.8 },
                ],
                sections: matchedVs?.sections || [],
              };
            });
          }
        }

        const songsToUse = worshipSetlist.length > 0 ? worshipSetlist : catalogData.length > 0 ? catalogData : [
          {
            id: 'demo_1',
            title: 'Vitorioso És',
            artist: 'Gabriel Guedes',
            bpm: 132,
            key: 'D',
            timeSignature: '4/4',
            tracks: [
              { trackId: 'click', label: 'Clique (Metrônomo)', defaultPan: -1.0, defaultVolume: 1.0 },
              { trackId: 'guide', label: 'Guia (Voz Regência)', defaultPan: 1.0, defaultVolume: 1.0 },
              { trackId: 'backing', label: 'Playback / Instrumental', defaultPan: 0.0, defaultVolume: 1.0 },
              { trackId: 'extra1', label: 'Teclados / Synths', defaultPan: 0.0, defaultVolume: 0.8 },
            ]
          }
        ];

        setSetlistSongs(songsToUse);
        setCurrentSong(songsToUse[0] || null);
      } catch (e) {
        console.error('Erro ao carregar VS Banda:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Sincronização em Tempo Real (Broadcast do Palco Principal)
    if (firestore) {
      const syncRef = doc(firestore, 'vs_live_sync', 'current');
      const unsub = onSnapshot(syncRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.currentSongIndex !== undefined) {
            setCurrentSongIndex(data.currentSongIndex);
          }
          if (data.isPlaying !== undefined) {
            setExternalIsPlaying(data.isPlaying);
          }
          if (data.isLive !== undefined) {
            setIsLive(data.isLive);
          }
        }
      });
      return () => unsub();
    }
  }, []);

  // Atualiza a música ativa quando o índice mudar via broadcast
  useEffect(() => {
    if (setlistSongs.length > 0 && setlistSongs[currentSongIndex]) {
      setCurrentSong(setlistSongs[currentSongIndex]);
    }
  }, [currentSongIndex, setlistSongs]);

  return (
    <div className="min-h-screen bg-[#07090e] text-white p-4 sm:p-6 space-y-6">
      {/* BANNER AO VIVO */}
      {isLive && (
        <div className="flex items-center justify-center gap-3 bg-rose-950/50 border border-rose-500/40 px-4 py-2 rounded-2xl">
          <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest text-rose-400">🔴 AO VIVO — Transmissão Ativa do Console Principal</span>
        </div>
      )}

      {/* HEADER DO PALCO / RETORNO DA BANDA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 sm:p-6 rounded-3xl shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-black uppercase text-[10px]">
              <Headphones className="size-3 mr-1 animate-pulse" /> Retorno dos Músicos (Band In-Ear Mix)
            </Badge>
            <Badge variant="outline" className="border-indigo-500/40 text-indigo-400 text-[10px]">
              <Sparkles className="size-3 mr-1" /> Com Clique + Guia + Cifra
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black italic tracking-tight">Console dos Músicos — Palco / Banda</h1>
          <p className="text-xs text-slate-400">Áudio completo com metrônomo, voz regência e cifras transpostas em tempo real.</p>
        </div>

        {/* SELETOR DE MÚSICA DA BANDA */}
        <div className="flex items-center gap-2">
          {setlistSongs.map((s, idx) => (
            <button
              type="button"
              key={s.id}
              onClick={() => {
                setCurrentSongIndex(idx);
                setCurrentSong(s);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentSongIndex === idx
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {idx + 1}. {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* PLAYER CONFIGURADO PARA BANDA (COM CLIQUE E GUIA) */}
      {currentSong ? (
        <VSMultitrackPlayer
          vs={currentSong}
          outputMode="band_monitors"
          externalIsPlaying={externalIsPlaying}
        />
      ) : (
        <div className="p-12 text-center text-slate-500">Carregando canal da Banda...</div>
      )}
    </div>
  );
}

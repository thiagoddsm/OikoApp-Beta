'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { collection, getDocs, deleteDoc, doc, query, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Play, Pause, Square, SkipBack, SkipForward, Flag, Clock, Settings, FileText, 
  Plus, Search, Sliders, Music, Radio, Volume2, Headphones, Sparkles, Lock, 
  HelpCircle, Disc, CheckCircle2, ChevronRight, Layers, ArrowLeft, Smartphone,
  Monitor, AlertCircle, Wifi, RefreshCw, Zap, VolumeX, Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { VSMultitrackPlayer, VsData } from '@/components/vs/vs-multitrack-player';

const { firestore } = initializeFirebase();

type VsEntry = {
  id: string;
  title: string;
  artist?: string;
  bpm?: number;
  key?: string;
  timeSignature?: string;
  duration?: number;
  tracks: { trackId: string; label: string; url?: string; defaultPan?: number; defaultVolume?: number }[];
  sections?: any[];
  status?: string;
  createdAt?: any;
};

export default function VsMainStagePage() {
  const { toast } = useToast();

  // Estados de Modo de Tela (Main Stage Desktop vs Mobile Remote Pad)
  const [viewMode, setViewMode] = useState<'desktop' | 'remote_pad'>('desktop');
  const [activeTab, setActiveTab] = useState<'current_set' | 'library' | 'mixer' | 'routing'>('current_set');
  
  const [catalog, setCatalog] = useState<VsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddSongDialogOpen, setIsAddSongDialogOpen] = useState(false);

  // Setlist do Culto Atual
  const [setlistTitle, setSetlistTitle] = useState('Culto de Domingo - Noite');
  const [setlistSongs, setSetlistSongs] = useState<VsEntry[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);

  // Estados do Player & Seção Enfileirada (Queued Section)
  const [isPlaying, setIsPlaying] = useState(false);
  const [serviceElapsedSeconds, setServiceElapsedSeconds] = useState(2052); // 00:34:12 de culto
  const [songCurrentTime, setSongCurrentTime] = useState(0); // tempo da música
  const [currentSectionLabel, setCurrentSectionLabel] = useState('INTRO');
  const [queuedSectionLabel, setQueuedSectionLabel] = useState<string | null>(null);
  const [countdownBeats, setCountdownBeats] = useState<number | null>(null);

  // Carrega o catálogo de VSs + Ordem de Culto Ativa do Worship Module
  useEffect(() => {
    async function fetchCatalogAndWorshipPlan() {
      if (!firestore) return;
      try {
        // 1. Carrega Catálogo VS
        const qCatalog = query(collection(firestore, 'vs_catalog'), orderBy('createdAt', 'desc'));
        const snapCatalog = await getDocs(qCatalog);
        const catalogData = snapCatalog.docs.map((d) => ({ id: d.id, ...d.data() } as VsEntry));
        setCatalog(catalogData);

        // 2. Busca o Plano de Culto (Worship Plan) mais recente ou do dia
        const qPlans = query(collection(firestore, 'worship_plans'), orderBy('createdAt', 'desc'));
        const snapPlans = await getDocs(qPlans);
        let worshipSetlist: VsEntry[] = [];

        if (!snapPlans.empty) {
          const latestPlanDoc = snapPlans.docs[0];
          const planData = latestPlanDoc.data();

          if (planData.title) {
            setSetlistTitle(`Ordem de Culto: ${planData.title}`);
          }

          if (Array.isArray(planData.items)) {
            const songItems = planData.items.filter((i: any) => i.type === 'song');
            
            worshipSetlist = songItems.map((item: any) => {
              // Tenta vincular pela vsId ou pelo título da música no catálogo de VS
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
                duration: item.durationSeconds || matchedVs?.duration || 270,
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

        if (worshipSetlist.length > 0) {
          setSetlistSongs(worshipSetlist);
        } else if (catalogData.length > 0) {
          setSetlistSongs(catalogData);
        } else {
          // Demo fallback se não houver registros
          const demoSongs: VsEntry[] = [
            {
              id: 'demo_1',
              title: 'Vitorioso És',
              artist: 'Gabriel Guedes',
              bpm: 132,
              key: 'D',
              timeSignature: '4/4',
              duration: 270,
              tracks: [
                { trackId: 'click', label: 'Clique (Metrônomo)', defaultPan: -1.0, defaultVolume: 1.0 },
                { trackId: 'guide', label: 'Guia (Voz Regência)', defaultPan: 1.0, defaultVolume: 1.0 },
                { trackId: 'backing', label: 'Playback / Instrumental', defaultPan: 0.0, defaultVolume: 1.0 },
                { trackId: 'extra1', label: 'Teclados / Synths', defaultPan: 0.0, defaultVolume: 0.8 },
              ]
            },
            {
              id: 'demo_2',
              title: 'Ousado Amor',
              artist: 'Isaias Saad',
              bpm: 68,
              key: 'F#m',
              timeSignature: '6/8',
              duration: 345,
              tracks: [
                { trackId: 'click', label: 'Clique (Metrônomo)', defaultPan: -1.0, defaultVolume: 1.0 },
                { trackId: 'guide', label: 'Guia (Voz Regência)', defaultPan: 1.0, defaultVolume: 1.0 },
                { trackId: 'backing', label: 'Playback / Instrumental', defaultPan: 0.0, defaultVolume: 1.0 },
                { trackId: 'extra1', label: 'Violão & Cordas', defaultPan: 0.0, defaultVolume: 0.8 },
              ]
            },
          ];
          setSetlistSongs(demoSongs);
        }
      } catch (e) {
        console.error('Erro ao carregar catálogo e ordem de culto:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchCatalogAndWorshipPlan();
  }, []);

  // Transmite o estado de reprodução REAL do player para as telas de palco
  // Chamado pelo callback onPlayStateChange do VSMultitrackPlayer
  const handlePlayerPlayStateChange = useCallback(async (playerIsPlaying: boolean) => {
    if (!firestore) return;
    try {
      const syncRef = doc(firestore, 'vs_live_sync', 'current');
      await setDoc(syncRef, {
        currentSongIndex,
        isPlaying: playerIsPlaying,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('Erro ao transmitir estado de palco:', e);
    }
  }, [currentSongIndex]);

  // Também sincroniza quando a música troca (independente do play)
  useEffect(() => {
    if (!firestore) return;
    try {
      const syncRef = doc(firestore, 'vs_live_sync', 'current');
      setDoc(syncRef, { currentSongIndex, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.warn('Erro ao transmitir índice de música:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSongIndex]);
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isPlaying) {
      interval = setInterval(() => {
        setServiceElapsedSeconds((prev) => prev + 1);

        setSongCurrentTime((prev) => {
          const maxDur = currentSong?.duration || 270;
          const next = prev + 1;

          // Atualiza o nome da seção com base na porcentagem de tempo
          const ratio = next / maxDur;
          if (ratio < 0.15) setCurrentSectionLabel('INTRO');
          else if (ratio < 0.35) setCurrentSectionLabel('VERSE 1');
          else if (ratio < 0.55) setCurrentSectionLabel('CHORUS');
          else if (ratio < 0.75) setCurrentSectionLabel('VERSE 2');
          else if (ratio < 0.90) setCurrentSectionLabel('BRIDGE');
          else setCurrentSectionLabel('OUTRO');

          // Se a música acabar, pula para a próxima
          if (next >= maxDur) {
            if (currentSongIndex < setlistSongs.length - 1) {
              setCurrentSongIndex((i) => i + 1);
              return 0;
            } else {
              setIsPlaying(false);
              return 0;
            }
          }
          return next;
        });

        // Se houver uma seção enfileirada (QUEUED), faz a contagem regressiva para a virada
        if (queuedSectionLabel) {
          setCountdownBeats((prev) => {
            if (prev === null) return 4;
            if (prev <= 1) {
              setCurrentSectionLabel(queuedSectionLabel);
              setQueuedSectionLabel(null);
              toast({
                title: `Virada de Seção 🔀`,
                description: `Entrando no ${queuedSectionLabel}!`,
              });
              return null;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, queuedSectionLabel, toast, currentSongIndex, setlistSongs.length]);

  // Música em reprodução no momento
  const currentSong = setlistSongs[currentSongIndex] || {
    id: 'demo_1',
    title: 'Vitorioso És',
    artist: 'Gabriel Guedes',
    bpm: 132,
    key: 'D',
    timeSignature: '4/4',
    duration: 270,
    tracks: []
  };

  const totalSetlistDurationSeconds = useMemo(() => {
    return setlistSongs.reduce((acc, s) => acc + (s.duration || 270), 0);
  }, [setlistSongs]);

  const remainingSeconds = Math.max(0, totalSetlistDurationSeconds - songCurrentTime);

  const formatClockTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Enfileirar nova seção (Virada no compasso)
  const handleQueueSection = (label: string) => {
    setQueuedSectionLabel(label);
    setCountdownBeats(4);
    toast({
      title: `Seção Enfileirada: ${label} ⏳`,
      description: `Entrará na virada do compasso (em 4 tempos).`,
    });
  };

  // Adicionar Música do Catálogo ao Repertório
  const handleAddSongToSetlist = (song: VsEntry) => {
    setSetlistSongs((prev) => [...prev, song]);
    setIsAddSongDialogOpen(false);
    toast({
      title: 'Música Adicionada ao Repertório 🎵',
      description: `"${song.title}" foi incluída no culto.`,
    });
  };

  // Remover Música do Repertório
  const handleRemoveSongFromSetlist = (index: number) => {
    setSetlistSongs((prev) => prev.filter((_, i) => i !== index));
    if (currentSongIndex >= index && currentSongIndex > 0) {
      setCurrentSongIndex((prev) => prev - 1);
    }
  };

  // Excluir VS do Catálogo Geral (Firestore)
  const handleDeleteVsFromCatalog = async (vsId: string, vsTitle: string) => {
    if (!confirm(`Tem certeza que deseja excluir "${vsTitle}" do catálogo?`)) return;
    try {
      if (firestore) {
        await deleteDoc(doc(firestore, 'vs_catalog', vsId));
      }
      setCatalog((prev) => prev.filter((item) => item.id !== vsId));
      setSetlistSongs((prev) => prev.filter((item) => item.id !== vsId));
      toast({
        title: 'VS Excluída com Sucesso 🗑️',
        description: `"${vsTitle}" foi removida do catálogo.`,
      });
    } catch (e) {
      console.error('Erro ao excluir VS:', e);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir VS',
        description: 'Não foi possível remover a música do banco de dados.',
      });
    }
  };

  // GERAÇÃO AUTOMÁTICA DE ROTEIRO PDF DO CULTO
  const handleGeneratePdfReport = () => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 38, 'F');

      doc.setTextColor(16, 185, 129);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('OIKO LIVE — ROTEIRO DE PALCO E REPERTÓRIO', 14, 18);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Evento: ${setlistTitle} | Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

      const tableData = setlistSongs.map((s, idx) => [
        (idx + 1).toString(),
        s.title,
        s.artist || '—',
        s.key || '—',
        s.bpm ? `${s.bpm} BPM` : '—',
        s.timeSignature || '4/4',
        formatClockTime(s.duration || 270),
        'Transição Auto'
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['#', 'Música / Faixa', 'Artista', 'Tom', 'BPM', 'Compasso', 'Duração', 'Tipo']],
        body: tableData,
        headStyles: { fillColor: [30, 41, 59], textColor: [16, 185, 129], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 180;
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.text('Documento gerado automaticamente pelo sistema Oiko Live (VS Stage Console).', 14, finalY + 15);
      doc.text(`Tempo Total Previsto do Repertório: ${formatClockTime(totalSetlistDurationSeconds)}`, 14, finalY + 22);

      doc.save(`Roteiro_Culto_${setlistTitle.replace(/\s+/g, '_')}.pdf`);
      toast({
        title: 'Roteiro PDF Gerado 📄',
        description: 'O arquivo de roteiro de palco foi baixado com sucesso.',
      });
    } catch (e: any) {
      console.error('Erro ao gerar PDF:', e);
      toast({ variant: 'destructive', title: 'Erro ao gerar PDF', description: e.message });
    }
  };

  // MODO MOBILE REMOTE PAD (TELA 2 DA REFERÊNCIA)
  if (viewMode === 'remote_pad') {
    return (
      <div className="min-h-screen bg-[#0a0d14] text-white font-sans flex flex-col justify-between p-4 max-w-md mx-auto select-none border-x border-slate-800 shadow-2xl">
        {/* Header do Remote Pad */}
        <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-black text-lg tracking-tight">OIKO LIVE REMOTE</span>
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setViewMode('desktop')}
              className="h-8 px-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
            >
              <Monitor size={14} className="mr-1" /> Desktop
            </Button>
            <Settings size={18} />
            <Wifi size={18} className="text-emerald-400" />
          </div>
        </div>

        {/* Card Master Out & VU Meter */}
        <div className="p-4 bg-[#121824] rounded-2xl border border-slate-800 space-y-2 text-center my-3">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400">
            <span>🔋 MIDI OK</span>
            <span>MASTER OUT</span>
          </div>
          <p className="text-3xl font-black font-mono text-cyan-400 tracking-tight drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]">
            -3.2 <span className="text-lg text-slate-400 font-normal">dB</span>
          </p>
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div className="h-full bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)] transition-all duration-300" style={{ width: isPlaying ? '75%' : '0%' }} />
          </div>
        </div>

        {/* GRID DE 8 PADS TOUCH DE SEÇÃO (TOUCH CONTROL PAD) */}
        <div className="grid grid-cols-2 gap-3 flex-1 my-2">
          {[
            { label: 'INTRO', color: 'border-l-4 border-l-cyan-400' },
            { label: 'VERSE 1', color: 'border-l-4 border-l-emerald-400' },
            { label: 'CHORUS', color: 'border-l-4 border-l-rose-500' },
            { label: 'VERSE 2', color: 'border-l-4 border-l-emerald-400' },
            { label: 'CHORUS 2', color: 'border-l-4 border-l-rose-500' },
            { label: 'BRIDGE', color: 'border-l-4 border-l-purple-500' },
            { label: 'CHORUS 3', color: 'border-l-4 border-l-rose-500' },
            { label: 'OUTRO', color: 'border-l-4 border-l-cyan-400' },
          ].map((pad) => {
            const isCurrent = currentSectionLabel === pad.label;
            const isQueued = queuedSectionLabel === pad.label;

            return (
              <button
                type="button"
                key={pad.label}
                onClick={() => handleQueueSection(pad.label)}
                className={`p-4 rounded-2xl bg-[#121824] border border-slate-800 text-left transition-all duration-200 flex flex-col justify-between active:scale-95 ${pad.color} ${
                  isCurrent
                    ? 'ring-2 ring-emerald-500 bg-emerald-950/40 shadow-lg shadow-emerald-500/20'
                    : isQueued
                    ? 'ring-2 ring-amber-500 bg-amber-950/40 animate-pulse'
                    : 'hover:bg-[#182030]'
                }`}
              >
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  {isCurrent ? 'CURRENT' : isQueued ? 'QUEUED' : 'SECTION'}
                </span>
                <span className="text-base font-black italic tracking-tight text-white mt-2 block">
                  {pad.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* BARRA DE AÇÃO RÁPIDA INFERIOR (STOP, PAUSE CYAN, NEXT) */}
        <div className="grid grid-cols-3 gap-3 my-2">
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              setIsPlaying(false);
              setSongCurrentTime(0);
            }}
            className="h-14 rounded-2xl border-rose-500/50 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-black text-sm"
          >
            <Square size={20} />
          </Button>

          <Button
            size="lg"
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-14 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-base shadow-[0_0_20px_rgba(6,182,212,0.5)]"
          >
            {isPlaying ? <Pause size={24} className="mr-1" /> : <Play size={24} className="mr-1 fill-slate-950" />}
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              if (currentSongIndex < setlistSongs.length - 1) setCurrentSongIndex((prev) => prev + 1);
              setSongCurrentTime(0);
            }}
            className="h-14 rounded-2xl border-slate-800 bg-[#121824] text-slate-300 hover:text-white font-black text-sm"
          >
            <SkipForward size={20} />
          </Button>
        </div>

        {/* NAVEGAÇÃO DE TABS DO REMOTE PAD */}
        <div className="flex items-center justify-around py-3 border-t border-slate-800/80 text-[10px] font-bold text-slate-400">
          <button type="button" className="flex flex-col items-center gap-1 text-cyan-400">
            <Smartphone size={16} /> Pads
          </button>
          <button type="button" className="flex flex-col items-center gap-1 hover:text-cyan-400" onClick={() => setViewMode('desktop')}>
            <Sliders size={16} /> Mixer
          </button>
          <button type="button" className="flex flex-col items-center gap-1 hover:text-cyan-400" onClick={() => setViewMode('desktop')}>
            <Music size={16} /> Setlist
          </button>
        </div>
      </div>
    );
  }

  // MODO DESKTOP MAIN STAGE (IMAGENS 1 E 3 DA REFERÊNCIA)
  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 font-sans flex flex-col justify-between select-none">
      {/* HEADER SUPERIOR CYBER-NEON DE CRONOMETRIA DO CULTO */}
      <header className="bg-[#121824] border-b border-slate-800/80 px-6 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black">
            <Disc className="size-5 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-xl font-black italic tracking-tight text-white flex items-center gap-2">
              OIKO LIVE <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">v3.4.2 Stable</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">{setlistTitle}</p>
          </div>
        </div>

        {/* ALERTA DE VIRADA DE SEÇÃO SE HOUVER QUEUED (REFRÃO EM 4...) */}
        {queuedSectionLabel && (
          <div className="hidden md:flex items-center gap-2 bg-rose-500/15 border border-rose-500/30 px-4 py-1.5 rounded-2xl animate-pulse">
            <Zap size={16} className="text-rose-400" />
            <span className="text-xs font-black text-rose-400 uppercase tracking-wider">
              🚨 {queuedSectionLabel} EM {countdownBeats}...
            </span>
          </div>
        )}

        {/* CONTADORES GIGANTES NEON (TEMPO DE CULTO & TEMPO RESTANTE) */}
        <div className="flex items-center gap-8 sm:gap-12">
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">
              TEMPO DE CULTO
            </span>
            <span className="text-2xl sm:text-4xl font-black font-mono tracking-tighter text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              {formatClockTime(serviceElapsedSeconds)}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden sm:block" />

          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">
              TEMPO RESTANTE
            </span>
            <span className="text-2xl sm:text-4xl font-black font-mono tracking-tighter text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]">
              {formatClockTime(remainingSeconds)}
            </span>
          </div>
        </div>

        {/* ÍCONES DE AÇÃO E SELETOR MOBILE REMOTE PAD */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setViewMode('remote_pad')}
            className="h-10 px-3 rounded-xl font-bold text-xs bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 gap-1.5 shadow-lg shadow-cyan-500/10"
          >
            <Smartphone size={16} /> Remote Pad (Mobile)
          </Button>

          <Button
            size="sm"
            onClick={handleGeneratePdfReport}
            className="h-10 px-4 rounded-xl font-bold text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 gap-2 shadow-lg shadow-emerald-500/10"
          >
            <FileText size={16} /> Baixar Roteiro PDF
          </Button>
        </div>
      </header>

      {/* CORPO PRINCIPAL: SIDEBAR ESQUERDA + WORKSPACE CENTRAL */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR ESQUERDA DE NAVEGAÇÃO PRO */}
        <aside className="w-60 bg-[#121824] border-r border-slate-800/80 p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div className="p-3 bg-[#182030] rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-black text-white truncate">Main Stage</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Sunday Service • Set A</p>
              <Button
                size="sm"
                onClick={() => setIsAddSongDialogOpen(true)}
                className="w-full h-8 text-[11px] font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl gap-1"
              >
                <Plus size={14} /> Adicionar Música
              </Button>
            </div>

            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab('current_set')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  activeTab === 'current_set'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Music size={16} /> Arrangement
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  activeTab === 'library'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Disc size={16} /> Library (Catálogo VS)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('mixer')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  activeTab === 'mixer'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Sliders size={16} /> Mixer (16 Canais)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('routing')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  activeTab === 'routing'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Radio size={16} /> Routing (Saídas USB L/R)
              </button>

              <div className="pt-2 border-t border-slate-800/60 space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider px-1">Links de Palco</span>
                <a
                  href="/public/vs-igreja"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-xs text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
                >
                  <Radio size={14} /> 🔊 Mesa PA (Igreja)
                </a>
                <a
                  href="/public/vs-banda"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-xs text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-all"
                >
                  <Headphones size={14} /> 🎧 Retorno (Banda)
                </a>
              </div>
            </nav>

            {/* STATUS DO SISTEMA NA SIDEBAR */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Status do Sistema</span>
              <div className="space-y-1 text-xs font-bold">
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#182030] text-emerald-400 border border-slate-800">
                  <span>MIDI</span>
                  <CheckCircle2 size={14} />
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#182030] text-emerald-400 border border-slate-800">
                  <span>ProPresenter</span>
                  <CheckCircle2 size={14} />
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#182030] text-slate-400 border border-slate-800">
                  <span>Offline Ready</span>
                  <Wifi size={14} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
            <button type="button" className="w-full flex items-center gap-2 px-2 py-1.5 hover:text-slate-300">
              <Lock size={14} /> Lock Controls
            </button>
            <button type="button" className="w-full flex items-center gap-2 px-2 py-1.5 hover:text-slate-300">
              <HelpCircle size={14} /> Support
            </button>
          </div>
        </aside>

        {/* WORKSPACE CENTRAL: ARRANGEMENT VIEW & MULTITRACK MIXER 14 CANAIS */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0a0d14]">
          {activeTab === 'current_set' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* COLUNA DA ESQUERDA: LISTA DE MÚSICAS DO CULTO (SETLIST) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center justify-between bg-[#121824] p-4 rounded-2xl border border-slate-800">
                  <div>
                    <h2 className="text-base font-black italic text-white">{setlistTitle}</h2>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {setlistSongs.length} Músicas • Duração: {formatClockTime(totalSetlistDurationSeconds)}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setIsAddSongDialogOpen(true)}
                    className="h-8 px-2.5 text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl gap-1"
                  >
                    <Plus size={12} /> Add
                  </Button>
                </div>

                {/* LISTA DAS FAIXAS DO REPERTÓRIO */}
                <div className="space-y-2">
                  {setlistSongs.map((song, idx) => {
                    const isSelected = idx === currentSongIndex;

                    return (
                      <div
                        key={`${song.id}-${idx}`}
                        onClick={() => {
                          setCurrentSongIndex(idx);
                          setSongCurrentTime(0);
                        }}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#182232] border-emerald-500 shadow-xl ring-2 ring-emerald-500/30'
                            : 'bg-[#121824] border-slate-800 hover:border-slate-700 hover:bg-[#161e2e]'
                        }`}
                      >
                        <div className="space-y-0.5 truncate">
                          <h3 className={`text-xs font-black italic truncate ${isSelected ? 'text-emerald-400' : 'text-white'}`}>
                            {song.title}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-medium">
                            BPM: {song.bpm || 120} • Key: {song.key || 'C'} • {formatClockTime(song.duration || 270)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isSelected && (
                            <Badge className="bg-emerald-500 text-slate-950 font-black text-[9px] uppercase px-2 py-0.5">
                              PLAYING
                            </Badge>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSongFromSetlist(idx);
                            }}
                            className="text-slate-600 hover:text-rose-400 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COLUNA DA DIREITA: PLAYER MAIN STAGE & MULTITRACK MIXER */}
              <div className="lg:col-span-8 space-y-6">
                <VSMultitrackPlayer
                  vs={currentSong as VsData}
                  onPlayStateChange={handlePlayerPlayStateChange}
                />
              </div>
            </div>
          )}

          {activeTab === 'library' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[#121824] p-4 rounded-2xl border border-slate-800">
                <div className="relative w-72">
                  <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
                  <Input
                    placeholder="Buscar no catálogo de VS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-9 text-xs bg-[#0b0f17] border-slate-800 text-white placeholder:text-slate-600 rounded-xl"
                  />
                </div>

                <Link href="/dashboard/vs/upload">
                  <Button size="sm" className="font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl gap-1.5">
                    <Plus size={14} /> Novo Upload de VS
                  </Button>
                </Link>
              </div>

              <div className="bg-[#121824] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#182030] text-emerald-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">#</th>
                      <th className="p-4">Música / Artista</th>
                      <th className="p-4">Tom</th>
                      <th className="p-4">BPM</th>
                      <th className="p-4">Duração</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {catalog
                      .filter((vs) =>
                        !searchQuery ||
                        vs.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (vs.artist && vs.artist.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                      .map((vs, idx) => (
                      <tr key={vs.id} className="hover:bg-[#161e2e] transition-colors">
                        <td className="p-4 font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-4 font-bold text-white">
                          {vs.title}
                          {vs.artist && <span className="block text-[11px] text-slate-400 font-normal">{vs.artist}</span>}
                        </td>
                        <td className="p-4 font-bold text-amber-400">{vs.key || 'C'}</td>
                        <td className="p-4 font-mono text-emerald-400">{vs.bpm || 120}</td>
                        <td className="p-4 font-mono">{formatClockTime(vs.duration || 270)}</td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAddSongToSetlist(vs)}
                            className="h-8 font-bold text-[11px] bg-slate-800 hover:bg-slate-700 text-white rounded-xl gap-1"
                          >
                            <Plus size={12} /> Add Set
                          </Button>
                          <Link href={`/dashboard/vs/${vs.id}`}>
                            <Button size="sm" className="h-8 font-bold text-[11px] bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl gap-1">
                              <Play size={12} className="fill-slate-950" /> Testar
                            </Button>
                          </Link>
                          <Link href={`/dashboard/vs/upload?edit=${vs.id}`}>
                            <Button size="sm" variant="outline" className="h-8 font-bold text-[11px] border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 rounded-xl gap-1">
                              Editar
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteVsFromCatalog(vs.id, vs.title)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl"
                            title="Excluir do catálogo"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* DIÁLOGO DE ADICIONAR MÚSICA AO REPERTÓRIO DO CULTO */}
      <Dialog open={isAddSongDialogOpen} onOpenChange={setIsAddSongDialogOpen}>
        <DialogContent className="bg-[#121824] border-slate-800 text-white rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black italic text-emerald-400">Adicionar Música ao Repertório</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Selecione uma música do seu catálogo de VSs salvas para incluir no culto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-60 overflow-y-auto py-2">
            {catalog.map((song) => (
              <div
                key={song.id}
                onClick={() => handleAddSongToSetlist(song)}
                className="p-3 bg-[#182030] hover:bg-[#1e293b] rounded-2xl border border-slate-800 cursor-pointer flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">{song.title}</h4>
                  <p className="text-[10px] text-slate-400">{song.artist} • {song.bpm} BPM • Tom: {song.key}</p>
                </div>
                <Button size="sm" className="h-7 text-[10px] font-bold bg-emerald-500 text-slate-950">
                  <Plus size={12} /> Incluir
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddSongDialogOpen(false)} className="text-xs font-bold text-slate-400">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FOOTER CYBERPUNK INFINITAMENTE PRO */}
      <footer className="bg-[#0b0f17] border-t border-slate-800/80 px-6 py-2 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-2 font-mono">
          <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Oiko Live v3.4.2 • System Ready</span>
        </div>

        <div className="flex items-center gap-6 font-medium">
          <button type="button" className="hover:text-slate-300">Documentation</button>
          <button type="button" className="hover:text-slate-300">Midi Map</button>
          <button type="button" className="hover:text-slate-300">Logs</button>
        </div>
      </footer>
    </div>
  );
}

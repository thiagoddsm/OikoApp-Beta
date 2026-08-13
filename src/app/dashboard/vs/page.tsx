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

const { firestore } = initializeFirebase();

type VsEntry = {
  id: string;
  title: string;
  artist?: string;
  bpm?: number;
  key?: string;
  timeSignature?: string;
  duration?: number;
  tracks: { trackId: string; label: string }[];
  status?: string;
  createdAt?: any;
};

interface MixerChannelState {
  name: string;
  volume: number; // 0..1
  isMuted: boolean;
  isSolo: boolean;
}

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

  // Estado dos 14 Canais da Mesa Multitrack de Áudio
  const [channelsState, setChannelsState] = useState<MixerChannelState[]>([
    { name: 'CLICK', volume: 0.8, isMuted: false, isSolo: false },
    { name: 'GUIDE', volume: 0.85, isMuted: false, isSolo: false },
    { name: 'KICK', volume: 0.9, isMuted: false, isSolo: false },
    { name: 'SNARE', volume: 0.75, isMuted: false, isSolo: false },
    { name: 'TOM 1', volume: 0.8, isMuted: false, isSolo: false },
    { name: 'TOM 2', volume: 0.8, isMuted: false, isSolo: false },
    { name: 'OH L', volume: 0.7, isMuted: false, isSolo: false },
    { name: 'OH R', volume: 0.7, isMuted: false, isSolo: false },
    { name: 'BASS DI', volume: 0.85, isMuted: false, isSolo: false },
    { name: 'BASS AMP', volume: 0.8, isMuted: false, isSolo: false },
    { name: 'GTR 1', volume: 0.85, isMuted: false, isSolo: false },
    { name: 'GTR 2', volume: 0.75, isMuted: false, isSolo: false },
    { name: 'KEYS L', volume: 0.9, isMuted: false, isSolo: false },
    { name: 'KEYS R', volume: 0.9, isMuted: false, isSolo: false },
  ]);

  // Carrega o catálogo do Firestore
  useEffect(() => {
    async function fetchCatalog() {
      if (!firestore) return;
      try {
        const q = query(collection(firestore, 'vs_catalog'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as VsEntry));
        setCatalog(data);

        if (data.length > 0) {
          setSetlistSongs(data);
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
              tracks: [{ trackId: '1', label: 'All Tracks' }]
            },
            {
              id: 'demo_2',
              title: 'Ousado Amor',
              artist: 'Isaias Saad',
              bpm: 68,
              key: 'F#m',
              timeSignature: '6/8',
              duration: 345,
              tracks: [{ trackId: '1', label: 'All Tracks' }]
            },
            {
              id: 'demo_3',
              title: 'Lugar Secreto',
              artist: 'Gabriela Rocha',
              bpm: 74,
              key: 'C',
              timeSignature: '4/4',
              duration: 370,
              tracks: [{ trackId: '1', label: 'All Tracks' }]
            }
          ];
          setSetlistSongs(demoSongs);
        }
      } catch (e) {
        console.error('Erro ao carregar catálogo:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchCatalog();
  }, []);

  // Temporizadores do Culto, Música e Virada de Seção em Tempo Real
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

  // Funções de Ajuste de Canais da Mesa Multitrack (Volume, Mute e Solo)
  const handleChannelVolumeChange = (idx: number, newVol: number) => {
    setChannelsState((prev) => {
      const copy = [...prev];
      copy[idx].volume = newVol;
      return copy;
    });
  };

  const handleToggleChannelMute = (idx: number) => {
    setChannelsState((prev) => {
      const copy = [...prev];
      copy[idx].isMuted = !copy[idx].isMuted;
      return copy;
    });
  };

  const handleToggleChannelSolo = (idx: number) => {
    setChannelsState((prev) => {
      const copy = [...prev];
      copy[idx].isSolo = !copy[idx].isSolo;
      return copy;
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
                        key={song.id || idx}
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
                {/* CARD PRINCIPAL DA MÚSICA EM EXECUÇÃO */}
                <Card className="bg-[#121824] border-slate-800 text-white rounded-3xl p-6 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          if (currentSongIndex > 0) setCurrentSongIndex((prev) => prev - 1);
                          setSongCurrentTime(0);
                        }}
                        className="size-12 rounded-2xl border-slate-800 bg-[#182030] text-slate-300 hover:text-white"
                      >
                        <SkipBack size={20} />
                      </Button>

                      <Button
                        size="icon"
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="size-14 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all"
                      >
                        {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1 fill-slate-950" />}
                      </Button>

                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          setIsPlaying(false);
                          setSongCurrentTime(0);
                        }}
                        className="size-12 rounded-2xl border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                      >
                        <Square size={20} />
                      </Button>
                    </div>

                    <div className="text-center">
                      <h2 className="text-2xl font-black italic text-cyan-400 tracking-tight">{currentSong.title}</h2>
                      <p className="text-xs text-slate-400 font-semibold">
                        {currentSong.artist || 'Hillsong'} • {currentSong.bpm || 132} BPM • Key: {currentSong.key || 'D'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">ELAPSED / REMAINING</span>
                      <span className="text-xl font-black font-mono text-white">
                        {formatClockTime(songCurrentTime)} / {formatClockTime(currentSong.duration || 270)}
                      </span>
                    </div>
                  </div>

                  {/* VISUALIZADOR DE ONDA MULTITRACK (ARRANGEMENT VIEW) */}
                  <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl p-4 space-y-3 relative overflow-hidden">
                    <div className="grid grid-cols-6 gap-1 text-[10px] font-black font-mono text-slate-300">
                      <button type="button" onClick={() => handleQueueSection('INTRO')} className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 text-left">INTRO</button>
                      <button type="button" onClick={() => handleQueueSection('VERSE 1')} className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 text-left">VERSE 1</button>
                      <button type="button" onClick={() => handleQueueSection('CHORUS')} className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 text-left">CHORUS</button>
                      <button type="button" onClick={() => handleQueueSection('VERSE 2')} className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 text-left">VERSE 2</button>
                      <button type="button" onClick={() => handleQueueSection('BRIDGE')} className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 text-left">BRIDGE</button>
                      <button type="button" onClick={() => handleQueueSection('OUTRO')} className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 text-left">OUTRO</button>
                    </div>

                    <div className="space-y-2 py-2">
                      {[1, 2, 3, 4].map((waveIndex) => (
                        <div key={waveIndex} className="h-5 flex items-center gap-1 opacity-80">
                          {Array.from({ length: 50 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-1 bg-emerald-400/80 rounded-full transition-all duration-300"
                              style={{
                                height: `${Math.max(15, Math.sin(i * 0.5 + waveIndex + (isPlaying ? songCurrentTime * 0.2 : 0)) * 100)}%`
                              }}
                            />
                          ))}
                        </div>
                      ))}
                    </div>

                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,1)] z-10 transition-all duration-300"
                      style={{ left: `${(songCurrentTime / (currentSong.duration || 270)) * 100}%` }}
                    />
                  </div>
                </Card>

                {/* MESA DE SOM MULTITRACK DE 14 CANAIS FUNCIONAL NO RODAPÉ */}
                <Card className="bg-[#121824] border-slate-800 text-white rounded-3xl p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black italic tracking-tight text-white flex items-center gap-2">
                      <Sliders size={18} className="text-emerald-400" /> MULTITRACK MIXER (14 CANAIS FUNCIONAIS)
                    </h3>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold text-[10px]">
                      14 Faders Ativos
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-[repeat(14,minmax(0,1fr))] gap-2 overflow-x-auto pt-2">
                    {channelsState.map((ch, idx) => {
                      const dbText = ch.isMuted
                        ? 'MUTED'
                        : `${(ch.volume * 24 - 18).toFixed(1)} dB`;

                      return (
                        <div key={ch.name} className="bg-[#0b0f17] p-2 rounded-2xl border border-slate-800/80 flex flex-col items-center space-y-2">
                          <span className="text-[9px] font-black text-slate-300 truncate w-full text-center">{ch.name}</span>

                          {/* Botões Mute & Solo */}
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleChannelSolo(idx)}
                              className={`text-[8px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                                ch.isSolo
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                                  : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                              }`}
                            >
                              S
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleChannelMute(idx)}
                              className={`text-[8px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                                ch.isMuted
                                  ? 'bg-rose-600 text-white border-rose-500 font-black'
                                  : 'bg-slate-900 text-slate-400 hover:text-rose-400 border-slate-800'
                              }`}
                            >
                              M
                            </button>
                          </div>

                          {/* Slider Vertical de Vômetro LED Animado */}
                          <div className="w-4 h-28 bg-slate-900 rounded-lg p-0.5 flex flex-col justify-end gap-0.5 border border-slate-800 relative">
                            {Array.from({ length: 10 }).map((_, ledIdx) => {
                              const levelPct = ch.isMuted ? 0 : ch.volume * (isPlaying ? Math.abs(Math.sin((songCurrentTime + idx) * 0.8)) * 0.4 + 0.6 : 0.7);
                              const isActive = (10 - ledIdx) * 10 <= levelPct * 100;

                              return (
                                <div
                                  key={ledIdx}
                                  className={`w-full h-2 rounded-xs transition-all duration-150 ${
                                    isActive
                                      ? ledIdx < 2
                                        ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]'
                                        : ledIdx < 4
                                        ? 'bg-amber-400'
                                        : 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                                      : 'bg-slate-800/40'
                                  }`}
                                />
                              );
                            })}
                          </div>

                          <span className="text-[8px] font-mono font-bold text-slate-400 truncate w-full text-center">
                            {dbText}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
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
                    {catalog.map((vs, idx) => (
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

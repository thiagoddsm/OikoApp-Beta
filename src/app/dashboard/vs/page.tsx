'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { collection, getDocs, deleteDoc, doc, query, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Play, Pause, Square, SkipBack, SkipForward, Flag, Clock, Settings, FileText, 
  Plus, Search, Sliders, Music, Radio, Volume2, Headphones, Sparkles, Lock, 
  HelpCircle, Disc, CheckCircle2, ChevronRight, Layers, ArrowLeft, Smartphone,
  Monitor, AlertCircle, Wifi, RefreshCw, Zap
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

export default function VsMainStagePage() {
  const { toast } = useToast();

  // Estados de Modo de Tela (Main Stage Desktop vs Mobile Remote Pad)
  const [viewMode, setViewMode] = useState<'desktop' | 'remote_pad'>('desktop');
  const [activeTab, setActiveTab] = useState<'current_set' | 'library' | 'mixer' | 'routing'>('current_set');
  
  const [catalog, setCatalog] = useState<VsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Setlist do Culto Atual
  const [setlistTitle, setSetlistTitle] = useState('Culto de Domingo - Noite');
  const [setlistSongs, setSetlistSongs] = useState<VsEntry[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);

  // Estados do Player & Seção Enfileirada (Queued Section)
  const [isPlaying, setIsPlaying] = useState(false);
  const [serviceElapsedSeconds, setServiceElapsedSeconds] = useState(2052); // 00:34:12 de culto
  const [songCurrentTime, setSongCurrentTime] = useState(222); // 03:42 de música
  const [currentSectionLabel, setCurrentSectionLabel] = useState('VERSE 1');
  const [queuedSectionLabel, setQueuedSectionLabel] = useState<string | null>(null);
  const [countdownBeats, setCountdownBeats] = useState<number | null>(null);

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
        }
      } catch (e) {
        console.error('Erro ao carregar catálogo:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchCatalog();
  }, []);

  // Temporizadores do Culto e Contagem de Virada de Seção
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setServiceElapsedSeconds((prev) => prev + 1);
        setSongCurrentTime((prev) => prev + 1);

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
  }, [isPlaying, queuedSectionLabel, toast]);

  // Música em reprodução no momento
  const currentSong = setlistSongs[currentSongIndex] || catalog[0] || {
    id: 'demo_1',
    title: 'Vitorioso És',
    artist: 'Gabriel Guedes',
    bpm: 132,
    key: 'D',
    timeSignature: '4/4',
    tracks: [
      { trackId: 'click', label: 'Click' },
      { trackId: 'guide', label: 'Guide' },
      { trackId: 'kick', label: 'Kick' },
      { trackId: 'snare', label: 'Snare' },
      { trackId: 'bass', label: 'Bass DI' },
      { trackId: 'keys', label: 'Keys L/R' }
    ]
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
            <span className="text-emerald-400 font-black text-lg tracking-tight">OIKO LIVE</span>
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
            <RefreshCw size={18} />
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
            <div className="h-full bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]" style={{ width: '70%' }} />
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
          <button type="button" className="flex flex-col items-center gap-1 hover:text-cyan-400">
            <Play size={16} /> Play
          </button>

          <button type="button" className="flex flex-col items-center gap-1 text-cyan-400">
            <Smartphone size={16} /> Pads
          </button>

          <button type="button" className="flex flex-col items-center gap-1 hover:text-cyan-400">
            <Sliders size={16} /> Mixer
          </button>

          <button type="button" className="flex flex-col items-center gap-1 hover:text-cyan-400">
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
          {/* Tempo de Culto (Verde Neon) */}
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">
              TEMPO DE CULTO
            </span>
            <span className="text-2xl sm:text-4xl font-black font-mono tracking-tighter text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              {formatClockTime(serviceElapsedSeconds)}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden sm:block" />

          {/* Tempo Restante (Rosa/Coral Neon) */}
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
              <Button size="sm" className="w-full h-8 text-[11px] font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl gap-1">
                <Plus size={14} /> New Setlist
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

        {/* WORKSPACE CENTRAL: ARRANGEMENT VIEW & MULTITRACK MIXER 16 CANAIS */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0a0d14]">
          {activeTab === 'current_set' && (
            <div className="space-y-6">
              {/* TOP PLAYER BAR & TIMELINE MARCADORES COLORIDOS DE SEÇÃO */}
              <Card className="bg-[#121824] border-slate-800 text-white rounded-3xl p-6 shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setSongCurrentTime(0)}
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

                  {/* Nome da Música Atual */}
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

                {/* VISUALIZADOR DE ONDA MULTITRACK (ARRANGEMENT VIEW DE 4 ONDAS) */}
                <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl p-4 space-y-4 relative overflow-hidden">
                  {/* SEÇÕES COLORIDAS NO TOPO DA TIMELINE */}
                  <div className="grid grid-cols-6 gap-1 text-[10px] font-black font-mono text-slate-300">
                    <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">INTRO</div>
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">VERSE 1</div>
                    <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">CHORUS</div>
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">VERSE 2</div>
                    <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">BRIDGE</div>
                    <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">CHORUS 2</div>
                  </div>

                  {/* Linhas Neon de Áudio Waveform */}
                  <div className="space-y-3 py-2">
                    {[1, 2, 3, 4].map((waveIndex) => (
                      <div key={waveIndex} className="h-6 flex items-center gap-1 opacity-80">
                        {Array.from({ length: 60 }).map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-emerald-400/80 rounded-full"
                            style={{ height: `${Math.max(15, Math.sin(i * 0.5 + waveIndex) * 100)}%` }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Cursor da Linha do Tempo */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,1)] z-10"
                    style={{ left: `${(songCurrentTime / (currentSong.duration || 270)) * 100}%` }}
                  />
                </div>
              </Card>

              {/* MESA DE SOM MULTITRACK DE 16 CANAIS NO RODAPÉ (MULTITRACK MIXER 16 CH) */}
              <Card className="bg-[#121824] border-slate-800 text-white rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black italic tracking-tight text-white flex items-center gap-2">
                    <Sliders size={18} className="text-emerald-400" /> MULTITRACK MIXER (16 CANAIS)
                  </h3>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold text-[10px]">
                    16 Canais USB Ativos
                  </Badge>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-[repeat(14,minmax(0,1fr))] gap-2 overflow-x-auto pt-2">
                  {[
                    { name: 'CLICK', db: '-12.4' },
                    { name: 'GUIDE', db: '-6.0' },
                    { name: 'KICK', db: '-0.2' },
                    { name: 'SNARE', db: '-18.0' },
                    { name: 'TOM 1', db: '-1.6' },
                    { name: 'TOM 2', db: '-3.8' },
                    { name: 'OH L', db: '-3.2' },
                    { name: 'OH R', db: '-7.6' },
                    { name: 'BASS DI', db: '-14.2' },
                    { name: 'BASS M..', db: '-5.0' },
                    { name: 'GTR 1', db: '-1.8' },
                    { name: 'GTR 2', db: '-8.8' },
                    { name: 'KEYS L', db: '-2.0' },
                    { name: 'KEYS R', db: '-13.2' },
                  ].map((ch) => (
                    <div key={ch.name} className="bg-[#0b0f17] p-2 rounded-2xl border border-slate-800/80 flex flex-col items-center space-y-2">
                      <span className="text-[9px] font-black text-slate-300 truncate w-full text-center">{ch.name}</span>

                      {/* Botões Mute & Solo Pequenos */}
                      <div className="flex gap-1">
                        <button type="button" className="text-[8px] font-bold px-1 py-0.5 rounded bg-slate-900 text-slate-400 hover:text-white border border-slate-800">S</button>
                        <button type="button" className="text-[8px] font-bold px-1 py-0.5 rounded bg-slate-900 text-slate-400 hover:text-rose-400 border border-slate-800">M</button>
                      </div>

                      {/* Slider Vômetro com LED Verde */}
                      <div className="w-4 h-32 bg-slate-900 rounded-lg p-0.5 flex flex-col justify-end gap-0.5 border border-slate-800">
                        {Array.from({ length: 10 }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-full h-2 rounded-xs ${
                              idx < 2 ? 'bg-rose-500' : idx < 4 ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                          />
                        ))}
                      </div>

                      <span className="text-[9px] font-mono font-bold text-slate-400">{ch.db}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

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

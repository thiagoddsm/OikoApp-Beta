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
  HelpCircle, Disc, CheckCircle2, ChevronRight, Layers, ArrowLeft
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

  // Estados Principais de Navegação e Tab
  const [activeTab, setActiveTab] = useState<'current_set' | 'library' | 'mixer' | 'routing'>('current_set');
  const [catalog, setCatalog] = useState<VsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Setlist do Culto Atual
  const [setlistTitle, setSetlistTitle] = useState('Culto de Domingo - Noite');
  const [setlistSongs, setSetlistSongs] = useState<VsEntry[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);

  // Estados do Player Main Stage
  const [isPlaying, setIsPlaying] = useState(false);
  const [serviceElapsedSeconds, setServiceElapsedSeconds] = useState(2052); // 00:34:12 de culto
  const [songCurrentTime, setSongCurrentTime] = useState(134); // 02:14 de música

  // Carrega as VSs do Firestore
  useEffect(() => {
    async function fetchCatalog() {
      if (!firestore) return;
      try {
        const q = query(collection(firestore, 'vs_catalog'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as VsEntry));
        setCatalog(data);

        // Se o setlist estiver vazio, coloca as músicas do catálogo nele
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

  // Temporizadores do Culto e da Música Atual
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setServiceElapsedSeconds((prev) => prev + 1);
        setSongCurrentTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

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
      { trackId: 'keys1', label: 'Keys 1' },
      { trackId: 'keys2', label: 'Keys 2' }
    ]
  };

  // Tempo Restante Total do Repertório
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

  // GERADOR AUTOMÁTICO DE ROTEIRO PDF DO CULTO
  const handleGeneratePdfReport = () => {
    try {
      const doc = new jsPDF();

      // Cabeçalho Estilo Oiko Live
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.rect(0, 0, 210, 38, 'F');

      doc.setTextColor(16, 185, 129); // Emerald 500
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('OIKO LIVE — ROTEIRO DE PALCO E REPERTÓRIO', 14, 18);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Evento: ${setlistTitle} | Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

      // Tabela do Repertório
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

      // Rodapé
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

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 font-sans flex flex-col justify-between select-none">
      {/* HEADER SUPERIOR CYBER-NEON DE CRONOMETRIA DO CULTO */}
      <header className="bg-[#121824] border-b border-slate-800/80 px-6 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black">
            <Disc className="size-5 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-xl font-black italic tracking-tight text-white flex items-center gap-2">
              Oiko Live <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">v2.4.0 Main Stage</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">{setlistTitle}</p>
          </div>
        </div>

        {/* CONTADORES GIGANTES NEON (TEMPO DE CULTO & TEMPO RESTANTE) */}
        <div className="flex items-center gap-8 sm:gap-12">
          {/* Tempo de Culto (Verde Neon) */}
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">
              Tempo de Culto
            </span>
            <span className="text-2xl sm:text-4xl font-black font-mono tracking-tighter text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              {formatClockTime(serviceElapsedSeconds)}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden sm:block" />

          {/* Tempo Restante (Rosa/Coral Neon) */}
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">
              Tempo Restante
            </span>
            <span className="text-2xl sm:text-4xl font-black font-mono tracking-tighter text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]">
              {formatClockTime(remainingSeconds)}
            </span>
          </div>
        </div>

        {/* ÍCONES DE AÇÃO NO TOPO */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleGeneratePdfReport}
            className="h-10 px-4 rounded-xl font-bold text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 gap-2 shadow-lg shadow-emerald-500/10"
          >
            <FileText size={16} /> Baixar Roteiro PDF
          </Button>

          <Button size="icon" variant="ghost" className="size-10 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <Clock size={18} />
          </Button>
          <Button size="icon" variant="ghost" className="size-10 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <Settings size={18} />
          </Button>
        </div>
      </header>

      {/* CORPO PRINCIPAL: SIDEBAR ESQUERDA + WORKSPACE CENTRAL */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR ESQUERDA DE NAVEGAÇÃO PRO */}
        <aside className="w-60 bg-[#121824] border-r border-slate-800/80 p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            {/* Bloco de Setlist Ativo */}
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

            {/* Menu de Navegação Tabs */}
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
                <Music size={16} /> Current Set
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
                <Radio size={16} /> Routing (Saídas L/R)
              </button>
            </nav>
          </div>

          {/* Rodapé da Sidebar */}
          <div className="space-y-1 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
            <button type="button" className="w-full flex items-center gap-2 px-2 py-1.5 hover:text-slate-300">
              <Lock size={14} /> Lock Controls
            </button>
            <button type="button" className="w-full flex items-center gap-2 px-2 py-1.5 hover:text-slate-300">
              <HelpCircle size={14} /> Support
            </button>
          </div>
        </aside>

        {/* WORKSPACE CENTRAL (PAINEL DO REPERTÓRIO & PLAYER MAIN STAGE) */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0d1117]">
          {activeTab === 'current_set' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* COLUNA DA ESQUERDA: LISTA DE MÚSICAS DO CULTO (SETLIST) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between bg-[#121824] p-4 rounded-2xl border border-slate-800">
                  <div>
                    <h2 className="text-base font-black italic text-white">{setlistTitle}</h2>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {setlistSongs.length} Músicas • Duração Prevista: {formatClockTime(totalSetlistDurationSeconds)}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleGeneratePdfReport}
                    className="h-8 px-3 text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 gap-1.5"
                  >
                    <FileText size={12} /> Gerar PDF
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
                        className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'bg-[#182232] border-emerald-500 shadow-xl ring-2 ring-emerald-500/30'
                            : 'bg-[#121824] border-slate-800 hover:border-slate-700 hover:bg-[#161e2e]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <h3 className={`text-sm font-black italic ${isSelected ? 'text-emerald-400' : 'text-white'}`}>
                              {song.title}
                            </h3>
                            <p className="text-[11px] text-slate-400 font-medium">
                              BPM: {song.bpm || 120} • Key: {song.key || 'C'} • {formatClockTime(song.duration || 270)}
                            </p>
                          </div>

                          {isSelected && (
                            <Badge className="bg-emerald-500 text-slate-950 font-black text-[9px] uppercase px-2 py-0.5">
                              Tocando
                            </Badge>
                          )}

                          {!isSelected && idx === currentSongIndex + 1 && (
                            <Badge variant="outline" className="border-amber-500/40 text-amber-400 font-bold text-[9px] uppercase px-2 py-0.5">
                              NEXT
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COLUNA DA DIREITA: PLAYER MAIN STAGE & QUICK MIX DE VÔMETROS */}
              <div className="lg:col-span-7 space-y-6">
                {/* CARD PRINCIPAL DA MÚSICA EM EXECUÇÃO */}
                <Card className="bg-[#121824] border-slate-800 text-white rounded-3xl p-6 shadow-2xl space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-black italic text-white tracking-tight">{currentSong.title}</h2>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">
                        Playing • Sync: Internal • MIDI: ON
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="size-2 rounded-full bg-emerald-400 animate-ping" />
                      <div className="size-2 rounded-full bg-emerald-400" />
                      <div className="size-2 rounded-full bg-slate-700" />
                    </div>
                  </div>

                  {/* WAVEFORM DE ÁUDIO SIMULADA COM INDICADOR VERDE NEON */}
                  <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl p-4 h-32 relative flex items-center justify-between gap-1 overflow-hidden">
                    {/* Linhas da Onda Sonora */}
                    {Array.from({ length: 48 }).map((_, i) => {
                      const heightPercent = Math.min(100, Math.max(15, Math.sin(i * 0.4) * 50 + 50));
                      const isPlayed = i / 48 <= (songCurrentTime / (currentSong.duration || 270));

                      return (
                        <div
                          key={i}
                          className={`w-1.5 rounded-full transition-all duration-300 ${
                            isPlayed ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-800'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      );
                    })}

                    {/* Cursor da Linha do Tempo em Verde Neon */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,1)] z-10 transition-all duration-200"
                      style={{ left: `${(songCurrentTime / (currentSong.duration || 270)) * 100}%` }}
                    />
                  </div>

                  {/* BOTÕES DE TRANSPORTE MAIN STAGE NEON */}
                  <div className="flex items-center justify-center gap-4 pt-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        if (currentSongIndex > 0) setCurrentSongIndex(prev => prev - 1);
                        setSongCurrentTime(0);
                      }}
                      className="size-12 rounded-2xl border-slate-800 bg-[#182030] text-slate-300 hover:text-white"
                    >
                      <SkipBack size={20} />
                    </Button>

                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setSongCurrentTime(0)}
                      className="size-12 rounded-2xl border-slate-800 bg-[#182030] text-slate-300 hover:text-white"
                    >
                      <Square size={20} />
                    </Button>

                    <Button
                      size="icon"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="size-16 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-95 transition-all"
                    >
                      {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1 fill-slate-950" />}
                    </Button>

                    <Button
                      size="icon"
                      variant="outline"
                      className="size-12 rounded-2xl border-slate-800 bg-[#182030] text-slate-300 hover:text-white"
                    >
                      <Flag size={20} />
                    </Button>

                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        if (currentSongIndex < setlistSongs.length - 1) setCurrentSongIndex(prev => prev + 1);
                        setSongCurrentTime(0);
                      }}
                      className="size-12 rounded-2xl border-slate-800 bg-[#182030] text-slate-300 hover:text-white"
                    >
                      <SkipForward size={20} />
                    </Button>
                  </div>
                </Card>

                {/* QUICK MIX: VÔMETROS DE LEDS EM TEMPO REAL DE 4 CANAIS */}
                <Card className="bg-[#121824] border-slate-800 text-white rounded-3xl p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black italic tracking-tight text-slate-200">Quick Mix (Vômetros de Áudio)</h3>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">16 Ch Available</span>
                  </div>

                  <div className="grid grid-cols-4 gap-4 pt-2">
                    {[
                      { name: 'Click', db: '-6.2', level: 70, color: 'bg-emerald-400' },
                      { name: 'Guide', db: '-12.0', level: 45, color: 'bg-emerald-400' },
                      { name: 'Keys 1', db: '+1.2', level: 85, color: 'bg-emerald-400' },
                      { name: 'Keys 2', db: '-9.4', level: 55, color: 'bg-emerald-400' }
                    ].map((ch) => (
                      <div key={ch.name} className="bg-[#0b0f17] p-3 rounded-2xl border border-slate-800/80 flex flex-col items-center space-y-2">
                        <span className="text-[11px] font-bold text-slate-300">{ch.name}</span>

                        {/* Barra de LED Vertical de Vômetro */}
                        <div className="w-6 h-28 bg-slate-900 rounded-xl p-1 flex flex-col justify-end gap-1 border border-slate-800">
                          {Array.from({ length: 8 }).map((_, idx) => {
                            const active = (8 - idx) * 12.5 <= ch.level;
                            return (
                              <div
                                key={idx}
                                className={`w-full h-2 rounded-sm transition-all ${
                                  active
                                    ? idx < 2
                                      ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]'
                                      : idx < 4
                                      ? 'bg-amber-400'
                                      : 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                                    : 'bg-slate-800/40'
                                }`}
                              />
                            );
                          })}
                        </div>

                        <span className="text-[10px] font-mono font-bold text-slate-400">{ch.db}</span>
                      </div>
                    ))}
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

              {/* TABELA DE MÚSICAS DA BIBLIOTECA */}
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
                        <td className="p-4 text-right">
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

      {/* FOOTER CYBERPUNK INFINITAMENTE PRO */}
      <footer className="bg-[#0b0f17] border-t border-slate-800/80 px-6 py-2 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-2 font-mono">
          <div className="size-2 rounded-full bg-emerald-400" />
          <span>Oiko Live v2.4.0 • System Ready</span>
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

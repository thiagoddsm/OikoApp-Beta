'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
    Download, 
    Printer, 
    Users, 
    Calendar, 
    TrendingUp, 
    Baby, 
    Award, 
    FlameKindling,
    FileText,
    Sparkles,
    Loader2
} from 'lucide-react';
import { runAttendanceAnalysis } from '@/ai/flows/attendance-analysis-flow';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid
} from 'recharts';

const horariosCultos = [
  "Domingo - 07:30",
  "Domingo - 10:15",
  "Domingo - 17:30",
  "Domingo - 19:30",
  "Quinta - 20:00",
  "Evento"
];

interface AttendanceRecord {
    id: string;
    data: any;
    horario: string;
    adultos: number;
    criancas: number;
    servos?: number;
    salaVip?: number;
    conversoes?: number;
    reconciliacoes?: number;
    clima?: string;
    observacoes?: string;
    teveApelo?: boolean;
    teveCeia?: boolean;
    serieMensagem?: string;
    feriadoProximo?: boolean;
    jogoFutebol?: boolean;
    apresentacaoBebe?: boolean;
}

interface AttendanceDashboardProps {
    registros: AttendanceRecord[];
    loading: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xl space-y-1.5 animate-in fade-in-50 duration-150">
                <p className="label font-black text-slate-800 text-xs uppercase tracking-tight">{label}</p>
                <div className="h-px bg-slate-100 my-1" />
                {payload.map((pld: any, index: number) => (
                     <div key={index} className="flex items-center gap-2 text-xs font-bold">
                        <span className="size-2 rounded-full" style={{ backgroundColor: pld.color || pld.fill }} />
                        <span className="text-slate-500">{pld.name}:</span>
                        <span className="text-slate-800">{pld.value.toLocaleString('pt-BR')}</span>
                     </div>
                ))}
            </div>
        );
    }
    return null;
};

export function AttendanceDashboard({ registros, loading }: AttendanceDashboardProps) {
  const [viewMode, setViewMode] = useState<'ampla' | 'individual'>('ampla');
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');

  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroHorario, setFiltroHorario] = useState('todos');
  const [filtroSerie, setFiltroSerie] = useState('');
  const [filtroFeriado, setFeriadoFeriado] = useState('todos'); 
  const [filtroJogo, setJogoFutebol] = useState('todos'); 
  const [filtroBebe, setApresentacaoBebe] = useState('todos'); 
  
  const [aiReport, setAiReport] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Markdown Parser Helpers
  const parseInlineBold = (text: string) => {
    const parts = text.split('**');
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-black text-slate-900">{part}</strong>;
      }
      return part;
    });
  };

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.trim().startsWith('### ')) {
        return <h4 key={i} className="text-xs font-black text-slate-800 uppercase tracking-wider mt-4 mb-2">{line.replace('### ', '')}</h4>;
      }
      if (line.trim().startsWith('## ')) {
        return <h3 key={i} className="text-sm font-black text-slate-900 uppercase tracking-wide mt-5 mb-2 border-b pb-1">{line.replace('## ', '')}</h3>;
      }
      if (line.trim().startsWith('# ')) {
        return <h2 key={i} className="text-base font-black text-indigo-600 uppercase mt-6 mb-3">{line.replace('# ', '')}</h2>;
      }
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return <li key={i} className="text-slate-700 ml-4 list-disc my-1 text-xs">{parseInlineBold(line.trim().substring(2))}</li>;
      }
      if (!line.trim()) {
        return <div key={i} className="h-2" />;
      }
      return <p key={i} className="my-1.5 leading-relaxed text-slate-700 text-xs">{parseInlineBold(line)}</p>;
    });
  };

  const registrosFiltrados = useMemo(() => {
    let filtrados = [...registros];

    try {
      if (filtroDataInicio) {
        const startTimestamp = new Date(filtroDataInicio + 'T00:00:00').getTime() / 1000;
        filtrados = filtrados.filter(r => r.data?.seconds && r.data.seconds >= startTimestamp);
      }
      if (filtroDataFim) {
        const endTimestamp = new Date(filtroDataFim + 'T23:59:59').getTime() / 1000;
        filtrados = filtrados.filter(r => r.data?.seconds && r.data.seconds <= endTimestamp);
      }
    } catch (e) {
      console.error("Erro ao filtrar data:", e);
    }

    if (filtroHorario !== 'todos') {
      filtrados = filtrados.filter(r => r.horario === filtroHorario);
    }
    if (filtroSerie) {
      filtrados = filtrados.filter(r => 
        r.serieMensagem && r.serieMensagem.toLowerCase().includes(filtroSerie.toLowerCase())
      );
    }
    if (filtroFeriado !== 'todos') {
        filtrados = filtrados.filter(r => (r.feriadoProximo || false) === (filtroFeriado === 'sim'));
    }
    if (filtroJogo !== 'todos') {
        filtrados = filtrados.filter(r => (r.jogoFutebol || false) === (filtroJogo === 'sim'));
    }
    if (filtroBebe !== 'todos') {
        filtrados = filtrados.filter(r => (r.apresentacaoBebe || false) === (filtroBebe === 'sim'));
    }
    
    return filtrados.sort((a, b) => (a.data?.seconds || 0) - (b.data?.seconds || 0));
  }, [registros, filtroDataInicio, filtroDataFim, filtroHorario, filtroSerie, filtroFeriado, filtroJogo, filtroBebe]);

  // Culto Selecionado para Análise Individual
  const selectedRecord = useMemo(() => {
    if (!registrosFiltrados.length) return null;
    if (selectedRecordId) {
      return registrosFiltrados.find(r => r.id === selectedRecordId) || registrosFiltrados[registrosFiltrados.length - 1];
    }
    return registrosFiltrados[registrosFiltrados.length - 1];
  }, [registrosFiltrados, selectedRecordId]);

  const stats = useMemo(() => {
      const totalAdultos = registrosFiltrados.reduce((acc, r) => acc + (r.adultos || 0), 0);
      const totalCriancas = registrosFiltrados.reduce((acc, r) => acc + (r.criancas || 0), 0);
      const totalServos = registrosFiltrados.reduce((acc, r) => acc + (r.servos || 0), 0);
      const totalSalaVip = registrosFiltrados.reduce((acc, r) => acc + (r.salaVip || 0), 0);
      const totalConversoes = registrosFiltrados.reduce((acc, r) => acc + (r.conversoes || 0), 0);
      const totalReconciliacoes = registrosFiltrados.reduce((acc, r) => acc + (r.reconciliacoes || 0), 0);
      
      const totalGeral = totalAdultos + totalCriancas + totalServos;
      const count = registrosFiltrados.length;

      return {
          count: count,
          totalAdultos: totalAdultos,
          totalCriancas: totalCriancas,
          totalServos: totalServos,
          totalSalaVip,
          totalConversoes,
          totalReconciliacoes,
          mediaGeral: count > 0 ? Math.round(totalGeral / count) : 0,
          mediaVip: count > 0 ? Math.round(totalSalaVip / count) : 0
      }
  }, [registrosFiltrados]);

  const frequenciaAoLongoDoTempoData = useMemo(() => {
     return registrosFiltrados.map(r => ({
         id: r.id,
         date: new Date((r.data?.seconds || 0) * 1000).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
         Adultos: r.adultos || 0,
         Crianças: r.criancas || 0,
         Servos: r.servos || 0,
         SalaVip: r.salaVip || 0,
         Conversões: r.conversoes || 0,
         Reconciliações: r.reconciliacoes || 0,
         Total: (r.adultos || 0) + (r.criancas || 0) + (r.servos || 0)
     }));
  }, [registrosFiltrados]);

  const mediaPorHorarioData = useMemo(() => {
    const grupos = horariosCultos.map(h => ({ 
        name: h.split(' - ')[1],
        Adultos: 0,
        Crianças: 0,
        count: 0
    }));

    registrosFiltrados.forEach(r => {
        const horario = r.horario.split(' - ')[1];
        const grupo = grupos.find(g => g.name === horario);
        if (grupo) {
            grupo.Adultos += r.adultos;
            grupo.Crianças += (r.criancas || 0);
            grupo.count++;
        }
    });

    return grupos
      .filter(g => g.count > 0)
      .map(g => ({...g, Adultos: Math.round(g.Adultos/g.count), Crianças: Math.round(g.Crianças/g.count) }));

  }, [registrosFiltrados]);

  const mediaPorFatoresExternosData = useMemo(() => {
      const comFeriado = registrosFiltrados.filter(r => r.feriadoProximo);
      const semFeriado = registrosFiltrados.filter(r => !r.feriadoProximo);
      const comJogo = registrosFiltrados.filter(r => r.jogoFutebol);
      const semJogo = registrosFiltrados.filter(r => !r.jogoFutebol);

      const calcMedia = (arr: AttendanceRecord[]) => arr.length > 0 ? Math.round(arr.reduce((acc, r) => acc + r.adultos + (r.criancas || 0), 0) / arr.length) : 0;

      return [
          { name: 'Feriado Próximo', Média: calcMedia(comFeriado) },
          { name: 'Sem Feriado', Média: calcMedia(semFeriado) },
          { name: 'Com Jogo', Média: calcMedia(comJogo) },
          { name: 'Sem Jogo', Média: calcMedia(semJogo) },
      ].filter(item => item.Média > 0);
  }, [registrosFiltrados]);

  const analysisStats = useMemo(() => {
    if (registrosFiltrados.length < 3) return null;
    
    // Agrupa por horário para calcular médias e desvios de forma justa
    const recordsByHorario: Record<string, number[]> = {};
    registrosFiltrados.forEach(r => {
      if (!recordsByHorario[r.horario]) {
        recordsByHorario[r.horario] = [];
      }
      recordsByHorario[r.horario].push(r.adultos + (r.criancas || 0));
    });
    
    const statsByHorario: Record<string, { mean: number; stdDev: number; count: number }> = {};
    Object.entries(recordsByHorario).forEach(([horario, totals]) => {
      const n = totals.length;
      const sum = totals.reduce((a, b) => a + b, 0);
      const mean = sum / n;
      const variance = totals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
      const stdDev = Math.sqrt(variance);
      
      statsByHorario[horario] = {
        mean: Math.round(mean),
        stdDev: Math.round(stdDev),
        count: n
      };
    });
    
    const totalsGlobal = registrosFiltrados.map(r => r.adultos + (r.criancas || 0));
    const meanGlobal = totalsGlobal.reduce((a, b) => a + b, 0) / totalsGlobal.length;
    
    const outliers = registrosFiltrados.map(r => {
      const total = r.adultos + (r.criancas || 0);
      const hStats = statsByHorario[r.horario];
      
      if (!hStats || hStats.count < 3) return null;
      
      const diff = total - hStats.mean;
      const zScore = hStats.stdDev > 0 ? diff / hStats.stdDev : 0;
      const pctDiff = Math.round((diff / hStats.mean) * 100);
      
      return {
        record: r,
        total,
        zScore,
        pctDiff,
        isHigh: zScore >= 1.2,
        isLow: zScore <= -1.2,
        localMean: hStats.mean,
        localStdDev: hStats.stdDev,
      };
    }).filter((o): o is NonNullable<typeof o> => o !== null && (o.isHigh || o.isLow));
    
    return {
      meanGlobal: Math.round(meanGlobal),
      statsByHorario,
      outliers,
    };
  }, [registrosFiltrados]);

  const handleGenerateAiReport = async () => {
    if (registrosFiltrados.length === 0) return;
    setIsGeneratingAi(true);
    try {
      const recordsForAi = registrosFiltrados.map(r => ({
        dateStr: new Date(r.data.seconds * 1000).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
        horario: r.horario,
        adultos: r.adultos,
        criancas: r.criancas || 0,
        total: r.adultos + (r.criancas || 0),
        serieMensagem: r.serieMensagem || '',
        feriadoProximo: !!r.feriadoProximo,
        jogoFutebol: !!r.jogoFutebol,
        apresentacaoBebe: !!r.apresentacaoBebe,
      }));

      const report = await runAttendanceAnalysis({
        records: recordsForAi,
        stats: {
          mean: stats.mediaGeral,
          byHorario: analysisStats?.statsByHorario || {},
        }
      });
      setAiReport(report);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar análise. Verifique as configurações da inteligência artificial.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Horário', 'Adultos', 'Crianças', 'Total', 'Série de Mensagem', 'Feriado Próximo', 'Jogo de Futebol', 'Apresentação Bebê'];
    const rows = registrosFiltrados.map(r => {
      const dateStr = new Date(r.data.seconds * 1000).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      return [
        dateStr,
        r.horario,
        r.adultos,
        r.criancas || 0,
        r.adultos + (r.criancas || 0),
        r.serieMensagem || '',
        r.feriadoProximo ? 'Sim' : 'Não',
        r.jogoFutebol ? 'Sim' : 'Não',
        r.apresentacaoBebe ? 'Sim' : 'Não'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'relatorio_presenca_cultos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <p className="text-center text-muted-foreground mt-10 font-bold animate-pulse">Carregando dados...</p>;
  }

  return (
    <div className="space-y-6">
      {/* CSS para Impressão */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, nav, aside, footer, button, .print-hidden, .no-print, [role="tablist"], select, input, .border-dashed {
            display: none !important;
          }
          main, .space-y-6, .grid {
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .card, .p-6, .border {
            page-break-inside: avoid !important;
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
            margin-bottom: 1.5rem !important;
          }
        }
      `}} />

      {/* Barra de Seleção de Modo de Visão */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 bg-slate-100 dark:bg-slate-900 rounded-2xl print-hidden">
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border">
          <button
            type="button"
            onClick={() => setViewMode('ampla')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2",
              viewMode === 'ampla' 
                ? "bg-indigo-600 text-white shadow-sm" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <TrendingUp className="size-3.5" />
            <span>📊 Visão Ampla (Global)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('individual')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2",
              viewMode === 'individual' 
                ? "bg-indigo-600 text-white shadow-sm" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Sparkles className="size-3.5" />
            <span>🔍 Análise Individual do Culto</span>
          </button>
        </div>

        {/* Seletor Rápido de Culto em Modo Individual */}
        {viewMode === 'individual' && registrosFiltrados.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Selecionar Culto:</span>
            <select
              value={selectedRecord?.id || ''}
              onChange={(e) => setSelectedRecordId(e.target.value)}
              className="h-9 px-3 rounded-xl bg-white dark:bg-slate-800 border text-xs font-black text-slate-800 dark:text-white shadow-sm outline-none"
            >
              {registrosFiltrados.map((r) => {
                const dateStr = new Date((r.data?.seconds || 0) * 1000).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                return (
                  <option key={r.id} value={r.id}>
                    {dateStr} — {r.horario.split(' - ')[1] || r.horario} ({(r.adultos || 0) + (r.criancas || 0)} pessoas)
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* ── MODO INDIVIDUAL: RAIO-X DO CULTO SELECIONADO ────────────────────── */}
      {viewMode === 'individual' && selectedRecord && (
        <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 dark:from-indigo-950/20 dark:to-slate-900 p-6 shadow-lg rounded-[2rem]">
          <CardHeader className="px-0 pt-0 border-b pb-4 flex flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-600 text-white font-extrabold uppercase text-[10px] tracking-widest">
                  {selectedRecord.horario}
                </Badge>
                <span className="text-xs font-bold text-slate-500">
                  🗓️ {new Date((selectedRecord.data?.seconds || 0) * 1000).toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <h2 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white mt-1">
                {selectedRecord.serieMensagem ? `Série: "${selectedRecord.serieMensagem}"` : 'Culto de Celebração'}
              </h2>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-indigo-600">
                {(selectedRecord.adultos || 0) + (selectedRecord.criancas || 0) + (selectedRecord.servos || 0)}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Geral de Presentes</p>
            </div>
          </CardHeader>

          <CardContent className="px-0 pt-6 space-y-6">
            {/* Grid 5 Colunas de Métricas do Culto */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border shadow-sm space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Adultos</span>
                <p className="text-2xl font-black text-emerald-600">{selectedRecord.adultos || 0}</p>
                <p className="text-[10px] text-slate-500">Público principal</p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border shadow-sm space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Crianças</span>
                <p className="text-2xl font-black text-amber-500">{selectedRecord.criancas || 0}</p>
                <p className="text-[10px] text-slate-500">Ministério infantil</p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border shadow-sm space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">🤝 Servos</span>
                <p className="text-2xl font-black text-indigo-600">{selectedRecord.servos || 0}</p>
                <p className="text-[10px] text-slate-500">Voluntários escalados</p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border shadow-sm space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">🏛️ Sala VIP</span>
                <p className="text-2xl font-black text-purple-600">{selectedRecord.salaVip || 0}</p>
                <p className="text-[10px] text-slate-500">Visitantes</p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border shadow-sm space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">✝️ Conversões & Reconciliações</span>
                <p className="text-2xl font-black text-sky-600">
                  {(selectedRecord.conversoes || 0) + (selectedRecord.reconciliacoes || 0)}
                </p>
                <p className="text-[10px] text-slate-500">
                  {selectedRecord.conversoes || 0} conv. / {selectedRecord.reconciliacoes || 0} reconc.
                </p>
              </div>
            </div>

            {/* Painel de Contexto Litúrgico & Fatores do Culto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border shadow-sm space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Sparkles className="size-4 text-indigo-500" /> Liturgia & Momentos Chave
                </h4>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant={selectedRecord.teveApelo ? "default" : "outline"} className={selectedRecord.teveApelo ? "bg-purple-600 text-white font-bold" : "text-slate-400"}>
                    {selectedRecord.teveApelo ? '✨ Teve Apelo' : 'Sem Apelo'}
                  </Badge>
                  <Badge variant={selectedRecord.teveCeia ? "default" : "outline"} className={selectedRecord.teveCeia ? "bg-emerald-600 text-white font-bold" : "text-slate-400"}>
                    {selectedRecord.teveCeia ? '🍷 Celebração da Ceia' : 'Sem Ceia'}
                  </Badge>
                  <Badge variant={selectedRecord.apresentacaoBebe ? "default" : "outline"} className={selectedRecord.apresentacaoBebe ? "bg-sky-600 text-white font-bold" : "text-slate-400"}>
                    {selectedRecord.apresentacaoBebe ? '👶 Apresentação de Bebê' : 'Sem Apresentação'}
                  </Badge>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border shadow-sm space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  ☀️ Clima & Fatores Externos
                </h4>
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedRecord.clima && (
                    <Badge variant="secondary" className="font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Clima: {selectedRecord.clima}
                    </Badge>
                  )}
                  <Badge variant={selectedRecord.feriadoProximo ? "destructive" : "outline"} className={selectedRecord.feriadoProximo ? "font-bold" : "text-slate-400"}>
                    {selectedRecord.feriadoProximo ? '🏖️ Feriado Próximo' : 'Sem Feriado'}
                  </Badge>
                  <Badge variant={selectedRecord.jogoFutebol ? "destructive" : "outline"} className={selectedRecord.jogoFutebol ? "font-bold" : "text-slate-400"}>
                    {selectedRecord.jogoFutebol ? '⚽ Jogo no Horário' : 'Sem Jogo'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Observações Adicionais */}
            {selectedRecord.observacoes && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <span className="font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest text-[10px]">
                  📝 Observações Adicionais do Culto:
                </span>
                <p className="leading-relaxed font-medium italic">{selectedRecord.observacoes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Painel de Filtros */}
      <Card className="shadow-sm border bg-white print-hidden">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-slate-800 font-black uppercase text-sm tracking-wider">Filtros & Pesquisa</CardTitle>
            <CardDescription className="text-xs">Filtre por datas, séries de mensagens e fatores externos.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleExportCSV} variant="outline" size="sm" className="font-bold text-xs uppercase gap-1.5 h-9">
              <Download className="size-3.5" /> Planilha
            </Button>
            <Button onClick={handlePrint} variant="outline" size="sm" className="font-bold text-xs uppercase gap-1.5 h-9">
              <Printer className="size-3.5" /> PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">De</Label>
            <Input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} className="bg-white h-10 font-bold"/>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Até</Label>
            <Input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} className="bg-white h-10 font-bold"/>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Horário do Culto</Label>
            <Select value={filtroHorario} onValueChange={setFiltroHorario}>
                <SelectTrigger className="bg-white h-10 font-bold"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="todos">Todos Horários</SelectItem>
                    {horariosCultos.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Buscar por Série</Label>
            <Input type="search" value={filtroSerie} onChange={e => setFiltroSerie(e.target.value)} placeholder="Ex: Amor, Fé..." className="bg-white h-10"/>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Feriado Próximo?</Label>
            <Select value={filtroFeriado} onValueChange={setFeriadoFeriado}>
                <SelectTrigger className="bg-white h-10 font-bold"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Jogo de Futebol?</Label>
            <Select value={filtroJogo} onValueChange={setJogoFutebol}>
                <SelectTrigger className="bg-white h-10 font-bold"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Apresentação Bebê?</Label>
            <Select value={filtroBebe} onValueChange={setApresentacaoBebe}>
                <SelectTrigger className="bg-white h-10 font-bold"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        <Card className="shadow-sm border bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Cultos</CardTitle>
            <Calendar className="size-4 text-blue-600 print-hidden" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-slate-800">{stats.count}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Registros no período</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Adultos</CardTitle>
            <Users className="size-4 text-emerald-600 print-hidden" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-emerald-600">{stats.totalAdultos.toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Presença acumulada</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Crianças</CardTitle>
            <Baby className="size-4 text-amber-600 print-hidden" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-amber-600">{stats.totalCriancas.toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Presença acumulada</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Servos</CardTitle>
            <Award className="size-4 text-indigo-600 print-hidden" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-indigo-600">{stats.totalServos.toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Voluntários no culto</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Média / Culto</CardTitle>
            <FlameKindling className="size-4 text-indigo-600 print-hidden" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-indigo-600">{(stats.totalAdultos + stats.totalCriancas + stats.totalServos > 0) ? stats.mediaGeral : 0}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Total de Presentes</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">🏛️ Sala VIP</CardTitle>
            <Sparkles className="size-4 text-purple-600 print-hidden" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-purple-600">{stats.totalSalaVip.toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Visitantes recepcionados</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">✝️ Decisões</CardTitle>
            <Award className="size-4 text-sky-600 print-hidden" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-sky-600">{(stats.totalConversoes + stats.totalReconciliacoes).toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{stats.totalConversoes} conv. / {stats.totalReconciliacoes} reconc.</p>
          </CardContent>
        </Card>
      </div>
      
      {registrosFiltrados.length === 0 ? (
        <Card className="p-8 border border-dashed text-center">
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground italic">Nenhum dado encontrado para os filtros aplicados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Gráfico Principal */}
          <Card className="shadow-sm border bg-white p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base font-black uppercase text-slate-800">Frequência ao Longo do Tempo</CardTitle>
              <CardDescription>Visualização da evolução do total de participantes</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] p-0">
              <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={frequenciaAoLongoDoTempoData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="Total" stroke="#4f46e5" strokeWidth={3} name="Total de Pessoas" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="Adultos" stroke="#10b981" strokeWidth={2} name="Adultos" />
                    <Line type="monotone" dataKey="Crianças" stroke="#f59e0b" strokeWidth={2} name="Crianças" />
                    <Line type="monotone" dataKey="Servos" stroke="#6366f1" strokeWidth={2} name="Servos (Voluntários)" />
                    <Line type="monotone" dataKey="SalaVip" stroke="#a855f7" strokeWidth={1.5} name="Sala VIP (Visitantes)" />
                    <Line type="monotone" dataKey="Conversões" stroke="#0284c7" strokeWidth={1.5} name="Conversões" />
                    <Line type="monotone" dataKey="Reconciliações" stroke="#ec4899" strokeWidth={1.5} name="Reconciliações" />
                 </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Seção de Análise de Anomalias & IA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cards de Desvios / Outliers (Matemático) */}
              <Card className="lg:col-span-1 shadow-sm border bg-white p-6">
                  <CardHeader className="px-0 pt-0">
                      <CardTitle className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                          <TrendingUp className="size-4 text-indigo-600" /> Desvios da Média
                      </CardTitle>
                      <CardDescription className="text-xs">Dias com variação acima de 1.2 desvios-padrão</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {analysisStats && analysisStats.outliers.length > 0 ? (
                          analysisStats.outliers.map((o, idx) => {
                              const dateStr = new Date(o.record.data.seconds * 1000).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                              return (
                                  <div key={idx} className={cn(
                                      "p-3 rounded-xl border flex flex-col gap-1.5",
                                      o.isHigh ? "bg-emerald-50/40 border-emerald-100" : "bg-rose-50/30 border-rose-100"
                                  )}>
                                      <div className="flex items-center justify-between">
                                          <span className="text-xs font-black text-slate-700">{dateStr}</span>
                                          <Badge className={o.isHigh ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-rose-100 text-rose-800 border-rose-200"}>
                                              {o.isHigh ? `+${o.pctDiff}%` : `${o.pctDiff}%`}
                                          </Badge>
                                      </div>
                                      <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight">
                                           {o.record.horario}
                                       </div>
                                       <div className="text-[11px] font-semibold text-slate-600">
                                           Frequência: <span className="font-bold text-slate-900">{o.total}</span> (Média do Horário: {o.localMean})
                                       </div>
                                      {/* Fatores contextuais */}
                                      <div className="flex flex-wrap gap-1 mt-1">
                                          {o.record.apresentacaoBebe && <Badge variant="outline" className="text-[9px] bg-sky-50 text-sky-700 border-sky-200">Bebês</Badge>}
                                          {o.record.feriadoProximo && <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">Feriado</Badge>}
                                          {o.record.jogoFutebol && <Badge variant="outline" className="text-[9px] bg-red-50 text-red-700 border-red-200">Jogo</Badge>}
                                          {o.record.serieMensagem && <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-700 border-slate-200 truncate max-w-[120px]" title={o.record.serieMensagem}>{o.record.serieMensagem}</Badge>}
                                      </div>
                                  </div>
                              );
                          })
                      ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                              <p className="text-xs italic">Nenhum desvio acentuado detectado no período.</p>
                          </div>
                      )}
                  </CardContent>
              </Card>

              {/* Análise Gerada com IA */}
              <Card className="lg:col-span-2 shadow-sm border bg-white p-6">
                  <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
                      <div>
                          <CardTitle className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                              <Sparkles className="size-4 text-indigo-600 animate-pulse" /> Relatório Estratégico IA
                          </CardTitle>
                          <CardDescription className="text-xs">Inteligência artificial para interpretar variações de presença</CardDescription>
                      </div>
                      <Button
                          onClick={handleGenerateAiReport}
                          disabled={isGeneratingAi || registrosFiltrados.length === 0}
                          className="font-bold text-xs uppercase gap-1.5 h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                          {isGeneratingAi ? (
                              <>
                                  <Loader2 className="size-3.5 animate-spin" /> Analisando...
                              </>
                          ) : (
                              <>
                                  <Sparkles className="size-3.5" /> Gerar Relatório
                              </>
                          )}
                      </Button>
                  </CardHeader>
                  <CardContent className="p-0 border-t pt-4">
                      {aiReport ? (
                          <div className="max-h-[380px] overflow-y-auto pr-2 custom-scrollbar space-y-1">
                              {renderMarkdown(aiReport)}
                          </div>
                      ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
                              <Sparkles className="size-8 opacity-25 text-indigo-500 animate-pulse" />
                              <p className="text-xs font-medium">Clique em "Gerar Relatório" para analisar o impacto dos fatores com inteligência artificial.</p>
                          </div>
                      )}
                  </CardContent>
              </Card>
          </div>

          {/* Gráficos de Média por Horários e Fatores */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Card className="shadow-sm border bg-white p-6">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-base font-black uppercase text-slate-800">Média por Horário</CardTitle>
                  <CardDescription>Divisão de presença média de Adultos vs Crianças</CardDescription>
                </CardHeader>
                <CardContent className="h-[320px] p-0">
                   <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={mediaPorHorarioData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                           <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                           <Tooltip content={<CustomTooltip />} />
                           <Legend />
                           <Bar dataKey="Adultos" fill="#10b981" name="Média de Adultos" radius={[4, 4, 0, 0]} />
                           <Bar dataKey="Crianças" fill="#f59e0b" name="Média de Crianças" radius={[4, 4, 0, 0]} />
                       </BarChart>
                    </ResponsiveContainer>
                </CardContent>
             </Card>
            
             <Card className="shadow-sm border bg-white p-6">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-base font-black uppercase text-slate-800">Média por Fatores Externos</CardTitle>
                  <CardDescription>Impacto de feriados ou jogos de futebol na frequência</CardDescription>
                </CardHeader>
                <CardContent className="h-[320px] p-0">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={mediaPorFatoresExternosData} layout="vertical">
                           <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                           <XAxis type="number" tick={{ fontSize: 11 }} stroke="#64748b" />
                           <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} stroke="#64748b" />
                           <Tooltip content={<CustomTooltip />} />
                           <Legend />
                           <Bar dataKey="Média" fill="#4f46e5" name="Média de Frequência Total" radius={[0, 4, 4, 0]} />
                       </BarChart>
                    </ResponsiveContainer>
                </CardContent>
             </Card>
          </div>
        </div>
      )}
    </div>
  );
}

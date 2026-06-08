'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
    FileText
} from 'lucide-react';
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
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroHorario, setFiltroHorario] = useState('todos');
  const [filtroSerie, setFiltroSerie] = useState('');
  const [filtroFeriado, setFeriadoFeriado] = useState('todos'); 
  const [filtroJogo, setJogoFutebol] = useState('todos'); 
  const [filtroBebe, setApresentacaoBebe] = useState('todos'); 

  const registrosFiltrados = useMemo(() => {
    let filtrados = [...registros];

    try {
      if (filtroDataInicio) {
        const startTimestamp = new Date(filtroDataInicio + 'T00:00:00').getTime() / 1000;
        filtrados = filtrados.filter(r => r.data.seconds >= startTimestamp);
      }
      if (filtroDataFim) {
        const endTimestamp = new Date(filtroDataFim + 'T23:59:59').getTime() / 1000;
        filtrados = filtrados.filter(r => r.data.seconds <= endTimestamp);
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
    
    return filtrados.sort((a, b) => a.data.seconds - b.data.seconds);
  }, [registros, filtroDataInicio, filtroDataFim, filtroHorario, filtroSerie, filtroFeriado, filtroJogo, filtroBebe]);

  const stats = useMemo(() => {
      const totalAdultos = registrosFiltrados.reduce((acc, r) => acc + r.adultos, 0);
      const totalCriancas = registrosFiltrados.reduce((acc, r) => acc + (r.criancas || 0), 0);
      
      const totalGeral = totalAdultos + totalCriancas;
      const count = registrosFiltrados.length;

      return {
          count: count,
          totalAdultos: totalAdultos,
          totalCriancas: totalCriancas,
          mediaGeral: count > 0 ? Math.round(totalGeral / count) : 0
      }
  }, [registrosFiltrados]);

  const frequenciaAoLongoDoTempoData = useMemo(() => {
     return registrosFiltrados.map(r => ({
         date: new Date(r.data.seconds * 1000).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
         Adultos: r.adultos,
         Crianças: r.criancas || 0,
         Total: r.adultos + (r.criancas || 0)
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Cultos Registrados</CardTitle>
            <Calendar className="size-4 text-blue-600 print-hidden" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-slate-800">{stats.count}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Registros no período</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total de Adultos</CardTitle>
            <Users className="size-4 text-emerald-600 print-hidden" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-emerald-600">{stats.totalAdultos.toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Presença acumulada</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total de Crianças</CardTitle>
            <Baby className="size-4 text-amber-600 print-hidden" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-amber-600">{stats.totalCriancas.toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Presença acumulada</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Média Geral por Culto</CardTitle>
            <FlameKindling className="size-4 text-indigo-600 print-hidden" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-indigo-600">{(stats.totalAdultos + stats.totalCriancas > 0) ? stats.mediaGeral : 0}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Adultos + Crianças por celebração</p>
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
                 </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

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

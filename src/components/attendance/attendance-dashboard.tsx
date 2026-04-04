
'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
            <div className="bg-background border border-border p-2 rounded-lg shadow-lg">
                <p className="label font-bold">{`${label}`}</p>
                {payload.map((pld: any, index: number) => (
                     <p key={index} style={{ color: pld.fill }}>{`${pld.name}: ${pld.value.toLocaleString('pt-BR')}`}</p>
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
         Crianças: r.criancas,
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


  if (loading) {
    return <p className="text-center text-muted-foreground mt-10">Carregando dados...</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros e Pesquisa</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} title="Data Início"/>
          <Input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} title="Data Fim"/>
          <Select value={filtroHorario} onValueChange={setFiltroHorario}>
              <SelectTrigger><SelectValue placeholder="Filtrar por horário" /></SelectTrigger>
              <SelectContent>
                  <SelectItem value="todos">Todos Horários</SelectItem>
                  {horariosCultos.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
          </Select>
          <Input type="search" value={filtroSerie} onChange={e => setFiltroSerie(e.target.value)} placeholder="Buscar por Série..."/>
           <Select value={filtroFeriado} onValueChange={setFeriadoFeriado}>
              <SelectTrigger><SelectValue placeholder="Feriado próximo?" /></SelectTrigger>
              <SelectContent>
                  <SelectItem value="todos">Feriado? (Todos)</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
          </Select>
          <Select value={filtroJogo} onValueChange={setJogoFutebol}>
              <SelectTrigger><SelectValue placeholder="Jogo no horário?" /></SelectTrigger>
              <SelectContent>
                  <SelectItem value="todos">Jogo? (Todos)</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
          </Select>
          <Select value={filtroBebe} onValueChange={setApresentacaoBebe}>
              <SelectTrigger><SelectValue placeholder="Apresentação de bebê?" /></SelectTrigger>
              <SelectContent>
                  <SelectItem value="todos">Bebê? (Todos)</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="text-center"><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Registros</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{stats.count}</p></CardContent></Card>
        <Card className="text-center"><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Total Adultos</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-emerald-600">{stats.totalAdultos.toLocaleString('pt-BR')}</p></CardContent></Card>
        <Card className="text-center"><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Total Crianças</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-amber-600">{stats.totalCriancas.toLocaleString('pt-BR')}</p></CardContent></Card>
        <Card className="text-center"><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Média Geral/Culto</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-violet-600">{stats.mediaGeral}</p></CardContent></Card>
      </div>
      
      {registrosFiltrados.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">Nenhum dado encontrado para os filtros aplicados.</p>
      ) : (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>Frequência ao Longo do Tempo</CardTitle></CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={frequenciaAoLongoDoTempoData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="Total" stroke="#8b5cf6" strokeWidth={2} name="Total de Pessoas" />
                        <Line type="monotone" dataKey="Adultos" stroke="#10b981" strokeWidth={2} name="Adultos" />
                        <Line type="monotone" dataKey="Crianças" stroke="#f59e0b" strokeWidth={2} name="Crianças" />
                     </LineChart>
                  </ResponsiveContainer>
                </CardContent>
            </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Card>
                <CardHeader><CardTitle>Média por Horário (Adultos vs Crianças)</CardTitle></CardHeader>
                <CardContent className="h-[350px]">
                   <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={mediaPorHorarioData}>
                           <CartesianGrid strokeDasharray="3 3" />
                           <XAxis dataKey="name" tick={{ fontSize: 12 }}/>
                           <YAxis tick={{ fontSize: 12 }} />
                           <Tooltip content={<CustomTooltip />}/>
                           <Legend />
                           <Bar dataKey="Adultos" fill="#10b981" name="Média de Adultos" />
                           <Bar dataKey="Crianças" fill="#f59e0b" name="Média de Crianças" />
                       </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>Média por Fatores Externos</CardTitle></CardHeader>
                <CardContent className="h-[350px]">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={mediaPorFatoresExternosData} layout="vertical">
                           <CartesianGrid strokeDasharray="3 3" />
                           <XAxis type="number" tick={{ fontSize: 12 }} />
                           <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                           <Tooltip content={<CustomTooltip />}/>
                           <Legend />
                           <Bar dataKey="Média" fill="#8b5cf6" name="Média de Frequência Total" />
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

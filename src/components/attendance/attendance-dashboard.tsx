
// src/components/attendance/attendance-dashboard.tsx
'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const horariosCultos = [
  "Domingo - 07:30",
  "Domingo - 10:15",
  "Domingo - 17:30",
  "Domingo - 19:30",
  "Quinta - 20:00",
  "Evento"
];

const timestampToDateString = (timestamp: any) => {
    if (!timestamp?.seconds) return '';
    const date = new Date(timestamp.seconds * 1000);
    const offset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + offset);
    return adjustedDate.toISOString().split('T')[0];
};

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

export function AttendanceDashboard({ registros, loading }: { registros: AttendanceRecord[], loading: boolean }) {
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroHorario, setFiltroHorario] = useState('todos');
  const [filtroSerie, setFiltroSerie] = useState('');
  const [filtroFeriado, setFiltroFeriado] = useState('todos'); 
  const [filtroJogo, setFiltroJogo] = useState('todos'); 
  const [filtroBebe, setFiltroBebe] = useState('todos'); 

  const registrosFiltrados = useMemo(() => {
    let filtrados = [...registros];

    try {
      if (filtroDataInicio) {
        const startTimestamp = new Date(filtroDataInicio).getTime() / 1000;
        filtrados = filtrados.filter(r => r.data.seconds >= startTimestamp);
      }
      if (filtroDataFim) {
        const endTimestamp = new Date(filtroDataFim).getTime() / 1000;
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

  const formatarDataGrafico = (timestamp: any) => {
    if(!timestamp?.seconds) return "";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
  };

  const dadosGraficoLinha = useMemo(() => {
    return registrosFiltrados.map(r => ({
      data: formatarDataGrafico(r.data),
      adultos: r.adultos,
      criancas: r.criancas || 0,
      total: r.adultos + (r.criancas || 0),
    }));
  }, [registrosFiltrados]);

    const dadosGraficoBarrasHorario = useMemo(() => {
    const totais = registrosFiltrados.reduce((acc: any, r) => {
      const horario = r.horario;
      if (!acc[horario]) {
        acc[horario] = { totalAdultos: 0, totalCriancas: 0, count: 0 };
      }
      acc[horario].totalAdultos += r.adultos;
      acc[horario].totalCriancas += (r.criancas || 0);
      acc[horario].count += 1;
      return acc;
    }, {});

    return Object.entries(totais).map(([horario, data]: [string, any]) => ({
      name: horario,
      mediaAdultos: data.count > 0 ? Math.round(data.totalAdultos / data.count) : 0,
      mediaCriancas: data.count > 0 ? Math.round(data.totalCriancas / data.count) : 0,
    })).sort((a,b) => (b.mediaAdultos + b.mediaCriancas) - (a.mediaAdultos + a.mediaCriancas));
  }, [registrosFiltrados]);
  
   const dadosGraficoBarrasFatores = useMemo(() => {
    const calcMedia = (filtro: (r: AttendanceRecord) => boolean) => {
      const { totalAdultos, totalCriancas, count } = registrosFiltrados.reduce((acc, r) => {
        if (filtro(r)) {
          acc.totalAdultos += r.adultos;
          acc.totalCriancas += (r.criancas || 0);
          acc.count += 1;
        }
        return acc;
      }, { totalAdultos: 0, totalCriancas: 0, count: 0 });
      return {
          mediaAdultos: count > 0 ? Math.round(totalAdultos / count) : 0,
          mediaCriancas: count > 0 ? Math.round(totalCriancas / count) : 0
      };
    };
    
    const nomes = ['Feriado', 'Jogo', 'Bebê'];
    const filtros = [
        (r: AttendanceRecord) => !!r.feriadoProximo,
        (r: AttendanceRecord) => !!r.jogoFutebol,
        (r: AttendanceRecord) => !!r.apresentacaoBebe
    ];

    return nomes.map((name, index) => {
        const mediasCom = calcMedia(filtros[index]);
        const mediasSem = calcMedia(r => !filtros[index](r));
        return {
            name: name,
            'Adultos (Com)': mediasCom.mediaAdultos, 
            'Adultos (Sem)': mediasSem.mediaAdultos, 
            'Crianças (Com)': mediasCom.mediaCriancas, 
            'Crianças (Sem)': mediasSem.mediaCriancas
        };
    });
  }, [registrosFiltrados]);

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
          <Input
            type="date"
            value={filtroDataInicio}
            onChange={e => setFiltroDataInicio(e.target.value)}
            title="Data Início"
          />
          <Input
            type="date"
            value={filtroDataFim}
            onChange={e => setFiltroDataFim(e.target.value)}
            title="Data Fim"
          />
          <Select value={filtroHorario} onValueChange={setFiltroHorario}>
              <SelectTrigger>
                  <SelectValue placeholder="Filtrar por horário" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="todos">Todos Horários</SelectItem>
                  {horariosCultos.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
          </Select>
          <Input
            type="search"
            value={filtroSerie}
            onChange={e => setFiltroSerie(e.target.value)}
            placeholder="Buscar por Série..."
          />
           <Select value={filtroFeriado} onValueChange={setFeriadoProximo as any}>
              <SelectTrigger>
                  <SelectValue placeholder="Feriado próximo?" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="todos">Feriado? (Todos)</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
          </Select>
          <Select value={filtroJogo} onValueChange={setFiltroJogo}>
              <SelectTrigger>
                  <SelectValue placeholder="Jogo no horário?" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="todos">Jogo? (Todos)</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
          </Select>
          <Select value={filtroBebe} onValueChange={setFiltroBebe}>
              <SelectTrigger>
                  <SelectValue placeholder="Apresentação de bebê?" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="todos">Bebê? (Todos)</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="text-center">
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Registros</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-primary">{stats.count}</p></CardContent>
        </Card>
        <Card className="text-center">
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Total Adultos</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-emerald-600">{stats.totalAdultos.toLocaleString('pt-BR')}</p></CardContent>
        </Card>
         <Card className="text-center">
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Total Crianças</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-amber-600">{stats.totalCriancas.toLocaleString('pt-BR')}</p></CardContent>
        </Card>
         <Card className="text-center">
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Média Geral/Culto</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-violet-600">{stats.mediaGeral}</p></CardContent>
        </Card>
      </div>
      
      {registrosFiltrados.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">Nenhum dado encontrado para os filtros aplicados.</p>
      ) : (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>Frequência ao Longo do Tempo</CardTitle></CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height="300">
                      <LineChart data={dadosGraficoLinha}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="data" fontSize={12} />
                        <YAxis fontSize={12} allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="adultos" name="Adultos" stroke="hsl(var(--primary))" strokeWidth={2} />
                        <Line type="monotone" dataKey="criancas" name="Crianças" stroke="hsl(var(--accent))" strokeWidth={2} />
                        <Line type="monotone" dataKey="total" name="Total" stroke="hsl(var(--secondary-foreground))" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Card>
                <CardHeader><CardTitle>Média por Horário (Adultos vs Crianças)</CardTitle></CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dadosGraficoBarrasHorario} layout="vertical" margin={{ left: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" fontSize={12} allowDecimals={false} />
                        <YAxis dataKey="name" type="category" fontSize={10} width={120} interval={0} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="mediaAdultos" name="Média Adultos" fill="hsl(var(--primary))" />
                        <Bar dataKey="mediaCriancas" name="Média Crianças" fill="hsl(var(--accent))" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>Média por Fatores Externos</CardTitle></CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dadosGraficoBarrasFatores}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis fontSize={12} allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Adultos (Com)" fill="hsl(var(--chart-1))" />
                            <Bar dataKey="Adultos (Sem)" fill="hsl(var(--chart-2))" />
                            <Bar dataKey="Crianças (Com)" fill="hsl(var(--chart-3))" />
                            <Bar dataKey="Crianças (Sem)" fill="hsl(var(--chart-4))" />
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

'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Users, TrendingUp, AlertTriangle, MessageSquare, HeartHandshake, BarChart2, ClipboardList, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type PresencaDoc = {
  id: string;
  cellId: string;
  membroId: string;
  membroNome: string;
  date: string;
  status: string;
  pedidoOracao?: string;
  termometro?: number;
};

type ReuniaoLog = {
  id: string;
  cellId: string;
  cellNome: string;
  date: string;
  liderId: string;
  metricas: {
    presentes: number;
    totalMembrosAtivos: number;
    visitantes: number;
    conversoes: number;
    oferta: number;
  };
  feedbackAoSupervisor?: string;
};

// Taxa de retenção: média de presença nas reuniões do mês
function calcRm(logs: ReuniaoLog[]): number {
  if (!logs.length) return 0;
  const totalPresentes = logs.reduce((s, l) => s + (l.metricas?.presentes || 0), 0);
  const totalCapacidade = logs.reduce((s, l) => s + (l.metricas?.totalMembrosAtivos || 1), 0);
  return totalCapacidade > 0 ? Math.round((totalPresentes / totalCapacidade) * 100) : 0;
}

function RmBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', value >= 75 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500')}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={cn('text-sm font-bold w-10 text-right', value >= 75 ? 'text-emerald-600' : value >= 50 ? 'text-amber-600' : 'text-red-600')}>
        {value}%
      </span>
    </div>
  );
}

type Cell = { id: string; nome: string; meetingDay?: string; liderId: string; };

const DAY_MAP: Record<string, number> = {
  'Domingo': 0, 'Segunda-feira': 1, 'Terça-feira': 2, 'Quarta-feira': 3,
  'Quinta-feira': 4, 'Sexta-feira': 5, 'Sábado': 6,
};
function getLastMeetingDate(meetingDay?: string): string {
  if (!meetingDay || DAY_MAP[meetingDay] === undefined)
    return new Date().toISOString().split('T')[0];
  const targetDay = DAY_MAP[meetingDay];
  const today = new Date();
  const daysBack = (today.getDay() - targetDay + 7) % 7;
  const date = new Date(today);
  date.setDate(today.getDate() - daysBack);
  return date.toISOString().split('T')[0];
}

export default function SupervisorPage() {
  const { firestore, user } = useFirebase();

  // Mês atual
  const currentMonth = new Date().toISOString().slice(0, 7); // "2026-05"

  const logsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'reuniao_logs'), where('date', '>=', `${currentMonth}-01`), orderBy('date', 'desc'), limit(500)) : null,
    [firestore, currentMonth]
  );

  const presencasQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'presencas_historico'), where('date', '>=', `${currentMonth}-01`), orderBy('date', 'desc'), limit(2000)) : null,
    [firestore, currentMonth]
  );

  const { data: logs, isLoading: l1 } = useCollection<ReuniaoLog>(logsQuery);
  const { data: presencas, isLoading: l2 } = useCollection<PresencaDoc>(presencasQuery);

  // Todas as células (para aba de relatórios)
  const allCellsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'cells'), orderBy('nome')) : null,
    [firestore]
  );
  const { data: allCells } = useCollection<Cell>(allCellsQuery);

  // Logs das últimas 2 semanas (para verificar se relatório foi enviado)
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const recentLogsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'reuniao_logs'), where('date', '>=', twoWeeksAgo.toISOString().split('T')[0]), orderBy('date', 'desc'), limit(300)) : null,
    [firestore]
  );
  const { data: recentLogs } = useCollection<ReuniaoLog>(recentLogsQuery);

  // Status de relatório por célula (com base na data da última reunião esperada)
  const cellReportStatus = useMemo(() => {
    const status: Record<string, { sent: boolean; date: string }> = {};
    allCells?.forEach(cell => {
      const lastDate = getLastMeetingDate(cell.meetingDay);
      const log = recentLogs?.find(l => l.cellId === cell.id && l.date === lastDate);
      status[cell.id] = { sent: !!log, date: lastDate };
    });
    return status;
  }, [allCells, recentLogs]);

  // Alertas Luz Vermelha — busca histórico de 30 dias para calcular faltas consecutivas
  const alertasQuery = useMemoFirebase(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
    return firestore
      ? query(collection(firestore, 'presencas_historico'), where('date', '>=', dateStr), orderBy('date', 'desc'), limit(3000))
      : null;
  }, [firestore]);
  const { data: presencasAlerta } = useCollection<PresencaDoc>(alertasQuery);

  // Métricas agregadas do mês
  const metricas = useMemo(() => {
    if (!logs) return null;
    return {
      totalReunioes: logs.length,
      totalPresentes: logs.reduce((s, l) => s + (l.metricas?.presentes || 0), 0),
      totalVisitantes: logs.reduce((s, l) => s + (l.metricas?.visitantes || 0), 0),
      totalConversoes: logs.reduce((s, l) => s + (l.metricas?.conversoes || 0), 0),
      totalOferta: logs.reduce((s, l) => s + (l.metricas?.oferta || 0), 0),
    };
  }, [logs]);

  // Ranking de células por Rm
  const celulaRanking = useMemo(() => {
    if (!logs) return [];
    const byCell: Record<string, ReuniaoLog[]> = {};
    logs.forEach(l => {
      if (!byCell[l.cellId]) byCell[l.cellId] = [];
      byCell[l.cellId].push(l);
    });
    return Object.entries(byCell)
      .map(([cellId, cellLogs]) => ({
        cellId,
        cellNome: cellLogs[0].cellNome,
        rm: calcRm(cellLogs),
        totalReunioes: cellLogs.length,
      }))
      .sort((a, b) => b.rm - a.rm);
  }, [logs]);

  // Alertas Luz Vermelha (membros com 2+ faltas sem justificativa consecutivas)
  const luzVermelhaAlertas = useMemo(() => {
    if (!presencasAlerta) return [];
    const byMembro: Record<string, PresencaDoc[]> = {};
    presencasAlerta.forEach(p => {
      if (!byMembro[p.membroId]) byMembro[p.membroId] = [];
      byMembro[p.membroId].push(p);
    });

    const alertas: { membroId: string; membroNome: string; cellId: string; faltasConsecutivas: number; ultimaPresenca: string }[] = [];

    Object.entries(byMembro).forEach(([membroId, registros]) => {
      const byCellMembro: Record<string, PresencaDoc[]> = {};
      registros.forEach(r => {
        if (!byCellMembro[r.cellId]) byCellMembro[r.cellId] = [];
        byCellMembro[r.cellId].push(r);
      });

      Object.entries(byCellMembro).forEach(([cellId, regs]) => {
        const sorted = [...regs].sort((a, b) => b.date.localeCompare(a.date));
        let consecutive = 0;
        for (const r of sorted) {
          if (r.status === 'ausente_sem_justificativa') consecutive++;
          else break;
        }
        if (consecutive >= 2) {
          const ultimaPresenca = sorted.find(r => r.status === 'presente')?.date || '—';
          alertas.push({ membroId, membroNome: regs[0].membroNome, cellId, faltasConsecutivas: consecutive, ultimaPresenca });
        }
      });
    });

    return alertas.sort((a, b) => b.faltasConsecutivas - a.faltasConsecutivas);
  }, [presencasAlerta]);

  // Feed de feedbacks dos líderes
  const feedbacks = useMemo(() =>
    (logs || []).filter(l => l.feedbackAoSupervisor?.trim()).slice(0, 20),
    [logs]
  );

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="font-bold">Acesso restrito</p>
        <p className="text-sm text-muted-foreground">Esta página é exclusiva para supervisores, líderes de área/rede e pastores.</p>
      </div>
    );
  }

  const isLoading = l1 || l2;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Painel do Supervisor</h1>
        <p className="text-sm text-muted-foreground">
          Visão estratégica do mês de{' '}
          <strong>{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong>
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2"><BarChart2 className="h-4 w-4" />Visão Geral</TabsTrigger>
            <TabsTrigger value="reports" className="gap-2"><ClipboardList className="h-4 w-4" />Relatórios da Semana</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
        <>
          {/* Cards de métricas */}
          {metricas && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Reuniões Realizadas', value: metricas.totalReunioes, icon: BarChart2, color: 'text-primary' },
                { label: 'Presenças Registradas', value: metricas.totalPresentes, icon: Users, color: 'text-emerald-600' },
                { label: 'Novos Visitantes', value: metricas.totalVisitantes, icon: TrendingUp, color: 'text-sky-600' },
                { label: 'Conversões', value: metricas.totalConversoes, icon: HeartHandshake, color: 'text-purple-600' },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label}>
                  <CardContent className="pt-5">
                    <Icon className={cn('h-6 w-6 mb-2', color)} />
                    <p className="text-2xl font-black">{value}</p>
                    <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ranking de células */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" /> Taxa de Retenção por Célula (Rm)
                </CardTitle>
                <CardDescription>Média de assiduidade no mês</CardDescription>
              </CardHeader>
              <CardContent>
                {celulaRanking.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum relatório enviado este mês.</p>
                ) : (
                  <div className="space-y-3">
                    {celulaRanking.map((c, i) => (
                      <div key={c.cellId} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-muted-foreground w-4">#{i + 1}</span>
                            <span className="text-sm font-bold">{c.cellNome}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{c.totalReunioes} reuniões</span>
                        </div>
                        <RmBar value={c.rm} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alertas Luz Vermelha */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" /> Alertas — Luz Vermelha
                </CardTitle>
                <CardDescription>Membros com 2 ou mais faltas sem justificativa consecutivas</CardDescription>
              </CardHeader>
              <CardContent>
                {luzVermelhaAlertas.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-2xl mb-1">🎉</p>
                    <p className="text-sm text-muted-foreground">Nenhum alerta ativo. Ótimo trabalho!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {luzVermelhaAlertas.map(a => (
                      <div key={`${a.membroId}-${a.cellId}`} className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
                        <Avatar className="h-8 w-8 border border-red-200 flex-shrink-0">
                          <AvatarFallback className="text-xs font-bold bg-red-100 text-red-700">{a.membroNome.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{a.membroNome}</p>
                          <p className="text-[11px] text-muted-foreground">Célula: {celulaRanking.find(c => c.cellId === a.cellId)?.cellNome || a.cellId}</p>
                        </div>
                        <Badge variant="destructive" className="flex-shrink-0 text-[11px]">
                          {a.faltasConsecutivas}x seguidas
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Feed de feedbacks dos líderes */}
          {feedbacks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Feedbacks dos Líderes
                </CardTitle>
                <CardDescription>O que os líderes compartilharam com você esta semana</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {feedbacks.map(log => (
                    <div key={log.id} className="rounded-xl border bg-muted/30 p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold">{log.cellNome}</p>
                        <p className="text-xs text-muted-foreground">{log.date}</p>
                      </div>
                      <p className="text-sm text-foreground/80 italic">"{log.feedbackAoSupervisor}"</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
          </TabsContent>

          {/* ===== ABA RELATÓRIOS ===== */}
          <TabsContent value="reports">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" /> Relatórios da Semana
                </CardTitle>
                <CardDescription>
                  Status dos relatórios de cada célula com base no dia de reunião cadastrado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!allCells?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma célula cadastrada.</p>
                ) : (
                  <div className="space-y-2">
                    {allCells.map(cell => {
                      const st = cellReportStatus[cell.id];
                      const dateLabel = st?.date
                        ? new Date(st.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                        : '—';
                      return (
                        <div key={cell.id} className={cn(
                          'flex items-center justify-between p-3 rounded-xl border transition-colors',
                          st?.sent ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                        )}>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{cell.nome}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {cell.meetingDay || 'Dia não definido'} &middot; Ref: {dateLabel}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {st?.sent ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold text-[11px] gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Enviado
                              </Badge>
                            ) : (
                              <>
                                <Badge variant="outline" className="text-amber-700 border-amber-300 font-bold text-[11px] gap-1">
                                  <Clock className="h-3 w-3" /> Pendente
                                </Badge>
                                <Button size="sm" variant="outline" className="h-7 text-[11px] font-bold" asChild>
                                  <Link href={`/dashboard/gc/report?cellId=${cell.id}`}>Preencher</Link>
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

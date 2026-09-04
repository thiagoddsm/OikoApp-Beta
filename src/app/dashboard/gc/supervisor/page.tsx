'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { GcSupervisorLegendCard, GcStatusBadges, evaluateGcSymbology } from '@/components/gc/gc-symbology';
import Link from 'next/link';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Loader2, Users, TrendingUp, AlertTriangle, MessageSquare, HeartHandshake, BarChart2, ClipboardList, CheckCircle2, Clock, Eye, Pencil, CalendarDays, UserPlus, DollarSign, Star, FileText, Trash2, ChevronLeft, ChevronRight, Filter, Activity, Rocket, AlertCircle, ShieldAlert, Bot, Send, XCircle, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { triggerGcReportForCell } from '@/app/actions/whatsapp-actions';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';

type PresencaDoc = {
  id: string;
  cellId: string;
  membroId: string;
  membroNome: string;
  date: string;
  status: string;
  pedidoOracao?: string;
  termometro?: number;
  observacaoCuidado?: string;
  reuniaoLogId?: string;
};

type ReuniaoLog = {
  id: string;
  cellId: string;
  cellNome: string;
  date: string;
  liderId: string;
  statusReuniao?: 'postponed' | 'cancelled' | 'realizado';
  novaData?: string;
  motivoCancelamento?: string;
  metricas?: {
    presentes?: number;
    totalMembrosAtivos?: number;
    visitantes?: number;
    conversoes?: number;
    oferta?: number;
  };
  visitantesNomes?: string[];   // lista de nomes dos visitantes
  conversoesNomes?: string[];   // lista de nomes dos novos convertidos
  observacoes?: string;         // observações gerais
  feedbackAoSupervisor?: string;
  termometroEspiritual?: number; // 1-5
  licaoMinistrada?: string;
};

export type GcReportStatusType = 'realizado' | 'cancelado' | 'remarcado' | 'pendente';

export interface CellStatusInfo {
  status: GcReportStatusType;
  sent: boolean;
  date: string;
  log?: ReuniaoLog;
  motivoCancelamento?: string;
  novaData?: string;
}

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

type CoLider = { id: string; casalId?: string };

type Cell = {
  id: string;
  nome: string;
  liderId: string;
  liderCasalId?: string;
  coLiderIds?: string[];
  coLideres?: CoLider[];
  anfitriaoId?: string;
  secretariaId?: string;
  secretarioId?: string;
  supervisorId?: string;
  areaId?: string;
  redeId?: string;
  members?: string[];
  membros?: string[];
  meetingDay?: string;
  meetingTime?: string;
  status?: 'active' | 'inactive' | 'growing';
  anfitriaoElegiveiIds?: string[];
  multiplicationDate?: string;
};
type Area = { id: string; nome: string; liderId: string; redeId: string; };
type Rede = { id: string; nome: string; liderId: string; pastorId: string; };

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

const THERMOMETER = [
  { value: 1, label: 'Precisa de cuidado', emoji: '😔' },
  { value: 2, label: 'Desanimado',         emoji: '😕' },
  { value: 3, label: 'Estável',            emoji: '😊' },
  { value: 4, label: 'Bem',                emoji: '😄' },
  { value: 5, label: 'Radiante',           emoji: '🔥' },
];

// ── Helpers de período ────────────────────────────────────────────────────
function getWeekStart(offsetWeeks = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() - offsetWeeks * 7); // domingo
  d.setHours(0, 0, 0, 0);
  return d;
}
function getWeekEnd(offsetWeeks = 0): Date {
  const d = getWeekStart(offsetWeeks);
  d.setDate(d.getDate() + 6);
  return d;
}
function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function getMeetingDateInWeek(meetingDay?: string, weekOffset = 0): string {
  if (!meetingDay || DAY_MAP[meetingDay] === undefined) return toDateStr(getWeekEnd(weekOffset));
  const weekSunday = getWeekStart(weekOffset);
  const d = new Date(weekSunday);
  d.setDate(d.getDate() + DAY_MAP[meetingDay]);
  return toDateStr(d);
}

export default function SupervisorPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [selectedLog, setSelectedLog] = useState<ReuniaoLog | null>(null);
  const [isDeletingLog, setIsDeletingLog] = useState(false);
  const [selectedLogPresencias, setSelectedLogPresencias] = useState<PresencaDoc[]>([]);
  const [isLoadingPresencias, setIsLoadingPresencias] = useState(false);

  useEffect(() => {
    if (!selectedLog || !firestore) {
      setSelectedLogPresencias([]);
      return;
    }

    const fetchPresencias = async () => {
      setIsLoadingPresencias(true);
      try {
        const q = query(
          collection(firestore, 'presencas_historico'),
          where('reuniaoLogId', '==', selectedLog.id)
        );
        const snapshot = await getDocs(q);
        const docsList: PresencaDoc[] = [];
        snapshot.forEach(doc => {
          docsList.push({ id: doc.id, ...doc.data() } as PresencaDoc);
        });
        setSelectedLogPresencias(docsList);
      } catch (err) {
        console.error("Error fetching presence logs:", err);
      } finally {
        setIsLoadingPresencias(false);
      }
    };

    fetchPresencias();
  }, [selectedLog, firestore]);

  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este relatório? Esta ação não pode ser desfeita.')) {
      return;
    }
    setIsDeletingLog(true);
    try {
      if (firestore) {
        await deleteDoc(doc(firestore, 'reuniao_logs', logId));

        // Delete associated presence records
        const q = query(
          collection(firestore, 'presencas_historico'),
          where('reuniaoLogId', '==', logId)
        );
        const snapshot = await getDocs(q);
        const deletePromises: Promise<void>[] = [];
        snapshot.forEach(d => {
          deletePromises.push(deleteDoc(d.ref));
        });
        await Promise.all(deletePromises);

        toast({
          title: 'Relatório excluído',
          description: 'O relatório foi excluído com sucesso.',
        });
        setSelectedLog(null);
      }
    } catch (error) {
      console.error('Erro ao excluir relatório:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o relatório. Tente novamente.',
      });
    } finally {
      setIsDeletingLog(false);
    }
  };

  // Filtro Visão Geral: 'week' | 'month' | 'year' | 'all'
  const [overviewPeriod, setOverviewPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [overviewWeekOffset, setOverviewWeekOffset] = useState(0);
  const [overviewMonthOffset, setOverviewMonthOffset] = useState(0);

  // Filtro Relatórios: semana e status
  const [reportWeekOffset, setReportWeekOffset] = useState(0);
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'realizado' | 'cancelado' | 'remarcado' | 'pendente'>('all');

  // Filtros de Rede, Área e Célula na Visão Geral
  const [filterRedeId, setFilterRedeId] = useState('');
  const [filterAreaId, setFilterAreaId] = useState('');
  const [filterCellId, setFilterCellId] = useState('');

  // Estados de reenvio de Bot do WhatsApp
  const [sendingCellId, setSendingCellId] = useState<string | null>(null);
  const [isSendingBatch, setIsSendingBatch] = useState(false);

  // Regras configuráveis do Radar de Faltas
  const [radarConfig, setRadarConfig] = useState({ minAtencao: 3, minAlerta: 4, maxAlerta: 8 });
  const [isRulesDialogOpen, setIsRulesDialogOpen] = useState(false);
  const [tempRules, setTempRules] = useState({ minAtencao: 3, minAlerta: 4, maxAlerta: 8 });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('radar_faltas_rules');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.minAtencao && parsed.minAlerta && parsed.maxAlerta) {
          setRadarConfig(parsed);
          setTempRules(parsed);
        }
      }
    } catch {}
  }, []);

  const handleSaveRules = () => {
    setRadarConfig(tempRules);
    try {
      localStorage.setItem('radar_faltas_rules', JSON.stringify(tempRules));
    } catch {}
    setIsRulesDialogOpen(false);
    toast({
      title: 'Regras do Radar Atualizadas',
      description: `Atenção: ${tempRules.minAtencao} faltas | Alerta: ${tempRules.minAlerta}-${tempRules.maxAlerta} faltas | Desistência: > ${tempRules.maxAlerta} faltas.`,
    });
  };

  // Filtro na aba de Diagnóstico & Simbologias
  const [diagFilter, setDiagFilter] = useState<'all' | 'ready' | 'attention' | 'alerts'>('all');

  // Usuários para contagem de membros por célula no diagnóstico
  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const { data: usersData } = useCollection<any>(usersQuery);

  const membersCountByCell = useMemo(() => {
    const map: Record<string, number> = {};
    (usersData || []).forEach((u: any) => {
      const cid = u.cellId || u.hierarchy?.celulaId;
      if (cid) map[cid] = (map[cid] || 0) + 1;
    });
    return map;
  }, [usersData]);

  // Período da Visão Geral
  const overviewRange = useMemo(() => {
    if (overviewPeriod === 'week') {
      return { start: toDateStr(getWeekStart(overviewWeekOffset)), end: toDateStr(getWeekEnd(overviewWeekOffset)) };
    }
    if (overviewPeriod === 'month') {
      const d = new Date();
      d.setMonth(d.getMonth() - overviewMonthOffset);
      const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
      return { start: `${y}-${m}-01`, end: `${y}-${m}-${lastDay}` };
    }
    if (overviewPeriod === 'year') {
      const y = new Date().getFullYear();
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    }
    return { start: '2020-01-01', end: toDateStr(new Date()) };
  }, [overviewPeriod, overviewWeekOffset, overviewMonthOffset]);

  const overviewLabel = useMemo(() => {
    if (overviewPeriod === 'week') {
      const s = getWeekStart(overviewWeekOffset);
      const e = getWeekEnd(overviewWeekOffset);
      return `${s.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${e.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }
    if (overviewPeriod === 'month') {
      const d = new Date(); d.setMonth(d.getMonth() - overviewMonthOffset);
      return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
    if (overviewPeriod === 'year') return `${new Date().getFullYear()}`;
    return 'Todo o período';
  }, [overviewPeriod, overviewWeekOffset, overviewMonthOffset]);

  const reportWeekLabel = useMemo(() => {
    const s = getWeekStart(reportWeekOffset);
    const e = getWeekEnd(reportWeekOffset);
    return `${s.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${e.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
  }, [reportWeekOffset]);

  const currentMonth = new Date().toISOString().slice(0, 7); // fallback

  // Query ampla: 1 ano de logs (filtramos por período no client)
  const logsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'reuniao_logs'), where('date', '>=', `${new Date().getFullYear()}-01-01`), orderBy('date', 'desc'), limit(2000)) : null,
    [firestore]
  );

  const presencasQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'presencas_historico'), where('date', '>=', `${currentMonth}-01`), orderBy('date', 'desc'), limit(2000)) : null,
    [firestore, currentMonth]
  );

  const { data: logsAll, isLoading: l1 } = useCollection<ReuniaoLog>(logsQuery);
  const { data: presencas, isLoading: l2 } = useCollection<PresencaDoc>(presencasQuery);

  const cellAttendanceRateMap = useMemo(() => {
    if (!logsAll) return {};
    const map: Record<string, { totalPresentes: number; totalCapacidade: number }> = {};
    logsAll.forEach(l => {
      if (!map[l.cellId]) map[l.cellId] = { totalPresentes: 0, totalCapacidade: 0 };
      map[l.cellId].totalPresentes += l.metricas?.presentes || 0;
      map[l.cellId].totalCapacidade += l.metricas?.totalMembrosAtivos || 1;
    });

    const rates: Record<string, number> = {};
    Object.entries(map).forEach(([cid, data]) => {
      rates[cid] = data.totalCapacidade > 0 ? Math.round((data.totalPresentes / data.totalCapacidade) * 100) : 0;
    });
    return rates;
  }, [logsAll]);

  // Todas as células (para aba de relatórios e filtros)
  const allCellsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'cells'), orderBy('nome')) : null,
    [firestore]
  );
  const { data: allCells } = useCollection<Cell>(allCellsQuery);

  // Carrega todas as Áreas e Redes para os filtros
  const areasQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'areas'), orderBy('nome')) : null,
    [firestore]
  );
  const redesQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'redes'), orderBy('nome')) : null,
    [firestore]
  );
  const { data: areas } = useCollection<Area>(areasQuery);
  const { data: redes } = useCollection<Rede>(redesQuery);

  // Células filtradas na Visão Geral
  const filteredCellIds = useMemo(() => {
    if (!allCells) return new Set<string>();
    const cellsFiltered = allCells.filter(c => {
      if (filterRedeId && c.redeId !== filterRedeId) return false;
      if (filterAreaId && c.areaId !== filterAreaId) return false;
      if (filterCellId && c.id !== filterCellId) return false;
      return true;
    });
    return new Set(cellsFiltered.map(c => c.id));
  }, [allCells, filterRedeId, filterAreaId, filterCellId]);

  // Logs filtrados pelo período da Visão Geral e pelos filtros de rede/área/célula
  const logs = useMemo(() => {
    const base = (logsAll || []).filter(l => l.date >= overviewRange.start && l.date <= overviewRange.end);
    if (!filterRedeId && !filterAreaId && !filterCellId) return base;
    return base.filter(l => filteredCellIds.has(l.cellId));
  }, [logsAll, overviewRange, filterRedeId, filterAreaId, filterCellId, filteredCellIds]);

  // Logs da semana selecionada nos relatórios
  const reportWeekStart = toDateStr(getWeekStart(reportWeekOffset));
  const reportWeekEnd = toDateStr(getWeekEnd(reportWeekOffset));
  const recentLogsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'reuniao_logs'), where('date', '>=', reportWeekStart), where('date', '<=', reportWeekEnd), orderBy('date', 'desc'), limit(300)) : null,
    [firestore, reportWeekStart, reportWeekEnd]
  );
  const { data: recentLogs } = useCollection<ReuniaoLog>(recentLogsQuery);

  // Status de relatório por célula (com base na semana selecionada)
  const cellReportStatus = useMemo(() => {
    const status: Record<string, CellStatusInfo> = {};
    const reportWeekStart = toDateStr(getWeekStart(reportWeekOffset));
    const reportWeekEnd = toDateStr(getWeekEnd(reportWeekOffset));

    // Combinar logsAll e recentLogs para garantir máxima cobertura de busca
    const availableLogs = [...(logsAll || []), ...(recentLogs || [])];

    allCells?.forEach(cell => {
      const meetingDate = getMeetingDateInWeek(cell.meetingDay, reportWeekOffset);
      
      // Busca se há relatório enviado para esta célula no intervalo da semana ou na data exata
      const log = availableLogs.find(l => {
        if (l.cellId !== cell.id) return false;
        const logDateStr = (l.date || '').split('T')[0];

        // 1. Coincidência com a data de reunião estimada
        if (logDateStr === meetingDate) return true;

        // 2. Qualquer relatório preenchido dentro dos limites da semana de referência
        return logDateStr >= reportWeekStart && logDateStr <= reportWeekEnd;
      });

      let statusType: GcReportStatusType = 'pendente';
      if (log) {
        if (log.statusReuniao === 'cancelled') {
          statusType = 'cancelado';
        } else if (log.statusReuniao === 'postponed') {
          statusType = 'remarcado';
        } else {
          statusType = 'realizado';
        }
      }

      status[cell.id] = {
        status: statusType,
        sent: !!log && statusType === 'realizado',
        date: log ? log.date.split('T')[0] : meetingDate,
        log,
        motivoCancelamento: log?.motivoCancelamento,
        novaData: log?.novaData
      };
    });
    return status;
  }, [allCells, logsAll, recentLogs, reportWeekOffset]);

  // Contagem e métricas de relatórios da semana
  const reportStats = useMemo(() => {
    let realizados = 0;
    let cancelados = 0;
    let remarcados = 0;
    let pendentes = 0;

    allCells?.forEach(cell => {
      const st = cellReportStatus[cell.id]?.status || 'pendente';
      if (st === 'realizado') realizados++;
      else if (st === 'cancelado') cancelados++;
      else if (st === 'remarcado') remarcados++;
      else pendentes++;
    });

    return {
      total: allCells?.length || 0,
      realizados,
      cancelados,
      remarcados,
      pendentes
    };
  }, [allCells, cellReportStatus]);

  // Contagem de células estritamente pendentes no período selecionado (exclui canceladas e remarcadas)
  const pendingCellsCount = reportStats.pendentes;

  // Células filtradas pelo status do relatório da semana
  const filteredReportCells = useMemo(() => {
    if (!allCells) return [];
    if (reportStatusFilter === 'all') return allCells;
    return allCells.filter(cell => cellReportStatus[cell.id]?.status === reportStatusFilter);
  }, [allCells, cellReportStatus, reportStatusFilter]);

  // Reenviar Bot do WhatsApp para uma célula específica
  const handleResendBot = async (cellId: string, cellNome: string) => {
    setSendingCellId(cellId);
    try {
      const res = await triggerGcReportForCell(cellId);
      if (res.success) {
        const destDesc = res.recipientRole === 'secretario'
          ? `enviado para a secretária (${res.recipientName})`
          : `enviado para o líder (${res.recipientName})`;
        toast({
          title: 'Bot do WhatsApp Enviado! 🚀',
          description: `O formulário do relatório do GC ${cellNome} foi ${destDesc}.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Não foi possível enviar o Bot',
          description: res.error || 'Verifique se o secretário ou líder possui telefone cadastrado.',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao disparar Bot',
        description: error.message || 'Ocorreu um erro ao comunicar com a API do WhatsApp.',
      });
    } finally {
      setSendingCellId(null);
    }
  };

  // Reenviar Bot do WhatsApp apenas para células que estão REALMENTE PENDENTES (não canceladas/remarcadas)
  const handleResendAllPending = async () => {
    if (!allCells) return;
    const pendingCells = allCells.filter(cell => cellReportStatus[cell.id]?.status === 'pendente');
    if (pendingCells.length === 0) {
      toast({
        title: 'Tudo em dia!',
        description: 'Não há GCs pendentes para a semana selecionada (todos já enviaram relatório, cancelaram ou adiaram).',
      });
      return;
    }

    if (!window.confirm(`Deseja disparar o bot de cobrança do relatório via WhatsApp para os ${pendingCells.length} líder(es) de GC que ainda não responderam?`)) {
      return;
    }

    setIsSendingBatch(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const cell of pendingCells) {
        try {
          const res = await triggerGcReportForCell(cell.id);
          if (res.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      toast({
        title: 'Disparo em Lote Concluído! 🚀',
        description: `${successCount} bot(s) enviado(s) aos líderes no WhatsApp. ${failCount > 0 ? `(${failCount} falha(s))` : ''}`,
      });
    } finally {
      setIsSendingBatch(false);
    }
  };

  // Alertas Luz Vermelha — busca histórico de 90 dias para calcular faltas consecutivas
  const alertasQuery = useMemoFirebase(() => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dateStr = ninetyDaysAgo.toISOString().split('T')[0];
    return firestore
      ? query(collection(firestore, 'presencas_historico'), where('date', '>=', dateStr), orderBy('date', 'desc'), limit(5000))
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

    const filteredPresences = !filterRedeId && !filterAreaId && !filterCellId
      ? presencasAlerta
      : presencasAlerta.filter(p => filteredCellIds.has(p.cellId));

    const byMembro: Record<string, PresencaDoc[]> = {};
    filteredPresences.forEach(p => {
      if (!byMembro[p.membroId]) byMembro[p.membroId] = [];
      byMembro[p.membroId].push(p);
    });

    const alertas: { membroId: string; membroNome: string; cellId: string; faltasConsecutivas: number; ultimaPresenca: string; nivel: 'Atenção' | 'Alerta' | 'Desistência' }[] = [];

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
          const s = (r.status || '').toLowerCase().trim();
          if (s === 'ausente_sem_justificativa' || s === 'ausente' || s === 'faltou' || s === 'falta') {
            consecutive++;
          } else {
            break;
          }
        }
        if (consecutive >= radarConfig.minAtencao) {
          const ultimaPresenca = sorted.find(r => r.status === 'presente')?.date || '—';
          
          let nivel: 'Atenção' | 'Alerta' | 'Desistência' = 'Atenção';
          if (consecutive >= radarConfig.minAlerta && consecutive <= radarConfig.maxAlerta) {
            nivel = 'Alerta';
          } else if (consecutive > radarConfig.maxAlerta) {
            nivel = 'Desistência';
          }

          alertas.push({ membroId, membroNome: regs[0].membroNome, cellId, faltasConsecutivas: consecutive, ultimaPresenca, nivel });
        }
      });
    });

    return alertas.sort((a, b) => b.faltasConsecutivas - a.faltasConsecutivas);
  }, [presencasAlerta, filterRedeId, filterAreaId, filterCellId, filteredCellIds, radarConfig]);

  // Feed de feedbacks dos líderes
  const feedbacks = useMemo(() =>
    (logs || []).filter(l => l.feedbackAoSupervisor?.trim()).slice(0, 20),
    [logs]
  );

  const chartData = useMemo(() => {
    const groups: Record<string, { key: string; label: string; presentes: number; visitantes: number; conversoes: number }> = {};
    
    const sortedLogs = [...(logs || [])].sort((a, b) => a.date.localeCompare(b.date));
    
    sortedLogs.forEach(log => {
      let key = log.date;
      let label = log.date;
      
      const parts = log.date.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthIdx = parseInt(parts[1]) - 1;
        const day = parts[2];
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        if (overviewPeriod === 'year' || overviewPeriod === 'all') {
          // Group by month
          key = `${year}-${parts[1]}`;
          label = `${months[monthIdx]}/${year.slice(2)}`;
        } else {
          // Group by date
          key = log.date;
          label = `${day}/${months[monthIdx]}`;
        }
      }
      
      if (!groups[key]) {
        groups[key] = { key, label, presentes: 0, visitantes: 0, conversoes: 0 };
      }
      
      groups[key].presentes += log.metricas?.presentes || 0;
      groups[key].visitantes += log.metricas?.visitantes || 0;
      groups[key].conversoes += log.metricas?.conversoes || 0;
    });
    
    return Object.values(groups).sort((a, b) => a.key.localeCompare(b.key));
  }, [logs, overviewPeriod]);

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
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Painel do Supervisor</h1>
          <p className="text-sm text-muted-foreground">Visão estratégica · <strong>{overviewLabel}</strong></p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2"><BarChart2 className="h-4 w-4" />Visão Geral</TabsTrigger>
            <TabsTrigger value="diagnostics" className="gap-2"><ShieldAlert className="h-4 w-4" />Diagnóstico &amp; Simbologias</TabsTrigger>
            <TabsTrigger value="reports" className="gap-2"><ClipboardList className="h-4 w-4" />Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
          <>
          {/* Filtro de período */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {(['week','month','year','all'] as const).map(p => (
              <button key={p} onClick={() => { setOverviewPeriod(p); setOverviewWeekOffset(0); setOverviewMonthOffset(0); }}
                className={cn('px-3 py-1 rounded-full text-xs font-bold border transition-colors',
                  overviewPeriod === p ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted')}>
                {{ week: 'Semana', month: 'Mês', year: 'Ano', all: 'Tudo' }[p]}
              </button>
            ))}
            {/* Navegador */}
            {overviewPeriod === 'week' && (
              <div className="flex items-center gap-1 ml-2 border rounded-lg">
                <button onClick={() => setOverviewWeekOffset(w => w + 1)} className="p-1 hover:bg-muted rounded-l-lg"><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-xs font-semibold px-2 min-w-[140px] text-center">{overviewLabel}</span>
                <button onClick={() => setOverviewWeekOffset(w => Math.max(0, w - 1))} disabled={overviewWeekOffset === 0} className="p-1 hover:bg-muted rounded-r-lg disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
              </div>
            )}
            {overviewPeriod === 'month' && (
              <div className="flex items-center gap-1 ml-2 border rounded-lg">
                <button onClick={() => setOverviewMonthOffset(m => m + 1)} className="p-1 hover:bg-muted rounded-l-lg"><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-xs font-semibold px-2 min-w-[140px] text-center capitalize">{overviewLabel}</span>
                <button onClick={() => setOverviewMonthOffset(m => Math.max(0, m - 1))} disabled={overviewMonthOffset === 0} className="p-1 hover:bg-muted rounded-r-lg disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
              </div>
            )}
          </div>

          {/* Filtros Estratégicos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/30 p-3 rounded-lg border border-border/60">
            {/* Filtro de Rede */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Rede</label>
              <Select 
                value={filterRedeId || 'all-redes'} 
                onValueChange={(val) => { 
                  const cleaned = val === 'all-redes' ? '' : val;
                  setFilterRedeId(cleaned); 
                  setFilterAreaId(''); 
                  setFilterCellId(''); 
                }}
              >
                <SelectTrigger className="h-9 bg-background text-xs font-semibold">
                  <SelectValue placeholder="Todas as Redes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-redes" className="text-xs font-semibold">Todas as Redes</SelectItem>
                  {redes?.map(r => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">{r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Área */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Área</label>
              <Select 
                value={filterAreaId || 'all-areas'} 
                onValueChange={(val) => { 
                  const cleaned = val === 'all-areas' ? '' : val;
                  setFilterAreaId(cleaned); 
                  setFilterCellId(''); 
                }}
                disabled={!filterRedeId}
              >
                <SelectTrigger className="h-9 bg-background text-xs font-semibold">
                  <SelectValue placeholder="Todas as Áreas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-areas" className="text-xs font-semibold">Todas as Áreas</SelectItem>
                  {areas
                    ?.filter(a => a.redeId === filterRedeId)
                    ?.map(a => (
                      <SelectItem key={a.id} value={a.id} className="text-xs">{a.nome}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de GC */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">GC (Célula)</label>
              <Select 
                value={filterCellId || 'all-cells'} 
                onValueChange={(val) => {
                  const cleaned = val === 'all-cells' ? '' : val;
                  setFilterCellId(cleaned);
                }}
              >
                <SelectTrigger className="h-9 bg-background text-xs font-semibold">
                  <SelectValue placeholder="Todas as Células" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-cells" className="text-xs font-semibold">Todas as Células</SelectItem>
                  {allCells
                    ?.filter(c => {
                      if (filterAreaId) return c.areaId === filterAreaId;
                      if (filterRedeId) return c.redeId === filterRedeId;
                      return true;
                    })
                    ?.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">{c.nome}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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

          {/* Gráfico de Evolução */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Evolução de Frequência e Crescimento
                </CardTitle>
                <CardDescription>Visualização temporal de presenças, novos visitantes e conversões</CardDescription>
              </CardHeader>
              <CardContent className="h-[260px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPresentes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorVisitantes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorConversoes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis 
                      dataKey="label" 
                      stroke="#888888" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <RechartsTooltip 
                      contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                      labelClassName="font-black text-slate-800"
                    />
                    <Area 
                      type="monotone" 
                      name="Presenças"
                      dataKey="presentes" 
                      stroke="#10b981" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorPresentes)" 
                    />
                    <Area 
                      type="monotone" 
                      name="Novos Visitantes"
                      dataKey="visitantes" 
                      stroke="#0ea5e9" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorVisitantes)" 
                    />
                    <Area 
                      type="monotone" 
                      name="Conversões"
                      dataKey="conversoes" 
                      stroke="#a855f7" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorConversoes)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
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
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" /> Radar de Faltas
                  </CardTitle>
                  <CardDescription>
                    Acompanhe os membros com faltas consecutivas ({radarConfig.minAtencao}+ faltas)
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-bold gap-1.5 shrink-0"
                  onClick={() => setIsRulesDialogOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5" /> Configurar regras
                </Button>
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
                      <div key={`${a.membroId}-${a.cellId}`} className={`flex items-center gap-3 rounded-xl border p-3 ${
                        a.nivel === 'Desistência' ? 'border-neutral-200 bg-neutral-50' : 
                        a.nivel === 'Alerta' ? 'border-red-200 bg-red-50' : 
                        'border-amber-200 bg-amber-50'
                      }`}>
                        <Avatar className={`h-8 w-8 border flex-shrink-0 ${
                          a.nivel === 'Desistência' ? 'border-neutral-200' : 
                          a.nivel === 'Alerta' ? 'border-red-200' : 
                          'border-amber-200'
                        }`}>
                          <AvatarFallback className={`text-xs font-bold ${
                            a.nivel === 'Desistência' ? 'bg-neutral-100 text-neutral-700' : 
                            a.nivel === 'Alerta' ? 'bg-red-100 text-red-700' : 
                            'bg-amber-100 text-amber-700'
                          }`}>{a.membroNome.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate flex items-center gap-2">
                            {a.membroNome}
                            <Badge variant="outline" className={`text-[9px] h-4 px-1 border-transparent ${
                              a.nivel === 'Desistência' ? 'bg-neutral-200 text-neutral-700' : 
                              a.nivel === 'Alerta' ? 'bg-red-200 text-red-700' : 
                              'bg-amber-200 text-amber-700'
                            }`}>{a.nivel}</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">Célula: {celulaRanking.find(c => c.cellId === a.cellId)?.cellNome || a.cellId}</p>
                        </div>
                        <Badge className={`flex-shrink-0 text-[11px] ${
                          a.nivel === 'Desistência' ? 'bg-neutral-600 hover:bg-neutral-700 text-white' : 
                          a.nivel === 'Alerta' ? 'bg-red-600 hover:bg-red-700 text-white' : 
                          'bg-amber-500 hover:bg-amber-600 text-white'
                        }`}>
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

          {/* ===== ABA DIAGNÓSTICO & SIMBOLOGIAS ===== */}
          <TabsContent value="diagnostics" className="space-y-6">
            <GcSupervisorLegendCard />

            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base font-black flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      Diagnóstico Operacional das Células
                    </CardTitle>
                    <CardDescription>
                      Classificação em tempo real por simbologia, prontidão de multiplicação e alertas
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      variant={diagFilter === 'all' ? 'default' : 'outline'}
                      className="text-xs font-bold h-8"
                      onClick={() => setDiagFilter('all')}
                    >
                      Todas ({allCells?.length || 0})
                    </Button>
                    <Button
                      size="sm"
                      variant={diagFilter === 'ready' ? 'default' : 'outline'}
                      className={cn("text-xs font-bold h-8 gap-1", diagFilter === 'ready' && "bg-emerald-600 hover:bg-emerald-700 text-white")}
                      onClick={() => setDiagFilter('ready')}
                    >
                      <Rocket className="h-3.5 w-3.5" /> Prontas
                    </Button>
                    <Button
                      size="sm"
                      variant={diagFilter === 'attention' ? 'default' : 'outline'}
                      className={cn("text-xs font-bold h-8 gap-1", diagFilter === 'attention' && "bg-amber-600 hover:bg-amber-700 text-white")}
                      onClick={() => setDiagFilter('attention')}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" /> Atenção
                    </Button>
                    <Button
                      size="sm"
                      variant={diagFilter === 'alerts' ? 'default' : 'outline'}
                      className={cn("text-xs font-bold h-8 gap-1", diagFilter === 'alerts' && "bg-rose-600 hover:bg-rose-700 text-white")}
                      onClick={() => setDiagFilter('alerts')}
                    >
                      <AlertCircle className="h-3.5 w-3.5" /> Alertas
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!allCells || allCells.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma célula encontrada.</p>
                ) : (
                  <div className="space-y-3">
                    {allCells
                      .map(cell => {
                        const mCount = membersCountByCell[cell.id] || cell.members?.length || 0;
                        const attRate = cellAttendanceRateMap[cell.id] || 0;
                        const hasEligibleHost = (cell.anfitriaoElegiveiIds?.length || 0) > 0 || !!cell.anfitriaoId;
                        const eligibleHostsCount = cell.anfitriaoElegiveiIds?.length || (cell.anfitriaoId ? 1 : 0);
                        const evalData = evaluateGcSymbology(cell, mCount, attRate);
                        return { cell, mCount, attRate, hasEligibleHost, eligibleHostsCount, evalData };
                      })
                      .filter(({ evalData }) => {
                        if (diagFilter === 'ready') return evalData.isReadyForMultiplication;
                        if (diagFilter === 'attention') return evalData.attentionReasons.length > 0;
                        if (diagFilter === 'alerts') return evalData.operationalAlerts.length > 0;
                        return true;
                      })
                      .map(({ cell, mCount, attRate, hasEligibleHost, eligibleHostsCount, evalData }) => (
                        <div key={cell.id} className="p-4 rounded-xl border bg-card hover:bg-muted/20 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link href={`/dashboard/gc/cells/${cell.id}`} className="font-black text-base hover:underline hover:text-primary">
                                {cell.nome}
                              </Link>
                              <GcStatusBadges data={evalData} />
                            </div>
                            <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span>Membros: <strong className="text-foreground">{mCount}</strong></span>
                              <span>&middot;</span>
                              <span>Frequência: <strong className={attRate >= 50 ? "text-emerald-600 font-bold" : attRate > 0 ? "text-amber-600 font-bold" : "text-slate-400 font-normal"}>{attRate > 0 ? `${attRate}%` : 'Sem dados'}</strong></span>
                              <span>&middot;</span>
                              <span>Anfitrião Elegível: <strong className={hasEligibleHost ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>{hasEligibleHost ? `Sim (${eligibleHostsCount})` : 'Não'}</strong></span>
                              <span>&middot;</span>
                              <span>Líder em Treinamento: <strong className="text-foreground font-bold">{cell.coLideres?.length || cell.coLiderIds?.length || 0}</strong></span>
                              <span>&middot;</span>
                              <span>Secretário(a): <strong className="text-foreground font-bold">{cell.secretariaId || (cell as any).secretarioId ? 'Sim' : 'Não'}</strong></span>
                              <span>&middot;</span>
                              <span>Multiplicação: <strong className="text-foreground font-bold">{cell.multiplicationDate || 'Não planejada'}</strong></span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1" asChild>
                              <Link href={`/dashboard/gc/cells/${cell.id}`}>
                                <Eye className="h-3.5 w-3.5" /> Abrir GC
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== ABA RELATÓRIOS ===== */}
          <TabsContent value="reports" className="space-y-4">
            {/* Navegador de semana */}
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setReportWeekOffset(w => w + 1)} className="p-1.5 border rounded-lg hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
              <div className="flex-1 text-center">
                <span className="text-sm font-bold">{reportWeekLabel}</span>
                {reportWeekOffset === 0 && <span className="ml-2 text-[11px] text-primary font-semibold">Esta semana</span>}
              </div>
              <button onClick={() => setReportWeekOffset(w => Math.max(0, w - 1))} disabled={reportWeekOffset === 0} className="p-1.5 border rounded-lg hover:bg-muted disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>

            {/* Cards de Resumo / Filtros Rápidos */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <button
                type="button"
                onClick={() => setReportStatusFilter('all')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all',
                  reportStatusFilter === 'all' ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card hover:bg-muted/50 border-border'
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Total GCs</p>
                <p className="text-xl font-black">{reportStats.total}</p>
              </button>

              <button
                type="button"
                onClick={() => setReportStatusFilter('realizado')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all',
                  reportStatusFilter === 'realizado' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-emerald-50/50 hover:bg-emerald-100/50 border-emerald-200 text-emerald-950 dark:text-emerald-300'
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">✓ Realizados</p>
                <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{reportStats.realizados}</p>
              </button>

              <button
                type="button"
                onClick={() => setReportStatusFilter('cancelado')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all',
                  reportStatusFilter === 'cancelado' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-rose-50/50 hover:bg-rose-100/50 border-rose-200 text-rose-950 dark:text-rose-300'
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">❌ Cancelados</p>
                <p className="text-xl font-black text-rose-700 dark:text-rose-300">{reportStats.cancelados}</p>
              </button>

              <button
                type="button"
                onClick={() => setReportStatusFilter('remarcado')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all',
                  reportStatusFilter === 'remarcado' ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-purple-50/50 hover:bg-purple-100/50 border-purple-200 text-purple-950 dark:text-purple-300'
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">📅 Remarcados</p>
                <p className="text-xl font-black text-purple-700 dark:text-purple-300">{reportStats.remarcados}</p>
              </button>

              <button
                type="button"
                onClick={() => setReportStatusFilter('pendente')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all',
                  reportStatusFilter === 'pendente' ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-amber-50/50 hover:bg-amber-100/50 border-amber-200 text-amber-950 dark:text-amber-300'
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">⏳ Pendentes</p>
                <p className="text-xl font-black text-amber-700 dark:text-amber-300">{reportStats.pendentes}</p>
              </button>
            </div>

            <Card>
              <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" /> Relatórios da Semana
                    {reportStatusFilter !== 'all' && (
                      <Badge variant="outline" className="text-xs ml-1 capitalize font-normal">
                        Filtro: {reportStatusFilter}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Acompanhe em tempo real quem realizou a reunião, quem cancelou e quem remarcou.
                  </CardDescription>
                </div>
                {pendingCellsCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-bold gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 shadow-sm shrink-0"
                    onClick={handleResendAllPending}
                    disabled={isSendingBatch || !!sendingCellId}
                  >
                    {isSendingBatch ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                    ) : (
                      <Bot className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    {isSendingBatch ? 'Enviando...' : `Cobrar Pendentes no WhatsApp (${pendingCellsCount})`}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {filteredReportCells.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <p className="text-sm">Nenhum GC encontrado com o status selecionado ({reportStatusFilter}).</p>
                    {reportStatusFilter !== 'all' && (
                      <Button variant="link" size="sm" onClick={() => setReportStatusFilter('all')} className="mt-1 text-xs">
                        Limpar filtro
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredReportCells.map(cell => {
                      const st = cellReportStatus[cell.id];
                      const statusType = st?.status || 'pendente';
                      const dateLabel = st?.date
                        ? new Date(st.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                        : '—';

                      // 1. REALIZADO
                      if (statusType === 'realizado') {
                        return (
                          <div key={cell.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-colors bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold truncate text-foreground">{cell.nome}</p>
                                <Badge className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 font-bold text-[11px] gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Realizado
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                                <span>{cell.meetingDay || 'Dia não definido'} &middot; Ref: {dateLabel}</span>
                                <span>&middot;</span>
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                  {st.log?.metricas?.presentes ?? 0} presentes ({st.log?.metricas?.visitantes ?? 0} visitantes)
                                </span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button size="sm" variant="outline" className="h-7 text-[11px] font-bold gap-1 bg-white dark:bg-background border-emerald-300 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50" onClick={() => setSelectedLog(st.log || null)}>
                                <Eye className="h-3 w-3" /> Ver Detalhes
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1" asChild>
                                <Link href={`/dashboard/gc/report?cellId=${cell.id}`}><Pencil className="h-3 w-3" /></Link>
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      // 2. CANCELADO
                      if (statusType === 'cancelado') {
                        return (
                          <div key={cell.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-colors bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold truncate text-foreground">{cell.nome}</p>
                                <Badge className="bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700 font-bold text-[11px] gap-1">
                                  <XCircle className="h-3 w-3 text-rose-600" /> Cancelado
                                </Badge>
                              </div>
                              <p className="text-xs text-rose-700 dark:text-rose-300 font-medium mt-1 truncate" title={st.motivoCancelamento}>
                                <strong>Motivo:</strong> {st.motivoCancelamento || 'Não especificado'}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {cell.meetingDay || 'Dia não definido'} &middot; Ref: {dateLabel} (Líder respondeu no WhatsApp)
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button size="sm" variant="outline" className="h-7 text-[11px] font-bold gap-1 text-rose-700 border-rose-300 bg-white dark:bg-background hover:bg-rose-50" onClick={() => setSelectedLog(st.log || null)}>
                                <Eye className="h-3 w-3" /> Ver Motivo
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1" asChild>
                                <Link href={`/dashboard/gc/report?cellId=${cell.id}`}><Pencil className="h-3 w-3" /></Link>
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      // 3. REMARCADO / ADIADO
                      if (statusType === 'remarcado') {
                        return (
                          <div key={cell.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-colors bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold truncate text-foreground">{cell.nome}</p>
                                <Badge className="bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700 font-bold text-[11px] gap-1">
                                  <CalendarDays className="h-3 w-3 text-purple-600" /> Remarcado
                                </Badge>
                              </div>
                              <p className="text-xs text-purple-700 dark:text-purple-300 font-semibold mt-1">
                                📅 Nova Data Informada: <strong>{st.novaData || 'A definir'}</strong>
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {cell.meetingDay || 'Dia não definido'} &middot; Ref: {dateLabel}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button size="sm" variant="outline" className="h-7 text-[11px] font-bold gap-1 text-purple-700 border-purple-300 bg-white dark:bg-background hover:bg-purple-50" onClick={() => setSelectedLog(st.log || null)}>
                                <Eye className="h-3 w-3" /> Ver Detalhes
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1" asChild>
                                <Link href={`/dashboard/gc/report?cellId=${cell.id}`}><Pencil className="h-3 w-3" /></Link>
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      // 4. PENDENTE
                      return (
                        <div key={cell.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-colors bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold truncate text-foreground">{cell.nome}</p>
                              <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-300 font-bold text-[11px] gap-1">
                                <Clock className="h-3 w-3" /> Pendente
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {cell.meetingDay || 'Dia não definido'} &middot; Ref: {dateLabel} &middot; <span className="text-amber-700 dark:text-amber-400 font-medium">Líder ainda não respondeu</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] font-bold gap-1 bg-white dark:bg-background hover:bg-emerald-50 text-emerald-700 border-emerald-300"
                              onClick={() => handleResendBot(cell.id, cell.nome)}
                              disabled={sendingCellId === cell.id || isSendingBatch}
                              title="Enviar formulário pelo WhatsApp para o líder"
                            >
                              {sendingCellId === cell.id ? (
                                <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                              ) : (
                                <Bot className="h-3 w-3 text-emerald-600" />
                              )}
                              Reenviar Bot
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-[11px] font-bold" asChild>
                              <Link href={`/dashboard/gc/report?cellId=${cell.id}`}>Preencher</Link>
                            </Button>
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

    {/* ── DRAWER DE VISUALIZAÇÃO DO RELATÓRIO ───────────────────────────── */}
    <Sheet open={!!selectedLog} onOpenChange={open => { if (!open) setSelectedLog(null); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {selectedLog && (
          <>
            <SheetHeader className="pb-4">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-lg font-black">{selectedLog.cellNome}</SheetTitle>
                {selectedLog.statusReuniao === 'cancelled' && (
                  <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-xs gap-1">
                    <XCircle className="h-3 w-3 text-rose-600" /> Cancelado
                  </Badge>
                )}
                {selectedLog.statusReuniao === 'postponed' && (
                  <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-bold text-xs gap-1">
                    <CalendarDays className="h-3 w-3 text-purple-600" /> Remarcado
                  </Badge>
                )}
                {(!selectedLog.statusReuniao || selectedLog.statusReuniao === 'realizado') && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Realizado
                  </Badge>
                )}
              </div>
              <SheetDescription className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Data de referência:{' '}
                {new Date(selectedLog.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </SheetDescription>
            </SheetHeader>
            <Separator />

            {/* DESTAQUE DE REUNIÃO CANCELADA */}
            {selectedLog.statusReuniao === 'cancelled' && (
              <div className="my-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                <div className="flex items-center gap-2 font-black text-rose-900 text-sm">
                  <XCircle className="h-5 w-5 text-rose-600" /> Reunião do GC Cancelada
                </div>
                <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                  Motivo Informado pelo Líder:
                </p>
                <p className="text-sm bg-white/90 p-3 rounded-lg border border-rose-200 font-medium text-rose-950">
                  "{selectedLog.motivoCancelamento || selectedLog.feedbackAoSupervisor || 'Sem justificativa informada'}"
                </p>
              </div>
            )}

            {/* DESTAQUE DE REUNIÃO REMARCADA / ADIADA */}
            {selectedLog.statusReuniao === 'postponed' && (
              <div className="my-4 p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 space-y-2">
                <div className="flex items-center gap-2 font-black text-purple-900 text-sm">
                  <CalendarDays className="h-5 w-5 text-purple-600" /> Reunião do GC Adiada / Remarcada
                </div>
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
                  Nova Data Informada pelo Líder:
                </p>
                <p className="text-sm bg-white/90 p-3 rounded-lg border border-purple-200 font-bold text-purple-950">
                  {selectedLog.novaData || 'A definir'}
                </p>
              </div>
            )}

            {/* MÉTRICAS (Apenas para reuniões realizadas ou com métricas) */}
            {selectedLog.statusReuniao !== 'cancelled' && selectedLog.statusReuniao !== 'postponed' && (
              <div className="grid grid-cols-2 gap-3 py-4">
                {[
                  { icon: Users, label: 'Presentes', value: selectedLog.metricas?.presentes ?? '—', color: 'text-emerald-600' },
                  { icon: UserPlus, label: 'Visitantes', value: selectedLog.metricas?.visitantes ?? '—', color: 'text-sky-600' },
                  { icon: HeartHandshake, label: 'Conversões', value: selectedLog.metricas?.conversoes ?? '—', color: 'text-purple-600' },
                  { icon: DollarSign, label: 'Oferta (R$)', value: selectedLog.metricas?.oferta != null ? `R$ ${selectedLog.metricas.oferta.toFixed(2)}` : '—', color: 'text-amber-600' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="rounded-xl border bg-muted/20 p-3 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className={cn('h-3.5 w-3.5', color)} />
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">{label}</span>
                    </div>
                    <p className={cn('text-xl font-black', color)}>{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* LIÇÃO MINISTRADA */}
            {selectedLog.licaoMinistrada?.trim() && (
              <>
                <Separator />
                <div className="py-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lição / Tema da Reunião</span>
                  </div>
                  <p className="text-sm font-bold text-foreground bg-indigo-50/30 border border-indigo-100 rounded-lg p-3">
                    {selectedLog.licaoMinistrada}
                  </p>
                </div>
              </>
            )}

            {/* TERMÔMETRO ESPIRITUAL */}
            {selectedLog.termometroEspiritual != null && (
              <>
                <Separator />
                <div className="py-4 space-y-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Termômetro Espiritual</span>
                  </div>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(n => (
                      <div key={n} className={cn('h-3 flex-1 rounded-full', n <= selectedLog.termometroEspiritual! ? 'bg-amber-400' : 'bg-muted')} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedLog.termometroEspiritual}/5</p>
                </div>
              </>
            )}

            {/* VISITANTES */}
            {Array.isArray(selectedLog.visitantesNomes) && selectedLog.visitantesNomes.length > 0 && (
              <>
                <Separator />
                <div className="py-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <UserPlus className="h-3.5 w-3.5 text-sky-500" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Visitantes</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLog.visitantesNomes.map((nome: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">{nome}</Badge>)}
                  </div>
                </div>
              </>
            )}

            {/* CONVERSÕES */}
            {Array.isArray(selectedLog.conversoesNomes) && selectedLog.conversoesNomes.length > 0 && (
              <>
                <Separator />
                <div className="py-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <HeartHandshake className="h-3.5 w-3.5 text-purple-500" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conversões</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLog.conversoesNomes.map((nome: string, i: number) => <Badge key={i} className="text-xs bg-purple-100 text-purple-700">{nome}</Badge>)}
                  </div>
                </div>
              </>
            )}

            {/* OBSERVAÇÕES */}
            {selectedLog.observacoes?.trim() && (
              <>
                <Separator />
                <div className="py-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Observações</span>
                  </div>
                  <p className="text-sm text-foreground/80 bg-muted/30 rounded-lg p-3">{selectedLog.observacoes}</p>
                </div>
              </>
            )}

            {/* FEEDBACK AO SUPERVISOR */}
            {selectedLog.feedbackAoSupervisor?.trim() && (
              <>
                <Separator />
                <div className="py-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Feedback ao Supervisor</span>
                  </div>
                  <p className="text-sm text-foreground/80 bg-primary/5 border border-primary/20 rounded-lg p-3 italic">"{selectedLog.feedbackAoSupervisor}"</p>
                </div>
              </>
            )}

            {/* PRESENÇA DOS MEMBROS */}
            <Separator />
            <div className="py-4 space-y-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Presença dos Membros</span>
              </div>
              
              {isLoadingPresencias ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground ml-2">Carregando presenças...</span>
                </div>
              ) : selectedLogPresencias.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhum registro de presença encontrado.</p>
              ) : (
                <div className="space-y-2">
                  {selectedLogPresencias.map(p => {
                    const statusText = p.status === 'presente' ? 'Presente' : p.status === 'ausente_justificado' ? 'Justificado' : 'Faltou';
                    const statusColor = p.status === 'presente' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : p.status === 'ausente_justificado' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200';
                    
                    const thermo = THERMOMETER.find(t => t.value === p.termometro);

                    return (
                      <div key={p.id} className="rounded-xl border bg-card p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{p.membroNome}</span>
                          <span className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full border", statusColor)}>
                            {statusText}
                          </span>
                        </div>
                        
                        {(thermo || p.pedidoOracao || p.observacaoCuidado) && (
                          <div className="pl-2 border-l-2 border-muted text-xs space-y-1.5 mt-1">
                            {thermo && (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Termômetro:</span>
                                <span>{thermo.emoji} {thermo.label}</span>
                              </div>
                            )}
                            {p.pedidoOracao && (
                              <div>
                                <span className="text-muted-foreground block font-medium">Pedido de Oração:</span>
                                <span className="text-foreground/80 italic">"{p.pedidoOracao}"</span>
                              </div>
                            )}
                            {p.observacaoCuidado && (
                              <div>
                                <span className="text-muted-foreground block font-medium">Observação de Cuidado:</span>
                                <span className="text-foreground/80">"{p.observacaoCuidado}"</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />
            <div className="pt-4 flex flex-col gap-2">
              <Button variant="outline" className="w-full gap-2" asChild>
                <Link href={`/dashboard/gc/report?cellId=${selectedLog.cellId}`}>
                  <Pencil className="h-4 w-4" /> Editar Relatório
                </Link>
              </Button>
              <Button
                variant="destructive"
                className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleDeleteLog(selectedLog.id)}
                disabled={isDeletingLog}
              >
                {isDeletingLog ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Excluir Relatório
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>

    {/* ── DIALOG DE CONFIGURAÇÃO DE REGRAS DO RADAR ──────────────────── */}
    <Dialog open={isRulesDialogOpen} onOpenChange={setIsRulesDialogOpen}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Configurar Regras do Radar de Faltas
          </DialogTitle>
          <DialogDescription>
            Defina a quantidade de faltas seguidas sem justificativa para acionar cada nível de alerta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 🟡 Atenção */}
          <div className="space-y-1.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <Label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500" /> 🟡 Nível "Atenção" (Faltas consecutivas)
            </Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={tempRules.minAtencao}
              onChange={e => setTempRules({ ...tempRules, minAtencao: parseInt(e.target.value) || 1 })}
              className="bg-white font-bold"
            />
            <p className="text-[11px] text-amber-700">Aciona quando o membro completa esta quantidade de faltas.</p>
          </div>

          {/* 🔴 Alerta (Luz Vermelha) */}
          <div className="space-y-1.5 p-3 rounded-lg bg-red-50 border border-red-200">
            <Label className="text-xs font-bold text-red-900 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-red-500" /> 🔴 Nível "Alerta / Luz Vermelha" (De X até Y faltas)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold">Mínimo de faltas:</span>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={tempRules.minAlerta}
                  onChange={e => setTempRules({ ...tempRules, minAlerta: parseInt(e.target.value) || 1 })}
                  className="bg-white font-bold"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold">Máximo de faltas:</span>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={tempRules.maxAlerta}
                  onChange={e => setTempRules({ ...tempRules, maxAlerta: parseInt(e.target.value) || 1 })}
                  className="bg-white font-bold"
                />
              </div>
            </div>
          </div>

          {/* ⚪ Risco de Desistência */}
          <div className="space-y-1.5 p-3 rounded-lg bg-neutral-100 border border-neutral-300">
            <Label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-neutral-600" /> ⚪ Nível "Desistência" (&gt; Y faltas)
            </Label>
            <p className="text-xs text-neutral-600 font-semibold">
              Acionado automaticamente quando o membro ultrapassar <strong>{tempRules.maxAlerta} faltas consecutivas</strong>.
            </p>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancelar</Button>
          </DialogClose>
          <Button size="sm" onClick={handleSaveRules} className="font-bold">Salvar Regras</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}

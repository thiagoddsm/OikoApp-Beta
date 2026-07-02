'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, writeBatch, Timestamp, serverTimestamp, getDocs, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Loader2, Send, Users, Heart, BarChart2, MessageSquare,
  ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle,
  Flame, HandHeart, UserX, UserCheck, History, BotMessageSquare, Trash2
} from 'lucide-react';
import { triggerGcReportForCell } from '@/app/actions/whatsapp-actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { format, parseISO } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────
type PresenceStatus = 'presente' | 'ausente_justificado' | 'ausente_sem_justificativa' | 'visitante';

type MemberAttendance = {
  membroId: string;
  membroNome: string;
  status: PresenceStatus;
  termometro: number | null;
  pedidoOracao: string;
  observacaoCuidado: string;
};

type Cell = {
  id: string;
  nome: string;
  liderId: string;
  coLiderIds?: string[];
  secretariaId?: string;
  supervisorId?: string;
  meetingDay?: string;
  membros: string[];
  visitors?: {
    id: string;
    name: string;
    phone?: string;
    firstVisitDate?: string;
    origin?: string;
    consolidationStatus?: string;
  }[];
};

// ─── Utilitário: última data de reunião ────────────────────────────────────────
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

type UserProfile = {
  id: string;
  name: string;
  photoURL?: string;
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: PresenceStatus; label: string; icon: React.ReactNode; activeClass: string }[] = [
  { value: 'presente',                  label: 'Presente',   icon: <UserCheck className="h-4 w-4" />, activeClass: 'bg-emerald-500 text-white border-emerald-500' },
  { value: 'ausente_justificado',       label: 'Justificado', icon: <AlertTriangle className="h-4 w-4" />, activeClass: 'bg-amber-500 text-white border-amber-500' },
  { value: 'ausente_sem_justificativa', label: 'Faltou',     icon: <UserX className="h-4 w-4" />, activeClass: 'bg-red-500 text-white border-red-500' },
];

// ─── Steps ───────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Chamada',    icon: <Users className="h-4 w-4" /> },
  { id: 2, label: 'Cuidado',   icon: <Heart className="h-4 w-4" /> },
  { id: 3, label: 'Métricas',  icon: <BarChart2 className="h-4 w-4" /> },
  { id: 4, label: 'Feedback',  icon: <MessageSquare className="h-4 w-4" /> },
];

// ─── Termômetro ───────────────────────────────────────────────────────────────
const THERMOMETER = [
  { value: 1, label: 'Precisa de cuidado', emoji: '😔', color: 'bg-red-100 border-red-400 text-red-700' },
  { value: 2, label: 'Desanimado',         emoji: '😕', color: 'bg-orange-100 border-orange-400 text-orange-700' },
  { value: 3, label: 'Estável',            emoji: '😊', color: 'bg-yellow-100 border-yellow-400 text-yellow-700' },
  { value: 4, label: 'Bem',                emoji: '😄', color: 'bg-lime-100 border-lime-400 text-lime-700' },
  { value: 5, label: 'Radiante',           emoji: '🔥', color: 'bg-emerald-100 border-emerald-500 text-emerald-700' },
];

// ─── Step 1: Chamada ──────────────────────────────────────────────────────────
function StepChamada({ members, attendance, onChange }: {
  members: UserProfile[];
  attendance: MemberAttendance[];
  onChange: (id: string, field: keyof MemberAttendance, value: any) => void;
}) {
  return (
    <div className="space-y-3">
      {members.map(member => {
        const att = attendance.find(a => a.membroId === member.id);
        if (!att) return null; // ainda inicializando

        const isAbsent = att.status === 'ausente_justificado' || att.status === 'ausente_sem_justificativa';

        return (
          <div key={member.id} className="rounded-xl border bg-card p-3 space-y-2">
            {/* Nome + botões */}
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border flex-shrink-0">
                {member.photoURL && <img src={member.photoURL} className="h-full w-full object-cover rounded-full" alt={member.name} />}
                <AvatarFallback className="text-xs font-bold">{member.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm flex-1 truncate">{member.name}</span>
              <div className="flex gap-1 flex-shrink-0">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(member.id, 'status', opt.value)}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-all min-h-[44px]',
                      att.status === opt.value ? opt.activeClass : 'border-border text-muted-foreground hover:bg-muted'
                    )}
                    title={opt.label}
                  >
                    {opt.icon}
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Campo de observação — só aparece se ausente */}
            {isAbsent && (
              <div className="pl-12">
                <Input
                  placeholder="Observação de cuidado (opcional)..."
                  value={att.observacaoCuidado}
                  onChange={e => onChange(member.id, 'observacaoCuidado', e.target.value)}
                  className="text-sm h-9"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 2: Termômetro & Oração ─────────────────────────────────────────────
function StepCuidado({ members, attendance, onChange }: {
  members: UserProfile[];
  attendance: MemberAttendance[];
  onChange: (id: string, field: keyof MemberAttendance, value: any) => void;
}) {
  const presentMembers = members.filter(m =>
    attendance.find(a => a.membroId === m.id)?.status === 'presente'
  );
  const [expanded, setExpanded] = useState<string[]>([]);

  if (presentMembers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Heart className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>Nenhum membro marcado como presente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {presentMembers.map(member => {
        const att = attendance.find(a => a.membroId === member.id)!;
        const isExpanded = expanded.includes(member.id);

        return (
          <div key={member.id} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 border flex-shrink-0">
                {member.photoURL && <img src={member.photoURL} className="h-full w-full object-cover rounded-full" alt={member.name} />}
                <AvatarFallback className="text-xs font-bold">{member.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm">{member.name}</span>
            </div>

            {/* Termômetro */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Como estava espiritualmente/emocionalmente?</p>
              <div className="flex gap-2 flex-wrap">
                {THERMOMETER.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => onChange(member.id, 'termometro', att.termometro === t.value ? null : t.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all min-h-[52px] min-w-[52px]',
                      att.termometro === t.value ? t.color + ' font-bold' : 'border-border hover:bg-muted'
                    )}
                    title={t.label}
                  >
                    <span className="text-lg leading-none">{t.emoji}</span>
                    <span className="text-[10px] leading-none hidden sm:block">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pedido de oração — expansível */}
            <div>
              <button
                type="button"
                onClick={() => setExpanded(prev => isExpanded ? prev.filter(id => id !== member.id) : [...prev, member.id])}
                className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
              >
                <HandHeart className="h-3.5 w-3.5" />
                {isExpanded ? 'Ocultar pedido de oração' : att.pedidoOracao ? '✅ Pedido registrado — editar' : 'Registrar pedido de oração'}
              </button>
              {isExpanded && (
                <Textarea
                  className="mt-2 text-sm"
                  rows={2}
                  placeholder="Anote o pedido de oração desta pessoa..."
                  value={att.pedidoOracao}
                  onChange={e => onChange(member.id, 'pedidoOracao', e.target.value)}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 3: Métricas ─────────────────────────────────────────────────────────
function StepMetricas({ data, onChange, reportDate, onDateChange }: {
  data: { visitantes: string; conversoes: number; licao: string };
  onChange: (field: string, value: any) => void;
  reportDate: string;
  onDateChange: (d: string) => void;
}) {
  const visitantesCount = data.visitantes
    .split(',')
    .map(v => v.trim())
    .filter(v => v.length > 0).length;
  return (
    <div className="space-y-5">
      <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
        <p className="text-xs text-slate-500 font-bold uppercase">Data da Reunião Selecionada</p>
        <p className="text-sm font-semibold text-slate-800">📅 {reportDate ? format(parseISO(reportDate), "dd/MM/yyyy") : "—"}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="licao">Lição / Tema da Reunião</Label>
        <Input id="licao" value={data.licao} onChange={e => onChange('licao', e.target.value)} placeholder="Ex: Lição 5 – O Poder da Oração" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="visitantes">Visitantes (nomes, separados por vírgula)</Label>
          {visitantesCount > 0 && (
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {visitantesCount} visitante{visitantesCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <Textarea id="visitantes" value={data.visitantes} onChange={e => onChange('visitantes', e.target.value)} placeholder="Ex: Maria, José, Ana" rows={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="conversoes">Conversões</Label>
        <Input id="conversoes" type="number" min={0} value={data.conversoes} onChange={e => onChange('conversoes', Number(e.target.value))} />
      </div>
    </div>
  );
}

// ─── Step 4: Feedback ─────────────────────────────────────────────────────────
function StepFeedback({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Esta mensagem será lida pelo seu supervisor. Seja honesto — ele está aqui para te apoiar! 💪
      </p>
      <Textarea
        rows={5}
        placeholder="Como você se sentiu liderando esta semana? Precisa de ajuda com algo? Tem algo que quer compartilhar com seu supervisor?"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-sm resize-none"
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CellReportPage() {
  const { user, isUserLoading, firestore } = useFirebase();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const preselectedCellId = searchParams.get('cellId');
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [isTriggeringWhatsApp, setIsTriggeringWhatsApp] = useState(false);

  const handleTriggerWhatsApp = async () => {
    if (!cell?.id) return;
    setIsTriggeringWhatsApp(true);
    try {
      const res = await triggerGcReportForCell(cell.id);
      if (res.success) {
        toast({ title: '✅ Bot acionado!', description: 'Você receberá uma mensagem no WhatsApp em instantes para preencher o relatório.' });
      } else {
        toast({ variant: 'destructive', title: 'Erro ao acionar Bot', description: res.error || 'Erro desconhecido.' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao acionar Bot', description: e.message });
    } finally {
      setIsTriggeringWhatsApp(false);
    }
  };

  // Role do usuário logado
  const { data: userData } = useDoc<{ hierarchy?: { role?: string } }>(
    user ? `users/${user.uid}` : null
  );
  const userRole = userData?.hierarchy?.role;
  const isSupervisor = ['lider_area', 'lider_rede', 'pastor_senior', 'admin'].includes(userRole || '');

  // Células onde o usuário é líder, co-líder ou secretaria
  const cellsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'cells'), where('liderId', '==', user.uid));
  }, [firestore, user]);

  const coLiderQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'cells'), where('coLiderIds', 'array-contains', user.uid));
  }, [firestore, user]);

  const secretariaQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'cells'), where('secretariaId', '==', user.uid));
  }, [firestore, user]);

  // Supervisores veem todas as células
  const allCellsQuery = useMemoFirebase(() => {
    if (!firestore || !isSupervisor) return null;
    return query(collection(firestore, 'cells'));
  }, [firestore, isSupervisor]);

  const { data: leaderCells, isLoading: l1 } = useCollection<Cell>(cellsQuery);
  const { data: coLiderCells, isLoading: l2 } = useCollection<Cell>(coLiderQuery);
  const { data: secretariaCells, isLoading: l3 } = useCollection<Cell>(secretariaQuery);
  const { data: allCellsDocs, isLoading: lSuper } = useCollection<Cell>(allCellsQuery);

  const allCells = useMemo(() => {
    if (isSupervisor && allCellsDocs?.length) return allCellsDocs;
    const seen = new Set<string>();
    return [...(leaderCells || []), ...(coLiderCells || []), ...(secretariaCells || [])].filter(c => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [isSupervisor, allCellsDocs, leaderCells, coLiderCells, secretariaCells]);

  const [selectedCellId, setSelectedCellId] = useState<string>('');
  const cell = useMemo(() => {
    if (preselectedCellId) return allCells.find(c => c.id === preselectedCellId) || allCells[0];
    return allCells.find(c => c.id === selectedCellId) || allCells[0];
  }, [allCells, selectedCellId, preselectedCellId]);

  // Data da reunião — calculada automaticamente pelo dia do GC
  const [reportDate, setReportDate] = useState('');
  useEffect(() => {
    setReportDate(getLastMeetingDate(cell?.meetingDay));
  }, [cell?.id, cell?.meetingDay]);

  // Membros da célula — lidos por hierarchy.celulaId, igual à tela de Membros do GC.
  // Isso garante que todos os membros aparecem, mesmo que cell.membros[] esteja desatualizado.
  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !cell?.id) return null;
    return query(collection(firestore, 'users'), where('hierarchy.celulaId', '==', cell.id));
  }, [firestore, cell?.id]);
  const { data: members, isLoading: l4 } = useCollection<UserProfile>(membersQuery);


  const recentLogsQuery = useMemoFirebase(() => {
    if (!firestore || !cell) return null;
    return query(collection(firestore, 'reuniao_logs'), where('cellId', '==', cell.id));
  }, [firestore, cell]);

  const { data: rawRecentLogs, isLoading: isLoadingRecentLogs } = useCollection<any>(recentLogsQuery);

  const recentLogs = useMemo(() => {
    if (!rawRecentLogs) return [];
    return [...rawRecentLogs]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [rawRecentLogs]);

  const handleEditLog = async (log: any) => {
    if (!firestore) return;
    setEditingLogId(log.id);
    setReportDate(log.date);
    setMetricas({
      licao: log.licaoMinistrada || '',
      visitantes: log.visitantesNomes || '',
      conversoes: log.metricas?.conversoes || 0,
    });
    setFeedback(log.feedbackAoSupervisor || '');

    try {
      const presDocs = await getDocs(
        query(
          collection(firestore, 'presencas_historico'),
          where('reuniaoLogId', '==', log.id)
        )
      );
      
      const presList: MemberAttendance[] = [];
      presDocs.forEach(d => {
        const data = d.data();
        presList.push({
          membroId: data.membroId,
          membroNome: data.membroNome,
          status: data.status,
          termometro: data.termometro || null,
          pedidoOracao: data.pedidoOracao || '',
          observacaoCuidado: data.observacaoCuidado || '',
        });
      });

      if (members) {
        const finalAttendance = members.map(m => {
          const match = presList.find(p => p.membroId === m.id);
          if (match) return match;
          return {
            membroId: m.id,
            membroNome: m.name,
            status: 'presente' as const,
            termometro: null,
            pedidoOracao: '',
            observacaoCuidado: '',
          };
        });
        setAttendance(finalAttendance);
      }
      
      setStep(1);
      toast({ title: 'Relatório carregado!', description: 'Você pode editar as informações e salvar novamente.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao carregar presenças', description: err.message });
    }
  };

  const handleDeleteLog = async () => {
    if (!editingLogId) return;
    if (!confirm('Tem certeza que deseja excluir este relatório permanentemente? Essa ação não pode ser desfeita.')) return;
    
    setIsSubmitting(true);
    try {
      const batch = writeBatch(firestore);
      batch.delete(doc(firestore, 'reuniao_logs', editingLogId));
      
      const oldPresDocs = await getDocs(
        query(collection(firestore, 'presencas_historico'), where('reuniaoLogId', '==', editingLogId))
      );
      oldPresDocs.forEach(d => batch.delete(d.ref));
      
      await batch.commit();
      toast({ title: 'Relatório excluído', description: 'O relatório foi removido com sucesso.' });
      setEditingLogId(null);
      setReportDate(getLastMeetingDate(cell?.meetingDay));
      setMetricas({ licao: '', visitantes: '', conversoes: 0 });
      setFeedback('');
      if (members) {
        setAttendance(members.map(m => ({
          membroId: m.id,
          membroNome: m.name,
          status: 'presente',
          termometro: null,
          pedidoOracao: '',
          observacaoCuidado: '',
        })));
      }
      setStep(1);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao excluir', description: 'Ocorreu um erro ao excluir o relatório.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Estado da chamada
  const [attendance, setAttendance] = useState<MemberAttendance[]>([]);

  // Inicializa attendance quando membros carregam
  React.useEffect(() => {
    if (members) {
      setAttendance(members.map(m => ({
        membroId: m.id,
        membroNome: m.name,
        status: 'presente',
        termometro: null,
        pedidoOracao: '',
        observacaoCuidado: '',
      })));
    }
  }, [members]);

  // Estado das métricas
  const [metricas, setMetricas] = useState({ visitantes: '', conversoes: 0, licao: '' });
  const [feedback, setFeedback] = useState('');

  const handleAttendanceChange = (id: string, field: keyof MemberAttendance, value: any) => {
    setAttendance(prev => prev.map(a => a.membroId === id ? { ...a, [field]: value } : a));
  };

  const handleMetricasChange = (field: string, value: any) => {
    setMetricas(prev => ({ ...prev, [field]: value }));
  };

  const presentes = attendance.filter(a => a.status === 'presente').length;
  const ausentesJust = attendance.filter(a => a.status === 'ausente_justificado').length;
  const ausentesSemJust = attendance.filter(a => a.status === 'ausente_sem_justificativa').length;
  const visitantesCount = metricas.visitantes.split(',').filter(v => v.trim()).length;

  const handleSubmit = async () => {
    if (!firestore || !cell || !user) return;
    setIsSubmitting(true);

    try {
      const batch = writeBatch(firestore);
      const now = Timestamp.now();
      const dateStr = reportDate || new Date().toISOString().split('T')[0];

      // Documento principal da reunião
      const logRef = editingLogId
        ? doc(firestore, 'reuniao_logs', editingLogId)
        : doc(collection(firestore, 'reuniao_logs'));

      const logData = {
        cellId: cell.id,
        cellNome: cell.nome,
        date: dateStr,
        liderId: user.uid,
        supervisorId: cell.supervisorId || null,
        metricas: {
          totalMembrosAtivos: members?.length || 0,
          presentes,
          ausentesJustificados: ausentesJust,
          ausentesSemJustificativa: ausentesSemJust,
          visitantes: visitantesCount,
          conversoes: metricas.conversoes,
        },
        licaoMinistrada: metricas.licao,
        visitantesNomes: metricas.visitantes,
        feedbackAoSupervisor: feedback,
        updatedAt: now,
      };

      if (editingLogId) {
        batch.update(logRef, logData);

        // Deletar presenças antigas do relatório
        const oldPresDocs = await getDocs(
          query(
            collection(firestore, 'presencas_historico'),
            where('reuniaoLogId', '==', editingLogId)
          )
        );
        oldPresDocs.forEach(d => {
          batch.delete(d.ref);
        });
      } else {
        batch.set(logRef, {
          ...logData,
          createdAt: now,
        });
      }

      // Um documento por membro em presencas_historico
      attendance.forEach(att => {
        const presRef = doc(collection(firestore, 'presencas_historico'));
        batch.set(presRef, {
          reuniaoLogId: logRef.id,
          cellId: cell.id,
          membroId: att.membroId,
          membroNome: att.membroNome,
          date: dateStr,
          status: att.status,
          termometro: att.termometro,
          pedidoOracao: att.pedidoOracao || null,
          observacaoCuidado: att.observacaoCuidado || null,
          createdAt: now,
        });
      });

      // Adiciona novos visitantes à célula
      const visitantesNomesArray = metricas.visitantes
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);

      const existingVisitors = cell.visitors || [];
      const updatedVisitors = [...existingVisitors];
      let cellUpdated = false;

      visitantesNomesArray.forEach((nome, index) => {
        const exists = existingVisitors.some(
          v => v.name.toLowerCase() === nome.toLowerCase()
        );
        if (!exists) {
          updatedVisitors.push({
            id: `v_${Date.now()}_${index}`,
            name: nome,
            phone: '',
            firstVisitDate: new Date().toISOString(),
            origin: 'Relatório de Célula',
            consolidationStatus: 'new',
          });
          cellUpdated = true;
        }
      });

      if (cellUpdated) {
        const cellRef = doc(firestore, 'cells', cell.id);
        batch.update(cellRef, { visitors: updatedVisitors });
      }

      await batch.commit();
      setSubmitted(true);
      toast({ title: '✅ Relatório enviado!', description: 'Obrigado pela sua dedicação, líder!' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao enviar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isUserLoading || l1 || l2 || l3 || l4 || lSuper;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Carregando dados da célula...</p>
      </div>
    );
  }

  if (allCells.length === 0) {
    return (
      <Card className="max-w-lg mx-auto mt-8">
        <CardHeader className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-2" />
          <CardTitle>Nenhuma Célula Vinculada</CardTitle>
          <CardDescription>
            Você não está registrado como líder ou co-líder de nenhuma célula. Entre em contato com seu supervisor.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-black text-foreground">Relatório Enviado!</h2>
        <p className="text-muted-foreground max-w-sm">
          Seu relatório da célula <strong>{cell?.nome}</strong> foi salvo com sucesso. Que Deus abençoe sua dedicação! 🙏
        </p>
        <Button onClick={() => { setSubmitted(false); setEditingLogId(null); setStep(1); setFeedback(''); setMetricas({ visitantes: '', conversoes: 0, licao: '' }); }}>
          Enviar outro relatório
        </Button>
      </div>
    );
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Relatório Semanal</h1>
          {allCells.length > 1 ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">Célula:</span>
              <select
                className="text-sm font-semibold text-primary bg-transparent border-b border-primary outline-none cursor-pointer"
                value={cell?.id}
                onChange={e => setSelectedCellId(e.target.value)}
              >
                {allCells.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">Célula: <strong>{cell?.nome}</strong></p>
          )}
        </div>
        
        {/* Botão do WhatsApp */}
        <Button 
          variant="outline" 
          onClick={handleTriggerWhatsApp}
          disabled={isTriggeringWhatsApp}
          className="flex items-center gap-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 text-emerald-600 font-bold transition-all shadow-sm"
        >
          {isTriggeringWhatsApp ? <Loader2 className="h-4 w-4 animate-spin" /> : <BotMessageSquare className="h-4 w-4" />}
          {isTriggeringWhatsApp ? 'Acionando...' : 'Preencher via WhatsApp'}
        </Button>
      </div>

      {/* Relatórios Recentes */}
      {recentLogs.length > 0 && (
        <Card className="border border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
              <History className="h-4 w-4 text-indigo-600" />
              Relatórios Recentes (Selecione para Editar/Ver)
            </CardTitle>
            <CardDescription className="text-xs">
              Edite um relatório anterior a partir dos dados já salvos.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex flex-wrap gap-2">
              {recentLogs.map((log: any) => {
                const isSelected = editingLogId === log.id;
                const formattedDate = format(parseISO(log.date), "dd/MM/yyyy");
                return (
                  <Button
                    key={log.id}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className="text-xs gap-1 h-8"
                    onClick={() => handleEditLog(log)}
                  >
                    <span>📅 {formattedDate}</span>
                    {log.licaoMinistrada && <span className="opacity-60 max-w-[80px] truncate">— {log.licaoMinistrada}</span>}
                    {isSelected && <span className="ml-1 text-[10px] font-bold bg-white text-indigo-600 px-1 rounded">Editando</span>}
                  </Button>
                );
              })}
              {editingLogId && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:bg-slate-100 h-8"
                    onClick={() => {
                      setEditingLogId(null);
                      setReportDate(getLastMeetingDate(cell?.meetingDay));
                      setMetricas({ licao: '', visitantes: '', conversoes: 0 });
                      setFeedback('');
                      if (members) {
                        setAttendance(members.map(m => ({
                          membroId: m.id,
                          membroNome: m.name,
                          status: 'presente',
                          termometro: null,
                          pedidoOracao: '',
                          observacaoCuidado: '',
                        })));
                      }
                      setStep(1);
                    }}
                  >
                    Cancelar Edição (Novo)
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:bg-destructive/10 h-8 ml-1"
                    onClick={handleDeleteLog}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
                    Excluir Relatório
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seletor de Data/Semana */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1 animate-in fade-in duration-200">
          <Label htmlFor="mainReportDate" className="font-bold text-xs text-slate-500 uppercase">Data/Semana da Reunião</Label>
          <input
            id="mainReportDate"
            type="date"
            value={reportDate}
            onChange={e => setReportDate(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-semibold text-slate-800"
          />
        </div>
        <p className="text-[11px] text-muted-foreground max-w-xs sm:text-right">
          Selecione a data da reunião da célula. Os dados do relatório serão vinculados a esta semana.
        </p>
      </div>

      {/* Barra de progresso */}
      <div className="space-y-2">
        <div className="flex justify-between">
          {STEPS.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => step > s.id && setStep(s.id)}
              className={cn(
                'flex flex-col items-center gap-1 text-xs font-semibold transition-colors',
                step >= s.id ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className={cn(
                'h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all',
                step > s.id ? 'bg-primary border-primary text-white' :
                step === s.id ? 'border-primary text-primary bg-primary/10' : 'border-border'
              )}>
                {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.icon}
              </div>
              <span className="hidden sm:block">{s.label}</span>
            </button>
          ))}
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Conteúdo do step */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {STEPS[step - 1].icon}
            {STEPS[step - 1].label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <StepChamada members={members || []} attendance={attendance} onChange={handleAttendanceChange} />
          )}
          {step === 2 && (
            <StepCuidado members={members || []} attendance={attendance} onChange={handleAttendanceChange} />
          )}
          {step === 3 && (
            <StepMetricas data={metricas} onChange={handleMetricasChange} reportDate={reportDate} onDateChange={setReportDate} />
          )}
          {step === 4 && (
            <StepFeedback value={feedback} onChange={setFeedback} />
          )}
        </CardContent>
      </Card>

      {/* Resumo rápido (visível na etapa 1) */}
      {step === 1 && attendance.length > 0 && (
        <div className="flex items-center justify-center gap-6 text-sm">
          <span className="flex items-center gap-1 text-emerald-600 font-bold"><UserCheck className="h-4 w-4" />{presentes} presentes</span>
          <span className="flex items-center gap-1 text-amber-600 font-bold"><AlertTriangle className="h-4 w-4" />{ausentesJust} just.</span>
          <span className="flex items-center gap-1 text-red-600 font-bold"><UserX className="h-4 w-4" />{ausentesSemJust} faltaram</span>
        </div>
      )}

      {/* Navegação */}
      <div className="flex justify-between pb-8">
        <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 1}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(s => s + 1)}>
            Próximo <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar Relatório
          </Button>
        )}
      </div>
    </div>
  );
}

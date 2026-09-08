'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  Users, Heart, BarChart2, MessageSquare, 
  UserCheck, AlertTriangle, UserX, HandHeart, 
  CheckCircle2, Loader2, ArrowRight, ArrowLeft,
  Calendar, Clock, Share2, Sparkles, AlertCircle, RefreshCw, Send
} from 'lucide-react';
import { verifyLeaderAccess, submitPublicGcReport, SubmitPublicReportPayload } from './actions';

type PresenceStatus = 'presente' | 'ausente_justificado' | 'ausente_sem_justificativa';

type MemberAttendance = {
  membroId: string;
  membroNome: string;
  photoURL?: string;
  status: PresenceStatus;
  termometro: number | null;
  pedidoOracao: string;
  observacaoCuidado: string;
};

const STATUS_OPTIONS: { value: PresenceStatus; label: string; icon: React.ReactNode; activeClass: string }[] = [
  { value: 'presente',                  label: 'Presente',    icon: <UserCheck className="h-4 w-4" />,      activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-sm' },
  { value: 'ausente_justificado',       label: 'Justificado', icon: <AlertTriangle className="h-4 w-4" />,  activeClass: 'bg-amber-500 text-white border-amber-500 shadow-sm' },
  { value: 'ausente_sem_justificativa', label: 'Faltou',      icon: <UserX className="h-4 w-4" />,          activeClass: 'bg-red-600 text-white border-red-600 shadow-sm' },
];

const STEPS = [
  { id: 1, label: 'Chamada',   icon: <Users className="h-4 w-4" /> },
  { id: 2, label: 'Cuidado',   icon: <Heart className="h-4 w-4" /> },
  { id: 3, label: 'Métricas',  icon: <BarChart2 className="h-4 w-4" /> },
  { id: 4, label: 'Feedback',  icon: <MessageSquare className="h-4 w-4" /> },
];

const THERMOMETER = [
  { value: 1, label: 'Precisa de cuidado', emoji: '😔', color: 'bg-red-100 border-red-500 text-red-700' },
  { value: 2, label: 'Desanimado',         emoji: '😕', color: 'bg-orange-100 border-orange-500 text-orange-700' },
  { value: 3, label: 'Estável',            emoji: '😊', color: 'bg-yellow-100 border-yellow-500 text-yellow-700' },
  { value: 4, label: 'Bem',                emoji: '😄', color: 'bg-lime-100 border-lime-500 text-lime-700' },
  { value: 5, label: 'Radiante',           emoji: '🔥', color: 'bg-emerald-100 border-emerald-500 text-emerald-700' },
];

function PublicGcReportContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const cellIdParam = searchParams.get('cellId') || undefined;
  const emailParam = searchParams.get('email') || '';

  // Auth / Identification State
  const [emailInput, setEmailInput] = useState(emailParam);
  const [isVerifying, setIsVerifying] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);
  const [activeCell, setActiveCell] = useState<any>(null);
  const [availableCells, setAvailableCells] = useState<any[]>([]);

  // Form State
  const [meetingStatus, setMeetingStatus] = useState<'realizada' | 'postponed' | 'cancelled'>('realizada');
  const [postponedDate, setPostponedDate] = useState('');
  const [cancelledReason, setCancelledReason] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  // Steps
  const [currentStep, setCurrentStep] = useState(1);
  const [attendance, setAttendance] = useState<MemberAttendance[]>([]);
  const [expandedCare, setExpandedCare] = useState<string[]>([]);

  // Metrics
  const [licao, setLicao] = useState('');
  const [visitantes, setVisitantes] = useState('');
  const [conversoes, setConversoes] = useState<number>(0);
  const [oferta, setOferta] = useState<number | ''>('');
  const [feedback, setFeedback] = useState('');

  // Submit & Success State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  // Auto-verify if email query param exists
  useEffect(() => {
    if (emailParam && !authenticatedUser && !isVerifying) {
      handleVerifyEmail(emailParam, cellIdParam);
    }
  }, [emailParam]);

  const handleVerifyEmail = async (emailToVerify?: string, targetCellId?: string) => {
    const email = (emailToVerify || emailInput).trim();
    if (!email || !email.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'E-mail inválido',
        description: 'Digite um e-mail válido para acessar o relatório.'
      });
      return;
    }

    setIsVerifying(true);
    try {
      const res = await verifyLeaderAccess(email, targetCellId || cellIdParam);
      if (!res.success) {
        toast({
          variant: 'destructive',
          title: 'Acesso não localizado',
          description: res.error || 'Não encontramos um GC associado a este e-mail.'
        });
        return;
      }

      if (res.multipleCells) {
        setAuthenticatedUser(res.user);
        setAvailableCells(res.cells);
        return;
      }

      // 1 GC selecionado
      setupCellData(res);
      toast({
        title: `Olá, ${res.user.name.split(' ')[0]}! 👋`,
        description: `Relatório aberto para o GC ${res.cell.nome}.`
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
        description: err.message || 'Falha ao comunicar com o servidor.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const setupCellData = (res: any) => {
    setAuthenticatedUser(res.user);
    setActiveCell(res.cell);
    if (res.defaultMeetingDate) {
      setReportDate(res.defaultMeetingDate);
    }

    // Inicializar lista de presença dos membros
    const initialAttendance: MemberAttendance[] = (res.members || []).map((m: any) => ({
      membroId: m.id,
      membroNome: m.name,
      photoURL: m.photoURL,
      status: 'presente',
      termometro: null,
      pedidoOracao: '',
      observacaoCuidado: ''
    }));
    setAttendance(initialAttendance);
  };

  const handleSelectCell = async (cell: any) => {
    setIsVerifying(true);
    try {
      const res = await verifyLeaderAccess(authenticatedUser.email, cell.id);
      if (res.success && !res.multipleCells) {
        setupCellData(res);
        setAvailableCells([]);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao selecionar GC', description: e.message });
    } finally {
      setIsVerifying(false);
    }
  };

  // Helper para atualizar presença
  const handleAttendanceChange = (memberId: string, field: keyof MemberAttendance, value: any) => {
    setAttendance(prev => prev.map(a => {
      if (a.membroId === memberId) {
        return { ...a, [field]: value };
      }
      return a;
    }));
  };

  // Ações em lote
  const handleMarkAllPresent = () => {
    setAttendance(prev => prev.map(a => ({ ...a, status: 'presente' })));
    toast({ title: 'Todos marcados como presentes!' });
  };

  const handleClearAttendance = () => {
    setAttendance(prev => prev.map(a => ({ ...a, status: 'ausente_sem_justificativa' })));
    toast({ title: 'Chamada limpa. Marque os presentes.' });
  };

  // Contadores
  const presentCount = useMemo(() => attendance.filter(a => a.status === 'presente').length, [attendance]);
  const absentCount = useMemo(() => attendance.filter(a => a.status !== 'presente').length, [attendance]);
  const presentMembers = useMemo(() => attendance.filter(a => a.status === 'presente'), [attendance]);
  const visitantesCount = useMemo(() => {
    return visitantes.split(',').map(v => v.trim()).filter(v => v.length > 0).length;
  }, [visitantes]);

  // Submissão do Relatório
  const handleSubmit = async () => {
    if (!activeCell || !authenticatedUser) return;

    if (meetingStatus === 'postponed' && !postponedDate.trim()) {
      toast({ variant: 'destructive', title: 'Data obrigatória', description: 'Informe para qual dia a reunião foi adiada.' });
      return;
    }

    if (meetingStatus === 'cancelled' && !cancelledReason.trim()) {
      toast({ variant: 'destructive', title: 'Motivo obrigatório', description: 'Informe o motivo do cancelamento da reunião.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: SubmitPublicReportPayload = {
        cellId: activeCell.id,
        userEmail: authenticatedUser.email,
        userId: authenticatedUser.id,
        userName: authenticatedUser.name,
        userRole: authenticatedUser.role,
        reportDate,
        status: meetingStatus,
        novaData: postponedDate,
        motivoCancelamento: cancelledReason,
        attendance: attendance.map(a => ({
          membroId: a.membroId,
          membroNome: a.membroNome,
          status: a.status,
          termometro: a.termometro,
          pedidoOracao: a.pedidoOracao,
          observacaoCuidado: a.observacaoCuidado
        })),
        metricas: {
          licao,
          visitantes,
          conversoes: Number(conversoes || 0),
          oferta: oferta ? Number(oferta) : 0
        },
        feedback
      };

      const res = await submitPublicGcReport(payload);
      if (res.success) {
        setSubmittedData({
          cellNome: activeCell.nome,
          reportDate,
          status: meetingStatus,
          presentes: presentCount,
          total: attendance.length,
          visitantes: visitantesCount,
          conversoes,
          licao,
          postponedDate,
          cancelledReason
        });
        toast({ title: '🎉 Relatório enviado!', description: 'O relatório do GC foi registrado com sucesso.' });
      } else {
        toast({ variant: 'destructive', title: 'Erro ao enviar', description: res.error || 'Falha ao salvar relatório.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro interno', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── TELA DE SUCESSO ────────────────────────────────────────────────────────
  if (submittedData) {
    const isCancelled = submittedData.status === 'cancelled';
    const isPostponed = submittedData.status === 'postponed';

    const shareText = encodeURIComponent(
      `📊 *Relatório de GC - ${submittedData.cellNome}*\n` +
      `📅 Data: ${submittedData.reportDate.split('-').reverse().join('/')}\n\n` +
      (isPostponed ? `⚠️ *Reunião Adiada* para: ${submittedData.postponedDate}\n` : '') +
      (isCancelled ? `❌ *Reunião Cancelada*. Motivo: ${submittedData.cancelledReason}\n` : '') +
      (!isCancelled && !isPostponed ? (
        `👥 *Presença:* ${submittedData.presentes} presentes de ${submittedData.total} membros\n` +
        `📖 *Lição:* ${submittedData.licao || 'Não informada'}\n` +
        `🤝 *Visitantes:* ${submittedData.visitantes}\n` +
        `🎯 *Conversões:* ${submittedData.conversoes || 0}\n`
      ) : '') +
      `\nEnviado por: ${authenticatedUser.name} (${authenticatedUser.role || 'Líder'})`
    );

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-xl border-emerald-100">
          <CardHeader className="text-center pb-2">
            <div className="size-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle2 className="size-10" />
            </div>
            <CardTitle className="text-2xl font-black text-slate-800">Relatório Registrado!</CardTitle>
            <CardDescription className="text-sm font-medium text-slate-500">
              O relatório do GC <strong className="text-slate-800">{submittedData.cellNome}</strong> foi salvo e sincronizado com a liderança.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="bg-slate-100 p-4 rounded-xl space-y-2 text-sm">
              <p className="font-bold text-slate-700 flex justify-between">
                <span>Data da Reunião:</span>
                <span>{submittedData.reportDate.split('-').reverse().join('/')}</span>
              </p>
              {!isCancelled && !isPostponed && (
                <>
                  <p className="flex justify-between text-slate-600">
                    <span>Membros Presentes:</span>
                    <span className="font-bold text-emerald-700">{submittedData.presentes} / {submittedData.total}</span>
                  </p>
                  <p className="flex justify-between text-slate-600">
                    <span>Visitantes:</span>
                    <span className="font-bold text-slate-800">{submittedData.visitantes}</span>
                  </p>
                  <p className="flex justify-between text-slate-600">
                    <span>Decisões por Cristo:</span>
                    <span className="font-bold text-indigo-700">{submittedData.conversoes || 0}</span>
                  </p>
                </>
              )}
              {isPostponed && (
                <p className="text-amber-700 font-semibold">Reagendada para: {submittedData.postponedDate}</p>
              )}
              {isCancelled && (
                <p className="text-red-700 font-semibold">Motivo: {submittedData.cancelledReason}</p>
              )}
            </div>

            <div className="space-y-3">
              <Button
                asChild
                className="w-full h-12 font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md flex items-center justify-center gap-2"
              >
                <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener noreferrer">
                  <Share2 className="size-5" /> Enviar Resumo no WhatsApp do Supervisor
                </a>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setSubmittedData(null);
                  setCurrentStep(1);
                  setMeetingStatus('realizada');
                }}
                className="w-full h-11 text-slate-600 font-semibold"
              >
                <RefreshCw className="mr-2 size-4" /> Lançar Outro Relatório
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── TELA 1: IDENTIFICAÇÃO DO LÍDER/SECRETÁRIO ──────────────────────────────
  if (!activeCell) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-slate-200">
          <CardHeader className="text-center pb-2">
            <div className="size-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Users className="size-6" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-slate-800">
              Relatório de GC
            </CardTitle>
            <CardDescription className="text-sm font-medium text-slate-500">
              Acesso rápido para Líderes, Co-líderes e Secretários registrarem a reunião semanal.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {availableCells.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-600 uppercase">
                  Identificamos mais de um GC no seu cadastro. Escolha qual deseja relatar:
                </p>
                {availableCells.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCell(c)}
                    className="w-full p-4 rounded-xl border-2 border-slate-200 hover:border-primary bg-white text-left transition-all hover:shadow-md flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-bold text-base text-slate-800 group-hover:text-primary transition-colors">
                        {c.nome}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        Função: <strong className="text-slate-700">{c.role}</strong> {c.meetingDay ? `• ${c.meetingDay}` : ''}
                      </p>
                    </div>
                    <ArrowRight className="size-5 text-slate-400 group-hover:text-primary transition-transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleVerifyEmail(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-black uppercase text-slate-700">
                    Seu E-mail Cadastrado
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemplo@gmail.com"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    className="h-12 text-base"
                    autoFocus
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    💡 Não é necessário senha. Apenas confirme seu e-mail de líder ou secretário.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isVerifying || !emailInput}
                  className="w-full h-12 font-black text-base shadow-lg transition-all"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 size-5 animate-spin" /> Verificando...
                    </>
                  ) : (
                    <>
                      Acessar Relatório <ArrowRight className="ml-2 size-5" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── TELA 2: FORMULÁRIO DO RELATÓRIO COMPLETO ───────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Top Header */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {activeCell.nome}
            </span>
            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
              Por: <strong className="text-slate-800">{authenticatedUser.name}</strong> ({authenticatedUser.role || 'Líder'})
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveCell(null)}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            Trocar
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        {/* Card de Configuração da Reunião (Status e Data) */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Label className="text-xs font-black uppercase text-slate-700">Data da Reunião</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="size-4 text-slate-400" />
                  <Input
                    type="date"
                    value={reportDate}
                    onChange={e => setReportDate(e.target.value)}
                    className="h-10 w-44 font-semibold text-sm"
                  />
                </div>
              </div>

              {/* Status Toggle */}
              <div>
                <Label className="text-xs font-black uppercase text-slate-700 block mb-1">Status da Reunião</Label>
                <div className="flex gap-1.5 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setMeetingStatus('realizada')}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-bold transition-all',
                      meetingStatus === 'realizada' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    ✅ Realizada
                  </button>
                  <button
                    type="button"
                    onClick={() => setMeetingStatus('postponed')}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-bold transition-all',
                      meetingStatus === 'postponed' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    📅 Adiada
                  </button>
                  <button
                    type="button"
                    onClick={() => setMeetingStatus('cancelled')}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-bold transition-all',
                      meetingStatus === 'cancelled' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    ❌ Cancelada
                  </button>
                </div>
              </div>
            </div>

            {/* Campos condicionais se Adiada ou Cancelada */}
            {meetingStatus === 'postponed' && (
              <div className="pt-3 border-t border-amber-200 bg-amber-50/50 -mx-4 -mb-4 p-4 rounded-b-xl space-y-2">
                <Label className="text-xs font-bold text-amber-900">
                  Para qual dia a reunião foi adiada?
                </Label>
                <Input
                  placeholder="Ex: Sexta-feira 25/08 às 20h"
                  value={postponedDate}
                  onChange={e => setPostponedDate(e.target.value)}
                  className="bg-white text-sm h-10"
                />
              </div>
            )}

            {meetingStatus === 'cancelled' && (
              <div className="pt-3 border-t border-red-200 bg-red-50/50 -mx-4 -mb-4 p-4 rounded-b-xl space-y-2">
                <Label className="text-xs font-bold text-red-900">
                  Qual foi o motivo do cancelamento?
                </Label>
                <Input
                  placeholder="Ex: Feriado prolongado / Encontro de casais da igreja"
                  value={cancelledReason}
                  onChange={e => setCancelledReason(e.target.value)}
                  className="bg-white text-sm h-10"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Se Realizada: Stepper dos 4 Passos idênticos ao site */}
        {meetingStatus === 'realizada' ? (
          <div className="space-y-6">
            {/* Stepper Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/80 rounded-xl shadow-inner">
              {STEPS.map(s => {
                const isActive = currentStep === s.id;
                const isPast = currentStep > s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setCurrentStep(s.id)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all',
                      isActive ? 'bg-white text-primary shadow-xs' : isPast ? 'text-slate-700 hover:bg-white/50' : 'text-slate-400 hover:bg-white/30'
                    )}
                  >
                    {s.icon}
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ─── PASSO 1: CHAMADA DE MEMBROS ─── */}
            {currentStep === 1 && (
              <div className="space-y-4">
                {/* Barra de Ações Rápidas & Totalizadores */}
                <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-black">
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md">
                      {presentCount} Presentes
                    </span>
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-md">
                      {absentCount} Ausentes
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleMarkAllPresent}
                      className="text-xs h-8 text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                    >
                      Todos Presentes
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleClearAttendance}
                      className="text-xs h-8 text-slate-500 hover:text-slate-800"
                    >
                      Limpar
                    </Button>
                  </div>
                </div>

                {/* Lista de Membros */}
                <div className="space-y-2.5">
                  {attendance.map((att, idx) => {
                    const isAbsent = att.status === 'ausente_justificado' || att.status === 'ausente_sem_justificativa';

                    return (
                      <div
                        key={att.membroId}
                        className={cn(
                          'rounded-xl border bg-white p-3.5 space-y-3 transition-all shadow-2xs',
                          att.status === 'presente' ? 'border-slate-200' : 'border-amber-200 bg-amber-50/20'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border shrink-0">
                            {att.photoURL && <AvatarImage src={att.photoURL} alt={att.membroNome} />}
                            <AvatarFallback className="text-xs font-black bg-slate-100 text-slate-700">
                              {att.membroNome.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-slate-800 truncate">{att.membroNome}</p>
                            <span className="text-[11px] text-slate-400 font-medium">Membro #{idx + 1}</span>
                          </div>

                          {/* Botões de Presença */}
                          <div className="flex gap-1 shrink-0">
                            {STATUS_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleAttendanceChange(att.membroId, 'status', opt.value)}
                                className={cn(
                                  'flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all min-h-[40px]',
                                  att.status === opt.value
                                    ? opt.activeClass
                                    : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                                )}
                                title={opt.label}
                              >
                                {opt.icon}
                                <span className="hidden sm:inline">{opt.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Campo de observação / justificativa — exibido se ausente */}
                        {isAbsent && (
                          <div className="pt-2 border-t border-slate-100">
                            <Input
                              placeholder="Observação de cuidado ou justificativa (opcional)..."
                              value={att.observacaoCuidado}
                              onChange={e => handleAttendanceChange(att.membroId, 'observacaoCuidado', e.target.value)}
                              className="text-xs h-9 bg-white"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── PASSO 2: CUIDADO & ORAÇÃO ─── */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 p-3.5 rounded-xl text-xs text-primary font-medium">
                  💡 Registre o termômetro espiritual e pedidos de oração dos membros que compareceram.
                </div>

                {presentMembers.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-dashed p-8 text-slate-400">
                    <Heart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm">Nenhum membro marcado como presente na chamada.</p>
                    <Button
                      variant="link"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs text-primary mt-1"
                    >
                      Voltar e marcar presenças
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {presentMembers.map(member => {
                      const isExpanded = expandedCare.includes(member.membroId);

                      return (
                        <div key={member.membroId} className="rounded-xl border bg-white p-4 space-y-3 shadow-2xs">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8 border shrink-0">
                              {member.photoURL && <AvatarImage src={member.photoURL} alt={member.membroNome} />}
                              <AvatarFallback className="text-xs font-bold">{member.membroNome.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-sm text-slate-800">{member.membroNome}</span>
                          </div>

                          {/* Termômetro */}
                          <div>
                            <p className="text-xs text-slate-500 mb-2 font-semibold">
                              Como estava espiritualmente ou emocionalmente?
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {THERMOMETER.map(t => (
                                <button
                                  key={t.value}
                                  type="button"
                                  onClick={() => handleAttendanceChange(
                                    member.membroId,
                                    'termometro',
                                    member.termometro === t.value ? null : t.value
                                  )}
                                  className={cn(
                                    'flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all min-h-[50px] min-w-[50px]',
                                    member.termometro === t.value ? t.color + ' font-bold' : 'border-slate-200 hover:bg-slate-50'
                                  )}
                                  title={t.label}
                                >
                                  <span className="text-lg leading-none">{t.emoji}</span>
                                  <span className="text-[10px] leading-none hidden sm:block">{t.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Pedido de Oração */}
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setExpandedCare(prev =>
                                isExpanded ? prev.filter(id => id !== member.membroId) : [...prev, member.membroId]
                              )}
                              className="flex items-center gap-1 text-xs text-primary font-bold hover:underline"
                            >
                              <HandHeart className="h-3.5 w-3.5" />
                              {isExpanded ? 'Ocultar pedido de oração' : member.pedidoOracao ? '✅ Pedido registrado — editar' : 'Registrar pedido de oração'}
                            </button>
                            {isExpanded && (
                              <Textarea
                                className="mt-2 text-sm bg-slate-50/50"
                                rows={2}
                                placeholder="Anote o pedido de oração desta pessoa..."
                                value={member.pedidoOracao}
                                onChange={e => handleAttendanceChange(member.membroId, 'pedidoOracao', e.target.value)}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ─── PASSO 3: MÉTRICAS ─── */}
            {currentStep === 3 && (
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="licao" className="text-xs font-black uppercase text-slate-700">
                      Tema da Lição Ministrada
                    </Label>
                    <Input
                      id="licao"
                      placeholder="Ex: O Poder da Oração e Comunhão"
                      value={licao}
                      onChange={e => setLicao(e.target.value)}
                      className="h-11 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="visitantes" className="text-xs font-black uppercase text-slate-700">
                        Visitantes (Nomes separados por vírgula)
                      </Label>
                      {visitantesCount > 0 && (
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {visitantesCount} visitante{visitantesCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <Textarea
                      id="visitantes"
                      placeholder="Ex: Carlos Silva, Mariana Souza"
                      rows={2}
                      value={visitantes}
                      onChange={e => setVisitantes(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="conversoes" className="text-xs font-black uppercase text-slate-700">
                        Conversões / Reconciliações
                      </Label>
                      <Input
                        id="conversoes"
                        type="number"
                        min={0}
                        value={conversoes}
                        onChange={e => setConversoes(Number(e.target.value))}
                        className="h-11 text-sm font-bold"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="oferta" className="text-xs font-black uppercase text-slate-700">
                        Valor da Oferta (R$ - Opcional)
                      </Label>
                      <Input
                        id="oferta"
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={oferta}
                        onChange={e => setOferta(e.target.value ? Number(e.target.value) : '')}
                        className="h-11 text-sm font-bold"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ─── PASSO 4: FEEDBACK AO SUPERVISOR ─── */}
            {currentStep === 4 && (
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4 sm:p-6 space-y-3">
                  <p className="text-sm text-slate-600 font-medium">
                    Esta mensagem será lida diretamente pelo seu supervisor de GC. Compartilhe testemunhos, vitórias ou necessidades do grupo! 💪
                  </p>
                  <Textarea
                    rows={5}
                    placeholder="Como você se sentiu liderando esta semana? Teve algum testemunho especial? Precisa de apoio com algum membro?"
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    className="text-sm resize-none"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Card simplificado para Adiada ou Cancelada */
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="bg-slate-100 p-4 rounded-xl text-sm font-medium text-slate-700">
                {meetingStatus === 'postponed'
                  ? 'A reunião foi marcada como ADIADA. Ao enviar, o supervisor será notificado da nova data.'
                  : 'A reunião foi marcada como CANCELADA. Ao enviar, o motivo será registrado no histórico do ciclo.'}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-700">
                  Observações adicionais para o supervisor (opcional)
                </Label>
                <Textarea
                  rows={3}
                  placeholder="Alguma informação adicional sobre o adiamento ou cancelamento?"
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* ─── BARRA DE NAVEGAÇÃO INFERIOR FIXA ─── */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 sm:p-4 z-30 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          {meetingStatus === 'realizada' && currentStep > 1 ? (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="font-bold text-xs h-11 px-4"
            >
              <ArrowLeft className="mr-1.5 size-4" /> Voltar
            </Button>
          ) : (
            <div />
          )}

          {meetingStatus === 'realizada' && currentStep < 4 ? (
            <Button
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="font-bold text-xs h-11 px-6 shadow-md"
            >
              Próximo <ArrowRight className="ml-1.5 size-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="font-black text-xs sm:text-sm h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <Send className="size-4" /> Finalizar e Enviar Relatório
                </>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

export default function PublicGcReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    }>
      <PublicGcReportContent />
    </Suspense>
  );
}

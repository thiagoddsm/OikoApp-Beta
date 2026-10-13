'use client';

import React, { useMemo, useState } from 'react';
import { useVolunteering, type Class, type OnlineException } from '@/contexts/volunteering-context';
import { useCoursesData, useMembersData } from '@/hooks/useDomainData';
import { useFirebase } from '@/firebase';
import { evaluateStudentAttendance } from '@/lib/teaching/attendance-calculator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  Filter, 
  MessageSquare, 
  User, 
  BookOpen, 
  ExternalLink,
  Calendar,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EnrichedExceptionItem {
  exception: OnlineException;
  studentId: string;
  studentUser?: any;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentPhoto?: string;
  classData: Class;
  courseData?: any;
  courseName: string;
  className: string;
  attendanceEval?: any;
}

export function OnlineExceptionsRequestsList() {
  const { classes, courses, updateClass } = useVolunteering();
  const { users } = useMembersData();
  const { user: currentUser } = useFirebase();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Estados dos modais de decisão
  const [decisionModalItem, setDecisionModalItem] = useState<EnrichedExceptionItem | null>(null);
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected' | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Mapeia todas as exceções de todas as turmas
  const allExceptions = useMemo<EnrichedExceptionItem[]>(() => {
    if (!classes) return [];

    const list: EnrichedExceptionItem[] = [];

    classes.forEach(cls => {
      if (!cls.onlineExceptions) return;

      const course = courses?.find(c => c.id === cls.courseId);

      Object.entries(cls.onlineExceptions).forEach(([studentId, ex]) => {
        if (!ex) return;
        const studentUser = users?.find(u => u.id === studentId);
        const studentName = studentUser?.name || 'Aluno Desconhecido';
        const studentEmail = studentUser?.email || '';
        const studentPhone = studentUser?.phone || '';
        const studentPhoto = studentUser?.photoURL || studentUser?.photoUrl;

        // Calcular avaliação acadêmica da frequência
        let attendanceEval: any = null;
        try {
          attendanceEval = evaluateStudentAttendance({
            classData: cls,
            courseData: course,
            studentId,
            studentUser,
            courseClasses: classes.filter(c => c.courseId === cls.courseId)
          });
        } catch (e) {
          console.error('[ExceptionsList] Erro ao calcular frequência:', e);
        }

        list.push({
          exception: ex,
          studentId,
          studentUser,
          studentName,
          studentEmail,
          studentPhone,
          studentPhoto,
          classData: cls,
          courseData: course,
          courseName: course?.name || 'Curso Desconhecido',
          className: cls.name,
          attendanceEval
        });
      });
    });

    // Ordenar: pendentes primeiro, depois por data mais recente
    return list.sort((a, b) => {
      const aIsPending = (a.exception.status || 'pending') === 'pending' ? 1 : 0;
      const bIsPending = (b.exception.status || 'pending') === 'pending' ? 1 : 0;
      if (aIsPending !== bIsPending) return bIsPending - aIsPending;

      const dateA = a.exception.requestedAt ? new Date(a.exception.requestedAt).getTime() : 0;
      const dateB = b.exception.requestedAt ? new Date(b.exception.requestedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [classes, courses, users]);

  // Contadores gerais
  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    allExceptions.forEach(item => {
      const st = item.exception.status || 'pending';
      if (st === 'pending') pending++;
      else if (st === 'approved') approved++;
      else if (st === 'rejected') rejected++;
    });

    return { pending, approved, rejected, total: allExceptions.length };
  }, [allExceptions]);

  // Lista filtrada
  const filteredExceptions = useMemo(() => {
    return allExceptions.filter(item => {
      const st = item.exception.status || 'pending';
      if (statusFilter !== 'all' && st !== statusFilter) return false;
      if (courseFilter !== 'all' && item.courseData?.id !== courseFilter) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = item.studentName.toLowerCase().includes(term);
        const matchesReason = (item.exception.reason || '').toLowerCase().includes(term);
        const matchesClass = item.className.toLowerCase().includes(term);
        if (!matchesName && !matchesReason && !matchesClass) return false;
      }

      return true;
    });
  }, [allExceptions, statusFilter, courseFilter, searchTerm]);

  // Cursos com exceções para o filtro
  const coursesWithExceptions = useMemo(() => {
    if (!courses) return [];
    const usedIds = new Set(allExceptions.map(item => item.courseData?.id).filter(Boolean));
    return courses.filter(c => usedIds.has(c.id));
  }, [courses, allExceptions]);

  // Abertura do modal de decisão
  const handleOpenDecision = (item: EnrichedExceptionItem, type: 'approved' | 'rejected') => {
    setDecisionModalItem(item);
    setDecisionType(type);
    setReviewNotes(item.exception.reviewNotes || '');
  };

  // Salvar decisão de forma ATÔMICA via dot notation
  const handleConfirmDecision = async () => {
    if (!decisionModalItem || !decisionType) return;

    setIsSubmitting(true);
    try {
      const { classData, studentId, exception } = decisionModalItem;

      const updatedException: OnlineException = {
        ...exception,
        status: decisionType,
        reviewedAt: new Date().toISOString(),
        reviewedBy: currentUser?.uid || 'coordenação',
        reviewNotes: reviewNotes.trim() || undefined
      };

      // Atualização atômica usando dot notation do Firestore para prevenir condições de corrida
      await updateClass(classData.id, {
        [`onlineExceptions.${studentId}`]: updatedException
      });

      toast({
        title: decisionType === 'approved' ? 'Exceção Aprovada! 🎓' : 'Exceção Recusada',
        description: `A solicitação de ${decisionModalItem.studentName} foi ${decisionType === 'approved' ? 'aprovada' : 'recusada'} com sucesso.`
      });

      setDecisionModalItem(null);
      setDecisionType(null);
      setReviewNotes('');
    } catch (error: any) {
      console.error('[ExceptionsList] Erro ao salvar decisão:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao processar decisão',
        description: error.message || 'Ocorreu um erro ao atualizar o Firestore.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gerador de Link do WhatsApp
  const getWhatsAppLink = (item: EnrichedExceptionItem, isApproval: boolean, notes?: string) => {
    const rawPhone = item.studentPhone.replace(/\D/g, '');
    if (!rawPhone) return null;

    const formattedPhone = rawPhone.length === 11 ? `55${rawPhone}` : rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
    const firstName = item.studentName.trim().split(' ')[0];

    const message = isApproval
      ? `Olá, ${firstName}! 🙌\n\nSua solicitação de exceção para aulas online no curso *${item.courseName}* foi *APROVADA* pela coordenação! 🎉\n\n${notes ? `*Observações:* ${notes}\n\n` : ''}Suas aulas assistidas no TheoFlix agora contam normalmente para fins de formatura. Bons estudos!`
      : `Olá, ${firstName}! 🙌\n\nInformamos que sua solicitação de exceção de aulas online no curso *${item.courseName}* foi analisada pela coordenação e *não pôde ser aprovada* no momento.\n\n${notes ? `*Parecer da coordenação:* ${notes}\n\n` : ''}Caso tenha dúvidas, procure a equipe de coordenação presencialmente.`;

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6">
      {/* ── KPIs no Topo ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className={cn(
            "cursor-pointer transition-all border-2",
            statusFilter === 'pending' ? "border-amber-500 bg-amber-50/30 dark:bg-amber-950/20" : "hover:border-amber-200"
          )}
          onClick={() => setStatusFilter('pending')}
        >
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs uppercase font-black text-amber-600 flex items-center justify-between">
              Pendentes
              <Clock className="size-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-amber-700 dark:text-amber-400">
              {stats.pending}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Aguardando análise</p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all border-2",
            statusFilter === 'approved' ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20" : "hover:border-emerald-200"
          )}
          onClick={() => setStatusFilter('approved')}
        >
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs uppercase font-black text-emerald-600 flex items-center justify-between">
              Aprovadas
              <CheckCircle2 className="size-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {stats.approved}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Exceções liberadas</p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all border-2",
            statusFilter === 'rejected' ? "border-rose-500 bg-rose-50/30 dark:bg-rose-950/20" : "hover:border-rose-200"
          )}
          onClick={() => setStatusFilter('rejected')}
        >
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs uppercase font-black text-rose-600 flex items-center justify-between">
              Recusadas
              <XCircle className="size-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-rose-700 dark:text-rose-400">
              {stats.rejected}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Indeferidas</p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all border-2",
            statusFilter === 'all' ? "border-slate-500 bg-slate-50/50 dark:bg-slate-900/50" : "hover:border-slate-300"
          )}
          onClick={() => setStatusFilter('all')}
        >
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs uppercase font-black text-slate-600 flex items-center justify-between">
              Total
              <ShieldCheck className="size-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-slate-800 dark:text-slate-200">
              {stats.total}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Histórico completo</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Barra de Filtros e Busca ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome do aluno ou motivo..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-full sm:w-[220px] h-10 text-xs">
              <SelectValue placeholder="Filtrar por Curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Cursos</SelectItem>
              {coursesWithExceptions.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
            <SelectTrigger className="w-full sm:w-[160px] h-10 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="pending">🟡 Pendentes</SelectItem>
              <SelectItem value="approved">🟢 Aprovadas</SelectItem>
              <SelectItem value="rejected">🔴 Recusadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Tabela / Lista de Solicitações ──────────────────────────── */}
      <div className="border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="font-bold text-xs">Aluno</TableHead>
              <TableHead className="font-bold text-xs">Curso / Turma</TableHead>
              <TableHead className="font-bold text-xs">Frequência Atual</TableHead>
              <TableHead className="font-bold text-xs">Motivo Informado</TableHead>
              <TableHead className="font-bold text-xs">Solicitado em</TableHead>
              <TableHead className="font-bold text-xs">Status</TableHead>
              <TableHead className="font-bold text-xs text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExceptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-xs text-muted-foreground">
                  <ShieldCheck className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                  Nenhuma solicitação de exceção encontrada para os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              filteredExceptions.map(item => {
                const st = item.exception.status || 'pending';
                const requestedDate = item.exception.requestedAt 
                  ? format(new Date(item.exception.requestedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) 
                  : '—';

                const totalRate = item.attendanceEval?.totalRate ?? 0;
                const onlineRate = item.attendanceEval?.onlineRate ?? 0;
                const inPersonRate = item.attendanceEval?.inPersonRate ?? 0;

                const waApproveUrl = getWhatsAppLink(item, true, item.exception.reviewNotes);
                const waRejectUrl = getWhatsAppLink(item, false, item.exception.reviewNotes);

                return (
                  <TableRow key={`${item.classData.id}-${item.studentId}`} className="hover:bg-muted/10 transition-colors">
                    {/* Aluno */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8">
                          <AvatarImage src={item.studentPhoto} />
                          <AvatarFallback className="text-[10px] font-bold">
                            {item.studentName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-xs leading-none">{item.studentName}</p>
                          {item.studentPhone && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {item.studentPhone}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Curso / Turma */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <Badge variant="outline" className="text-[9px] font-bold uppercase py-0 bg-primary/5 text-primary border-primary/20">
                          {item.courseName}
                        </Badge>
                        <p className="text-[11px] font-bold text-muted-foreground">{item.className}</p>
                      </div>
                    </TableCell>

                    {/* Frequência Atual */}
                    <TableCell>
                      <div className="space-y-1 min-w-[120px]">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span>Total: {totalRate}%</span>
                          <span className="text-muted-foreground">({inPersonRate}% P / {onlineRate}% O)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                          <div style={{ width: `${inPersonRate}%` }} className="bg-emerald-500 h-full" title={`Presencial: ${inPersonRate}%`} />
                          <div style={{ width: `${onlineRate}%` }} className="bg-blue-500 h-full" title={`Online: ${onlineRate}%`} />
                        </div>
                      </div>
                    </TableCell>

                    {/* Motivo Informado */}
                    <TableCell className="max-w-[240px]">
                      <div className="space-y-1">
                        <p className="text-xs italic bg-muted/30 p-2 rounded-lg border leading-snug line-clamp-2 hover:line-clamp-none transition-all">
                          "{item.exception.reason}"
                        </p>
                        {item.exception.notes && (
                          <p className="text-[10px] text-muted-foreground">
                            Obs: {item.exception.notes}
                          </p>
                        )}
                        {item.exception.reviewNotes && (
                          <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                            Parecer: {item.exception.reviewNotes}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Solicitado em */}
                    <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {requestedDate}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {st === 'pending' && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold text-[10px] gap-1 animate-pulse">
                          <Clock className="size-3" /> Pendente
                        </Badge>
                      )}
                      {st === 'approved' && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px] gap-1">
                          <CheckCircle2 className="size-3" /> Aprovada
                        </Badge>
                      )}
                      {st === 'rejected' && (
                        <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300 font-bold text-[10px] gap-1">
                          <XCircle className="size-3" /> Recusada
                        </Badge>
                      )}
                    </TableCell>

                    {/* Ações */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {st === 'pending' ? (
                          <>
                            <Button
                              size="sm"
                              className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 gap-1"
                              onClick={() => handleOpenDecision(item, 'approved')}
                            >
                              <CheckCircle2 className="size-3.5" /> Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-[11px] px-2.5 gap-1"
                              onClick={() => handleOpenDecision(item, 'rejected')}
                            >
                              <XCircle className="size-3.5" /> Recusar
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[10px] font-bold text-muted-foreground hover:bg-muted gap-1"
                              onClick={() => handleOpenDecision(item, st === 'approved' ? 'rejected' : 'approved')}
                              title="Alterar decisão da coordenação"
                            >
                              <RotateCcw className="size-3" /> Reavaliar
                            </Button>
                            {st === 'approved' && waApproveUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-2 gap-1"
                                asChild
                              >
                                <a href={waApproveUrl} target="_blank" rel="noopener noreferrer">
                                  <MessageSquare className="size-3 text-emerald-600" /> Notificar
                                </a>
                              </Button>
                            )}
                            {st === 'rejected' && waRejectUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] font-bold border-rose-300 text-rose-700 hover:bg-rose-50 px-2 gap-1"
                                asChild
                              >
                                <a href={waRejectUrl} target="_blank" rel="noopener noreferrer">
                                  <MessageSquare className="size-3 text-rose-600" /> Notificar
                                </a>
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Modal de Confirmação de Decisão ──────────────────────────── */}
      <Dialog open={!!decisionModalItem} onOpenChange={open => !open && setDecisionModalItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              {decisionType === 'approved' ? (
                <>
                  <CheckCircle2 className="size-5 text-emerald-600" />
                  Aprovar Exceção de Frequência Online
                </>
              ) : (
                <>
                  <XCircle className="size-5 text-rose-600" />
                  Recusar Solicitação de Exceção
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
              {decisionModalItem?.studentName} • {decisionModalItem?.courseName} ({decisionModalItem?.className})
            </DialogDescription>
          </DialogHeader>

          {decisionModalItem && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-muted/40 rounded-xl space-y-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Motivo informado pelo aluno:</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 italic">
                  "{decisionModalItem.exception.reason}"
                </p>
                {decisionModalItem.exception.notes && (
                  <p className="text-[11px] text-muted-foreground">
                    Obs: {decisionModalItem.exception.notes}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {decisionType === 'approved' ? 'Parecer / Observação da Coordenação (Opcional):' : 'Justificativa da Recusa (Opcional):'}
                </label>
                <Textarea 
                  placeholder={decisionType === 'approved' ? 'Ex: Aprovado conforme declaração de trabalho em escala...' : 'Ex: Módulo exige participação presencial obrigatória...'}
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  className="text-xs min-h-[70px]"
                />
              </div>

              {/* Botão de WhatsApp após decidir */}
              {decisionModalItem.studentPhone && (
                <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-emerald-600" />
                    <span className="font-bold text-emerald-900 dark:text-emerald-300 text-[11px]">
                      Enviar mensagem pelo WhatsApp ao aluno?
                    </span>
                  </div>
                  {decisionType && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-100 px-2"
                      asChild
                    >
                      <a 
                        href={getWhatsAppLink(decisionModalItem, decisionType === 'approved', reviewNotes) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Abrir WhatsApp <ExternalLink className="size-2.5 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDecisionModalItem(null)}
              disabled={isSubmitting}
              className="text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDecision}
              disabled={isSubmitting}
              className={cn(
                "text-xs font-bold text-white",
                decisionType === 'approved' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3 animate-spin mr-1.5" /> Salvando...
                </>
              ) : decisionType === 'approved' ? (
                'Confirmar Aprovação'
              ) : (
                'Confirmar Recusa'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

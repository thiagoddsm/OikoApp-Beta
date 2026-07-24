'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from 'next/link';
import { useFirebase, useDoc } from '@/firebase';
import { getLessonsAction, startLessonAction, finishLessonAction, reportAbsenceAction, createLessonAction, Lesson } from './actions';
import { Play, CheckCircle, AlertCircle, Clock, BookOpen, UserCheck, Loader2, Calendar, PlusCircle, CheckSquare, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCoursesData, useMembersData } from "@/hooks/useDomainData";

export default function DiarioDeClassePage() {
  const { user } = useFirebase();
  const { toast } = useToast();
  const { courses, classes } = useCoursesData();
  const { users } = useMembersData();
  
  const { data: userData } = useDoc<any>(user ? `users/${user.uid}` : null);
  const userRole = userData?.hierarchy?.role;
  const isAdminOrCoordinator = userRole === 'admin' || userRole === 'pastor_senior' || userRole === 'coordenador';

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal States
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLogClassOpen, setIsLogClassOpen] = useState(false);

  // Form Fields
  const [conteudo, setConteudo] = useState('');
  const [motivoFalta, setMotivoFalta] = useState<'falta_aluno' | 'falta_professor'>('falta_aluno');
  const [submitting, setSubmitting] = useState(false);

  // New Lesson Form
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [lessonDate, setLessonDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [lessonTime, setLessonTime] = useState<string>('19:30');

  // Fetch Lessons
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const targetTeacherId = isAdminOrCoordinator ? 'all' : user.uid;
    getLessonsAction(targetTeacherId)
      .then(res => {
        if (res.success && res.data) {
          setLessons(res.data);
        } else {
          toast({ title: 'Erro ao carregar', description: res.error || 'Erro desconhecido', variant: 'destructive' });
        }
      })
      .finally(() => setLoading(false));
  }, [user, refreshTrigger, isAdminOrCoordinator]);

  // Today's lessons filtering
  const todayLessons = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return lessons.filter(l => {
      if (!l.data_agendada) return false;
      const lessonDateStr = new Date(l.data_agendada).toISOString().split('T')[0];
      return lessonDateStr === todayStr;
    });
  }, [lessons]);

  // Check-in action
  const handleStartLesson = async (lessonId: string) => {
    try {
      setLoading(true);
      const res = await startLessonAction(lessonId);
      if (res.success) {
        toast({ title: 'Aula Iniciada!', description: 'O ponto de início foi registrado com sucesso.' });
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast({ title: 'Erro', description: res.error || 'Não foi possível iniciar a aula', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Open check-out modal
  const openFinishModal = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setConteudo('');
    setIsFinishModalOpen(true);
  };

  // Check-out action
  const handleFinishLesson = async () => {
    if (!selectedLesson) return;
    try {
      setSubmitting(true);
      const res = await finishLessonAction(selectedLesson.id, conteudo);
      if (res.success) {
        toast({ title: 'Aula Concluída!', description: 'O diário de classe e o ponto de encerramento foram gravados.' });
        setIsFinishModalOpen(false);
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast({ title: 'Erro', description: res.error || 'Não foi possível finalizar a aula', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Open absence modal
  const openAbsenceModal = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setMotivoFalta('falta_aluno');
    setIsAbsenceModalOpen(true);
  };

  // Absence action
  const handleReportAbsence = async () => {
    if (!selectedLesson) return;
    try {
      setSubmitting(true);
      const res = await reportAbsenceAction(selectedLesson.id, motivoFalta);
      if (res.success) {
        toast({ title: 'Falta Registrada!', description: 'A aula foi encaminhada para a fila de reposições.' });
        setIsAbsenceModalOpen(false);
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast({ title: 'Erro', description: res.error || 'Não foi possível registrar a falta', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendada':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Agendada</Badge>;
      case 'em_andamento':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white animate-pulse">Em Andamento</Badge>;
      case 'concluida':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Concluída</Badge>;
      case 'falta_aluno':
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Falta Aluno</Badge>;
      case 'falta_professor':
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Falta Professor</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreateLesson = async () => {
    if (!selectedClassId && !selectedTeacherId) {
      toast({ title: "Preencha os campos", description: "Selecione pelo menos uma turma ou professor.", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      const res = await createLessonAction({
        professor_id: selectedTeacherId || user?.uid || '',
        aluno_id: selectedStudentId || '',
        class_id: selectedClassId || '',
        data_agendada: lessonDate,
        horario_inicio_agendado: lessonTime
      });
      if (res.success) {
        toast({ title: "Aula Agendada!", description: "A nova aula foi adicionada ao diário." });
        setIsCreateModalOpen(false);
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast({ title: "Erro", description: res.error || "Não foi possível agendar a aula", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="size-6 text-indigo-500" />
            Diário de Classe & Ponto Eletrônico
          </h1>
          <p className="text-sm text-slate-400">Ponto eletrônico seguro, diário de classe e lançamento de presença para todas as turmas (DIS, Wave, Lumine, Crescer, Pertencer, Teologia).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={() => setIsLogClassOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5"
          >
            <CheckSquare className="size-4" /> Lançar Chamada por Turma
          </Button>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            variant="outline"
            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs gap-1.5"
          >
            <PlusCircle className="size-4" /> + Agendar Nova Aula
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="gap-2"
          >
            <Calendar className="size-4" /> Atualizar
          </Button>
        </div>
      </div>

      {loading && lessons.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-md font-bold flex items-center gap-2">
                <Clock className="size-4.5 text-indigo-500" />
                Aulas Agendadas para Hoje
              </CardTitle>
              <CardDescription>Gerencie suas mentorias agendadas para a data de hoje.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {todayLessons.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">
                  <p>Você não possui nenhuma aula agendada para hoje.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {todayLessons.map(lesson => (
                    <div key={lesson.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-850 dark:text-slate-200">{lesson.aluno_nome}</span>
                          {getStatusBadge(lesson.status)}
                        </div>
                        <p className="text-xs text-slate-500">
                          Horário Agendado: <strong className="text-indigo-600 dark:text-indigo-400">{lesson.horario_inicio_agendado}</strong>
                        </p>
                        {lesson.horario_inicio_real && (
                          <p className="text-[10px] text-slate-450">
                            Check-in Real: <strong className="text-slate-700 dark:text-slate-300">{new Date(lesson.horario_inicio_real).toLocaleTimeString('pt-BR')}</strong>
                          </p>
                        )}
                        {lesson.horario_fim_real && (
                          <p className="text-[10px] text-slate-450">
                            Check-out Real: <strong className="text-slate-700 dark:text-slate-300">{new Date(lesson.horario_fim_real).toLocaleTimeString('pt-BR')}</strong>
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 w-full md:w-auto">
                        {lesson.status === 'agendada' && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => handleStartLesson(lesson.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 md:flex-none gap-1.5"
                            >
                              <Play className="size-3.5" /> Iniciar Aula
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => openAbsenceModal(lesson)}
                              className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 flex-1 md:flex-none gap-1.5"
                            >
                              <AlertCircle className="size-3.5" /> Registrar Falta
                            </Button>
                          </>
                        )}

                        {lesson.status === 'em_andamento' && (
                          <Button 
                            size="sm" 
                            onClick={() => openFinishModal(lesson)}
                            className="bg-amber-600 hover:bg-amber-700 text-white flex-1 md:flex-none gap-1.5"
                          >
                            <UserCheck className="size-3.5" /> Finalizar Aula
                          </Button>
                        )}

                        {lesson.status === 'concluida' && (
                          <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle className="size-4" /> Aula Concluída
                          </div>
                        )}

                        {(lesson.status === 'falta_aluno' || lesson.status === 'falta_professor') && (
                          <span className="text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-950/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Reposição Pendente
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Check-out Modal */}
      <Dialog open={isFinishModalOpen} onOpenChange={setIsFinishModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conteúdo Ministrado (Diário de Classe)</DialogTitle>
            <DialogDescription>
              O preenchimento do conteúdo ministrado é obrigatório para encerrar o ponto da mentoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500">Descrição do Conteúdo</label>
              <Textarea 
                placeholder="Ex: Discutimos o Módulo 1 do Wave, revisamos a leitura e fizemos aplicação prática do diário..." 
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                rows={4}
              />
              <p className="text-[10px] text-slate-400">
                Mínimo de 15 caracteres. Digitados: <strong className={conteudo.trim().length >= 15 ? "text-emerald-500" : "text-red-500"}>{conteudo.trim().length}</strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFinishModalOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleFinishLesson}
              disabled={submitting || conteudo.trim().length < 15}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {submitting ? 'Gravando...' : 'Salvar e Encerrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Absence Modal */}
      <Dialog open={isAbsenceModalOpen} onOpenChange={setIsAbsenceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Ausência / Falta</DialogTitle>
            <DialogDescription>
              Informe quem faltou à aula agendada. Isso enviará a mentoria para a Fila de Reposições automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500">Motivo da Falta</label>
              <Select value={motivoFalta} onValueChange={(val: any) => setMotivoFalta(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="falta_aluno">Falta do Aluno (Fila de Reposição)</SelectItem>
                  <SelectItem value="falta_professor">Falta do Professor (Fila de Reposição)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAbsenceModalOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleReportAbsence}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? 'Salvando...' : 'Confirmar Falta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agendar Nova Aula Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar Nova Aula / Mentoria</DialogTitle>
            <DialogDescription>
              Cadastre o agendamento da aula para que fique disponível no diário do professor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Turma / Curso (Opcional)</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger><SelectValue placeholder="Selecione a turma..." /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => {
                    const crs = courses.find(co => co.id === c.courseId);
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({crs?.name || 'Curso'})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Professor / Mentor</Label>
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger><SelectValue placeholder="Selecione o professor..." /></SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.isTeacher || u.hierarchy?.role === 'admin' || u.hierarchy?.role === 'professor').map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data Agendada</Label>
                <Input type="date" value={lessonDate} onChange={e => setLessonDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Horário de Início</Label>
                <Input type="time" value={lessonTime} onChange={e => setLessonTime(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateLesson} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {submitting ? 'Agendando...' : 'Salvar Agendamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lançar Chamada por Turma Modal */}
      <Dialog open={isLogClassOpen} onOpenChange={setIsLogClassOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lançar Presença por Turma</DialogTitle>
            <DialogDescription>
              Selecione a turma para abrir a chamada rápida de presença e diário de conteúdo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Selecione a Turma</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger><SelectValue placeholder="Escolha uma turma para lançar presença..." /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => {
                    const crs = courses.find(co => co.id === c.courseId);
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} — {crs?.name || 'Curso'} ({c.students?.length || 0} alunos)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLogClassOpen(false)}>Cancelar</Button>
            {selectedClassId ? (
              <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                <Link href={`/dashboard/teaching/log/${selectedClassId}`}>
                  Abrir Chamada da Turma
                </Link>
              </Button>
            ) : (
              <Button disabled className="bg-slate-300">Abrir Chamada da Turma</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import React, { useMemo } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Calendar, Clock, DollarSign, Loader2, MessageSquare, CreditCard, GraduationCap, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useCoursesData, useTeachingFinance } from "@/hooks/useDomainData";

export function DisStudentArea() {
  const { user } = useFirebase();
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();
    const { wavePayments, disPayments, wavePlans, disPlans, waveExpenses } = useTeachingFinance();

  const { isLoading } = useVolunteering();

  const myClasses = useMemo(() => {
    if (!user) return [];
    return classes.filter(c => c.students?.includes(user.uid));
  }, [classes, user]);

  const myPayments = useMemo(() => {
    if (!user) return [];
    return disPayments.filter(p => p.userId === user.uid).sort((a, b) => b.month.localeCompare(a.month));
  }, [disPayments, user]);

  const myFeedback = useMemo(() => {
    if (!user || myClasses.length === 0) return [];
    const myClassIds = myClasses.map(c => c.id);
    return pedagogicalLogs
      .filter(log => myClassIds.includes(log.classId))
      .sort((a, b) => b.date.toMillis() - a.date.toMillis());
  }, [pedagogicalLogs, myClasses]);

  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c.name])), [courses]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-primary to-accent text-primary-foreground overflow-hidden relative shadow-xl border-none">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <GraduationCap size={120} />
          </div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="size-5" />
              Identidade Estudantil
            </CardTitle>
            <CardDescription className="text-primary-foreground/80 font-medium">DIS - Escola de Inclusão</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-70 mb-1">Aluno(a)</p>
              <p className="text-xl font-black leading-tight">{user.displayName}</p>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] uppercase tracking-widest opacity-70 mb-1">Situação</p>
                <Badge variant="outline" className="bg-white/20 text-white border-white/20 font-bold">
                  REGULAR
                </Badge>
              </div>
              <div className="bg-white p-1 rounded-md shadow-inner">
                <div className="size-14 bg-black rounded-sm flex items-center justify-center">
                   <div className="size-10 border-2 border-white/20"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-5 text-primary" />
              Minha Agenda de Aulas
            </CardTitle>
            <CardDescription>Confira seus horários e locais de aula no DIS.</CardDescription>
          </CardHeader>
          <CardContent>
            {myClasses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <p>Você ainda não está matriculado em nenhuma turma.</p>
                <Button variant="link" asChild>
                   <a href="/public/enrollment">Ver cursos disponíveis</a>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {myClasses.map(cls => (
                  <div key={cls.id} className="flex flex-col p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
                    <p className="text-sm font-black text-primary mb-1">{courseMap.get(cls.courseId)}</p>
                    <p className="text-xs font-medium text-muted-foreground mb-3">{cls.name}</p>
                    <div className="mt-auto space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="size-3.5 text-muted-foreground" />
                        <span className="font-semibold">{cls.dayOfWeek} às {cls.startTime}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="size-5 text-primary" />
              Feedback dos Professores
            </CardTitle>
            <CardDescription>Acompanhe o que os professores registraram sobre suas aulas.</CardDescription>
          </CardHeader>
          <CardContent>
            {myFeedback.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground border-2 border-dashed rounded-lg italic">
                Nenhum registro de aula disponível ainda.
              </p>
            ) : (
              <div className="space-y-4">
                {myFeedback.slice(0, 3).map(log => (
                  <div key={log.id} className="p-4 bg-slate-50 rounded-xl border-l-4 border-primary shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-bold text-primary">{format(log.date.toDate(), 'dd/MM/yyyy', { locale: ptBR })}</p>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "size-2 rounded-full", 
                              i < log.student_performance ? "bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.5)]" : "bg-slate-200"
                            )} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{log.content_taught}</p>
                    <p className="text-xs text-muted-foreground mt-2 italic border-t pt-2">"{log.observations}"</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="size-5 text-primary" />
              Minhas Mensalidades
            </CardTitle>
            <CardDescription>Acompanhe o status dos seus pagamentos.</CardDescription>
          </CardHeader>
          <CardContent>
            {myPayments.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                Nenhum registro financeiro encontrado.
              </p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto w-full">
<Table>
                  <TableBody>
                    {myPayments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <p className="text-sm font-bold">{p.month}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Referência</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="text-sm font-medium">R$ {p.amount.toFixed(2).replace('.', ',')}</p>
                          <Badge 
                            variant={p.status === 'paid' ? 'default' : p.status === 'overdue' ? 'destructive' : 'outline'}
                            className="mt-1 h-5 text-[9px] uppercase font-black"
                          >
                            {p.status === 'paid' ? 'Pago' : p.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

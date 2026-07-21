'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useMembersData, useCoursesData, useTeachingFinance } from "@/hooks/useDomainData";

export function TeacherDashboard() {
  const { user } = useFirebase();
  const { users } = useMembersData();
  const { courses, classes, isLoading: loadingCourses } = useCoursesData();
  const { wavePayments, wavePlans, isLoading: loadingFinance } = useTeachingFinance();
  const { isLoading: loadingVolunteering } = useVolunteering();

  const isLoading = loadingCourses || loadingFinance || loadingVolunteering;

  // Filter lessons/classes for the logged-in teacher
  const teacherClasses = useMemo(() => {
    if (!user || !classes) return [];
    return classes.filter(cls => cls.teacherId === user.uid);
  }, [user, classes]);

  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c.name])), [courses]);

  // Find next upcoming class for this teacher (today's closest class)
  const upcomingClass = useMemo(() => {
    if (teacherClasses.length === 0) return null;
    return teacherClasses[0]; // Returns the first active assigned class
  }, [teacherClasses]);

  const totalStudents = useMemo(() => {
    const studentSet = new Set<string>();
    teacherClasses.forEach(cls => {
      cls.students?.forEach(studentId => studentSet.add(studentId));
    });
    return studentSet.size;
  }, [teacherClasses]);

  // Calculate dynamic monthly commission (50% of paid amounts of the teacher's students)
  const financialSummary = useMemo(() => {
    const teacherStudentIds = new Set<string>();
    teacherClasses.forEach(cls => {
      cls.students?.forEach(studentId => teacherStudentIds.add(studentId));
    });

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // Payments from students enrolled in this teacher's classes
    const teacherStudentPayments = wavePayments.filter(p => teacherStudentIds.has(p.userId) && p.month.startsWith(currentMonth));
    
    const paidSum = teacherStudentPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingSum = teacherStudentPayments
      .filter(p => p.status === 'pending' || p.status === 'overdue')
      .reduce((sum, p) => sum + p.amount, 0);

    // 50% commission rate for the teacher
    const totalReceived = paidSum * 0.5;
    const pending = pendingSum * 0.5;

    const localeOptions = { minimumFractionDigits: 2, style: 'currency' as const, currency: 'BRL' };

    return {
      monthName: new Date().toLocaleDateString('pt-BR', { month: 'long' }),
      totalReceived: totalReceived.toLocaleString('pt-BR', localeOptions),
      pending: pending.toLocaleString('pt-BR', localeOptions),
    };
  }, [teacherClasses, wavePayments]);

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome and Summary */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription>Próxima Aula</CardDescription>
            <CardTitle className="text-3xl text-indigo-650 dark:text-indigo-400">{upcomingClass?.startTime || '--:--'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-slate-500">
              Turma: <strong>{upcomingClass?.name || 'Não agendada'}</strong>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription>Total de Alunos</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">{totalStudents}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-slate-500">
              Gerenciando {totalStudents} jornadas musicais no Wave
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription>Repasse Estimado ({financialSummary.monthName})</CardDescription>
            <CardTitle className="text-3xl text-indigo-600">{financialSummary.totalReceived}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-slate-500">
              {financialSummary.pending} aguardando pagamento
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Schedule and Students */}
      <div className="grid grid-cols-1">
        <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-md font-bold">
              <BookOpen className="size-5 text-indigo-500"/>
              Minhas Turmas Ativas
            </CardTitle>
            <CardDescription>Lista de instrumentos e alunos sob sua mentoria.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turma</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Nº de Alunos</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teacherClasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-slate-400">
                      Você não está alocado em nenhuma turma do Wave.
                    </TableCell>
                  </TableRow>
                ) : (
                  teacherClasses.map(cls => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-bold">{cls.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {courseMap.get(cls.courseId) || 'Curso não encontrado'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                          {cls.students?.length || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {cls.dayOfWeek} às {cls.startTime}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/teaching/diario`}>
                            <BookOpen className="size-4 mr-2 text-indigo-500"/>
                            Registrar Aula
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

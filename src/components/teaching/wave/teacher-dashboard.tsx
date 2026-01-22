
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

export function TeacherDashboard() {
  const { user } = useFirebase();
  const { classes, courses, users, isLoading } = useVolunteering();

  const teacherClasses = useMemo(() => {
    if (!user || !classes) return [];
    return classes.filter(cls => cls.teacherId === user.uid);
  }, [user, classes]);

  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c.name])), [courses]);

  const upcomingClass = teacherClasses[0]; // Simplistic placeholder
  const totalStudents = useMemo(() => {
    const studentSet = new Set<string>();
    teacherClasses.forEach(cls => {
      cls.students?.forEach(studentId => studentSet.add(studentId));
    });
    return studentSet.size;
  }, [teacherClasses]);
  
  const financialSummary = {
    month: 'Outubro',
    totalReceived: 'R$ 1.850,00',
    pending: 'R$ 240,00',
  };

  if (isLoading) {
      return (
          <div className="flex h-64 w-full items-center justify-center">
              <Loader2 className="size-8 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="space-y-6">
        {/* Welcome and Summary */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Próxima Aula</CardDescription>
                    <CardTitle className="text-3xl">{upcomingClass?.schedule?.split(',')[1] || '--:--'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-xs text-muted-foreground">
                        Turma: <strong>{upcomingClass?.name || 'N/A'}</strong>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Total de Alunos</CardDescription>
                    <CardTitle className="text-3xl">{totalStudents}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-xs text-muted-foreground">
                        Gerenciando {totalStudents} jornadas musicais
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Repasse (Mês)</CardDescription>
                    <CardTitle className="text-3xl">{financialSummary.totalReceived}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-xs text-muted-foreground">
                       {financialSummary.pending} pendentes de pagamento
                    </div>
                </CardContent>
            </Card>
        </div>
        
        {/* Schedule and Students */}
        <div className="grid grid-cols-1">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BookOpen className="size-5"/> Minhas Turmas</CardTitle>
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
                                    <TableCell colSpan={5} className="text-center h-24">
                                        Você não está alocado em nenhuma turma.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                teacherClasses.map(cls => (
                                    <TableRow key={cls.id}>
                                        <TableCell className="font-medium">{cls.name}</TableCell>
                                        <TableCell><Badge variant="outline">{courseMap.get(cls.courseId) || 'Curso não encontrado'}</Badge></TableCell>
                                        <TableCell>{cls.students?.length || 0}</TableCell>
                                        <TableCell className="text-muted-foreground">{cls.schedule || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/dashboard/teaching/log/${cls.id}`}>
                                                    <BookOpen className="size-4 mr-2"/>
                                                    Diário de Classe
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

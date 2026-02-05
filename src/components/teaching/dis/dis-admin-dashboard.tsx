
'use client';

import React, { useMemo, useState } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Inbox, BookOpen, GraduationCap, ChevronRight, TrendingUp, UserPlus, PlusCircle } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { EnrollmentDialog } from '../enrollment-dialog';
import { ClassFormDialog } from '../class-form-dialog';

// Dados simulados para o gráfico de crescimento
const growthData = [
  { name: 'Jul', matriculas: 12, solicitacoes: 18 },
  { name: 'Ago', matriculas: 15, solicitacoes: 22 },
  { name: 'Set', matriculas: 20, solicitacoes: 25 },
  { name: 'Out', matriculas: 28, solicitacoes: 30 },
];

export function DisAdminDashboard() {
  const { users, classes, courses, enrollmentRequests, isLoading } = useVolunteering();
  const [isEnrollmentOpen, setEnrollmentOpen] = useState(false);
  const [isClassFormOpen, setClassFormOpen] = useState(false);

  // Filtrar dados específicos do DIS
  const disCourses = useMemo(() => 
    courses.filter(c => c.ministryName.toLowerCase() === 'dis' || c.name.toLowerCase().includes('libras')),
    [courses]
  );

  const disCourseIds = useMemo(() => disCourses.map(c => c.id), [disCourses]);
  const primaryDisCourseId = disCourseIds[0];

  const disClasses = useMemo(() => 
    classes.filter(c => disCourseIds.includes(c.courseId)),
    [classes, disCourseIds]
  );

  const disRequests = useMemo(() => 
    enrollmentRequests.filter(r => disCourseIds.includes(r.courseId)),
    [enrollmentRequests, disCourseIds]
  );

  const disStudentsCount = useMemo(() => {
    const studentSet = new Set<string>();
    disClasses.forEach(c => c.students?.forEach(s => studentSet.add(s)));
    return studentSet.size;
  }, [disClasses]);

  const disTeachers = useMemo(() => 
    users.filter(u => u.isTeacher && u.taughtCourseIds?.some(id => disCourseIds.includes(id))),
    [users, disCourseIds]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards & Main Action */}
      <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold">Gestão DIS</h3>
          <div className="flex gap-2">
              <Button variant="outline" onClick={() => setClassFormOpen(true)} disabled={!primaryDisCourseId}>
                  <PlusCircle className="mr-2 size-4" />
                  Nova Turma
              </Button>
              <Button onClick={() => setEnrollmentOpen(true)}>
                  <UserPlus className="mr-2 size-4" />
                  Inscrição Manual
              </Button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alunos Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{disStudentsCount}</div>
            <p className="text-xs text-muted-foreground">Matriculados nas turmas de Libras</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitações Pendentes</CardTitle>
            <Inbox className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{disRequests.filter(r => r.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">Aguardando revisão de matrícula</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turmas DIS</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{disClasses.length}</div>
            <p className="text-xs text-muted-foreground">Turmas em andamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Professores DIS</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{disTeachers.length}</div>
            <p className="text-xs text-muted-foreground">Habilitados para Libras</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Interesse e Matrículas
            </CardTitle>
            <CardDescription>Comparativo de novas solicitações vs. matrículas efetivadas.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="matriculas" name="Matrículas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="solicitacoes" name="Solicitações" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Inscrições Recentes</CardTitle>
            <CardDescription>Pessoas que usaram o link público.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {disRequests.slice(0, 5).map(req => (
                <div key={req.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{req.name}</p>
                    <p className="text-xs text-muted-foreground">{format(req.createdAt.toDate(), 'dd/MM/yy', { locale: ptBR })}</p>
                  </div>
                  <Badge variant={req.status === 'pending' ? 'outline' : 'secondary'}>
                    {req.status === 'pending' ? 'Pendente' : 'Revisado'}
                  </Badge>
                </div>
              ))}
              {disRequests.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma solicitação recente.</p>
              )}
              <Button variant="link" className="w-full text-xs" asChild>
                <Link href={primaryDisCourseId ? `/dashboard/teaching/courses/${primaryDisCourseId}` : '#'}>Ver todas as solicitações</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Turmas Ativas - DIS</CardTitle>
          <CardDescription>Acompanhamento de horários e professores.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turma</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Dia/Hora</TableHead>
                  <TableHead className="text-center">Alunos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disClasses.map(cls => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell>{users.find(u => u.id === cls.teacherId)?.name || 'Não atribuído'}</TableCell>
                    <TableCell className="text-xs">
                      {cls.dayOfWeek} às {cls.startTime}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{cls.students?.length || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/teaching/classes/${cls.id}`}>
                          Gerenciar <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {disClasses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Nenhuma turma do DIS cadastrada.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EnrollmentDialog open={isEnrollmentOpen} onOpenChange={setEnrollmentOpen} />
      
      {primaryDisCourseId && (
        <ClassFormDialog 
            open={isClassFormOpen} 
            onOpenChange={setClassFormOpen} 
            courseId={primaryDisCourseId} 
            existingClass={null} 
        />
      )}
    </div>
  );
}

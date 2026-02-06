
'use client';

import React, { useMemo, useState } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Inbox, BookOpen, GraduationCap, ChevronRight, TrendingUp, UserPlus, PlusCircle, LayoutDashboard, Search } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnrollmentDialog } from '../enrollment-dialog';
import { ClassFormDialog } from '../class-form-dialog';
import { EnrollmentRequestsList } from '../enrollment-requests-list';
import { StudentsManagement } from '../students-management';
import { TeachersManagement } from '../teachers-management';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Dados simulados para o gráfico de crescimento
const growthData = [
  { name: 'Jul', matriculas: 12, solicitacoes: 18 },
  { name: 'Ago', matriculas: 15, solicitacoes: 22 },
  { name: 'Set', matriculas: 20, solicitacoes: 25 },
  { name: 'Out', matriculas: 28, solicitacoes: 30 },
];

export function DisAdminDashboard() {
  const { users, classes, courses, enrollmentRequests, isLoading } = useVolunteering();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEnrollmentOpen, setEnrollmentOpen] = useState(false);
  const [isClassFormOpen, setClassFormOpen] = useState(false);

  // Filtrar dados específicos do DIS (Ministério "DIS" ou cursos de Libras)
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

  const pendingRequestsCount = disRequests.filter(r => r.status === 'pending').length;

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

  const kpis = [
    { id: 'students', title: "Alunos Ativos", value: disStudentsCount, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { id: 'requests', title: "Solicitações", value: pendingRequestsCount, icon: Inbox, color: "text-amber-600", bg: "bg-amber-50" },
    { id: 'classes', title: "Turmas DIS", value: disClasses.length, icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50" },
    { id: 'teachers', title: "Professores", value: disTeachers.length, icon: GraduationCap, color: "text-green-600", bg: "bg-green-50" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards Interactive */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <button 
            key={kpi.id} 
            onClick={() => setActiveTab(kpi.id)}
            className={cn(
                "text-left transition-all hover:scale-105 active:scale-95 outline-none",
                activeTab === kpi.id ? "ring-2 ring-primary ring-offset-2 rounded-xl" : ""
            )}
          >
            <Card className={cn("h-full", activeTab === kpi.id ? "bg-muted/50" : "")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <div className={cn("p-2 rounded-lg", kpi.bg, kpi.color)}>
                    <kpi.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Clique para gerenciar</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl mb-6">
            <TabsTrigger value="overview"><LayoutDashboard className="size-4 mr-2"/>Geral</TabsTrigger>
            <TabsTrigger value="requests">Solicitações {pendingRequestsCount > 0 && <Badge className="ml-2 h-4 px-1">{pendingRequestsCount}</Badge>}</TabsTrigger>
            <TabsTrigger value="students">Alunos</TabsTrigger>
            <TabsTrigger value="classes">Turmas</TabsTrigger>
            <TabsTrigger value="teachers">Professores</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 animate-in fade-in-50">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Fluxo de Interessados
                        </CardTitle>
                        <CardDescription>Acompanhamento mensal de novas solicitações.</CardDescription>
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
                        <CardTitle>Inscrições Recentes</CardTitle>
                        <CardDescription>Aguardando sua revisão.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {disRequests.slice(0, 5).map(req => (
                            <div key={req.id} className="flex items-center justify-between border-b border-dashed pb-3 last:border-0 last:pb-0">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold truncate">{req.name}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase">{req.courseId.substring(0,8)}</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setActiveTab('requests')}>
                                    <ChevronRight className="size-4" />
                                </Button>
                            </div>
                        ))}
                        {disRequests.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma solicitação.</p>}
                        <Button variant="outline" className="w-full text-xs" onClick={() => setActiveTab('requests')}>Gerenciar Todas</Button>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="requests" className="animate-in slide-in-from-left-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Solicitações de Inscrição - Libras/DIS</CardTitle>
                        <CardDescription>Clique em aprovar para vincular o aluno à turma e efetivar a matrícula.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEnrollmentOpen(true)}>
                        <UserPlus className="mr-2 size-4" /> Inscrição Manual
                    </Button>
                </CardHeader>
                <CardContent>
                    <EnrollmentRequestsList courseId={primaryDisCourseId} />
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="students" className="animate-in slide-in-from-left-4">
            <StudentsManagement filterCourseIds={disCourseIds} />
        </TabsContent>

        <TabsContent value="classes" className="animate-in slide-in-from-left-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Turmas Ativas</CardTitle>
                        <CardDescription>Gestão de horários, salas e professores DIS.</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setClassFormOpen(true)} disabled={!primaryDisCourseId}>
                        <PlusCircle className="mr-2 size-4" /> Nova Turma
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Turma</TableHead>
                                    <TableHead>Professor</TableHead>
                                    <TableHead>Horário</TableHead>
                                    <TableHead className="text-center">Alunos</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {disClasses.map(cls => (
                                    <TableRow key={cls.id}>
                                        <TableCell className="font-bold">{cls.name}</TableCell>
                                        <TableCell>{users.find(u => u.id === cls.teacherId)?.name || 'A definir'}</TableCell>
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
                                    <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground italic">Nenhuma turma cadastrada.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="teachers" className="animate-in slide-in-from-left-4">
            <TeachersManagement filterCourseId={primaryDisCourseId} />
        </TabsContent>
      </Tabs>

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

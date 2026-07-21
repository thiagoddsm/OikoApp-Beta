'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bar, CartesianGrid, Legend, Line, ComposedChart, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Users, Wallet, AlertTriangle, DoorOpen, Loader2, Calendar, BookOpen, GraduationCap, LayoutDashboard, Inbox, ChevronRight, PlusCircle, UserPlus } from 'lucide-react';
import { ChartContainer } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useMembersData, useCoursesData, useTeachingFinance } from "@/hooks/useDomainData";
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Import management dialogs
import { EnrollmentDialog } from '../enrollment-dialog';
import { ClassFormDialog } from '../class-form-dialog';
import { EnrollmentRequestsList } from '../enrollment-requests-list';
import { StudentsManagement } from '../students-management';
import { TeachersManagement } from '../teachers-management';

const COLORS = ['#6750A4', '#8A75B5', '#AE9CCE', '#D1C4E7', '#F2F0F7'];

export function WaveAdminDashboard() {
  const { firestore } = useFirebase();
  const { users, isLoading: loadingUsers } = useMembersData();
  const { courses, classes, enrollmentRequests, isLoading: loadingCourses } = useCoursesData();
  const { wavePayments, waveExpenses, wavePlans, isLoading: loadingFinance } = useTeachingFinance();

  // Tab and Dialog States
  const [activeTab, setActiveTab] = useState('overview');
  const [isEnrollmentOpen, setEnrollmentOpen] = useState(false);
  const [isClassFormOpen, setClassFormOpen] = useState(false);

  // Query today's lessons to show dynamic room occupancy and active lessons count
  const todayStr = new Date().toISOString().split('T')[0];
  const startOfDay = new Date(`${todayStr}T00:00:00`);
  const endOfDay = new Date(`${todayStr}T23:59:59`);

  const aulasQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'aulas'),
      where('data_agendada', '>=', Timestamp.fromDate(startOfDay)),
      where('data_agendada', '<=', Timestamp.fromDate(endOfDay))
    );
  }, [firestore, todayStr]);

  const { data: todayAulas, isLoading: loadingAulas } = useCollection<any>(aulasQuery);

  const isLoading = loadingUsers || loadingCourses || loadingFinance || loadingAulas;

  // Filter courses and classes belonging to the Wave ministry
  const waveCourses = useMemo(() => 
    courses.filter(c => c.ministryName?.toLowerCase() === 'wave'),
    [courses]
  );
  
  const waveCourseIds = useMemo(() => waveCourses.map(c => c.id), [waveCourses]);
  const primaryWaveCourseId = waveCourseIds[0] || '';
  const waveCourseNamesMap = useMemo(() => new Map(waveCourses.map(c => [c.id, c.name])), [waveCourses]);

  const waveClasses = useMemo(() => 
    classes.filter(c => waveCourseIds.includes(c.courseId)),
    [classes, waveCourseIds]
  );

  // Filter Wave enrollment requests
  const waveRequests = useMemo(() => 
    enrollmentRequests.filter(r => waveCourseIds.includes(r.courseId)),
    [enrollmentRequests, waveCourseIds]
  );

  const pendingRequestsCount = waveRequests.filter(r => r.status === 'pending').length;

  // Filter Wave teachers
  const waveTeachers = useMemo(() => 
    users.filter(u => u.isTeacher && u.taughtCourseIds?.some((id: string) => waveCourseIds.includes(id))),
    [users, waveCourseIds]
  );

  // 1. KPI: Active Students Count
  const activeStudentsCount = useMemo(() => {
    const studentSet = new Set<string>();
    waveClasses.forEach(cls => {
      cls.students?.forEach(s => studentSet.add(s));
    });
    return studentSet.size;
  }, [waveClasses]);

  // 2. KPI: Monthly Revenue (current month paid amount)
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthlyRevenue = useMemo(() => {
    return wavePayments
      .filter(p => p.month.startsWith(currentMonth) && p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [wavePayments, currentMonth]);

  // 3. KPI: Delinquency Rate
  const delinquencyMetrics = useMemo(() => {
    const currentMonthPayments = wavePayments.filter(p => p.month.startsWith(currentMonth));
    const overduePayments = currentMonthPayments.filter(p => p.status === 'overdue' || p.status === 'pending');
    
    const rate = currentMonthPayments.length > 0 
      ? Math.round((overduePayments.length / currentMonthPayments.length) * 100) 
      : 0;

    return {
      rate: `${rate}%`,
      description: `${overduePayments.length} mensalidades pendentes`
    };
  }, [wavePayments, currentMonth]);

  // 4. KPI: Active Lessons / Rooms occupied right now
  const ongoingLessons = useMemo(() => {
    if (!todayAulas) return [];
    return todayAulas.filter((a: any) => a.status === 'em_andamento');
  }, [todayAulas]);

  const roomsOccupiedLabel = `${ongoingLessons.length} / 6`;

  // 5. Dynamic Cash Flow Data (last 6 months)
  const financeChartData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return {
        monthKey: format(d, 'yyyy-MM'),
        label: format(d, 'MMM', { locale: ptBR }),
        Receita: 0,
        Despesa: 0,
        Lucro: 0
      };
    });

    // Add revenue from payments
    wavePayments.forEach(p => {
      if (p.status === 'paid') {
        const match = last6Months.find(m => p.month.startsWith(m.monthKey));
        if (match) match.Receita += p.amount;
      }
    });

    // Add expenses
    waveExpenses.forEach(e => {
      if (e.date) {
        const dateVal = e.date as any;
        const dateObj = e.date instanceof Timestamp 
          ? e.date.toDate() 
          : dateVal?.seconds 
            ? new Date(dateVal.seconds * 1000) 
            : new Date(dateVal);
        const monthKey = dateObj.toISOString().slice(0, 7);
        const match = last6Months.find(m => m.monthKey === monthKey);
        if (match) match.Despesa += e.amount;
      }
    });

    // Calculate profit
    last6Months.forEach(m => {
      m.Lucro = m.Receita - m.Despesa;
    });

    return last6Months.map(m => ({
      name: m.label.charAt(0).toUpperCase() + m.label.slice(1),
      Receita: Math.round(m.Receita),
      Despesa: Math.round(m.Despesa),
      Lucro: Math.round(m.Lucro)
    }));
  }, [wavePayments, waveExpenses]);

  // 6. Dynamic Discipline Distribution Chart
  const disciplineChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    
    waveClasses.forEach(cls => {
      const courseName = waveCourseNamesMap.get(cls.courseId) || 'Outros';
      counts[courseName] = (counts[courseName] || 0) + (cls.students?.length || 0);
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);
  }, [waveClasses, waveCourseNamesMap]);

  // 7. Dynamic Rooms occupancy view for today
  const roomsOccupancy = useMemo(() => {
    const defaultRooms = [
      { name: 'Sala 1', instrument: 'Piano', status: 'Livre', professor: '', aluno: '', color: 'green' },
      { name: 'Sala 2', instrument: 'Violão', status: 'Livre', professor: '', aluno: '', color: 'green' },
      { name: 'Sala 3', instrument: 'Bateria', status: 'Livre', professor: '', aluno: '', color: 'green' },
      { name: 'Sala 4', instrument: 'Canto', status: 'Livre', professor: '', aluno: '', color: 'green' },
      { name: 'Sala 5', instrument: 'Teoria', status: 'Livre', professor: '', aluno: '', color: 'green' },
      { name: 'Sala 6', instrument: 'Sopro/Prática', status: 'Livre', professor: '', aluno: '', color: 'green' }
    ];

    ongoingLessons.forEach((lesson: any) => {
      const room = defaultRooms.find(r => 
        (lesson.course_id && waveCourseNamesMap.get(lesson.course_id)?.toLowerCase().includes(r.instrument.toLowerCase()))
      ) || defaultRooms.find(r => r.status === 'Livre');

      if (room) {
        room.status = 'Ocupada';
        room.professor = lesson.professor_nome || 'Prof. Auxiliar';
        room.aluno = lesson.aluno_nome || 'Aluno';
        room.color = 'red';
      }
    });

    return defaultRooms;
  }, [ongoingLessons, waveCourseNamesMap]);

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const kpis = [
    { id: 'overview', title: "Alunos Ativos", value: activeStudentsCount, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { id: 'requests', title: "Solicitações", value: pendingRequestsCount, icon: Inbox, color: "text-amber-600", bg: "bg-amber-50" },
    { id: 'classes', title: "Turmas Wave", value: waveClasses.length, icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50" },
    { id: 'teachers', title: "Professores", value: waveTeachers.length, icon: GraduationCap, color: "text-green-600", bg: "bg-green-50" },
  ];

  return (
    <div className="space-y-6">
      {/* Dynamic Tab Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <button 
            key={kpi.id} 
            onClick={() => setActiveTab(kpi.id)}
            className={cn(
              "text-left transition-all hover:scale-102 active:scale-98 outline-none",
              activeTab === kpi.id ? "ring-2 ring-primary ring-offset-2 rounded-xl" : ""
            )}
          >
            <Card className={cn("h-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800", activeTab === kpi.id ? "bg-slate-50/50" : "")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <div className={cn("p-2 rounded-lg", kpi.bg, kpi.color)}>
                  <kpi.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Gerenciar</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl mb-6 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-full">
          <TabsTrigger value="overview" className="rounded-full text-xs"><LayoutDashboard className="size-3.5 mr-1.5"/>Geral</TabsTrigger>
          <TabsTrigger value="requests" className="rounded-full text-xs">
            Inscrições {pendingRequestsCount > 0 && <Badge className="ml-1.5 h-4 px-1">{pendingRequestsCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="students" className="rounded-full text-xs">Alunos</TabsTrigger>
          <TabsTrigger value="classes" className="rounded-full text-xs">Turmas</TabsTrigger>
          <TabsTrigger value="teachers" className="rounded-full text-xs">Professores</TabsTrigger>
        </TabsList>

        {/* 1. OVERVIEW / METRICS TAB */}
        <TabsContent value="overview" className="space-y-8 animate-in fade-in-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase">Receita (Mês)</CardTitle>
                <div className="p-1.5 bg-green-50 text-green-600 rounded-full"><Wallet size={16} /></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <p className="text-[10px] text-slate-400 mt-1">Mensalidades liquidadas</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase">Inadimplência</CardTitle>
                <div className="p-1.5 bg-red-50 text-red-650 rounded-full"><AlertTriangle size={16} /></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{delinquencyMetrics.rate}</div>
                <p className="text-[10px] text-red-500 mt-1">{delinquencyMetrics.description}</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase">Salas Ocupadas</CardTitle>
                <div className="p-1.5 bg-yellow-50 text-yellow-600 rounded-full"><DoorOpen size={16} /></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{roomsOccupiedLabel}</div>
                <p className="text-[10px] text-slate-400 mt-1">Mentorias ativas hoje</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle>Fluxo de Caixa (Semestral)</CardTitle>
                <CardDescription>Comparativo real entre receita de mensalidades e despesas.</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ChartContainer config={{}} className="h-[300px] w-full">
                  <ComposedChart data={financeChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(value) => `R$${value}`} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                    <Legend />
                    <Bar dataKey="Receita" fill="#10b981" name="Receita" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Despesa" fill="#ef4444" name="Despesa" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="Lucro" fill="#6366f1" stroke="#6366f1" name="Lucro Líquido" strokeWidth={2.5} />
                  </ComposedChart>
                </ChartContainer>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle>Distribuição por Disciplina</CardTitle>
                <CardDescription>Popularidade dos instrumentos por alunos ativos.</CardDescription>
              </CardHeader>
              <CardContent>
                {disciplineChartData.length === 0 ? (
                  <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
                    Nenhum aluno matriculado.
                  </div>
                ) : (
                  <ChartContainer config={{}} className="h-[300px] w-full">
                    <PieChart>
                      <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                      <Legend />
                      <Pie
                        data={disciplineChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        innerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                      >
                        {disciplineChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle>Gestão Operacional de Salas</CardTitle>
              <CardDescription>Ocupação das salas de aula em tempo real baseada no Diário Eletrônico.</CardDescription>
            </CardHeader>
            <CardContent>
              <h4 className="text-sm font-bold text-slate-500 uppercase mb-4 tracking-wider">Status das Salas - Hoje</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {roomsOccupancy.map((room) => {
                  const isOccupied = room.status === 'Ocupada';
                  const colorClass = isOccupied ? 'red' : 'green';

                  return (
                    <Card key={room.name} className={`bg-${colorClass}-50 dark:bg-${colorClass}-950/20 border-${colorClass}-200 dark:border-${colorClass}-900`}>
                      <CardHeader className="flex flex-row justify-between items-start p-3 pb-2">
                        <CardTitle className={`text-sm font-bold text-slate-700 dark:text-slate-350`}>{room.name}</CardTitle>
                        <div className={`w-2.5 h-2.5 rounded-full bg-${colorClass}-500 mt-1`}></div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-1">
                        <p className="text-[10px] text-slate-455">{room.instrument}</p>
                        <Badge variant="outline" className={`text-[10px] font-semibold mt-2 bg-white dark:bg-slate-900`}>
                          {room.status}
                        </Badge>
                        {isOccupied && (
                          <div className="pt-2 text-[9px] text-slate-500 leading-tight">
                            <p className="font-bold">{room.professor}</p>
                            <p className="text-slate-400">Aluno: {room.aluno}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ENROLLMENT REQUESTS TAB */}
        <TabsContent value="requests" className="animate-in slide-in-from-left-4">
          <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>Solicitações de Matrícula - Wave</CardTitle>
                <CardDescription>Aprovação e encaminhamento de interessados nos cursos de instrumentos.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setEnrollmentOpen(true)} className="bg-indigo-650 hover:bg-indigo-700 text-white">
                <UserPlus className="mr-2 size-4" /> Matrícula Manual
              </Button>
            </CardHeader>
            <CardContent>
              <EnrollmentRequestsList courseId={waveCourseIds} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. STUDENTS TAB */}
        <TabsContent value="students" className="animate-in slide-in-from-left-4">
          <StudentsManagement filterCourseIds={waveCourseIds} />
        </TabsContent>

        {/* 4. CLASSES / TURMAS TAB */}
        <TabsContent value="classes" className="animate-in slide-in-from-left-4">
          <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>Turmas e Agendas Wave</CardTitle>
                <CardDescription>Gestão de horários de aula, salas e professores alocados.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setClassFormOpen(true)} disabled={!primaryWaveCourseId} className="bg-indigo-650 hover:bg-indigo-700 text-white">
                <PlusCircle className="mr-2 size-4" /> Nova Turma / Mentoria
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-850">
                    <TableRow>
                      <TableHead>Turma</TableHead>
                      <TableHead>Mentor / Professor</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead className="text-center">Alunos</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waveClasses.map(cls => (
                      <TableRow key={cls.id}>
                        <TableCell className="font-bold">{cls.name}</TableCell>
                        <TableCell>{users.find(u => u.id === cls.teacherId)?.name || 'A definir'}</TableCell>
                        <TableCell className="text-xs text-slate-550">
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
                    {waveClasses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24 text-slate-400 italic">
                          Nenhuma turma cadastrada no Wave.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. TEACHERS TAB */}
        <TabsContent value="teachers" className="animate-in slide-in-from-left-4">
          <TeachersManagement filterCourseIds={waveCourseIds} />
        </TabsContent>
      </Tabs>

      {/* Management Dialogs */}
      <EnrollmentDialog 
        open={isEnrollmentOpen} 
        onOpenChange={setEnrollmentOpen} 
      />
      <ClassFormDialog 
        open={isClassFormOpen} 
        onOpenChange={setClassFormOpen} 
        courseId={primaryWaveCourseId} 
      />
    </div>
  );
}

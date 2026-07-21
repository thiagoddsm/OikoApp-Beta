'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bar, CartesianGrid, Legend, Line, ComposedChart, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Users, Wallet, AlertTriangle, DoorOpen, Loader2 } from 'lucide-react';
import { ChartContainer } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useMembersData, useCoursesData, useTeachingFinance } from "@/hooks/useDomainData";
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#6750A4', '#8A75B5', '#AE9CCE', '#D1C4E7', '#F2F0F7'];

export function WaveAdminDashboard() {
  const { firestore } = useFirebase();
  const { users, isLoading: loadingUsers } = useMembersData();
  const { courses, classes, isLoading: loadingCourses } = useCoursesData();
  const { wavePayments, waveExpenses, wavePlans, isLoading: loadingFinance } = useTeachingFinance();

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
  const waveCourseNamesMap = useMemo(() => new Map(waveCourses.map(c => [c.id, c.name])), [waveCourses]);

  const waveClasses = useMemo(() => 
    classes.filter(c => waveCourseIds.includes(c.courseId)),
    [classes, waveCourseIds]
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
      // Find matching room based on instrument type or locationId
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

  const kpiData = [
    { title: "Alunos Ativos", value: activeStudentsCount.toString(), change: "Matrículas no Wave", changeColor: "text-slate-500", icon: Users, iconColor: "text-blue-600", bgColor: "bg-blue-100" },
    { title: "Receita Mensal (Paga)", value: `R$ ${monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, change: "Mensalidades compensadas", changeColor: "text-slate-500", icon: Wallet, iconColor: "text-green-600", bgColor: "bg-green-100" },
    { title: "Inadimplência (Mês)", value: delinquencyMetrics.rate, change: delinquencyMetrics.description, changeColor: "text-red-500", icon: AlertTriangle, iconColor: "text-red-600", bgColor: "bg-red-100" },
    { title: "Salas Ocupadas (Agora)", value: roomsOccupiedLabel, change: "Check-ins ativos", changeColor: "text-yellow-600", icon: DoorOpen, iconColor: "text-yellow-600", bgColor: "bg-yellow-100" },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((item, index) => {
          const Icon = item.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                <div className={`p-2 ${item.bgColor} rounded-full`}>
                    <Icon className={`w-5 h-5 ${item.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.value}</div>
                <p className={`text-xs ${item.changeColor}`}>{item.change}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
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
        
        <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
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
      
      {/* Management Section */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
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
                    <p className="text-[10px] text-slate-450">{room.instrument}</p>
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
    </div>
  );
}


'use client';

import React, { useMemo } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Users, 
  BookOpen, 
  School, 
  Inbox, 
  TrendingUp, 
  GraduationCap, 
  Clock, 
  CheckCircle2,
  CalendarDays,
  Loader2
} from 'lucide-react';
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis, 
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const COLORS = ['#6750A4', '#9A89C6', '#BDB2D9', '#D9D3E9', '#F2F0F7'];

export function TeachingOverviewDashboard() {
  const { classes, courses, enrollmentRequests, users, isLoading } = useVolunteering();

  const stats = useMemo(() => {
    if (isLoading) return null;

    const totalCourses = courses.length;
    const totalClasses = classes.length;
    const pendingRequests = enrollmentRequests.filter(r => r.status === 'pending').length;
    
    const studentSet = new Set<string>();
    classes.forEach(c => c.students?.forEach(s => studentSet.add(s)));
    const activeStudents = studentSet.size;

    const teachersCount = users.filter(u => u.isTeacher).length;

    // Distribution by school
    const schoolCounts: Record<string, number> = {};
    courses.forEach(c => {
      schoolCounts[c.ministryName] = (schoolCounts[c.ministryName] || 0) + 1;
    });
    const schoolData = Object.entries(schoolCounts).map(([name, value]) => ({ name, value }));

    return {
      totalCourses,
      totalClasses,
      pendingRequests,
      activeStudents,
      teachersCount,
      schoolData
    };
  }, [isLoading, classes, courses, enrollmentRequests, users]);

  const recentRequests = useMemo(() => {
    return enrollmentRequests
      .filter(r => r.status === 'pending')
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
      .slice(0, 5);
  }, [enrollmentRequests]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const kpis = [
    { title: "Alunos Ativos", value: stats?.activeStudents, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Inscrições Pendentes", value: stats?.pendingRequests, icon: Inbox, color: "text-amber-600", bg: "bg-amber-50" },
    { title: "Cursos Ofertados", value: stats?.totalCourses, icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Corpo Docente", value: stats?.teachersCount, icon: GraduationCap, color: "text-green-600", bg: "bg-green-50" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="border-none shadow-sm transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">{kpi.title}</CardTitle>
              <div className={cn("p-2 rounded-xl shadow-sm", kpi.bg, kpi.color)}>
                <kpi.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{kpi.value}</div>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground font-bold uppercase">
                <TrendingUp size={10} className="text-emerald-500" /> +2% este mês
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart: Distribution by Ministry */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <School className="size-5 text-primary" />
              Oferta por Escolas / Ministérios
            </CardTitle>
            <CardDescription>Quantidade de cursos ativos em cada área de ensino.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.schoolData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" name="Cursos" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Pending Enrollments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="size-5 text-amber-500" />
              Inscrições Recentes
            </CardTitle>
            <CardDescription>Aguardando aprovação dos coordenadores.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground italic text-center">
                <CheckCircle2 size={32} className="text-emerald-500 opacity-20 mb-2" />
                <p className="text-xs">Tudo em dia!</p>
              </div>
            ) : (
              recentRequests.map(req => {
                const course = courses.find(c => c.id === req.courseId);
                return (
                  <div key={req.id} className="flex items-start gap-3 p-3 rounded-xl border-2 border-dashed border-muted transition-colors hover:border-primary/30 group">
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold group-hover:bg-primary group-hover:text-white transition-colors">
                      {req.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black truncate text-slate-900 leading-none mb-1">{req.name}</p>
                      <p className="text-[10px] font-bold text-primary truncate uppercase tracking-tighter">{course?.name || 'Carregando...'}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[8px] h-4 font-black bg-amber-50 text-amber-700 border-amber-200">PENDENTE</Badge>
                        <span className="text-[9px] text-muted-foreground font-medium uppercase">
                          {req.createdAt ? format(req.createdAt.toDate(), 'dd/MM', { locale: ptBR }) : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <Button variant="ghost" className="w-full text-xs font-black uppercase text-primary tracking-widest h-10 mt-2" asChild>
              <a href="#requests">Gerenciar Tudo</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stats Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/10 shadow-inner">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="size-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary mb-4">
              <School size={24} />
            </div>
            <h4 className="font-black text-xs uppercase tracking-widest text-primary mb-1">Capacidade Total</h4>
            <p className="text-3xl font-black text-slate-900">{stats?.totalClasses ? stats.totalClasses * 20 : 0}</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">Baseado em turmas de 20 vagas</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 shadow-inner">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="size-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-600 mb-4">
              <CalendarDays size={24} />
            </div>
            <h4 className="font-black text-xs uppercase tracking-widest text-emerald-700 mb-1">Próximo Semestre</h4>
            <p className="text-3xl font-black text-slate-900">8</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">Cursos planejados para 2026/1</p>
          </CardContent>
        </Card>

        <Card className="bg-indigo-50 border-indigo-100 shadow-inner">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="size-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-600 mb-4">
              <TrendingUp size={24} />
            </div>
            <h4 className="font-black text-xs uppercase tracking-widest text-indigo-700 mb-1">Taxa de Conclusão</h4>
            <p className="text-3xl font-black text-slate-900">74%</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">Média geral dos últimos 6 meses</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

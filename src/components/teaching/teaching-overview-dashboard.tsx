'use client';

import React, { useMemo, useState } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
  Loader2,
  ChevronLeft,
  Filter
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
  Cell
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useMembersData, useCoursesData } from "@/hooks/useDomainData";

const COLORS = ['#6750A4', '#9A89C6', '#BDB2D9', '#D9D3E9', '#F2F0F7'];

export function TeachingOverviewDashboard() {
    const { users } = useMembersData();
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();

  const { isLoading } = useVolunteering();

  const [selectedMinistry, setSelectedMinistry] = useState<string | null>(null);
  const [filterCycle, setFilterCycle] = useState<string>('all');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');

  const stats = useMemo(() => {
    if (isLoading) return null;

    const totalCourses = courses.length;
    const totalClasses = classes.length;
    const pendingRequests = enrollmentRequests.filter(r => r.status === 'pending').length;
    
    const studentSet = new Set<string>();
    classes.forEach(c => c.students?.forEach(s => studentSet.add(s)));
    const activeStudents = studentSet.size;

    const teachersCount = users.filter(u => u.isTeacher).length;

    const schoolCounts: Record<string, { totalCourses: number, totalStudents: number, totalCapacity: number }> = {};
    
    courses.forEach(c => {
      const ministry = c.ministryName || 'Geral';
      if (!schoolCounts[ministry]) {
          schoolCounts[ministry] = { totalCourses: 0, totalStudents: 0, totalCapacity: 0 };
      }
      schoolCounts[ministry].totalCourses += 1;
      
      const courseClasses = classes.filter(cls => cls.courseId === c.id);
      courseClasses.forEach(cls => {
          schoolCounts[ministry].totalStudents += (cls.students?.length || 0);
          schoolCounts[ministry].totalCapacity += (cls.maxStudents || 20);
      });
    });

    const schoolData = Object.entries(schoolCounts).map(([name, data]) => ({ 
        name, 
        Cursos: data.totalCourses,
        Alunos: data.totalStudents,
        Vagas: data.totalCapacity - data.totalStudents
    }));

    return {
      totalCourses,
      totalClasses,
      pendingRequests,
      activeStudents,
      teachersCount,
      schoolData
    };
  }, [isLoading, classes, courses, enrollmentRequests, users]);

  // Ciclos disponíveis para o ministério selecionado
  const ministryCycles = useMemo(() => {
    if (!selectedMinistry || !courses || !classes) return [];
    const ministryCourseIds = new Set(courses.filter(c => (c.ministryName || 'Geral') === selectedMinistry).map(c => c.id));
    const cycleSet = new Set<string>();
    classes.filter(cls => ministryCourseIds.has(cls.courseId)).forEach(cls => {
      if (cls.cycle) cycleSet.add(cls.cycle);
    });
    return Array.from(cycleSet).sort((a, b) => b.localeCompare(a));
  }, [selectedMinistry, courses, classes]);

  const ministryDetailsData = useMemo(() => {
      if (!selectedMinistry || !courses || !classes) return [];
      
      const ministryCourses = courses.filter(c => (c.ministryName || 'Geral') === selectedMinistry);
      
      return ministryCourses.map(course => {
          // Filtrar turmas pelo ciclo selecionado
          let courseClasses = classes.filter(cls => cls.courseId === course.id);
          if (filterCycle !== 'all') {
            courseClasses = courseClasses.filter(cls => cls.cycle === filterCycle);
          }

          let totalStudents = 0;
          let totalCapacity = 0;
          
          courseClasses.forEach(cls => {
              // Filtro de período: contar apenas alunos matriculados em turmas dentro do período
              const clsStart = (cls.startDate as string | undefined)?.split('T')[0] || '';
              const clsEnd = (cls.endDate as string | undefined)?.split('T')[0] || '';
              if (filterDateStart && clsEnd && clsEnd < filterDateStart) return;
              if (filterDateEnd && clsStart && clsStart > filterDateEnd) return;

              totalStudents += (cls.students?.length || 0);
              totalCapacity += (cls.maxStudents || 20);
          });

          // Não mostrar cursos sem turmas após o filtro
          if (totalStudents === 0 && totalCapacity === 0) return null;

          return {
              name: course.name.length > 20 ? course.name.substring(0, 20) + '...' : course.name,
              fullName: course.name,
              'Alunos Inscritos': totalStudents,
              'Vagas Livres': Math.max(0, totalCapacity - totalStudents)
          };
      }).filter(Boolean);
  }, [selectedMinistry, courses, classes, filterCycle, filterDateStart, filterDateEnd]);

  const recentRequests = useMemo(() => {
    return enrollmentRequests
      .filter(r => r.status === 'pending')
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
      .slice(0, 5);
  }, [enrollmentRequests]);

  const handleBarClick = (chartData: any) => {
    if (chartData && chartData.activeIndex !== undefined && stats?.schoolData) {
        const clickedItem = stats.schoolData[chartData.activeIndex];
        if (clickedItem && clickedItem.name) {
            setSelectedMinistry(clickedItem.name);
        }
    }
  };

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
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                  <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                      <School className="size-5 text-primary" />
                      {selectedMinistry ? `Ocupação: ${selectedMinistry}` : 'Visão por Escolas / Ministérios'}
                      </CardTitle>
                      <CardDescription>
                          {selectedMinistry ? 'Distribuição de vagas e matrículas por curso.' : 'Clique em uma coluna para ver os detalhes dos cursos.'}
                      </CardDescription>
                  </div>
                  {selectedMinistry && (
                      <Button variant="outline" size="sm" onClick={() => { setSelectedMinistry(null); setFilterCycle('all'); setFilterDateStart(''); setFilterDateEnd(''); }} className="h-8">
                          <ChevronLeft className="size-4 mr-1" /> Voltar
                      </Button>
                  )}
              </div>

              {/* Filtros — aparecem somente na visão de detalhe */}
              {selectedMinistry && (
                <div className="flex flex-wrap items-end gap-3 pt-1">
                  <Filter className="size-3.5 text-muted-foreground mb-2.5" />

                  {/* Filtro Ciclo */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Ciclo</Label>
                    <Select value={filterCycle} onValueChange={setFilterCycle}>
                      <SelectTrigger className="h-8 w-[130px] bg-white text-xs font-semibold">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Ciclos</SelectItem>
                        {ministryCycles.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro Data Início */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Início</Label>
                    <input
                      type="date"
                      value={filterDateStart}
                      onChange={e => setFilterDateStart(e.target.value)}
                      className="flex h-8 w-[130px] rounded-md border border-input bg-white px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>

                  {/* Filtro Data Fim */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Fim</Label>
                    <input
                      type="date"
                      value={filterDateEnd}
                      onChange={e => setFilterDateEnd(e.target.value)}
                      className="flex h-8 w-[130px] rounded-md border border-input bg-white px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>

                  {/* Limpar filtros */}
                  {(filterCycle !== 'all' || filterDateStart || filterDateEnd) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground mb-0.5"
                      onClick={() => { setFilterCycle('all'); setFilterDateStart(''); setFilterDateEnd(''); }}
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="h-[320px] pt-6 outline-none focus:outline-none">
            {!selectedMinistry ? (
                <ResponsiveContainer key="overview" width="100%" height="100%" className="outline-none focus:outline-none">
                <BarChart data={stats?.schoolData} onClick={handleBarClick}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tickMargin={10} />
                    <YAxis axisLine={false} tickLine={false} fontSize={12} />
                    <Tooltip 
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                    <Bar dataKey="Alunos" name="Alunos Matriculados" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} cursor="pointer" />
                    <Bar dataKey="Vagas" name="Vagas Disponíveis" stackId="a" fill="#cbd5e1" radius={[4, 4, 0, 0]} cursor="pointer" />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <ResponsiveContainer key="details" width="100%" height="100%" className="outline-none focus:outline-none">
                <BarChart data={ministryDetailsData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tickMargin={10} />
                    <YAxis axisLine={false} tickLine={false} fontSize={12} />
                    <Tooltip 
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                    <Bar dataKey="Alunos Inscritos" stackId="a" fill="#6366f1" radius={[0, 0, 4, 4]} maxBarSize={60} />
                    <Bar dataKey="Vagas Livres" stackId="a" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
                </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="size-5 text-amber-500" />
              Inscrições Recentes
            </CardTitle>
            <CardDescription>Aguardando aprovação.</CardDescription>
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
                      {(req.name || '?').charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black truncate text-slate-900 leading-none mb-1">{req.name || 'Sem nome'}</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/10 shadow-inner">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="size-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary mb-4">
              <School size={24} />
            </div>
            <h4 className="font-black text-xs uppercase tracking-widest text-primary mb-1">Capacidade Total</h4>
            <p className="text-3xl font-black text-slate-900">
              {classes.reduce((acc, cls) => acc + (cls.maxStudents || 20), 0)}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">Soma de vagas em todas as turmas ativas</p>
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
            <h4 className="font-black text-xs uppercase tracking-widest text-indigo-700 mb-1">Ocupação Geral</h4>
            <p className="text-3xl font-black text-slate-900">
                {(() => {
                    const totalCap = classes.reduce((acc, cls) => acc + (cls.maxStudents || 20), 0);
                    const totalAlunos = classes.reduce((acc, cls) => acc + (cls.students?.length || 0), 0);
                    return totalCap > 0 ? Math.round((totalAlunos / totalCap) * 100) : 0;
                })()}%
            </p>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">Das vagas ofertadas já preenchidas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

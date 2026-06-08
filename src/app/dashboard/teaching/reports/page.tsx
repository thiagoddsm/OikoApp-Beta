'use client';

import React, { useState, useMemo } from 'react';
import { VolunteeringProvider, useVolunteering, getResolvedSchedule } from '@/contexts/volunteering-context';
import { CourseReports } from '@/components/teaching/course-reports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BarChart2, BookOpen, Users, Award, Percent, ChevronRight, FileText, Download, Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { parseISO, isWithinInterval, startOfWeek, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function GeneralTeachingReportsContent() {
  const { courses, classes, users } = useVolunteering();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');

  // Traduzir o track
  const getTrackName = (track?: string, type?: string) => {
    if (type === 'eletivo') return 'Eletivas & Outros';
    if (track === 'discipulado') return 'Trilho de Discipulado';
    if (track === 'biblico') return 'Trilho Bíblico';
    if (track === 'teologico') return 'Trilho Teológico';
    return 'Eletivas & Outros';
  };

  // Calcular estatísticas consolidadas por curso
  const courseStats = useMemo(() => {
    return courses.map(course => {
      const courseClasses = classes.filter(c => c.courseId === course.id);
      const studentSet = new Set<string>();
      courseClasses.forEach(cls => cls.students?.forEach(sId => studentSet.add(sId)));
      const enrolledCount = studentSet.size;

      // Calcular frequência média para o curso
      let totalAttendancePossibilities = 0;
      let totalPresentCount = 0;

      courseClasses.forEach(cls => {
        const resolved = getResolvedSchedule(cls, course);
        const activeDates = new Set(resolved.map(r => r.dateStr));

        cls.students?.forEach(studentId => {
          cls.attendance?.forEach(att => {
            if (!activeDates.has(att.date)) return; // Ignora se a aula foi excluída

            if (dateStart || dateEnd) {
              const date = parseISO(att.date.split('T')[0]);
              const start = dateStart ? parseISO(dateStart) : parseISO('2000-01-01');
              const end = dateEnd ? parseISO(dateEnd) : parseISO('2100-01-01');
              if (!isWithinInterval(date, { start, end })) return;
            }

            const isPresent = att.presentStudentIds?.includes(studentId) || att.onlineStudentIds?.includes(studentId);
            const isRepo = att.repositions?.some(r => r.studentId === studentId);
            if (isPresent || isRepo) {
              totalPresentCount++;
            }
            totalAttendancePossibilities++;
          });
        });
      });

      const averageAttendance = totalAttendancePossibilities > 0 
        ? Math.round((totalPresentCount / totalAttendancePossibilities) * 100) 
        : 0;

      return {
        id: course.id,
        name: course.name,
        ministryName: course.ministryName || 'Ensino',
        track: course.ebdTrack || 'eletivo',
        type: course.type || 'eletivo',
        classesCount: courseClasses.length,
        enrolledCount,
        averageAttendance,
      };
    })
    .filter(c => selectedTrack === 'all' || c.track === selectedTrack || (selectedTrack === 'eletivo' && c.type === 'eletivo'))
    .sort((a, b) => b.enrolledCount - a.enrolledCount);
  }, [courses, classes, selectedTrack, dateStart, dateEnd]);

  // KPIs globais de todo o Ensino
  const globalKpis = useMemo(() => {
    const totalCourses = courses.length;
    const totalClasses = classes.length;
    
    // Contar alunos únicos em todas as turmas
    const uniqueStudents = new Set<string>();
    classes.forEach(cls => cls.students?.forEach(sId => uniqueStudents.add(sId)));
    
    // Média de frequência global
    let totalPossibilities = 0;
    let totalPresents = 0;
    classes.forEach(cls => {
      const course = courses.find(c => c.id === cls.courseId);
      const resolved = getResolvedSchedule(cls, course);
      const activeDates = new Set(resolved.map(r => r.dateStr));

      cls.students?.forEach(studentId => {
        cls.attendance?.forEach(att => {
          if (!activeDates.has(att.date)) return; // Ignora se a aula foi excluída

          if (dateStart || dateEnd) {
            const date = parseISO(att.date.split('T')[0]);
            const start = dateStart ? parseISO(dateStart) : parseISO('2000-01-01');
            const end = dateEnd ? parseISO(dateEnd) : parseISO('2100-01-01');
            if (!isWithinInterval(date, { start, end })) return;
          }

          const isPresent = att.presentStudentIds?.includes(studentId) || att.onlineStudentIds?.includes(studentId);
          const isRepo = att.repositions?.some(r => r.studentId === studentId);
          if (isPresent || isRepo) {
            totalPresents++;
          }
          totalPossibilities++;
        });
      });
    });

    const globalAverage = totalPossibilities > 0 ? Math.round((totalPresents / totalPossibilities) * 100) : 0;

    return {
      totalCourses,
      totalClasses,
      totalStudents: uniqueStudents.size,
      globalAverage,
    };
  }, [courses, classes, dateStart, dateEnd]);

  // Gráfico de barras: alunos por curso
  const chartData = useMemo(() => {
    return courseStats.slice(0, 8).map(c => ({
      name: c.name.length > 15 ? c.name.substring(0, 13) + '...' : c.name,
      'Alunos': c.enrolledCount,
      'Freq. Média (%)': c.averageAttendance
    }));
  }, [courseStats]);

  // Gráfico de pizza: aprovados vs reprovados gerais
  const pieData = useMemo(() => {
    let approved = 0;
    let pending = 0;

    courses.forEach(course => {
      const courseClasses = classes.filter(c => c.courseId === course.id);
      const studentSet = new Set<string>();
      courseClasses.forEach(cls => cls.students?.forEach(sId => studentSet.add(sId)));
      const threshold = course.minAttendanceApproval || 75;

      studentSet.forEach(studentId => {
        let attended = 0;
        let total = 0;

        courseClasses.forEach(cls => {
          if (!cls.students?.includes(studentId)) return;
          const resolved = getResolvedSchedule(cls, course);
          const activeDates = new Set(resolved.map(r => r.dateStr));

          cls.attendance?.forEach(att => {
            if (!activeDates.has(att.date)) return;

            if (dateStart || dateEnd) {
              const date = parseISO(att.date.split('T')[0]);
              const start = dateStart ? parseISO(dateStart) : parseISO('2000-01-01');
              const end = dateEnd ? parseISO(dateEnd) : parseISO('2100-01-01');
              if (!isWithinInterval(date, { start, end })) return;
            }

            const isPresent = att.presentStudentIds?.includes(studentId) || att.onlineStudentIds?.includes(studentId);
            const isRepo = att.repositions?.some(r => r.studentId === studentId);
            if (isPresent || isRepo) attended++;
            total++;
          });
        });

        const rate = total > 0 ? (attended / total) * 100 : 0;
        if (rate >= threshold) {
          approved++;
        } else {
          pending++;
        }
      });
    });

    return [
      { name: 'Apto (Aprovado)', value: approved, color: '#10b981' },
      { name: 'Pendente/Reprovado', value: pending, color: '#f59e0b' }
    ];
  }, [courses, classes, dateStart, dateEnd]);

  const weeklyAttendanceData = useMemo(() => {
    const weeklyMap: Record<string, { weekStart: Date; label: string; count: number }> = {};

    classes.forEach(cls => {
      const course = courses.find(c => c.id === cls.courseId);
      const resolved = getResolvedSchedule(cls, course);
      const activeDates = new Set(resolved.map(r => r.dateStr));

      cls.attendance?.forEach(att => {
        if (!activeDates.has(att.date)) return; // Ignora se a aula foi excluída

        // Filtro por data
        if (dateStart || dateEnd) {
          const date = parseISO(att.date.split('T')[0]);
          const start = dateStart ? parseISO(dateStart) : parseISO('2000-01-01');
          const end = dateEnd ? parseISO(dateEnd) : parseISO('2100-01-01');
          if (!isWithinInterval(date, { start, end })) return;
        }

        const dateObj = parseISO(att.date.split('T')[0]);
        const sunday = startOfWeek(dateObj, { weekStartsOn: 0 });
        const weekKey = format(sunday, 'yyyy-MM-dd');

        // Somar os presentes nessa aula
        const uniquePresents = new Set<string>();
        att.presentStudentIds?.forEach(sId => uniquePresents.add(sId));
        att.onlineStudentIds?.forEach(sId => uniquePresents.add(sId));
        att.repositions?.forEach(r => uniquePresents.add(r.studentId));

        // Filtrar apenas se pertencem à turma
        const activeClassStudents = cls.students || [];
        const presentInClassCount = Array.from(uniquePresents).filter(sId => activeClassStudents.includes(sId)).length;

        if (!weeklyMap[weekKey]) {
          weeklyMap[weekKey] = {
            weekStart: sunday,
            label: format(sunday, "'Semana' dd/MM", { locale: ptBR }),
            count: 0
          };
        }
        weeklyMap[weekKey].count += presentInClassCount;
      });
    });

    return Object.values(weeklyMap)
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
      .map(item => ({
        name: item.label,
        'Presenças': item.count
      }));
  }, [classes, courses, dateStart, dateEnd]);

  const handleExportConsolidatedCSV = () => {
    const headers = ['Curso', 'Trilho', 'Qtd. Turmas', 'Alunos Matriculados', 'Frequência Média (%)'];
    const rows = courseStats.map(c => [
      c.name,
      getTrackName(c.track, c.type),
      c.classesCount,
      c.enrolledCount,
      `${c.averageAttendance}%`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'relatorio_consolidado_ensino.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print-content">
      {/* CSS específico para impressão em PDF */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, nav, aside, footer, button, .print-hidden, .no-print, [role="tablist"], select {
            display: none !important;
          }
          main, .print-content {
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-card {
            page-break-inside: avoid !important;
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
            margin-bottom: 1.5rem !important;
          }
          .print-title {
            font-size: 24px !important;
            font-weight: 900 !important;
          }
        }
      `}} />

      {/* Top Header & Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border shadow-sm print-card">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2 print-title">
            <BarChart2 className="size-6 text-primary print-hidden" />
            Relatórios de Ensino
          </h1>
          <p className="text-xs text-muted-foreground">
            Acompanhe o desempenho, frequência e conclusão dos alunos por curso ou de forma consolidada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto print-hidden">
          <div className="w-[180px] space-y-1.5">
            <Label htmlFor="trackSelector" className="text-[10px] font-black uppercase text-muted-foreground ml-1">Trilho</Label>
            <Select value={selectedTrack} onValueChange={setSelectedTrack}>
              <SelectTrigger id="trackSelector" className="bg-white font-bold h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Trilhos</SelectItem>
                <SelectItem value="discipulado">Trilho de Discipulado</SelectItem>
                <SelectItem value="biblico">Trilho Bíblico</SelectItem>
                <SelectItem value="teologico">Trilho Teológico</SelectItem>
                <SelectItem value="eletivo">Eletivas & Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-[220px] space-y-1.5">
            <Label htmlFor="courseSelector" className="text-[10px] font-black uppercase text-muted-foreground ml-1">Selecionar Curso</Label>
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger id="courseSelector" className="bg-white font-bold h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Visão Geral (Todos os Cursos)</SelectItem>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCourseId === 'all' && (
            <>
              <div className="w-[140px] space-y-1.5 animate-in fade-in duration-200">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">De</Label>
                <input
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-bold"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                />
              </div>

              <div className="w-[140px] space-y-1.5 animate-in fade-in duration-200">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Até</Label>
                <input
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-bold"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                />
              </div>
            </>
          )}

          <Button onClick={handlePrint} variant="outline" size="sm" className="h-10 mt-5 font-bold uppercase gap-1.5">
            <Printer className="size-4" /> PDF
          </Button>
        </div>
      </div>

      {selectedCourseId === 'all' ? (
        // VISÃO GERAL CONSOLIDADA
        <div className="space-y-6">
          {/* KPIs Globais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm border-none bg-white print-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Cursos Ativos</CardTitle>
                <BookOpen className="size-4 text-blue-600 print-hidden" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black">{globalKpis.totalCourses}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Total de cursos catalogados</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none bg-white print-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Turmas Registradas</CardTitle>
                <FileText className="size-4 text-emerald-600 print-hidden" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black">{globalKpis.totalClasses}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Turmas abertas neste ciclo</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none bg-white print-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Alunos Ativos</CardTitle>
                <Users className="size-4 text-indigo-600 print-hidden" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black">{globalKpis.totalStudents}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Membros únicos matriculados</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none bg-white print-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Freq. Média Geral</CardTitle>
                <Percent className="size-4 text-amber-600 print-hidden" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-amber-600">{globalKpis.globalAverage}%</div>
                <p className="text-[10px] text-muted-foreground mt-1">Presença média global em todas as aulas</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos de Visualização Recharts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print-card">
            <Card className="lg:col-span-2 shadow-sm border-none bg-white p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base font-black uppercase text-slate-800">Inscritos por Curso (Top 8)</CardTitle>
                <CardDescription>Comparativo do total de alunos ativos por curso</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px] p-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={11} stroke="#64748b" />
                    <YAxis fontSize={11} stroke="#64748b" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Alunos" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none bg-white p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base font-black uppercase text-slate-800">Aproveitamento Geral</CardTitle>
                <CardDescription>Taxa de aptidão baseada em presença mínima</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px] p-0 flex flex-col justify-center items-center">
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 text-xs font-bold mt-2">
                  <div className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-[#10b981]"></span> Apto</div>
                  <div className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-[#f59e0b]"></span> Pendente</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Linha: Frequência Semanal */}
          <Card className="shadow-sm border-none bg-white p-6 print-card">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base font-black uppercase text-slate-800">Frequência por Semana</CardTitle>
              <CardDescription>Quantidade total de alunos presentes em sala/online por semana</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px] p-0">
              {weeklyAttendanceData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground italic">
                  Nenhuma presença registrada no período selecionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyAttendanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={11} stroke="#64748b" />
                    <YAxis fontSize={11} stroke="#64748b" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Presenças" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Tabela Consolidada por Curso */}
          <Card className="shadow-sm border-none bg-white print-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black uppercase text-slate-800">Estatísticas Consolidadas</CardTitle>
                <CardDescription className="text-xs">Lista de cursos filtrados e desempenho médio</CardDescription>
              </div>
              <Button onClick={handleExportConsolidatedCSV} variant="outline" size="sm" className="font-bold text-xs uppercase tracking-wider gap-1.5 print-hidden">
                <Download className="size-3.5" /> Exportar Planilha
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Curso</TableHead>
                    <TableHead>Trilho / Tipo</TableHead>
                    <TableHead className="text-center">Turmas</TableHead>
                    <TableHead className="text-center">Alunos Inscritos</TableHead>
                    <TableHead className="text-center">Frequência Média</TableHead>
                    <TableHead className="text-right print-hidden">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">Nenhum curso cadastrado.</TableCell>
                    </TableRow>
                  ) : (
                    courseStats.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-bold text-sm text-slate-800">{course.name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs font-medium">{getTrackName(course.track, course.type)}</TableCell>
                        <TableCell className="text-center font-bold text-slate-700">{course.classesCount}</TableCell>
                        <TableCell className="text-center font-black text-slate-800">{course.enrolledCount}</TableCell>
                        <TableCell className="text-center">
                          <span className="font-black text-sm text-primary">{course.averageAttendance}%</span>
                        </TableCell>
                        <TableCell className="text-right print-hidden">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="font-bold text-xs gap-1 hover:text-primary"
                            onClick={() => setSelectedCourseId(course.id)}
                          >
                            Ver Detalhes <ChevronRight className="size-3.5" />
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
      ) : (
        // DETALHE DO CURSO SELECIONADO
        <Card className="shadow-sm border-none bg-white p-6 print-card">
          <CourseReports courseId={selectedCourseId} />
        </Card>
      )}
    </div>
  );
}

export default function GeneralTeachingReportsPage() {
  return (
    <VolunteeringProvider>
      <GeneralTeachingReportsContent />
    </VolunteeringProvider>
  );
}

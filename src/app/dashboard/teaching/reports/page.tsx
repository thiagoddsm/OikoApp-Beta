'use client';

import React, { useState, useMemo } from 'react';
import { VolunteeringProvider, useVolunteering, getResolvedSchedule } from '@/contexts/volunteering-context';
import { CourseReports } from '@/components/teaching/course-reports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BarChart2, BookOpen, Users, Award, Percent, ChevronRight, FileText, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function GeneralTeachingReportsContent() {
  const { courses, classes, users } = useVolunteering();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');

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
        classesCount: courseClasses.length,
        enrolledCount,
        averageAttendance,
      };
    }).sort((a, b) => b.enrolledCount - a.enrolledCount);
  }, [courses, classes]);

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
  }, [courses, classes]);

  const handleExportConsolidatedCSV = () => {
    const headers = ['Curso', 'Ministerio', 'Qtd. Turmas', 'Alunos Matriculados', 'Frequência Média (%)'];
    const rows = courseStats.map(c => [
      c.name,
      c.ministryName,
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

  return (
    <div className="space-y-6">
      {/* Top Header & Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <BarChart2 className="size-6 text-primary" />
            Relatórios de Ensino
          </h1>
          <p className="text-xs text-muted-foreground">
            Acompanhe o desempenho, frequência e conclusão dos alunos por curso ou de forma consolidada.
          </p>
        </div>

        <div className="w-full sm:w-[300px] space-y-1.5 shrink-0">
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
      </div>

      {selectedCourseId === 'all' ? (
        // VISÃO GERAL CONSOLIDADA
        <div className="space-y-6">
          {/* KPIs Globais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm border-none bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Cursos Ativos</CardTitle>
                <BookOpen className="size-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black">{globalKpis.totalCourses}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Total de cursos catalogados</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Turmas Registradas</CardTitle>
                <FileText className="size-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black">{globalKpis.totalClasses}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Turmas abertas neste ciclo</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Alunos Ativos</CardTitle>
                <Users className="size-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black">{globalKpis.totalStudents}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Membros únicos matriculados</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Freq. Média Geral</CardTitle>
                <Percent className="size-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-amber-600">{globalKpis.globalAverage}%</div>
                <p className="text-[10px] text-muted-foreground mt-1">Presença média global em todas as aulas</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela Consolidada por Curso */}
          <Card className="shadow-sm border-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black uppercase text-slate-800">Estatísticas Consolidadas por Curso</CardTitle>
                <CardDescription className="text-xs">Lista consolidada com o aproveitamento de cada curso ativo</CardDescription>
              </div>
              <Button onClick={handleExportConsolidatedCSV} variant="outline" size="sm" className="font-bold text-xs uppercase tracking-wider gap-1.5">
                <Download className="size-3.5" /> Exportar Planilha
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Curso</TableHead>
                    <TableHead>Ministério</TableHead>
                    <TableHead className="text-center">Turmas</TableHead>
                    <TableHead className="text-center">Alunos Inscritos</TableHead>
                    <TableHead className="text-center">Frequência Média</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
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
                        <TableCell className="text-muted-foreground text-xs font-medium">{course.ministryName}</TableCell>
                        <TableCell className="text-center font-bold text-slate-700">{course.classesCount}</TableCell>
                        <TableCell className="text-center font-black text-slate-800">{course.enrolledCount}</TableCell>
                        <TableCell className="text-center">
                          <span className="font-black text-sm text-primary">{course.averageAttendance}%</span>
                        </TableCell>
                        <TableCell className="text-right">
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
        <Card className="shadow-sm border-none bg-white p-6">
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

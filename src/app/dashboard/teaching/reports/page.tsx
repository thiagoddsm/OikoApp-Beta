'use client';

import React, { useState, useMemo } from 'react';
import { VolunteeringProvider, useVolunteering, getResolvedSchedule } from '@/contexts/volunteering-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart2, 
  BookOpen, 
  Users, 
  Percent, 
  Printer, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  Award 
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMembersData, useCoursesData } from "@/hooks/useDomainData";

function GeneralTeachingReportsContent() {
  const { users } = useMembersData();
  const { courses, classes } = useCoursesData();

  // Estados dos filtros
  const [selectedCycle, setSelectedCycle] = useState<string>('all');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');

  // Controle de expansão das aulas por curso
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});

  // Obter ciclos únicos ordenados
  const cycles = useMemo(() => {
    const set = new Set<string>();
    classes.forEach(c => { if (c.cycle) set.add(c.cycle); });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [classes]);

  // Helper de comparação rápida de datas (ISO string compare)
  const isDateInRange = (dateStr: string) => {
    const cleanDate = dateStr.split('T')[0];
    if (dateStart && cleanDate < dateStart) return false;
    if (dateEnd && cleanDate > dateEnd) return false;
    return true;
  };

  // Filtrar turmas pelo ciclo ativo e trilho selecionado
  const filteredClassesByCycleAndTrack = useMemo(() => {
    let result = classes;
    if (selectedCycle !== 'all') {
      result = result.filter(c => c.cycle === selectedCycle);
    }
    if (selectedTrack !== 'all') {
      result = result.filter(c => {
        const course = courses.find(co => co.id === c.courseId);
        if (!course) return false;
        if (selectedTrack === 'eletivo') {
          return (course.ebdTrack as any) === 'eletivo' || (course as any).type === 'eletivo';
        }
        return (course.ebdTrack as any) === selectedTrack;
      });
    }
    return result;
  }, [classes, courses, selectedCycle, selectedTrack]);

  // Obter cursos únicos baseados nas turmas filtradas pelo ciclo/trilho
  const filteredCoursesByCycle = useMemo(() => {
    const courseIds = new Set(filteredClassesByCycleAndTrack.map(c => c.courseId));
    return courses.filter(c => courseIds.has(c.id));
  }, [courses, filteredClassesByCycleAndTrack]);

  // Filtrar turmas considerando também o curso selecionado e a turma selecionada
  const filteredClasses = useMemo(() => {
    let result = filteredClassesByCycleAndTrack;
    if (selectedCourseId !== 'all') {
      result = result.filter(c => c.courseId === selectedCourseId);
    }
    if (selectedClassId !== 'all') {
      result = result.filter(c => c.id === selectedClassId);
    }
    return result;
  }, [filteredClassesByCycleAndTrack, selectedCourseId, selectedClassId]);

  const toggleCourseExpanded = (courseId: string) => {
    setExpandedCourses(prev => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  // ── 1. CÁLCULO DE INSCRITOS POR CURSO ─────────────────────────────────────────
  const enrollmentStats = useMemo(() => {
    let totalInscritos = 0;
    const distribution: Record<string, { name: string; count: number; track: string }> = {};

    filteredClasses.forEach(cls => {
      const course = courses.find(c => c.id === cls.courseId);
      if (!course) return;

      const studentCount = cls.students?.length || 0;
      totalInscritos += studentCount;

      if (!distribution[course.id]) {
        distribution[course.id] = { 
          name: course.name, 
          count: 0, 
          track: course.ebdTrack || 'discipulado' 
        };
      }
      distribution[course.id].count += studentCount;
    });

    return {
      total: totalInscritos,
      list: Object.entries(distribution).map(([id, info]) => ({ id, ...info })).sort((a, b) => b.count - a.count)
    };
  }, [filteredClasses, courses]);

  // ── 2. CÁLCULO DE FREQUÊNCIA E PRESENÇAS ──────────────────────────────────────
  const frequencyStats = useMemo(() => {
    let totalPossibilities = 0;
    let totalPresents = 0;
    const courseFreq: Record<string, { total: number; presents: number }> = {};

    filteredClasses.forEach(cls => {
      const course = courses.find(c => c.id === cls.courseId);
      if (!course) return;

      const resolved = getResolvedSchedule(cls, course);
      const activeDates = new Set(resolved.map(r => r.dateStr));

      if (!courseFreq[course.id]) {
        courseFreq[course.id] = { total: 0, presents: 0 };
      }

      cls.students?.forEach(studentId => {
        cls.attendance?.forEach(att => {
          if (!activeDates.has(att.date)) return;
          if (!isDateInRange(att.date)) return; // Filtro de data

          const isPresent = att.presentStudentIds?.includes(studentId) || att.onlineStudentIds?.includes(studentId);
          const isRepo = att.repositions?.some(r => r.studentId === studentId);

          if (isPresent || isRepo) {
            totalPresents++;
            courseFreq[course.id].presents++;
          }
          totalPossibilities++;
          courseFreq[course.id].total++;
        });
      });
    });

    const averageGlobal = totalPossibilities > 0 ? Math.round((totalPresents / totalPossibilities) * 100) : 0;

    const list = Object.entries(courseFreq).map(([id, stats]) => {
      const course = courses.find(c => c.id === id);
      return {
        id,
        name: course?.name || 'Desconhecido',
        average: stats.total > 0 ? Math.round((stats.presents / stats.total) * 100) : 0
      };
    }).sort((a, b) => b.average - a.average);

    return {
      globalAverage: averageGlobal,
      totalPresences: totalPresents,
      courseAverages: list
    };
  }, [filteredClasses, courses, dateStart, dateEnd]);

  // ── 3. DETALHAMENTO DE FREQUÊNCIA POR AULA ────────────────────────────────────
  const classesAndLessonsDetail = useMemo(() => {
    const result: Record<string, {
      courseName: string;
      lessons: {
        title: string;
        date: string;
        present: number;
        absent: number;
        rate: number;
      }[];
    }> = {};

    filteredClasses.forEach(cls => {
      const course = courses.find(c => c.id === cls.courseId);
      if (!course) return;

      const resolved = getResolvedSchedule(cls, course);
      const activeDates = new Set(resolved.map(r => r.dateStr));

      resolved.forEach((session, index) => {
        if (!isDateInRange(session.dateStr)) return; // Filtro de data

        if (!result[course.id]) {
          result[course.id] = { courseName: course.name, lessons: [] };
        }

        const attRecord = cls.attendance?.find(a => a.date === session.dateStr);
        const uniquePresents = new Set<string>();
        attRecord?.presentStudentIds?.forEach(id => uniquePresents.add(id));
        attRecord?.onlineStudentIds?.forEach(id => uniquePresents.add(id));
        attRecord?.repositions?.forEach(r => uniquePresents.add(r.studentId));

        const activeStudents = cls.students || [];
        const presentCount = Array.from(uniquePresents).filter(id => activeStudents.includes(id)).length;
        const totalStudents = activeStudents.length;
        const absentCount = Math.max(0, totalStudents - presentCount);
        const rate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

        result[course.id].lessons.push({
          title: session.syllabusItem?.title || session.syllabusItem?.name || `Aula ${index + 1}`,
          date: session.dateStr,
          present: presentCount,
          absent: absentCount,
          rate
        });
      });
    });

    return result;
  }, [filteredClasses, courses, dateStart, dateEnd]);

  // ── 4. PROJEÇÃO DE APROVAÇÃO / REPROVAÇÃO ──────────────────────────────────────
  const approvalProjections = useMemo(() => {
    let totalInscritos = 0;
    let elegiveisHoje = 0;
    let projAprovados = 0;
    let projReprovados = 0;

    filteredClasses.forEach(cls => {
      const course = courses.find(c => c.id === cls.courseId);
      if (!course) return;

      const resolved = getResolvedSchedule(cls, course);
      const totalLessons = resolved.filter(r => isDateInRange(r.dateStr)).length;
      if (totalLessons === 0) return;

      const minAttendanceRate = course.minAttendanceApproval || 75;
      const maxAbsencesAllowed = Math.floor((1 - (minAttendanceRate / 100)) * totalLessons);

      const activeStudents = cls.students || [];
      totalInscritos += activeStudents.length;

      activeStudents.forEach(studentId => {
        let absencesCount = 0;
        let lessonsConducted = 0;
        let presentsCount = 0;

        cls.attendance?.forEach(att => {
          // Apenas contar aulas válidas no cronograma e no intervalo de datas
          const isValidSession = resolved.some(r => r.dateStr === att.date);
          if (!isValidSession) return;
          if (!isDateInRange(att.date)) return;

          lessonsConducted++;
          const isPresent = att.presentStudentIds?.includes(studentId) || att.onlineStudentIds?.includes(studentId);
          const isRepo = att.repositions?.some(r => r.studentId === studentId);

          if (isPresent || isRepo) {
            presentsCount++;
          } else {
            absencesCount++;
          }
        });

        // ELEGÍVEL HOJE: Suas faltas atuais não ultrapassam o limite máximo de faltas do curso inteiro.
        const isEligible = absencesCount <= maxAbsencesAllowed;
        if (isEligible) {
          elegiveisHoje++;
        }

        // PROJEÇÃO DE APROVAÇÃO:
        // Assumindo que nas aulas restantes o aluno mantém sua frequência média histórica.
        const historicalRate = lessonsConducted > 0 ? (presentsCount / lessonsConducted) : 1.0;
        const remainingLessons = Math.max(0, totalLessons - lessonsConducted);
        const projectedPresents = presentsCount + (remainingLessons * historicalRate);
        const projectedRate = (projectedPresents / totalLessons) * 100;

        if (projectedRate >= minAttendanceRate && isEligible) {
          projAprovados++;
        } else {
          projReprovados++;
        }
      });
    });

    return {
      totalInscritos,
      elegiveisHoje,
      projAprovados,
      projReprovados
    };
  }, [filteredClasses, courses, dateStart, dateEnd]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
      {/* CSS para Impressão PDF */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 12px !important;
          }
          .print-hide {
            display: none !important;
          }
          .print-full {
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-card {
            page-break-inside: avoid !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            margin-bottom: 12px !important;
          }
        }
      `}} />

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border shadow-sm print-card">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Award className="size-6 text-primary print-hide" />
            Dashboard Gerencial do Ensino
          </h1>
          <p className="text-xs text-muted-foreground">
            Acompanhe a saúde pedagógica, frequência e projeções de aprovação do Trilho de Discipulado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto print-hide">
          {/* Seletor de Trilho */}
          <div className="w-[160px] space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-slate-500">Trilho</Label>
            <Select value={selectedTrack} onValueChange={(val) => {
              setSelectedTrack(val);
              setSelectedCourseId('all');
              setSelectedClassId('all');
            }}>
              <SelectTrigger className="bg-white font-bold h-10">
                <SelectValue placeholder="Selecione o Trilho" />
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

          {/* Seletor de Ciclo */}
          <div className="w-[130px] space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-slate-500">Ciclo</Label>
            <Select value={selectedCycle} onValueChange={(val) => {
              setSelectedCycle(val);
              setSelectedCourseId('all');
              setSelectedClassId('all');
            }}>
              <SelectTrigger className="bg-white font-bold h-10">
                <SelectValue placeholder="Selecione o Ciclo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Ciclos</SelectItem>
                {cycles.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seletor de Curso */}
          <div className="w-[160px] space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-slate-500">Curso</Label>
            <Select value={selectedCourseId} onValueChange={(val) => {
              setSelectedCourseId(val);
              setSelectedClassId('all');
            }}>
              <SelectTrigger className="bg-white font-bold h-10">
                <SelectValue placeholder="Todos os Cursos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Cursos</SelectItem>
                {filteredCoursesByCycle.map(course => (
                  <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seletor de Turma */}
          <div className="w-[160px] space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-slate-500">Turma</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="bg-white font-bold h-10">
                <SelectValue placeholder="Todas as Turmas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Turmas</SelectItem>
                {filteredClassesByCycleAndTrack
                  .filter(c => selectedCourseId === 'all' || c.courseId === selectedCourseId)
                  .map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data Início */}
          <div className="w-[130px] space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-slate-500 font-bold">Início</Label>
            <input
              type="date"
              className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-bold"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
            />
          </div>

          {/* Data Fim */}
          <div className="w-[130px] space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-slate-500 font-bold">Fim</Label>
            <input
              type="date"
              className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-bold"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
            />
          </div>

          <Button onClick={handlePrint} variant="outline" className="h-10 mt-5 font-bold uppercase gap-1.5">
            <Printer className="size-4" /> Imprimir Relatório
          </Button>
        </div>
      </div>

      {/* Indicadores do Ciclo (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print-card">
        {/* Inscrições */}
        <Card className="shadow-sm border border-slate-100 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Inscrições</CardTitle>
            <Users className="size-4 text-indigo-500 print-hide" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-indigo-600">{enrollmentStats.total}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Alunos inscritos ativos</p>
          </CardContent>
        </Card>

        {/* Frequência Média */}
        <Card className="shadow-sm border border-slate-100 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Presença Média</CardTitle>
            <Percent className="size-4 text-emerald-500 print-hide" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600">{frequencyStats.globalAverage}%</div>
            <p className="text-[10px] text-muted-foreground mt-1">{frequencyStats.totalPresences} presenças registradas</p>
          </CardContent>
        </Card>

        {/* Elegíveis Hoje */}
        <Card className="shadow-sm border border-slate-100 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Elegíveis Hoje</CardTitle>
            <TrendingUp className="size-4 text-blue-500 print-hide" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600">{approvalProjections.elegiveisHoje}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Dentro da margem de faltas permitidas</p>
          </CardContent>
        </Card>

        {/* Projeção de Aprovação */}
        <Card className="shadow-sm border border-slate-100 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Projeção Aprovados</CardTitle>
            <CheckCircle2 className="size-4 text-violet-500 print-hide" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-violet-600">{approvalProjections.projAprovados}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Projeção de reprovação: {approvalProjections.projReprovados}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribuição de Alunos e Frequência Média por Curso */}
        <div className="lg:col-span-1 space-y-6">
          {/* Distribuição */}
          <Card className="shadow-sm border border-slate-100 bg-white print-card">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase text-slate-800">Distribuição por Curso</CardTitle>
              <CardDescription className="text-xs">Número de alunos matriculados no período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {enrollmentStats.list.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhum aluno inscrito.</p>
                ) : (
                  enrollmentStats.list.map(c => {
                    const pct = enrollmentStats.total > 0 ? Math.round((c.count / enrollmentStats.total) * 100) : 0;
                    return (
                      <div key={c.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-700 truncate max-w-[180px]">{c.name}</span>
                          <span className="text-slate-900 font-bold">{c.count} alunos ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Frequência Média */}
          <Card className="shadow-sm border border-slate-100 bg-white print-card">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase text-slate-800">Média por Curso</CardTitle>
              <CardDescription className="text-xs">Taxa de presença acumulada por curso</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {frequencyStats.courseAverages.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhum dado de frequência.</p>
                ) : (
                  frequencyStats.courseAverages.map(c => (
                    <div key={c.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700 truncate max-w-[180px]">{c.name}</span>
                        <span className="text-emerald-600 font-bold">{c.average}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${c.average}%` }}></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Frequência por Aula e Detalhamento */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border border-slate-100 bg-white print-card">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase text-slate-800">Frequência por Encontro (Aulas)</CardTitle>
              <CardDescription className="text-xs">Monitore a frequência de cada aula nos cursos ativos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.keys(classesAndLessonsDetail).length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 italic">
                  Selecione um ciclo ou curso ativo para ver as aulas.
                </div>
              ) : (
                Object.entries(classesAndLessonsDetail).map(([courseId, data]) => {
                  const isExpanded = expandedCourses[courseId] ?? false;
                  return (
                    <div key={courseId} className="border border-slate-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleCourseExpanded(courseId)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="size-4 text-primary" />
                          <span className="font-bold text-sm text-slate-800">{data.courseName}</span>
                          <Badge variant="secondary" className="text-[10px] ml-1">{data.lessons.length} aulas</Badge>
                        </div>
                        {isExpanded ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100 p-2 bg-white">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500">Aula / Conteúdo</TableHead>
                                <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500 text-center">Presentes</TableHead>
                                <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500 text-center">Faltas</TableHead>
                                <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500 text-center">Aproveitamento</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {data.lessons.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center py-4 text-xs text-muted-foreground italic">Nenhuma aula gerada no cronograma.</TableCell>
                                </TableRow>
                              ) : (
                                data.lessons.map((lesson, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="py-2 text-xs font-semibold text-slate-800">
                                      {lesson.title}
                                    </TableCell>
                                    <TableCell className="py-2 text-center text-xs font-bold text-emerald-600">
                                      {lesson.present}
                                    </TableCell>
                                    <TableCell className="py-2 text-center text-xs font-bold text-red-500">
                                      {lesson.absent}
                                    </TableCell>
                                    <TableCell className="py-2 text-center">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${lesson.rate >= 90 ? 'bg-emerald-50 text-emerald-700' : lesson.rate >= 75 ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                                        {lesson.rate}%
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Relatório Gerencial Consolidado (Tabela de Impressão e Auditoria) */}
      <Card className="shadow-sm border border-slate-100 bg-white print-card">
        <CardHeader>
          <CardTitle className="text-base font-black uppercase text-slate-800">Relatório Executivo do Ciclo</CardTitle>
          <CardDescription className="text-xs">Visão geral consolidada para liderança e coordenação de Ensino</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead className="text-center">Matrículas</TableHead>
                <TableHead className="text-center">Frequência</TableHead>
                <TableHead className="text-center">Elegíveis (Hoje)</TableHead>
                <TableHead className="text-center">Proj. Formandos</TableHead>
                <TableHead className="text-center">Proj. Reprovação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoursesByCycle.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                    Nenhum curso cadastrado ou ativo no ciclo selecionado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCoursesByCycle.map(course => {
                  const stats = enrollmentStats.list.find(e => e.id === course.id);
                  const enrolled = stats?.count || 0;
                  const freq = frequencyStats.courseAverages.find(f => f.id === course.id)?.average || 0;

                  // Projeção local por curso
                  let localElegiveis = 0;
                  let localAprovados = 0;
                  let localReprovados = 0;

                  const courseClasses = filteredClasses.filter(c => c.courseId === course.id);
                  courseClasses.forEach(cls => {
                    const resolved = getResolvedSchedule(cls, course);
                    const totalLessons = resolved.length;
                    if (totalLessons === 0) return;

                    const minAttendanceRate = course.minAttendanceApproval || 75;
                    const maxAbsencesAllowed = Math.floor((1 - (minAttendanceRate / 100)) * totalLessons);

                    cls.students?.forEach(studentId => {
                      let absencesCount = 0;
                      let lessonsConducted = 0;
                      let presentsCount = 0;

                      cls.attendance?.forEach(att => {
                        const isValidSession = resolved.some(r => r.dateStr === att.date);
                        if (!isValidSession) return;

                        lessonsConducted++;
                        const isPresent = att.presentStudentIds?.includes(studentId) || att.onlineStudentIds?.includes(studentId);
                        const isRepo = att.repositions?.some(r => r.studentId === studentId);

                        if (isPresent || isRepo) presentsCount++;
                        else absencesCount++;
                      });

                      if (absencesCount <= maxAbsencesAllowed) localElegiveis++;

                      const historicalRate = lessonsConducted > 0 ? (presentsCount / lessonsConducted) : 1.0;
                      const remainingLessons = Math.max(0, totalLessons - lessonsConducted);
                      const projectedPresents = presentsCount + (remainingLessons * historicalRate);
                      const projectedRate = (projectedPresents / totalLessons) * 100;

                      if (projectedRate >= minAttendanceRate && absencesCount <= maxAbsencesAllowed) {
                        localAprovados++;
                      } else {
                        localReprovados++;
                      }
                    });
                  });

                  return (
                    <TableRow key={course.id}>
                      <TableCell className="font-bold text-sm text-slate-800">{course.name}</TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{enrolled}</TableCell>
                      <TableCell className="text-center font-black text-emerald-600">{freq}%</TableCell>
                      <TableCell className="text-center font-bold text-blue-600">{localElegiveis}</TableCell>
                      <TableCell className="text-center font-black text-indigo-600">{localAprovados}</TableCell>
                      <TableCell className="text-center font-bold text-red-500">{localReprovados}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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

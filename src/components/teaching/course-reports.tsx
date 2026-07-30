'use client';

import React, { useMemo, useState } from 'react';
import { useVolunteering, getModuleIndexForDate, getResolvedSchedule } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, Award, Percent, BookOpen, Download, Calendar, Printer } from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar, Legend } from 'recharts';
import { useMembersData, useCoursesData } from "@/hooks/useDomainData";

interface CourseReportsProps {
  courseId: string;
}

export function CourseReports({ courseId }: CourseReportsProps) {
    const { users } = useMembersData();
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();

  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');

  const course = useMemo(() => courses.find(c => c.id === courseId), [courses, courseId]);
  const courseClasses = useMemo(() => classes.filter(c => c.courseId === courseId), [classes, courseId]);
  const threshold = course?.minAttendanceApproval || 75;

  const safeParseISO = (dateStr: string): Date => {
    if (!dateStr || typeof dateStr !== 'string') return new Date(NaN);
    const withoutTime = dateStr.split('T')[0];
    const cleanD = withoutTime.split('-').slice(0, 3).join('-');
    const parsed = parseISO(cleanD);
    return isNaN(parsed.getTime()) ? new Date(NaN) : parsed;
  };


  const filteredClasses = useMemo(() => {
    if (selectedClassId === 'all') return courseClasses;
    return courseClasses.filter(c => c.id === selectedClassId);
  }, [courseClasses, selectedClassId]);

  // Alunos e estatísticas de frequência
  const stats = useMemo(() => {
    const studentSet = new Set<string>();
    filteredClasses.forEach(cls => cls.students?.forEach(sId => studentSet.add(sId)));
    const enrolledStudents = users.filter(u => studentSet.has(u.id));

    let totalAttendancePossibilities = 0;
    let totalPresentCount = 0;

    let approvedCount = 0;
    let rejectedCount = 0;
    let pendingCount = 0;

    const studentReportList = enrolledStudents.map(student => {
      let attendedClasses = 0;
      let totalClassDates = 0;

      filteredClasses.forEach(cls => {
        if (!cls.students?.includes(student.id)) return;

        const resolved = getResolvedSchedule(cls, courses.find(c => c.id === cls.courseId));
        const activeDates = new Set(resolved.map(r => r.dateStr));

        // Aulas da turma filtrando por data (se aplicável)
        const classDates = new Set<string>();
        cls.attendance?.forEach(att => {
          if (!activeDates.has(att.date)) return; // Ignora se a aula foi cancelada/excluída

          if (dateStart || dateEnd) {
            const date = safeParseISO(att.date);
            const start = dateStart ? safeParseISO(dateStart) : safeParseISO('2000-01-01');
            const end = dateEnd ? safeParseISO(dateEnd) : safeParseISO('2100-01-01');
            if (isNaN(date.getTime()) || !isWithinInterval(date, { start, end })) return;
          }
          classDates.add(att.date);

          const isPresent = att.presentStudentIds?.includes(student.id) || att.onlineStudentIds?.includes(student.id);
          const isRepo = att.repositions?.some(r => r.studentId === student.id);
          
          let hasCompleted = isPresent || isRepo;
          
          if (!hasCompleted) {
            const modIndex = getModuleIndexForDate(att.date, cls, course?.syllabus || []);
            if (modIndex !== -1) {
              const hasRepoInOtherClass = courseClasses.some(otherCls => 
                otherCls.id !== cls.id && 
                otherCls.attendance?.some(otherAtt => 
                  getModuleIndexForDate(otherAtt.date, otherCls, course?.syllabus || []) === modIndex &&
                  (otherAtt.presentStudentIds?.includes(student.id) || 
                   otherAtt.onlineStudentIds?.includes(student.id) ||
                   otherAtt.repositions?.some(r => r.studentId === student.id))
                )
              );
              
              const isMembership = Boolean(
                course?.id === 'pertencer' ||
                course?.id === 'membros' ||
                course?.linkedTheoflixId === 'membros' ||
                /^(pertencer|curso de membro|curso de membros)/i.test(course?.name || '')
              );
              const isManualDone = isMembership
                ? student.journey?.memberCourseProgress?.[`module${modIndex + 1}`]
                : student.journey?.courseProgress?.[cls.courseId]?.[`module${modIndex + 1}`];
              
              if (hasRepoInOtherClass || isManualDone) {
                hasCompleted = true;
              }
            }
          }

          if (hasCompleted) {
            attendedClasses++;
          }
          // NOTE: totalAttendancePossibilities is accumulated below via += totalClassDates
          // (removed the ++ here that was causing double-counting)

        });

        totalClassDates += classDates.size;
      });

      const attendanceRate = totalClassDates > 0 ? (attendedClasses / totalClassDates) * 100 : 0;
      const isApproved = attendanceRate >= threshold;
      
      if (attendanceRate >= threshold) {
        approvedCount++;
      } else if (totalClassDates > 0) {
        rejectedCount++;
      } else {
        pendingCount++;
      }

      totalAttendancePossibilities += totalClassDates;
      totalPresentCount += attendedClasses;

      return {
        id: student.id,
        name: student.name,
        attended: attendedClasses,
        total: totalClassDates,
        rate: Math.round(attendanceRate),
        status: isApproved ? 'Aprovado' : 'Pendente/Reprovado'
      };
    }).sort((a, b) => b.rate - a.rate);

    const averageAttendance = totalAttendancePossibilities > 0 ? (totalPresentCount / totalAttendancePossibilities) * 100 : 0;

    return {
      enrolledCount: enrolledStudents.length,
      approvedCount,
      rejectedCount,
      pendingCount,
      averageAttendance: Math.round(averageAttendance),
      students: studentReportList
    };
  }, [filteredClasses, users, threshold, dateStart, dateEnd]);

  // Estatística aula a aula
  const classByClassReport = useMemo(() => {
    const reportMap: Record<string, { date: string; title: string; present: number; total: number }> = {};

    filteredClasses.forEach(cls => {
      const resolved = getResolvedSchedule(cls, courses.find(c => c.id === cls.courseId));
      const activeDates = new Set(resolved.map(r => r.dateStr));

      cls.attendance?.forEach(att => {
        if (!activeDates.has(att.date)) return; // Ignora se a aula foi cancelada/excluída

        if (dateStart || dateEnd) {
          const date = safeParseISO(att.date);
          const start = dateStart ? safeParseISO(dateStart) : safeParseISO('2000-01-01');
          const end = dateEnd ? safeParseISO(dateEnd) : safeParseISO('2100-01-01');
          if (isNaN(date.getTime()) || !isWithinInterval(date, { start, end })) return;
        }

        const presentCount = (att.presentStudentIds?.length || 0) + (att.onlineStudentIds?.length || 0);
        const enrolledInClass = cls.students?.length || 0;

        const modIndex = getModuleIndexForDate(att.date, cls, course?.syllabus || []);
        const modTitle = modIndex !== -1 ? course?.syllabus?.[modIndex]?.title : 'Aula Extra / Reposição';

        if (!reportMap[att.date]) {
          reportMap[att.date] = {
            date: att.date,
            title: modTitle || 'Aula',
            present: 0,
            total: 0
          };
        }

        reportMap[att.date].present += presentCount;
        reportMap[att.date].total += enrolledInClass;
      });
    });

    return Object.values(reportMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredClasses, course, dateStart, dateEnd]);

  const handleExportCSV = () => {
    const headers = ['Nome do Aluno', 'Presenças', 'Aulas Totais', 'Frequencia (%)', 'Status'];
    const rows = stats.students.map(s => [
      s.name,
      s.attended,
      s.total,
      `${s.rate}%`,
      s.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_${course?.name?.toLowerCase().replace(/\s+/g, '_') || 'ensino'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col md:flex-row md:items-end gap-4 bg-slate-50 p-4 rounded-xl border border-dashed print-hidden">
        <div className="flex-1 space-y-1">
          <Label className="text-[10px] font-black uppercase text-muted-foreground">Turma</Label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="h-10 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Turmas</SelectItem>
              {courseClasses.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-black uppercase text-muted-foreground">De</Label>
          <input
            type="date"
            className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-black uppercase text-muted-foreground">Até</Label>
          <input
            type="date"
            className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" className="h-10 font-bold uppercase tracking-widest text-xs px-5">
            <Download className="size-4 mr-2" /> CSV
          </Button>
        </div>
      </div>

      {/* Gráfico de Evolução de Frequência */}
      {classByClassReport.length > 0 && (
        <Card className="shadow-sm border-none bg-slate-50/30 p-6 print-card">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base font-black uppercase text-slate-800">Evolução da Frequência por Aula</CardTitle>
            <CardDescription>Percentual de presença registrada ao longo do curso</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] p-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={classByClassReport.map(session => {
                const parsedDate = safeParseISO(session.date);
                const formattedDate = isNaN(parsedDate.getTime()) ? 'Data Inválida' : format(parsedDate, 'dd/MM');
                return {
                  date: formattedDate,
                  'Freq. (%)': session.total > 0 ? Math.round((session.present / session.total) * 100) : 0,
                  'Alunos Presentes': session.present,
                  'Alunos Totais': session.total
                };
              })}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={11} stroke="#64748b" />
                <YAxis yAxisId="left" domain={[0, 100]} fontSize={11} stroke="#64748b" tickFormatter={(value) => `${value}%`} />
                <YAxis yAxisId="right" orientation="right" fontSize={11} stroke="#64748b" />
                <Tooltip formatter={(value: any, name: any) => name === '% de presença' ? [`${value}%`, name] : [value, name]} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar yAxisId="right" dataKey="Alunos Presentes" name="Presença" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Line yAxisId="left" type="monotone" dataKey="Freq. (%)" name="% de presença" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print-card">
        <Card className="shadow-sm border-none bg-slate-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Alunos Inscritos</CardTitle>
            <Users className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{stats.enrolledCount}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Total de alunos vinculados</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none bg-slate-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Aprovados</CardTitle>
            <Award className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">{stats.approvedCount}</div>
            <p className="text-[10px] text-muted-foreground mt-1">{stats.enrolledCount > 0 ? Math.round((stats.approvedCount / stats.enrolledCount) * 100) : 0}% de aprovação ({threshold}%+ freq.)</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none bg-slate-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Frequência Média</CardTitle>
            <Percent className="size-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-indigo-600">{stats.averageAttendance}%</div>
            <p className="text-[10px] text-muted-foreground mt-1">Presença média global</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none bg-slate-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Pendentes / Reprovados</CardTitle>
            <BarChart3 className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600">{stats.rejectedCount + stats.pendingCount}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Abaixo de {threshold}% de frequência</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabela de Alunos */}
        <Card className="lg:col-span-2 shadow-sm border-none">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase text-slate-800">Desempenho dos Alunos</CardTitle>
            <CardDescription className="text-xs">Classificação ordenada por taxa de presença</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead className="text-center">Presenças / Total</TableHead>
                  <TableHead className="text-right">Frequência</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">Nenhum aluno localizado.</TableCell>
                  </TableRow>
                ) : (
                  stats.students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-bold text-sm text-slate-800">{student.name}</TableCell>
                      <TableCell className="text-center font-medium">{student.attended} / {student.total}</TableCell>
                      <TableCell className="text-right font-black text-primary">{student.rate}%</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={student.rate >= threshold ? 'default' : 'outline'} className={student.rate >= threshold ? 'bg-emerald-600' : ''}>
                          {student.rate >= threshold ? 'APTO' : 'PENDENTE'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Frequência Aula a Aula */}
        <Card className="shadow-sm border-none">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase text-slate-800">Frequência Aula a Aula</CardTitle>
            <CardDescription className="text-xs">Detalhamento por data e módulo correspondente</CardDescription>
          </CardHeader>
          <CardContent className="p-0 max-h-[400px] overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aula</TableHead>
                  <TableHead className="text-right">Freq. (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classByClassReport.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center text-muted-foreground italic">Nenhuma aula registrada.</TableCell>
                  </TableRow>
                ) : (
                  classByClassReport.map((session, index) => {
                    const rate = session.total > 0 ? Math.round((session.present / session.total) * 100) : 0;
                    const parsedDate = safeParseISO(session.date);
                    const formattedDate = isNaN(parsedDate.getTime()) ? 'Data Inválida' : format(parsedDate, 'dd/MM/yyyy');
                    return (
                      <TableRow key={session.date}>
                        <TableCell>
                          <div className="font-bold text-sm text-slate-800">
                            {formattedDate}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase truncate max-w-[200px]" title={session.title}>
                            {session.title}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-black text-sm text-slate-700">{rate}%</span>
                          <span className="text-[10px] text-muted-foreground block">
                            ({session.present}/{session.total})
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

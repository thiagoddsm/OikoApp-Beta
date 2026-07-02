
'use client';

import React, { useMemo } from 'react';
import { useVolunteering, type Class, type User } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, CheckCircle2, XCircle, Clock, Loader2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMembersData, useCoursesData } from "@/hooks/useDomainData";

const safeParseISO = (dateStr: string): Date => {
    if (!dateStr || typeof dateStr !== 'string') return new Date(NaN);
    // Strip time component (e.g. T08:00), then take only first 3 dash-parts (YYYY-MM-DD).
    // This correctly handles: '2026-04-05' → '2026-04-05', '2026-06-28-1' → '2026-06-28',
    // '2026-05-02T08:00' → '2026-05-02'. The old regex /-[\d]+$/ was wrongly stripping
    // the day from dates like '2026-04-05' → '2026-04'.
    const withoutTime = dateStr.split('T')[0];
    const parts = withoutTime.split('-');
    const cleanD = parts.slice(0, 3).join('-');
    const parsed = parseISO(cleanD);
    return isNaN(parsed.getTime()) ? new Date(NaN) : parsed;
};



export function ClassPerformanceReport({ classData }: { classData: Class }) {
    const { users } = useMembersData();
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();

    const { isLoading } = useVolunteering();

    const enrolledStudents = useMemo(() => {
        if (!users || !classData?.students) return [];
        const studentSet = new Set(classData.students);
        return users
            .filter(u => studentSet.has(u.id))
            .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    }, [users, classData]);

    // Derive class dates directly from attendance records.
    // Accepts YYYY-MM-DD and YYYY-MM-DD-N (e.g. 2026-06-28-1 for a 2nd session).
    // Only includes past dates that had at least one student recorded.
    const classOccurrences = useMemo(() => {
        if (!classData?.attendance) return [];
        // Matches YYYY-MM-DD or YYYY-MM-DD-N (second/third sessions on the same day)
        const validDateRegex = /^\d{4}-\d{2}-\d{2}(-\d+)?$/;
        const today = format(new Date(), 'yyyy-MM-dd');
        return (classData.attendance as Array<{ date: string; presentStudentIds?: string[]; onlineStudentIds?: string[] }>)
            .filter(a =>
                validDateRegex.test(a.date) &&
                a.date.substring(0, 10) <= today &&
                ((a.presentStudentIds?.length ?? 0) + (a.onlineStudentIds?.length ?? 0)) > 0
            )
            .map(a => a.date)
            .sort();
    }, [classData?.attendance]);


    const assessments = useMemo(() => {
        if (!classData.grades) return [];
        return Array.from(new Set(classData.grades.map(g => g.assessmentName)));
    }, [classData.grades]);

    const exportToExcel = () => {
        const workbook = XLSX.utils.book_new();

        const excelData = enrolledStudents.map(student => {
            const studentGrades: Record<string, any> = {};
            let totalGrade = 0;
            assessments.forEach(assessment => {
                const gradeEntry = classData.grades?.find(g => g.studentId === student.id && g.assessmentName === assessment);
                const grade = gradeEntry?.grade || 0;
                studentGrades[assessment] = grade;
                totalGrade += grade;
            });
            const average = assessments.length > 0 ? (totalGrade / assessments.length).toFixed(1) : '0.0';

            let presentCount = 0;
            let totalClassesTaken = 0;
            const presence: Record<string, string> = {};

            classOccurrences.forEach(date => {
                const cleanDate = date.split('-').slice(0, 3).join('-');
                const record = classData.attendance?.find(a => a.date === date);
                if (record) {
                    totalClassesTaken++;
                    const isPresent = record.presentStudentIds?.includes(student.id) || record.onlineStudentIds?.includes(student.id);
                    if (isPresent) presentCount++;
                    const parsedDate = safeParseISO(cleanDate);
                    presence[format(parsedDate, 'dd/MM')] = isPresent ? 'P' : 'F';
                } else {
                    const parsedDate = safeParseISO(cleanDate);
                    presence[format(parsedDate, 'dd/MM')] = '-';
                }
            });

            const attendancePercent = totalClassesTaken > 0
                ? ((presentCount / totalClassesTaken) * 100).toFixed(0) + '%'
                : '0%';

            return {
                'Nome do Aluno': student.name,
                ...presence,
                'Aulas Realizadas': totalClassesTaken,
                'Presenças': presentCount,
                'Frequência %': attendancePercent,
                ...studentGrades,
                'Média Final': average
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Desempenho");

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        saveAs(data, `Relatorio_Desempenho_${classData.name.replace(/\s+/g, '_')}.xlsx`);
    };

    if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Relatório de Desempenho</h3>
                    <p className="text-sm text-muted-foreground">Frequência e notas consolidadas dos alunos matriculados.</p>
                </div>
                <Button onClick={exportToExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11">
                    <FileSpreadsheet className="mr-2 size-5" /> Exportar Planilha (.xlsx)
                </Button>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                <Info className="size-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                    <p className="font-bold mb-1">Dica de Visualização:</p>
                    <p>Os ícones representam: <CheckCircle2 className="inline size-3.5 text-emerald-500" /> Presença Presencial, <Clock className="inline size-3.5 text-blue-500" /> Presença Online, e <XCircle className="inline size-3.5 text-slate-300" /> Falta ou aula não realizada.</p>
                </div>
            </div>

            <div className="rounded-xl border shadow-sm bg-background overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-2">
                                <TableHead className="min-w-[220px] sticky left-0 bg-muted/50 z-20 border-r">Aluno</TableHead>
                                <TableHead className="text-center bg-blue-50/50 min-w-[100px]">Freq. %</TableHead>
                                {classOccurrences.map(date => {
                                    const parts = date.split('-');
                                    const cleanDate = parts.slice(0, 3).join('-');
                                    const sessionNum = parts.length > 3 ? Number(parts[3]) + 1 : null; // -1 → "(2)", -2 → "(3)"
                                    const parsedDate = safeParseISO(cleanDate);
                                    if (isNaN(parsedDate.getTime())) {
                                        return <TableHead key={date} className="text-center min-w-[70px]">Inválida</TableHead>;
                                    }
                                    return (
                                        <TableHead key={date} className="text-center min-w-[70px] text-[10px] uppercase font-black px-1">
                                            {format(parsedDate, 'dd/MM')}
                                            {sessionNum && <span className="block text-[8px] font-normal text-muted-foreground">({sessionNum}ª)</span>}
                                        </TableHead>
                                    );
                                })}
                                <TableHead className="text-center bg-amber-50/50 min-w-[80px] border-l-2">Média</TableHead>
                                {assessments.map(assessment => (
                                    <TableHead key={assessment} className="text-center min-w-[100px] text-[10px] uppercase font-bold px-2">
                                        {assessment}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {enrolledStudents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={classOccurrences.length + assessments.length + 3} className="h-32 text-center text-muted-foreground italic">
                                        Nenhum aluno matriculado nesta turma para gerar o relatório.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                enrolledStudents.map(student => {
                                    let presentCount = 0;
                                    let totalClassesTaken = 0;

                                    classOccurrences.forEach(date => {
                                        const record = classData.attendance?.find(a => a.date === date);
                                        if (record) {
                                            totalClassesTaken++;
                                            if (record.presentStudentIds?.includes(student.id) || record.onlineStudentIds?.includes(student.id)) {
                                                presentCount++;
                                            }
                                        }
                                    });

                                    const attendancePercent = totalClassesTaken > 0 ? (presentCount / totalClassesTaken) * 100 : 0;

                                    return (
                                        <TableRow key={student.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-bold sticky left-0 bg-background z-10 border-r">{student.name}</TableCell>
                                            <TableCell className="text-center bg-blue-50/10">
                                                <Badge variant={attendancePercent >= 75 ? "default" : "destructive"} className={cn("h-6 font-black", attendancePercent >= 75 ? "bg-emerald-500" : "")}>
                                                    {attendancePercent.toFixed(0)}%
                                                </Badge>
                                            </TableCell>
                                            {classOccurrences.map(date => {
                                                const record = classData.attendance?.find(a => a.date === date);
                                                const isPresent = record?.presentStudentIds?.includes(student.id);
                                                const isOnline = record?.onlineStudentIds?.includes(student.id);

                                                if (!record) return <TableCell key={date} className="text-center opacity-20"><XCircle className="size-4 mx-auto text-slate-300" /></TableCell>;

                                                return (
                                                    <TableCell key={date} className="text-center">
                                                        {isPresent ? (
                                                            <CheckCircle2 className="size-5 text-emerald-500 mx-auto" />
                                                        ) : isOnline ? (
                                                            <Clock className="size-5 text-blue-500 mx-auto" />
                                                        ) : (
                                                            <XCircle className="size-5 text-destructive/40 mx-auto" />
                                                        )}
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell className="text-center font-black text-primary bg-amber-50/20 border-l-2">
                                                {assessments.length > 0 ? (
                                                    (() => {
                                                        let sum = 0;
                                                        assessments.forEach(ass => {
                                                            const g = classData.grades?.find(entry => entry.studentId === student.id && entry.assessmentName === ass);
                                                            sum += (g?.grade || 0);
                                                        });
                                                        return (sum / assessments.length).toFixed(1);
                                                    })()
                                                ) : '-'}
                                            </TableCell>
                                            {assessments.map(assessment => {
                                                const gradeEntry = classData.grades?.find(g => g.studentId === student.id && g.assessmentName === assessment);
                                                return (
                                                    <TableCell key={assessment} className="text-center font-bold text-slate-700">
                                                        {gradeEntry ? gradeEntry.grade.toFixed(1) : '0.0'}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}

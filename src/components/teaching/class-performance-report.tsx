
'use client';

import React, { useMemo } from 'react';
import { useVolunteering, type Class, type User } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, CheckCircle2, XCircle, Clock, Loader2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format, parseISO, isBefore, addWeeks, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';

const weekDayMap: Record<string, number> = {
    "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3,
    "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6
};

export function ClassPerformanceReport({ classData }: { classData: Class }) {
    const { users, pedagogicalLogs, isLoading } = useVolunteering();

    const enrolledStudents = useMemo(() => {
        if (!users || !classData?.students) return [];
        const studentSet = new Set(classData.students);
        return users
            .filter(u => studentSet.has(u.id))
            .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    }, [users, classData]);

    const resolvedSchedule = useMemo(() => {
        if (!classData || !classData.startDate) return [];
        
        const items: any[] = [];
        const start = parseISO(classData.startDate);
        const end = classData.endDate ? parseISO(classData.endDate) : addMonths(start, 2);
        const targetDay = classData.dayOfWeek ? weekDayMap[classData.dayOfWeek] : -1;
        const holidays = new Set(classData.holidayDates || []);
        const overrides = classData.scheduleOverrides || {};

        let current = start;
        let safe = 0;

        // 1. Recorrência base
        if (classData.frequency && classData.frequency !== 'pontual') {
            while (isBefore(current, end) || format(current, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
                if (safe++ > 150) break;
                const dStr = format(current, 'yyyy-MM-dd');
                const override = overrides[dStr];

                // Pular se for feriado sem override, ou se estiver explicitamente cancelado
                if (override?.isCancelled) {
                    current = addWeeks(current, classData.frequency === 'quinzenal' ? 2 : 1);
                    continue;
                }

                if (holidays.has(dStr) && !override) {
                    current = addWeeks(current, classData.frequency === 'quinzenal' ? 2 : 1);
                    continue;
                }

                let matches = false;
                if (classData.frequency === 'semanal') {
                    matches = targetDay === -1 || current.getDay() === targetDay;
                } else if (classData.frequency === 'quinzenal') {
                    const diffWeeks = Math.floor((current.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
                    matches = diffWeeks % 2 === 0 && (targetDay === -1 || current.getDay() === targetDay);
                }

                if (matches) items.push(dStr);
                current = addWeeks(current, classData.frequency === 'quinzenal' ? 2 : 1);
            }
        } else if (classData.frequency === 'pontual') {
            if (!overrides[classData.startDate]?.isCancelled) {
                items.push(classData.startDate);
            }
        }

        // 2. Adicionar overrides de fora da recorrência
        Object.entries(overrides).forEach(([dateStr, override]: [string, any]) => {
            if (override.isCancelled) return;
            if (items.includes(dateStr)) return;
            items.push(dateStr);
        });

        return items.sort();
    }, [classData]);

    const classOccurrences = resolvedSchedule;

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
                const record = classData.attendance?.find(a => a.date === date);
                if (record) {
                    totalClassesTaken++;
                    const isPresent = record.presentStudentIds?.includes(student.id) || record.onlineStudentIds?.includes(student.id);
                    if (isPresent) presentCount++;
                    presence[format(parseISO(date), 'dd/MM')] = isPresent ? 'P' : 'F';
                } else {
                    presence[format(parseISO(date), 'dd/MM')] = '-';
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
                                {classOccurrences.map(date => (
                                    <TableHead key={date} className="text-center min-w-[70px] text-[10px] uppercase font-black px-1">
                                        {format(parseISO(date), 'dd/MM')}
                                    </TableHead>
                                ))}
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

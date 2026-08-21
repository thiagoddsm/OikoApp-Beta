'use client';

import React, { useMemo } from 'react';
import { useVolunteering, getModuleIndexForDate, type Class, type User } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, CheckCircle2, XCircle, Clock, Loader2, PlayCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMembersData, useCoursesData } from "@/hooks/useDomainData";
import { getModuleCompletion } from '@/domain/teaching/module-completion';
import { isMembershipCourse } from '@/lib/teaching/is-membership-course';

const safeParseISO = (dateStr: string): Date => {
    if (!dateStr || typeof dateStr !== 'string') return new Date(NaN);
    const withoutTime = dateStr.split('T')[0];
    const parts = withoutTime.split('-');
    const cleanD = parts.slice(0, 3).join('-');
    const parsed = parseISO(cleanD);
    return isNaN(parsed.getTime()) ? new Date(NaN) : parsed;
};

export function ClassPerformanceReport({ classData }: { classData: Class }) {
    const { users } = useMembersData();
    const { courses, classes } = useCoursesData();
    const { isLoading } = useVolunteering();

    const courseData = useMemo(() => courses.find(c => c.id === classData?.courseId), [courses, classData]);
    const courseClasses = useMemo(() => classes.filter(c => c.courseId === classData?.courseId), [classes, classData]);

    const enrolledStudents = useMemo(() => {
        if (!users || !classData?.students) return [];
        const studentSet = new Set(classData.students);
        return users
            .filter(u => studentSet.has(u.id))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [users, classData]);

    const classOccurrences = useMemo(() => {
        if (!classData?.startDate) return [];
        const uniqueDates = new Set<string>();
        
        (classData.attendance || []).forEach(att => {
            if (att.date && !att.isRepositionOnly) {
                uniqueDates.add(att.date);
            }
        });

        (classData.extraSessions || []).forEach(s => {
            if (!s.isRepositionOnly) {
                const uniqueStr = s.startTime ? `${s.date}T${s.startTime}` : s.date;
                uniqueDates.add(uniqueStr);
            }
        });

        return Array.from(uniqueDates).sort();
    }, [classData]);

    const assessments = useMemo(() => {
        return classData?.grades?.map((g: any) => g.assessmentName || g.name) || [];
    }, [classData]);

    const getStudentLessonStatus = (student: any, date: string) => {
        const cleanDate = date.split('T')[0];
        const record = classData.attendance?.find(a => a.date === date || a.date?.split('T')[0] === cleanDate);
        
        const isInPerson = !!record?.presentStudentIds?.includes(student.id);
        const isOnlineLive = !!record?.onlineStudentIds?.includes(student.id);
        const isNativeRepo = !!record?.repositions?.some((r: any) => r.studentId === student.id);

        let isRepo = isNativeRepo;
        let isOnline = isOnlineLive;

        if (!isInPerson && !isOnlineLive && !isNativeRepo) {
            const modIndex = getModuleIndexForDate(date, classData, courseData?.syllabus || []);
            if (modIndex !== -1) {
                const isMembership = isMembershipCourse(courseData || { id: classData.courseId });
                const courseSyllabus = courseData?.syllabus || [];

                const completion = getModuleCompletion({
                    studentId: student.id,
                    studentEmail: student.email,
                    studentJourney: student.journey,
                    course: courseData || { id: classData.courseId },
                    modIndex,
                    modId: courseSyllabus[modIndex]?.id || (modIndex + 1).toString(),
                    modules: courseSyllabus,
                    courseClasses,
                    isMembership
                });

                if (completion.isDone) {
                    if (completion.isOnline) isOnline = true;
                    else isRepo = true;
                }
            }
        }

        return {
            hasRecord: !!record,
            isInPerson,
            isOnline,
            isRepo,
            isAttended: isInPerson || isOnline || isRepo
        };
    };

    const handleExportExcel = () => {
        const excelData = enrolledStudents.map(student => {
            const studentGrades: Record<string, number> = {};
            let totalGrade = 0;
            assessments.forEach(assessment => {
                const gradeEntry = classData.grades?.find((g: any) => ((g.assessmentName || g.name) === assessment) && g.studentId === student.id);
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
                const status = getStudentLessonStatus(student, date);
                if (status.hasRecord) {
                    totalClassesTaken++;
                    if (status.isAttended) presentCount++;
                    const parsedDate = safeParseISO(cleanDate);
                    presence[format(parsedDate, 'dd/MM')] = status.isInPerson ? 'P' : status.isRepo ? 'R' : status.isOnline ? 'O' : 'F';
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
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Desempenho");

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        saveAs(data, `Relatorio_Desempenho_${classData.name.replace(/\s+/g, '_')}.xlsx`);
    };

    if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-card p-4 rounded-xl border">
                <div>
                    <h3 className="font-black text-lg">Diário de Desempenho e Frequência</h3>
                    <p className="text-xs text-muted-foreground">Visão tabular consolidada de presenças, reposições e notas da turma</p>
                </div>
                <Button onClick={handleExportExcel} className="gap-2 font-bold" variant="outline">
                    <FileSpreadsheet className="size-4 text-emerald-600" /> Exportar Planilha
                </Button>
            </div>

            <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="font-bold min-w-[200px] sticky left-0 bg-muted/50 z-20 border-r">Aluno</TableHead>
                                <TableHead className="text-center font-bold min-w-[80px]">Freq %</TableHead>
                                {classOccurrences.map(date => {
                                    const parsed = safeParseISO(date);
                                    return (
                                        <TableHead key={date} className="text-center font-bold min-w-[70px]">
                                            {format(parsed, 'dd/MM')}
                                        </TableHead>
                                    );
                                })}
                                {assessments.map(assessment => (
                                    <TableHead key={assessment} className="text-center font-bold min-w-[90px] bg-amber-50/10">
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
                                        const status = getStudentLessonStatus(student, date);
                                        if (status.hasRecord) {
                                            totalClassesTaken++;
                                            if (status.isAttended) {
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
                                                const status = getStudentLessonStatus(student, date);

                                                if (!status.hasRecord) return <TableCell key={date} className="text-center opacity-20"><Clock className="size-4 mx-auto text-slate-300" /></TableCell>;

                                                return (
                                                    <TableCell key={date} className="text-center">
                                                        {status.isInPerson ? (
                                                            <CheckCircle2 className="size-5 text-emerald-500 mx-auto" />
                                                        ) : status.isRepo ? (
                                                            <Badge className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 h-5 w-5 p-0 mx-auto flex items-center justify-center font-black text-[10px]">R</Badge>
                                                        ) : status.isOnline ? (
                                                            <PlayCircle className="size-5 text-indigo-500 mx-auto" />
                                                        ) : (
                                                            <XCircle className="size-5 text-destructive/40 mx-auto" />
                                                        )}
                                                    </TableCell>
                                                );
                                            })}
                                            {assessments.map(assessment => {
                                                const gradeEntry = classData.grades?.find((g: any) => ((g.assessmentName || g.name) === assessment) && g.studentId === student.id);
                                                return (
                                                    <TableCell key={assessment} className="text-center font-bold bg-amber-50/5">
                                                        {gradeEntry?.grade ?? '-'}
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

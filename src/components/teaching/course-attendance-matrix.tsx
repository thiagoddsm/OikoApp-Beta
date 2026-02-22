'use client';
import React, { useMemo } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Award, Loader2, Users, GraduationCap, ChevronRight, XCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format, parseISO, isBefore, startOfDay, addWeeks, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const weekDayMap: Record<string, number> = {
    "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3,
    "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6
};

export function CourseAttendanceMatrix({ courseId }: { courseId: string }) {
    const { classes, users, courses, updateVolunteer, isLoading } = useVolunteering();

    const course = useMemo(() => courses.find(c => c.id === courseId), [courses, courseId]);
    const isMemberCourse = course?.name?.toLowerCase().includes('membro') || course?.name?.toLowerCase().includes('integração');

    // Cálculo unificado de ocorrências do curso
    const allDates = useMemo(() => {
        const dates = new Set<string>();
        const courseClasses = classes.filter(c => c.courseId === courseId);
        
        courseClasses.forEach(cls => {
            if (!cls.startDate) return;
            const start = parseISO(cls.startDate);
            const end = cls.endDate ? parseISO(cls.endDate) : addMonths(start, 6);
            const targetDay = cls.dayOfWeek ? weekDayMap[cls.dayOfWeek] : -1;

            if (!cls.frequency || cls.frequency === 'pontual') {
                dates.add(cls.startDate);
                return;
            }

            let current = start;
            let safe = 0;
            while (isBefore(current, end) || format(current, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
                if (safe++ > 100) break;
                let matches = false;
                if (cls.frequency === 'semanal') matches = targetDay === -1 || current.getDay() === targetDay;
                else if (cls.frequency === 'quinzenal') matches = (Math.floor((current.getTime() - start.getTime()) / (7*24*60*60*1000)) % 2 === 0) && (targetDay === -1 || current.getDay() === targetDay);
                else if (cls.frequency === 'mensal') {
                    const week = Math.ceil(current.getDate() / 7);
                    const isLast = current.getDate() > (new Date(current.getFullYear(), current.getMonth()+1, 0).getDate() - 7);
                    matches = (cls.weekOfMonth === 'last' && isLast) || (week.toString() === cls.weekOfMonth);
                    matches = matches && current.getDay() === targetDay;
                }
                if (matches) dates.add(format(current, 'yyyy-MM-dd'));
                current = addWeeks(current, 1);
            }
        });

        return Array.from(dates).sort();
    }, [classes, courseId]);

    const students = useMemo(() => {
        const studentSet = new Set<string>();
        classes.filter(c => c.courseId === courseId).forEach(cls => cls.students?.forEach(sId => studentSet.add(sId)));
        return users.filter(u => studentSet.has(u.id)).sort((a, b) => a.name.localeCompare(b.name));
    }, [users, classes, courseId]);

    const stats = useMemo(() => {
        if (!isMemberCourse) return null;
        const counts = { ready: 0, finishing: 0, missing: 0 };
        students.forEach(s => {
            const progress = s.journey?.memberCourseProgress || {};
            const completedCount = Object.values(progress).filter(Boolean).length;
            if (completedCount === 5) counts.finishing++;
            else if (['module1', 'module2', 'module3', 'module4'].every(m => progress[m])) counts.ready++;
            else counts.missing++;
        });
        return counts;
    }, [students, isMemberCourse]);

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            {isMemberCourse && stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-amber-500 text-white rounded-lg"><GraduationCap size={20}/></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-amber-700">Aptos para Comissionamento</p>
                                <p className="text-2xl font-black text-amber-900">{stats.ready}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-50 border-emerald-200">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-emerald-500 text-white rounded-lg"><Award size={20}/></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-emerald-700">Curso Concluído</p>
                                <p className="text-2xl font-black text-emerald-900">{stats.finishing}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-50 border-slate-200">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-slate-500 text-white rounded-lg"><Users size={20}/></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-700">Em Jornada (Módulos 1-4)</p>
                                <p className="text-2xl font-black text-slate-900">{stats.missing}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="rounded-xl border bg-background overflow-x-auto shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="min-w-[250px] sticky left-0 bg-muted/50 z-20">Aluno</TableHead>
                            {allDates.map(date => (
                                <TableHead key={date} className="text-center min-w-[100px]">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-black uppercase text-muted-foreground">{format(parseISO(date), 'EEE', { locale: ptBR })}</span>
                                        <span className="font-bold text-slate-900">{format(parseISO(date), 'dd/MM')}</span>
                                    </div>
                                </TableHead>
                            ))}
                            <TableHead className="text-center min-w-[150px] bg-primary/5 font-black text-primary">Aproveitamento</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={allDates.length + 2} className="h-32 text-center text-muted-foreground italic">
                                    Nenhum aluno matriculado neste curso.
                                </TableCell>
                            </TableRow>
                        ) : (
                            students.map(student => {
                                let attended = 0;
                                const today = startOfDay(new Date());

                                return (
                                    <TableRow key={student.id} className="hover:bg-muted/30">
                                        <TableCell className="sticky left-0 bg-background z-10 font-medium border-r">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={PlaceHolderImages.find(p => p.id === 'avatar-1')?.imageUrl} />
                                                    <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold">{student.name}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        
                                        {allDates.map(date => {
                                            const isPast = isBefore(parseISO(date), today);
                                            const isPresent = classes.some(cls => 
                                                cls.courseId === courseId && 
                                                cls.attendance?.some(att => att.date === date && att.presentStudentIds.includes(student.id))
                                            );
                                            if (isPresent) attended++;

                                            return (
                                                <TableCell key={date} className="text-center">
                                                    {isPresent ? (
                                                        <CheckCircle2 className="text-emerald-500 size-5 mx-auto" />
                                                    ) : isPast ? (
                                                        <XCircle className="text-destructive/20 size-5 mx-auto" />
                                                    ) : (
                                                        <Clock className="text-slate-200 size-5 mx-auto" />
                                                    )}
                                                </TableCell>
                                            );
                                        })}

                                        <TableCell className="bg-primary/5 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="font-black text-primary text-sm">
                                                    {allDates.length > 0 ? Math.round((attended / allDates.length) * 100) : 0}%
                                                </span>
                                                <span className="text-[9px] uppercase font-bold text-muted-foreground">
                                                    {attended} / {allDates.length} aulas
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
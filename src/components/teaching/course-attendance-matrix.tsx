
'use client';
import React, { useMemo } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Award, Loader2, Users, GraduationCap, ChevronRight, XCircle, Minus, Video, PlayCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format, parseISO, isBefore, startOfDay, addWeeks, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const weekDayMap: Record<string, number> = {
    "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3,
    "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6
};

export function CourseAttendanceMatrix({ courseId }: { courseId: string }) {
    const { classes, users, courses, theoflixCourses, isLoading } = useVolunteering();

    const course = useMemo(() => courses.find(c => c.id === courseId), [courses, courseId]);
    const isMemberCourse = course?.name?.toLowerCase().includes('membro') || course?.name?.toLowerCase().includes('integração');

    const courseClasses = useMemo(() => classes.filter(c => c.courseId === courseId), [classes, courseId]);

    // Busca o curso vinculado do TheoFlix
    const linkedTheoflix = useMemo(() => 
        theoflixCourses.find(tf => tf.id === course?.linkedTheoflixId),
    [theoflixCourses, course]);

    // Cálculo unificado de ocorrências do curso (removendo feriados)
    const allDates = useMemo(() => {
        const dates = new Set<string>();
        
        courseClasses.forEach(cls => {
            if (!cls.startDate) return;
            const start = parseISO(cls.startDate);
            const end = cls.endDate ? parseISO(cls.endDate) : addMonths(start, 6);
            const targetDay = cls.dayOfWeek ? weekDayMap[cls.dayOfWeek] : -1;
            const holidays = new Set(cls.holidayDates || []);

            if (!cls.frequency || cls.frequency === 'pontual') {
                if (!holidays.has(cls.startDate)) dates.add(cls.startDate);
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
                
                const dateStr = format(current, 'yyyy-MM-dd');
                if (matches && !holidays.has(dateStr)) dates.add(dateStr);
                current = addWeeks(current, 1);
            }
        });

        return Array.from(dates).sort();
    }, [courseClasses]);

    const students = useMemo(() => {
        const studentSet = new Set<string>();
        courseClasses.forEach(cls => cls.students?.forEach(sId => studentSet.add(sId)));
        return users.filter(u => studentSet.has(u.id)).sort((a, b) => a.name.localeCompare(b.name));
    }, [users, courseClasses]);

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
                    <Card className="bg-amber-50 border-amber-200 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-amber-500 text-white rounded-lg shadow-inner"><GraduationCap size={20}/></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Aptos para Comissionamento</p>
                                <p className="text-2xl font-black text-amber-900 leading-none mt-1">{stats.ready}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-50 border-emerald-200 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-emerald-500 text-white rounded-lg shadow-inner"><Award size={20}/></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Curso Concluído</p>
                                <p className="text-2xl font-black text-emerald-900 leading-none mt-1">{stats.finishing}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-50 border-slate-200 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-slate-500 text-white rounded-lg shadow-inner"><Users size={20}/></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Em Jornada (Módulos 1-4)</p>
                                <p className="text-2xl font-black text-slate-900 leading-none mt-1">{stats.missing}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="rounded-xl border bg-background overflow-x-auto shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="min-w-[250px] sticky left-0 bg-muted/50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r">Aluno</TableHead>
                            {allDates.map((date, index) => {
                                const episode = linkedTheoflix?.episodes?.[index];
                                return (
                                    <TableHead key={date} className="text-center min-w-[140px] px-2 py-4">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">Aula {index + 1}</span>
                                                {episode && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Video className="size-3 text-primary animate-pulse" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="text-xs">Disponível no TheoFlix</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-black uppercase text-muted-foreground leading-none">{format(parseISO(date), 'EEE', { locale: ptBR })}</span>
                                            <span className="font-bold text-slate-900 leading-none">{format(parseISO(date), 'dd/MM')}</span>
                                            {episode && (
                                                <p className="text-[9px] font-bold text-primary truncate max-w-[120px] mt-1 uppercase italic leading-tight" title={episode.title}>
                                                    {episode.title}
                                                </p>
                                            )}
                                        </div>
                                    </TableHead>
                                );
                            })}
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
                                let attendedCount = 0;
                                const today = startOfDay(new Date());

                                return (
                                    <TableRow key={student.id} className="hover:bg-muted/30 group">
                                        <TableCell className="sticky left-0 bg-background z-10 font-medium border-r shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
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
                                            const classHeld = courseClasses.find(cls => 
                                                cls.attendance?.some(att => att.date === date)
                                            );
                                            const isPresent = classHeld?.attendance?.find(a => a.date === date)?.presentStudentIds.includes(student.id);
                                            const isPast = isBefore(parseISO(date), today);
                                            
                                            if (isPresent) attendedCount++;

                                            return (
                                                <TableCell key={date} className="text-center">
                                                    {isPresent ? (
                                                        <CheckCircle2 className="text-emerald-500 size-5 mx-auto" />
                                                    ) : classHeld ? (
                                                        <XCircle className="text-destructive size-5 mx-auto opacity-40" />
                                                    ) : isPast ? (
                                                        <Minus className="text-slate-200 size-5 mx-auto" />
                                                    ) : (
                                                        <Clock className="text-slate-100 size-5 mx-auto" />
                                                    )}
                                                </TableCell>
                                            );
                                        })}

                                        <TableCell className="bg-primary/5 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="font-black text-primary text-sm">
                                                    {allDates.length > 0 ? Math.round((attendedCount / allDates.length) * 100) : 0}%
                                                </span>
                                                <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">
                                                    {attendedCount} / {allDates.length} aulas
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
            
            <div className="flex flex-wrap gap-6 p-4 bg-muted/20 rounded-xl border border-dashed text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <div className="flex items-center gap-2"><CheckCircle2 className="size-3 text-emerald-500"/> Presente</div>
                <div className="flex items-center gap-2"><XCircle className="size-3 text-destructive/40"/> Falta (Aula houve)</div>
                <div className="flex items-center gap-2"><Minus className="size-3 text-slate-300"/> Aula não realizada</div>
                <div className="flex items-center gap-2"><Clock className="size-3 text-slate-200"/> Pendente (Futura)</div>
                <div className="flex items-center gap-2 ml-auto"><Video className="size-3 text-primary"/> Possui aula online no TheoFlix</div>
            </div>
        </div>
    );
}

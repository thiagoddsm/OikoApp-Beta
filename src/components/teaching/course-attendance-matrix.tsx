'use client';
import React, { useMemo } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Award, Loader2, Users, GraduationCap, ChevronRight, XCircle, Minus, Video, PlayCircle, Star } from 'lucide-react';
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
    const isMembership = course?.name?.toLowerCase().includes('membro') || course?.name?.toLowerCase().includes('pertencer') || course?.name?.toLowerCase().includes('integração');

    const courseClasses = useMemo(() => classes.filter(c => c.courseId === courseId), [classes, courseId]);

    // Linked TheoFlix data for online validation hints
    const linkedTheoflix = useMemo(() => 
        theoflixCourses.find(tf => tf.id === course?.linkedTheoflixId),
    [theoflixCourses, course]);

    // If it's membership, we group by MODULE (1-5), not dates.
    const modules = useMemo(() => [
        { id: '1', title: 'História e Visão', type: 'Obrigatório', week: '1' },
        { id: '2', title: 'DNA e Células', type: 'Obrigatório', week: '2' },
        { id: '3', title: 'Mordomia e Finanças', type: 'Obrigatório', week: '3' },
        { id: '4', title: 'Governança e Ética', type: 'Obrigatório', week: '4' },
        { id: '5', title: 'Comissionamento', type: 'Eletivo', week: 'last' },
    ], []);

    const students = useMemo(() => {
        const studentSet = new Set<string>();
        courseClasses.forEach(cls => cls.students?.forEach(sId => studentSet.add(sId)));
        return users.filter(u => studentSet.has(u.id)).sort((a, b) => a.name.localeCompare(b.name));
    }, [users, courseClasses]);

    const stats = useMemo(() => {
        if (!isMembership) return null;
        const counts = { ready: 0, finishing: 0, missing: 0 };
        students.forEach(s => {
            const progress = s.journey?.memberCourseProgress || {};
            
            // For stats, we need to consider BOTH manual flags and actual attendance (physical/online)
            let completedMandatoryCount = 0;
            modules.slice(0, 4).forEach(mod => {
                const modKey = `module${mod.id}`;
                const manualDone = progress[modKey];
                const relevantClasses = courseClasses.filter(c => c.weekOfMonth === mod.week);
                const isPresentPhysical = relevantClasses.some(c => c.attendance?.some(a => a.presentStudentIds.includes(s.id)));
                const isPresentOnline = relevantClasses.some(c => c.attendance?.some(a => a.onlineStudentIds?.includes(s.id)));
                
                if (manualDone || isPresentPhysical || isPresentOnline) completedMandatoryCount++;
            });

            const module5Done = progress['module5'] || courseClasses.filter(c => c.weekOfMonth === 'last').some(c => c.attendance?.some(a => a.presentStudentIds.includes(s.id) || a.onlineStudentIds?.includes(s.id)));
            
            if (completedMandatoryCount === 4 && module5Done) counts.finishing++;
            else if (completedMandatoryCount === 4) counts.ready++;
            else counts.missing++;
        });
        return counts;
    }, [students, isMembership, courseClasses, modules]);

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    if (isMembership) {
        return (
            <div className="space-y-6">
                {stats && (
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
                                    <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Ciclo Completo (5/5)</p>
                                    <p className="text-2xl font-black text-amber-900 leading-none mt-1">{stats.finishing}</p>
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
                                <TableHead className="min-w-[250px] sticky left-0 bg-white z-[2] border-r shadow-[2px_0_5_rgba(0,0,0,0.05)]">Aluno (Membresia Modular)</TableHead>
                                {modules.map((mod, index) => {
                                    const episode = linkedTheoflix?.episodes?.[index];
                                    return (
                                        <TableHead key={mod.id} className="text-center min-w-[160px] py-4">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className={cn(
                                                        "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                                        mod.type === 'Eletivo' ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                                                    )}>
                                                        {mod.type === 'Eletivo' ? 'Eletivo' : `Módulo ${mod.id}`}
                                                    </span>
                                                    {episode && <Video className="size-3 text-primary" />}
                                                </div>
                                                <span className="font-bold text-slate-900 leading-none text-xs">{mod.title}</span>
                                                <p className="text-[9px] text-muted-foreground uppercase font-bold mt-1 tracking-widest">{index+1}º Domingo</p>
                                            </div>
                                        </TableHead>
                                    )
                                })}
                                <TableHead className="text-center min-w-[120px] bg-primary/5 font-black text-primary">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.map(student => {
                                const manualProgress = student.journey?.memberCourseProgress || {};
                                
                                // Calculate accurate module completion count considering all sources
                                let completedMandatoryCount = 0;
                                modules.slice(0, 4).forEach(mod => {
                                    const modKey = `module${mod.id}`;
                                    const isManualDone = manualProgress[modKey];
                                    const relevantClasses = courseClasses.filter(c => c.weekOfMonth === mod.week);
                                    const isPresentPhysical = relevantClasses.some(c => c.attendance?.some(a => a.presentStudentIds.includes(student.id)));
                                    const isPresentOnline = relevantClasses.some(c => c.attendance?.some(a => a.onlineStudentIds?.includes(student.id)));
                                    
                                    if (isManualDone || isPresentPhysical || isPresentOnline) completedMandatoryCount++;
                                });

                                return (
                                    <TableRow key={student.id} className="hover:bg-muted/30 group">
                                        <TableCell className="sticky left-0 bg-white z-[1] font-medium border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <p className="truncate text-sm font-bold">{student.name}</p>
                                            </div>
                                        </TableCell>
                                        {modules.map(mod => {
                                            const modKey = `module${mod.id}`;
                                            const isManualDone = manualProgress[modKey];
                                            
                                            const relevantClasses = courseClasses.filter(c => c.weekOfMonth === mod.week);
                                            const isPresentPhysical = relevantClasses.some(c => c.attendance?.some(a => a.presentStudentIds.includes(student.id)));
                                            const isPresentOnline = relevantClasses.some(c => c.attendance?.some(a => a.onlineStudentIds?.includes(student.id)));

                                            return (
                                                <TableCell key={mod.id} className="text-center">
                                                    {isPresentPhysical ? (
                                                        <CheckCircle2 className="text-emerald-500 size-5 mx-auto" />
                                                    ) : isPresentOnline ? (
                                                        <PlayCircle className="text-blue-500 size-5 mx-auto" />
                                                    ) : isManualDone ? (
                                                        <CheckCircle2 className="text-emerald-500 size-5 mx-auto opacity-50" />
                                                    ) : mod.type === 'Eletivo' ? (
                                                        <Star className="text-amber-200 size-5 mx-auto" />
                                                    ) : (
                                                        <Clock className="text-slate-200 size-5 mx-auto opacity-50" />
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                        <TableCell className="bg-primary/5 text-center">
                                            <Badge variant={completedMandatoryCount === 4 ? "default" : "outline"} className="text-[10px] uppercase font-black">
                                                {completedMandatoryCount === 4 ? "APTO" : `${completedMandatoryCount}/4`}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center gap-6 text-[10px] font-bold uppercase text-muted-foreground bg-muted/20 p-3 rounded-lg border border-dashed">
                    <div className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500"/> Presença Física</div>
                    <div className="flex items-center gap-1.5"><PlayCircle className="size-3 text-blue-500"/> Validado via TheoFlix</div>
                    <div className="flex items-center gap-1.5"><Star className="size-3 text-amber-400"/> Módulo Eletivo</div>
                    <div className="flex items-center gap-1.5"><Clock className="size-3 text-slate-300"/> Aula Pendente</div>
                </div>
            </div>
        );
    }

    // Default Matrix logic for other courses (Date-based)
    const allDates = useMemo(() => {
        const dates = new Set<string>();
        courseClasses.forEach(cls => {
            if (!cls.startDate) return;
            const start = parseISO(cls.startDate);
            const end = cls.endDate ? parseISO(cls.endDate) : addMonths(start, 6);
            const targetDay = cls.dayOfWeek ? weekDayMap[cls.dayOfWeek] : -1;
            const holidays = new Set(cls.holidayDates || []);
            const extras = cls.extraDates || [];

            if (cls.frequency && cls.frequency !== 'pontual') {
                let current = start;
                let safe = 0;
                while ((isBefore(current, end) || format(current, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) && safe++ < 150) {
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
            } else if (cls.frequency === 'pontual') {
                if (!holidays.has(cls.startDate)) dates.add(cls.startDate);
            }
            
            // Add extra dates
            extras.forEach(d => dates.add(d));
        });
        return Array.from(dates).sort();
    }, [courseClasses]);

    return (
        <div className="space-y-6">
            <div className="rounded-xl border bg-background overflow-x-auto shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="min-w-[250px] sticky left-0 bg-white z-[2] border-r shadow-[2px_0_5_rgba(0,0,0,0.05)]">Aluno</TableHead>
                            {allDates.map((date, index) => {
                                const episode = linkedTheoflix?.episodes?.[index];
                                return (
                                    <TableHead key={date} className="text-center min-w-[140px] px-2 py-4">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">Aula {index + 1}</span>
                                            <span className="text-[10px] font-black uppercase text-muted-foreground leading-none">{format(parseISO(date), 'EEE', { locale: ptBR })}</span>
                                            <span className="font-bold text-slate-900 leading-none">{format(parseISO(date), 'dd/MM')}</span>
                                            {episode && <Video className="size-3 text-primary mt-1" />}
                                        </div>
                                    </TableHead>
                                );
                            })}
                            <TableHead className="text-center min-w-[150px] bg-primary/5 font-black text-primary">Aproveitamento</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.map(student => {
                            let attendedCount = 0;
                            const today = startOfDay(new Date());
                            return (
                                <TableRow key={student.id} className="hover:bg-muted/30 group">
                                    <TableCell className="sticky left-0 bg-white z-[1] font-medium border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8"><AvatarFallback>{student.name.charAt(0)}</AvatarFallback></Avatar>
                                            <p className="truncate text-sm font-bold">{student.name}</p>
                                        </div>
                                    </TableCell>
                                    {allDates.map(date => {
                                        const classHeld = courseClasses.find(cls => cls.attendance?.some(att => att.date === date));
                                        const attendanceRecord = classHeld?.attendance?.find(a => a.date === date);
                                        const isPresentPhysical = attendanceRecord?.presentStudentIds.includes(student.id);
                                        const isPresentOnline = attendanceRecord?.onlineStudentIds?.includes(student.id);
                                        if (isPresentPhysical || isPresentOnline) attendedCount++;
                                        return (
                                            <TableCell key={date} className="text-center">
                                                {isPresentPhysical ? <CheckCircle2 className="text-emerald-500 size-5 mx-auto" /> : 
                                                 isPresentOnline ? <PlayCircle className="text-blue-500 size-5 mx-auto" /> :
                                                 classHeld ? <XCircle className="text-destructive size-5 mx-auto opacity-40" /> :
                                                 isBefore(parseISO(date), today) ? <Minus className="text-slate-200 size-5 mx-auto" /> : 
                                                 <Clock className="text-slate-100 size-5 mx-auto" />}
                                            </TableCell>
                                        );
                                    })}
                                    <TableCell className="bg-primary/5 text-center">
                                        <span className="font-black text-primary text-sm">{allDates.length > 0 ? Math.round((attendedCount / allDates.length) * 100) : 0}%</span>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center gap-6 text-[10px] font-bold uppercase text-muted-foreground bg-muted/20 p-3 rounded-lg border border-dashed">
                <div className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500"/> Presença Física</div>
                <div className="flex items-center gap-1.5"><PlayCircle className="size-3 text-blue-500"/> Validado via TheoFlix</div>
                <div className="flex items-center gap-1.5"><XCircle className="size-3 text-destructive opacity-40"/> Falta (Aula Realizada)</div>
                <div className="flex items-center gap-1.5"><Minus className="size-3 text-slate-200"/> Aula Não Realizada</div>
                <div className="flex items-center gap-1.5"><Clock className="size-3 text-slate-100"/> Aula Pendente</div>
            </div>
        </div>
    );
}

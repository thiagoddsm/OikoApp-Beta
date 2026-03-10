
'use client';
import React, { useMemo } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Award, Loader2, Users, GraduationCap, ChevronRight, XCircle, Minus, Video, PlayCircle, Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format, parseISO, isBefore, startOfDay, addWeeks, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const weekDayMap: Record<string, number> = {
    "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3,
    "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6
};

export function CourseAttendanceMatrix({ courseId }: { courseId: string }) {
    const { classes, users, courses, theoflixCourses, isLoading } = useVolunteering();

    const course = useMemo(() => courses.find(c => c.id === courseId), [courses, courseId]);
    const isMembership = course?.name?.toLowerCase().includes('membro') || course?.name?.toLowerCase().includes('pertencer') || course?.name?.toLowerCase().includes('integração');

    const courseClasses = useMemo(() => classes.filter(c => c.courseId === courseId), [classes, courseId]);

    const linkedTheoflix = useMemo(() => 
        theoflixCourses.find(tf => tf.id === course?.linkedTheoflixId),
    [theoflixCourses, course]);

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
            
            let completedMandatoryCount = 0;
            modules.slice(0, 4).forEach(mod => {
                const modKey = `module${mod.id}`;
                const manualDone = progress[modKey];
                
                // Checagem robusta: busca em todas as turmas do curso se o aluno esteve presente em uma data que corresponde ao domingo do módulo
                const isPresent = courseClasses.some(c => 
                    c.attendance?.some(att => {
                        const date = parseISO(att.date);
                        const sundayIndex = Math.ceil(date.getDate() / 7);
                        return sundayIndex === parseInt(mod.id) && (att.presentStudentIds.includes(s.id) || att.onlineStudentIds?.includes(s.id));
                    })
                );
                
                if (manualDone || isPresent) completedMandatoryCount++;
            });

            if (completedMandatoryCount === 4) counts.ready++;
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
                                    <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Membros em Jornada</p>
                                    <p className="text-2xl font-black text-emerald-900 leading-none mt-1">{students.length}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <div className="rounded-xl border bg-background overflow-x-auto shadow-sm">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="min-w-[250px] sticky left-0 bg-white z-[2] border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Aluno (Membresia Modular)</TableHead>
                                {modules.map((mod, index) => (
                                    <TableHead key={mod.id} className="text-center min-w-[160px] py-4">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={cn(
                                                "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                                mod.type === 'Eletivo' ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                                            )}>
                                                {mod.type === 'Eletivo' ? 'Eletivo' : `Módulo ${mod.id}`}
                                            </span>
                                            <span className="font-bold text-slate-900 leading-none text-xs">{mod.title}</span>
                                        </div>
                                    </TableHead>
                                ))}
                                <TableHead className="text-center min-w-[120px] bg-primary/5 font-black text-primary">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.map(student => {
                                const manualProgress = student.journey?.memberCourseProgress || {};
                                let completedCount = 0;

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
                                            const isManualDone = manualProgress[`module${mod.id}`];
                                            const isPresent = courseClasses.some(c => 
                                                c.attendance?.some(att => {
                                                    const date = parseISO(att.date);
                                                    const sundayIndex = Math.ceil(date.getDate() / 7);
                                                    return sundayIndex === parseInt(mod.id) && (att.presentStudentIds.includes(student.id) || att.onlineStudentIds?.includes(student.id));
                                                })
                                            );

                                            if (isManualDone || isPresent) completedCount++;

                                            return (
                                                <TableCell key={mod.id} className="text-center">
                                                    {isPresent ? (
                                                        <CheckCircle2 className="text-emerald-500 size-5 mx-auto" />
                                                    ) : isManualDone ? (
                                                        <CheckCircle2 className="text-emerald-500 size-5 mx-auto opacity-50" />
                                                    ) : (
                                                        <Clock className="text-slate-200 size-5 mx-auto opacity-50" />
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                        <TableCell className="bg-primary/5 text-center">
                                            <Badge variant={completedCount >= 4 ? "default" : "outline"} className="text-[10px] uppercase font-black">
                                                {completedCount >= 4 ? "APTO" : `${completedCount}/4`}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    }

    const allDates = useMemo(() => {
        const dates = new Set<string>();
        courseClasses.forEach(cls => {
            cls.attendance?.forEach(att => dates.add(att.date));
        });
        return Array.from(dates).sort();
    }, [courseClasses]);

    return (
        <div className="space-y-6">
            <div className="rounded-xl border bg-background overflow-x-auto shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="min-w-[250px] sticky left-0 bg-white z-[2] border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Aluno</TableHead>
                            {allDates.map((date, index) => (
                                <TableHead key={date} className="text-center min-w-[140px] px-2 py-4">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase">Aula {index + 1}</span>
                                        <span className="font-bold text-slate-900 leading-none">{format(parseISO(date), 'dd/MM')}</span>
                                    </div>
                                </TableHead>
                            ))}
                            <TableHead className="text-center min-w-[150px] bg-primary/5 font-black text-primary">Aproveitamento</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.map(student => {
                            let attendedCount = 0;
                            return (
                                <TableRow key={student.id} className="hover:bg-muted/30 group">
                                    <TableCell className="sticky left-0 bg-white z-[1] font-medium border-r shadow-[2px_0_5_px_rgba(0,0,0,0.05)]">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8"><AvatarFallback>{student.name.charAt(0)}</AvatarFallback></Avatar>
                                            <p className="truncate text-sm font-bold">{student.name}</p>
                                        </div>
                                    </TableCell>
                                    {allDates.map(date => {
                                        const isPresent = courseClasses.some(c => c.attendance?.some(att => att.date === date && (att.presentStudentIds.includes(student.id) || att.onlineStudentIds?.includes(student.id))));
                                        if (isPresent) attendedCount++;
                                        return (
                                            <TableCell key={date} className="text-center">
                                                {isPresent ? <CheckCircle2 className="text-emerald-500 size-5 mx-auto" /> : <Minus className="text-slate-200 size-5 mx-auto" />}
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
        </div>
    );
}

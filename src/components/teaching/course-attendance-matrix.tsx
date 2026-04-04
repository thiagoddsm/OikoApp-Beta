'use client';
import React, { useMemo, useState } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Award, Loader2, Users, GraduationCap, ChevronRight, XCircle, Minus, Video, PlayCircle, Star, Filter, RefreshCw, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format, parseISO, isBefore, startOfDay, addWeeks, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const weekDayMap: Record<string, number> = {
    "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3,
    "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6
};

function getModuleIndexForDate(dateStr: string, classData: any): number {
    if (!classData || !classData.startDate) return -1;
    
    const occurrences: string[] = [];
    const start = parseISO(classData.startDate);
    const end = classData.endDate ? parseISO(classData.endDate) : addMonths(start, 1);
    const targetDay = classData.dayOfWeek ? weekDayMap[classData.dayOfWeek] : -1;
    const holidays = new Set(classData.holidayDates || []);
    const extras = classData.extraDates || [];

    let current = start;
    let safe = 0;

    if (classData.frequency && classData.frequency !== 'pontual') {
        while (isBefore(current, end) || format(current, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
            if (safe++ > 150) break;
            let matches = false;
            if (classData.frequency === 'semanal') {
                matches = targetDay === -1 || current.getDay() === targetDay;
            } else if (classData.frequency === 'quinzenal') {
                const diffWeeks = Math.floor((current.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
                matches = diffWeeks % 2 === 0 && (targetDay === -1 || current.getDay() === targetDay);
            }
            const dStr = format(current, 'yyyy-MM-dd');
            if (matches && !holidays.has(dStr)) occurrences.push(dStr);
            current = addWeeks(current, 1);
        }
    } else if (classData.frequency === 'pontual') {
        occurrences.push(classData.startDate);
    }

    const allDates = Array.from(new Set([...occurrences, ...extras])).sort();
    return allDates.indexOf(dateStr); 
}

const Legend = () => (
    <div className="pt-4 mt-6 border-t">
        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Legenda</h4>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Presença (Presencial)</span>
            </div>
            <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-blue-500" />
                <span>Presença (Online ao Vivo)</span>
            </div>
            <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-indigo-500" />
                <span>Concluído (Gravado)</span>
            </div>
            <div className="flex items-center gap-2">
                <Video className="size-4 text-slate-500" />
                <span>Módulo Híbrido</span>
            </div>
             <div className="flex items-center gap-2">
                <Clock className="size-4 text-slate-300" />
                <span>Pendente</span>
            </div>
        </div>
    </div>
);

export function CourseAttendanceMatrix({ courseId }: { courseId: string }) {
    const { classes, users, courses, theoflixCourses, updateVolunteer, isLoading } = useVolunteering();
    const { toast } = useToast();
    const [selectedClassId, setSelectedClassId] = useState<string>('all');
    const [isSyncing, setIsSyncing] = useState(false);

    const course = useMemo(() => courses.find(c => c.id === courseId), [courses, courseId]);
    const isMembership = course?.name?.toLowerCase().includes('membro') || course?.name?.toLowerCase().includes('pertencer') || course?.name?.toLowerCase().includes('integração');
    const threshold = course?.minAttendanceApproval || 75;

    const courseClasses = useMemo(() => classes.filter(c => c.courseId === courseId), [classes, courseId]);

    const filteredClasses = useMemo(() => {
        if (selectedClassId === 'all') return courseClasses;
        return courseClasses.filter(c => c.id === selectedClassId);
    }, [courseClasses, selectedClassId]);

    const modules = useMemo(() => {
        if (course?.syllabus && course.syllabus.length > 0) {
            return course.syllabus.map((s, index) => ({
                id: (index + 1).toString(),
                title: s.title,
                type: index === course.syllabus!.length - 1 && isMembership ? 'Eletivo' : 'Obrigatório',
                week: (index + 1).toString(),
                theoflixCourseId: s.theoflixCourseId
            }));
        }
        if (isMembership) {
            return [
                { id: '1', title: 'História e Visão', type: 'Obrigatório', week: '1', theoflixCourseId: 'historia-e-visao' },
                { id: '2', title: 'DNA e Células', type: 'Obrigatório', week: '2', theoflixCourseId: 'dna-e-celulas' },
                { id: '3', title: 'Mordomia e Finanças', type: 'Obrigatório', week: '3', theoflixCourseId: 'mordomia-e-financas' },
                { id: '4', title: 'Governança e Ética', type: 'Obrigatório', week: '4', theoflixCourseId: 'governanca-e-etica' },
                { id: '5', title: 'Comissionamento', type: 'Eletivo', week: 'last', theoflixCourseId: null },
            ];
        }
        return [];
    }, [course, isMembership]);

    const students = useMemo(() => {
        const studentSet = new Set<string>();
        filteredClasses.forEach(cls => cls.students?.forEach(sId => studentSet.add(sId)));
        return users.filter(u => studentSet.has(u.id)).sort((a, b) => a.name.localeCompare(b.name));
    }, [users, filteredClasses]);

    const allDates = useMemo(() => {
        const dates = new Set<string>();
        filteredClasses.forEach(cls => {
            cls.attendance?.forEach(att => dates.add(att.date));
        });
        return Array.from(dates).sort();
    }, [filteredClasses]);

    const handleSyncWithProfiles = async () => {
        if (!courseId || isSyncing) return;
        setIsSyncing(true);
        
        try {
            let syncCount = 0;
            const promises = students.map(student => {
                let isApproved = false;
                let completedCount = 0;

                if (isMembership) {
                    const mandatoryModules = modules.filter(m => m.type !== 'Eletivo');
                    modules.forEach(mod => {
                        const modIndex = parseInt(mod.id) - 1;
                        let attendanceRecord: any = null;
                        courseClasses.forEach(c => {
                            c.attendance?.forEach(att => {
                                if (getModuleIndexForDate(att.date, c) === modIndex) attendanceRecord = att;
                            });
                        });
                        const isInPerson = attendanceRecord?.presentStudentIds?.includes(student.id);
                        const isOnlineLive = attendanceRecord?.onlineStudentIds?.includes(student.id);
                        const isManualDone = student.journey?.memberCourseProgress?.[`module${mod.id}`];
                        if ((isInPerson || isOnlineLive || isManualDone) && mod.type !== 'Eletivo') completedCount++;
                    });
                    isApproved = (completedCount / mandatoryModules.length) * 100 >= threshold;
                } else {
                    let attendedCount = 0;
                    allDates.forEach(date => {
                        const attendanceRecord = filteredClasses.flatMap(c => c.attendance || []).find(att => att.date === date);
                        if (attendanceRecord?.presentStudentIds?.includes(student.id) || attendanceRecord?.onlineStudentIds?.includes(student.id)) attendedCount++;
                    });
                    isApproved = allDates.length > 0 && (attendedCount / allDates.length) * 100 >= threshold;
                }

                if (isApproved) {
                    syncCount++;
                    return updateVolunteer(student.id, {
                        [`journey.courseStatus.${courseId}`]: 'approved'
                    });
                }
                return Promise.resolve();
            });

            await Promise.all(promises);
            toast({ title: "Sincronização Concluída", description: `${syncCount} alunos aprovados tiveram seus perfis atualizados.` });
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro na Sincronização", description: "Não foi possível atualizar os perfis dos alunos." });
        } finally {
            setIsSyncing(false);
        }
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-dashed">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2.5 rounded-xl text-primary shadow-sm">
                        <Filter className="size-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 leading-none">Matriz de Aproveitamento</h3>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Controle de frequência e conclusão</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-lg border shadow-sm min-w-[250px]">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Turma:</Label>
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                            <SelectTrigger className="h-8 font-bold border-none shadow-none focus:ring-0">
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
                    <Button onClick={handleSyncWithProfiles} disabled={isSyncing || students.length === 0} size="sm" className="h-11 px-6 font-black uppercase tracking-widest shadow-lg">
                        {isSyncing ? <Loader2 className="size-4 animate-spin mr-2" /> : <Send className="size-4 mr-2" />}
                        Sincronizar com Perfis
                    </Button>
                </div>
            </div>

            <div className="rounded-xl border bg-background overflow-x-auto shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="min-w-[250px] sticky left-0 bg-white z-[2] border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Aluno</TableHead>
                            {isMembership ? (
                                modules.map((mod) => (
                                    <TableHead key={mod.id} className="text-center min-w-[180px] py-4">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <span className={cn(
                                                "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                                mod.type === 'Eletivo' ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                                            )}>
                                                {mod.type === 'Eletivo' ? 'Eletivo' : `Módulo ${mod.id}`}
                                            </span>
                                            <span className="font-bold text-slate-900 leading-none text-xs flex items-center gap-1.5">
                                                {mod.title}
                                                {mod.theoflixCourseId && <Video size={14} className="text-slate-400" />}
                                            </span>
                                        </div>
                                    </TableHead>
                                ))
                            ) : (
                                allDates.map((date, index) => {
                                    const modDef = modules[index];
                                    return (
                                        <TableHead key={date} className="text-center min-w-[180px] px-2 py-4">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase">Aula {index + 1}</span>
                                                <span className="font-bold text-slate-900 leading-none">{format(parseISO(date), 'dd/MM')}</span>
                                                {modDef?.title && 
                                                    <span className="text-[10px] text-muted-foreground truncate w-full px-2 mt-1 flex items-center justify-center gap-1.5">
                                                        {modDef.title}
                                                        {modDef.theoflixCourseId && <Video size={12} className="text-slate-400" />}
                                                    </span>}
                                            </div>
                                        </TableHead>
                                    )
                                })
                            )}
                            <TableHead className="text-center min-w-[120px] bg-primary/5 font-black text-primary">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.map(student => {
                            const manualProgress = student.journey?.memberCourseProgress || {};
                            const theoflixProgress = student.journey?.theoflixProgress || {};
                            let completedCount = 0;

                            return (
                                <TableRow key={student.id} className="hover:bg-muted/30 group">
                                    <TableCell className="sticky left-0 bg-white z-[1] font-medium border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8"><AvatarFallback>{student.name.charAt(0)}</AvatarFallback></Avatar>
                                            <p className="truncate text-sm font-bold">{student.name}</p>
                                        </div>
                                    </TableCell>
                                    
                                    {isMembership ? (
                                        modules.map(mod => {
                                            const modIndex = parseInt(mod.id) - 1;
                                            let attendanceRecord: any = null;
                                            courseClasses.forEach(c => {
                                                c.attendance?.forEach(att => {
                                                    if (getModuleIndexForDate(att.date, c) === modIndex) attendanceRecord = att;
                                                });
                                            });

                                            const isInPerson = attendanceRecord?.presentStudentIds?.includes(student.id);
                                            const isOnlineLive = attendanceRecord?.onlineStudentIds?.includes(student.id);
                                            const isManualDone = manualProgress[`module${mod.id}`];
                                            const isDone = isInPerson || isOnlineLive || isManualDone;

                                            if (isDone && mod.type !== 'Eletivo') completedCount++;

                                            let icon = <Clock className="text-slate-300 size-5 mx-auto" />;
                                            if (isInPerson) icon = <CheckCircle2 className="size-5 mx-auto text-emerald-500" />;
                                            else if (isOnlineLive) icon = <CheckCircle2 className="size-5 mx-auto text-blue-500" />;
                                            else if (isManualDone) icon = <CheckCircle2 className="size-5 mx-auto text-emerald-500" />;

                                            return <TableCell key={mod.id} className="text-center">{icon}</TableCell>;
                                        })
                                    ) : (
                                        allDates.map((date, index) => {
                                            const attendanceRecord = filteredClasses.flatMap(c => c.attendance || []).find(att => att.date === date);
                                            const isInPerson = attendanceRecord?.presentStudentIds?.includes(student.id);
                                            const isOnlineLive = attendanceRecord?.onlineStudentIds?.includes(student.id);
                                            const isDone = isInPerson || isOnlineLive;
                                            if (isDone) completedCount++;

                                            let icon = <Minus className="text-slate-300 size-5 mx-auto" />;
                                            if (isInPerson) icon = <CheckCircle2 className="size-5 mx-auto text-emerald-500" />;
                                            else if (isOnlineLive) icon = <CheckCircle2 className="size-5 mx-auto text-blue-500" />;

                                            return <TableCell key={date} className="text-center">{icon}</TableCell>;
                                        })
                                    )}

                                    <TableCell className="bg-primary/5 text-center">
                                        {(() => {
                                            const total = isMembership ? modules.filter(m => m.type !== 'Eletivo').length : allDates.length;
                                            const percent = total > 0 ? (completedCount / total) * 100 : 0;
                                            const isApproved = percent >= threshold;
                                            return (
                                                <Badge variant={isApproved ? "default" : "outline"} className={cn("text-[10px] uppercase font-black", isApproved ? "bg-emerald-600" : "")}>
                                                    {isApproved ? "APTO" : `${Math.round(percent)}%`}
                                                </Badge>
                                            )
                                        })()}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            <Legend />
        </div>
    );
}

'use client';
import React, { useMemo, useState } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Award, Loader2, Users, GraduationCap, ChevronRight, XCircle, Minus, Video, PlayCircle, Star, Filter, RefreshCw, Send, Info, ListFilter } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format, parseISO, isBefore, startOfDay, addWeeks, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const weekDayMap: Record<string, number> = {
    "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3,
    "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6
};

function getModuleIndexForDate(dateStr: string, classData: any, syllabus: any[] = []): number {
    if (!classData || !classData.startDate) return -1;
    
    // 1. Verificar se existe override para esta data específica
    const overrides = classData.scheduleOverrides || {};
    if (overrides[dateStr]) {
        const ov = overrides[dateStr];
        if (ov.isCancelled) return -1;
        if (ov.syllabusId) {
            return syllabus.findIndex(s => s.id === ov.syllabusId);
        }
    }

    // 2. Lógica de recorrência padrão
    const occurrences: string[] = [];
    const start = parseISO(classData.startDate);
    const end = classData.endDate ? parseISO(classData.endDate) : addMonths(start, 2); 
    const targetDay = classData.dayOfWeek ? weekDayMap[classData.dayOfWeek] : -1;
    const holidaySet = new Set(classData.holidayDates || []);

    let current = start;
    let safe = 0;
    let currentIndex = 0;

    if (classData.frequency && classData.frequency !== 'pontual') {
        while (safe++ < 200) {
            const dStr = format(current, 'yyyy-MM-dd');
            
            // Pular feriado sem override
            if (holidaySet.has(dStr) && !overrides[dStr]) {
                current = addWeeks(current, classData.frequency === 'quinzenal' ? 2 : 1);
                continue;
            }

            // Se for a data procurada e não estiver cancelada por override
            if (dStr === dateStr) {
                const ov = overrides[dStr];
                if (ov?.isCancelled) return -1;
                return currentIndex;
            }

            // Incrementar índice do syllabus apenas para aulas válidas
            if (!overrides[dStr]?.isCancelled) {
                currentIndex++;
            }

            current = addWeeks(current, classData.frequency === 'quinzenal' ? 2 : 1);
            if (isBefore(end, current) && dStr !== format(end, 'yyyy-MM-dd')) break;
        }
    } else if (classData.frequency === 'pontual') {
        return classData.startDate === dateStr ? 0 : -1;
    }

    return -1; 
}

const Legend = () => (
    <div className="pt-4 mt-6 border-t">
        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Legenda</h4>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span className="font-medium">Presencial</span>
            </div>
            <div className="flex items-center gap-2">
                <PlayCircle className="size-4 text-indigo-500" />
                <span className="font-medium">Theoflix</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="bg-amber-100 text-amber-700 size-5 flex items-center justify-center rounded text-[10px] font-black border border-amber-200 shadow-sm">R</div>
                <span className="font-medium">Reposição</span>
            </div>
            <div className="flex items-center gap-2">
                <Clock className="size-4 text-slate-300" />
                <span className="font-medium">Pendente</span>
            </div>
        </div>
    </div>
);

export function CourseAttendanceMatrix({ courseId }: { courseId: string }) {
    const { classes, users, courses, updateVolunteer, isLoading } = useVolunteering();
    const { toast } = useToast();
    const [selectedClassId, setSelectedClassId] = useState<string>('all');
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Filtros de coluna
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

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

    const allDates = useMemo(() => {
        const dates = new Set<string>();
        filteredClasses.forEach(cls => {
            cls.attendance?.forEach(att => dates.add(att.date));
        });
        return Array.from(dates).sort();
    }, [filteredClasses]);

    // Função utilitária para checar conclusão de módulo por aluno
    const getModuleStatus = (student: any, modId: string) => {
        const modIndex = parseInt(modId) - 1;
        let regularAttendance: any = null;
        let repositionAttendance: any = null;

        courseClasses.forEach(c => {
            const isEnrolled = c.students?.includes(student.id);
            c.attendance?.forEach(att => {
                if (getModuleIndexForDate(att.date, c, course?.syllabus || []) === modIndex) {
                    const isPresent = att.presentStudentIds?.includes(student.id);
                    const isOnline = att.onlineStudentIds?.includes(student.id);
                    const isRepoRecord = att.repositions?.some(r => r.studentId === student.id);

                    if (isEnrolled && (isPresent || isOnline)) {
                        regularAttendance = { ...att, isOnline };
                    } else if (!isEnrolled && (isPresent || isOnline || isRepoRecord)) {
                        repositionAttendance = att;
                    }
                }
            });
        });

        const isManualDone = student.journey?.memberCourseProgress?.[`module${modId}`];
        
        return {
            isDone: !!(regularAttendance || repositionAttendance || isManualDone),
            isRepo: !!(!regularAttendance && repositionAttendance),
            isOnline: !!(regularAttendance?.isOnline),
            isManual: !!(isManualDone && !regularAttendance && !repositionAttendance),
            data: regularAttendance || repositionAttendance
        };
    };

    const students = useMemo(() => {
        const studentSet = new Set<string>();
        filteredClasses.forEach(cls => cls.students?.forEach(sId => studentSet.add(sId)));
        let baseStudents = users.filter(u => studentSet.has(u.id)).sort((a, b) => a.name.localeCompare(b.name));

        // Aplica filtros de coluna
        return baseStudents.filter(student => {
            for (const [key, value] of Object.entries(columnFilters)) {
                if (value === 'all' || !value) continue;

                if (key === 'status') {
                    const mandatoryModules = modules.filter(m => m.type !== 'Obrigatório').length; // Simplificação
                    let completedMandatory = 0;
                    modules.forEach(m => {
                        const status = getModuleStatus(student, m.id);
                        if (status.isDone && m.type !== 'Eletivo') completedMandatory++;
                    });
                    
                    const totalMandatory = modules.filter(m => m.type !== 'Eletivo').length;
                    const percent = totalMandatory > 0 ? (completedMandatory / totalMandatory) * 100 : 0;
                    const isApto = percent >= threshold;

                    if (value === 'apto' && !isApto) return false;
                    if (value === 'pendente' && isApto) return false;
                } else if (key.startsWith('mod_')) {
                    const modId = key.replace('mod_', '');
                    const status = getModuleStatus(student, modId);
                    if (value === 'concluido' && !status.isDone) return false;
                    if (value === 'pendente' && status.isDone) return false;
                }
            }
            return true;
        });
    }, [users, filteredClasses, columnFilters, modules, threshold]);

    const handleSyncWithProfiles = async () => {
        if (!courseId || isSyncing) return;
        setIsSyncing(true);
        
        try {
            let syncCount = 0;
            const promises = students.map(student => {
                const totalMandatory = modules.filter(m => m.type !== 'Eletivo').length;
                let completedMandatory = 0;
                modules.forEach(m => {
                    if (getModuleStatus(student, m.id).isDone && m.type !== 'Eletivo') completedMandatory++;
                });

                const isApproved = totalMandatory > 0 && (completedMandatory / totalMandatory) * 100 >= threshold;

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

    const toggleFilter = (columnKey: string, value: string) => {
        setColumnFilters(prev => ({
            ...prev,
            [columnKey]: value
        }));
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <TooltipProvider>
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
                        {Object.values(columnFilters).some(v => v !== 'all') && (
                            <Button variant="ghost" size="sm" onClick={() => setColumnFilters({})} className="text-[10px] font-bold uppercase text-destructive">
                                Limpar Filtros
                            </Button>
                        )}
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
                                <TableHead className="min-w-[250px] sticky left-0 bg-white z-[2] border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                    <div className="flex items-center justify-between">
                                        <span>Aluno</span>
                                        <Badge variant="outline" className="text-[9px]">{students.length} exibidos</Badge>
                                    </div>
                                </TableHead>
                                {isMembership ? (
                                    modules.map((mod) => (
                                        <TableHead key={mod.id} className="text-center min-w-[180px] py-4 relative group/header">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className={cn(
                                                    "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                                    mod.type === 'Eletivo' ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                                                )}>
                                                    {mod.type === 'Eletivo' ? 'Eletivo' : `Módulo ${mod.id}`}
                                                </span>
                                                <div className="flex items-center justify-center gap-1.5 w-full px-2">
                                                    <span className="font-bold text-slate-900 leading-none text-xs truncate">
                                                        {mod.title}
                                                    </span>
                                                    
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className={cn(
                                                                "p-1 rounded hover:bg-slate-200 transition-colors",
                                                                columnFilters[`mod_${mod.id}`] && columnFilters[`mod_${mod.id}`] !== 'all' ? "text-primary" : "text-slate-400"
                                                            )}>
                                                                <ListFilter size={14} />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-40">
                                                            <DropdownMenuLabel className="text-[10px] uppercase font-black">Filtrar Módulo</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuRadioGroup value={columnFilters[`mod_${mod.id}`] || 'all'} onValueChange={(v) => toggleFilter(`mod_${mod.id}`, v)}>
                                                                <DropdownMenuRadioItem value="all" className="text-xs">Todos</DropdownMenuRadioItem>
                                                                <DropdownMenuRadioItem value="concluido" className="text-xs">Concluídos</DropdownMenuRadioItem>
                                                                <DropdownMenuRadioItem value="pendente" className="text-xs">Pendentes</DropdownMenuRadioItem>
                                                            </DropdownMenuRadioGroup>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        </TableHead>
                                    ))
                                ) : (
                                    allDates.map((date, index) => {
                                        return (
                                            <TableHead key={date} className="text-center min-w-[180px] px-2 py-4">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase">Aula {index + 1}</span>
                                                    <span className="font-bold text-slate-900 leading-none">{format(parseISO(date), 'dd/MM')}</span>
                                                </div>
                                            </TableHead>
                                        )
                                    })
                                )}
                                <TableHead className="text-center min-w-[140px] bg-primary/5 font-black text-primary p-0">
                                    <div className="flex items-center justify-center gap-2 h-full w-full py-4">
                                        Status
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className={cn(
                                                    "p-1 rounded hover:bg-primary/10 transition-colors",
                                                    columnFilters['status'] && columnFilters['status'] !== 'all' ? "text-primary" : "text-primary/40"
                                                )}>
                                                    <ListFilter size={16} />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                <DropdownMenuLabel className="text-[10px] uppercase font-black">Filtrar Status</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuRadioGroup value={columnFilters['status'] || 'all'} onValueChange={(v) => toggleFilter('status', v)}>
                                                    <DropdownMenuRadioItem value="all" className="text-xs">Todos</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="apto" className="text-xs">Aptos (75%+)</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="pendente" className="text-xs">Pendentes</DropdownMenuRadioItem>
                                                </DropdownMenuRadioGroup>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isMembership ? modules.length + 2 : allDates.length + 2} className="h-32 text-center text-muted-foreground italic">
                                        Nenhum aluno atende aos filtros selecionados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                students.map(student => {
                                    let completedCount = 0;
                                    const studentClass = courseClasses.find(c => c.students?.includes(student.id));

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
                                                    const status = getModuleStatus(student, mod.id);
                                                    if (status.isDone && mod.type !== 'Eletivo') completedCount++;

                                                    let icon = <Clock className="text-slate-300 size-5 mx-auto" />;
                                                    
                                                    if (status.isDone) {
                                                        if (status.isRepo) {
                                                            const repoClass = courseClasses.find(c => c.attendance?.some(att => att.date === status.data?.date && att.repositions?.some(r => r.studentId === student.id)));
                                                            let originalDate = "Não definida";
                                                            if (studentClass) {
                                                                const ownClassAtt = studentClass.attendance?.find(a => getModuleIndexForDate(a.date, studentClass) === (parseInt(mod.id) - 1));
                                                                originalDate = ownClassAtt ? format(parseISO(ownClassAtt.date), 'dd/MM/yyyy') : "Pendente na Turma";
                                                            }

                                                            icon = (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="cursor-help mx-auto w-fit">
                                                                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 h-6 w-6 p-0 flex items-center justify-center font-black">
                                                                                R
                                                                            </Badge>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="bg-slate-900 text-white border-none p-3 shadow-xl">
                                                                        <div className="space-y-1 text-left">
                                                                            <p className="text-[10px] font-black uppercase text-amber-400">Reposição Realizada</p>
                                                                            <p className="text-xs font-bold">Turma: {repoClass?.name || 'Outra Turma'}</p>
                                                                            <p className="text-xs">Data da Reposição: {status.data?.date ? format(parseISO(status.data.date), 'dd/MM/yyyy') : '-'}</p>
                                                                            <p className="text-[10px] opacity-70 italic mt-1">Aula original da sua turma: {originalDate}</p>
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            );
                                                        } else if (status.isOnline || status.isManual) {
                                                            icon = <PlayCircle className="size-5 mx-auto text-indigo-500" />;
                                                        } else {
                                                            icon = <CheckCircle2 className="size-5 mx-auto text-emerald-500" />;
                                                        }
                                                    }

                                                    return <TableCell key={mod.id} className="text-center">{icon}</TableCell>;
                                                })
                                            ) : (
                                                allDates.map((date, index) => {
                                                    const attendanceRecord = filteredClasses.flatMap(c => c.attendance || []).find(att => att.date === date);
                                                    const isInPerson = attendanceRecord?.presentStudentIds?.includes(student.id);
                                                    const isOnlineLive = attendanceRecord?.onlineStudentIds?.includes(student.id);
                                                    const isRepo = attendanceRecord?.repositions?.some(r => r.studentId === student.id);
                                                    const isDone = isInPerson || isOnlineLive || isRepo;
                                                    if (isDone) completedCount++;

                                                    let icon = <Minus className="text-slate-300 size-5 mx-auto" />;
                                                    if (isInPerson) icon = <CheckCircle2 className="size-5 mx-auto text-emerald-500" />;
                                                    else if (isOnlineLive) icon = <PlayCircle className="size-5 mx-auto text-indigo-500" />;
                                                    else if (isRepo) icon = <Badge className="bg-amber-100 text-amber-700 border-amber-200 h-5 w-5 p-0 flex items-center justify-center font-black mx-auto">R</Badge>;

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
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
                <Legend />
            </div>
        </TooltipProvider>
    );
}
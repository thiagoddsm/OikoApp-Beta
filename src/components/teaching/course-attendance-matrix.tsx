
'use client';
import React, { useMemo, useState } from 'react';
import { useVolunteering, getModuleIndexForDate, weekDayMap, Course, Class } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Award, Loader2, Users, GraduationCap, ChevronRight, XCircle, Minus, Video, PlayCircle, Star, Filter, RefreshCw, Send, Info, ListFilter, Search } from 'lucide-react';
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
import { addTimelineEvent } from '@/lib/timeline';
import { useFirebase } from '@/firebase';



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
    const { firestore, user: currentUser } = useFirebase();    const [selectedClassId, setSelectedClassId] = useState<string>('all');
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    
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
                theoflixCourseId: (s as any).theoflixCourseId
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
            const validDatesForThisClass = new Set<string>();

            // Aulas regulares
            if (cls.startDate) {
                const start = parseISO(cls.startDate);
                const end = cls.endDate ? parseISO(cls.endDate) : addMonths(start, 2);
                const holidaySet = new Set(cls.holidayDates || []);
                const overrides = cls.scheduleOverrides || {};
                
                if (cls.frequency === 'pontual') {
                    dates.add(cls.startDate);
                    validDatesForThisClass.add(cls.startDate);
                } else {
                    let current = start;
                    let safe = 0;
                    while (safe++ < 200) {
                        const dStr = format(current, 'yyyy-MM-dd');
                        if (!holidaySet.has(dStr) && !overrides[dStr]?.isCancelled) {
                            dates.add(dStr);
                            validDatesForThisClass.add(dStr);
                        } else if (overrides[dStr] && !overrides[dStr]?.isCancelled) {
                            dates.add(dStr);
                            validDatesForThisClass.add(dStr);
                        }
                        current = addWeeks(current, cls.frequency === 'quinzenal' ? 2 : 1);
                        if (isBefore(end, current) && dStr !== format(end, 'yyyy-MM-dd')) break;
                    }
                }

                // Adicionar overrides que caem fora da recorrência (step 2 do log)
                Object.keys(overrides).forEach(dStr => {
                    if (!overrides[dStr]?.isCancelled) {
                        dates.add(dStr);
                        validDatesForThisClass.add(dStr);
                    }
                });
            }
            
            const repoOnlyDates = new Set(cls.extraSessions?.filter(s => s.isRepositionOnly).map(s => `${s.date}T${s.startTime}`) || []);

            // Aulas extras (novo modelo)
            const allExtraSessionDates = new Set(cls.extraSessions?.map(s => `${s.date}T${s.startTime}`) || []);
            
            cls.extraSessions?.forEach(s => {
                if (!s.isRepositionOnly) {
                    dates.add(`${s.date}T${s.startTime}`);
                    validDatesForThisClass.add(`${s.date}T${s.startTime}`);
                }
            });

            // Fallback para presenças marcadas sem calendário (Legado)
            cls.attendance?.forEach(att => {
                // Ignorar reposições estritas
                if (repoOnlyDates.has(att.date) || att.isRepositionOnly) return;
                
                // Se é uma data com horário (aula extra) e não está na lista atual, é resquício de exclusão
                if (att.date.includes('T') && !allExtraSessionDates.has(att.date)) return;

                // Se a turma TEM um cronograma estruturado, a data deve estar no cronograma válido
                if (cls.startDate && !validDatesForThisClass.has(att.date)) return;

                dates.add(att.date);
            });
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

    // Alunos filtrados por busca textual e filtros de coluna
    const filteredStudents = useMemo(() => {
        const studentSet = new Set<string>();
        filteredClasses.forEach(cls => cls.students?.forEach(sId => studentSet.add(sId)));
        let baseStudents = users.filter(u => studentSet.has(u.id)).sort((a, b) => a.name.localeCompare(b.name));

        // Filtro por texto (Busca)
        if (searchQuery.trim()) {
            const normalizedQuery = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            baseStudents = baseStudents.filter(s => 
                s.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalizedQuery)
            );
        }

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
    }, [users, filteredClasses, columnFilters, modules, threshold, searchQuery]);

    // Paginação
    const paginatedStudents = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredStudents, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

    const handleSyncWithProfiles = async () => {
        if (!courseId || isSyncing) return;
        setIsSyncing(true);
        
        try {
            let syncCount = 0;
            const promises = filteredStudents.map(student => {
                const totalMandatory = modules.filter(m => m.type !== 'Eletivo').length;
                let completedMandatory = 0;
                modules.forEach(m => {
                    if (getModuleStatus(student, m.id).isDone && m.type !== 'Eletivo') completedMandatory++;
                });

                const isApproved = totalMandatory > 0 && (completedMandatory / totalMandatory) * 100 >= threshold;
                const alreadyApproved = student.journey?.courseStatus?.[courseId] === 'approved';

                if (isApproved) {
                    syncCount++;
                    const updatePromise = updateVolunteer(student.id, {
                        [`journey.courseStatus.${courseId}`]: 'approved'
                    });

                    // ── Timeline trigger ──────────────────────────────────────
                    if (!alreadyApproved && firestore) {
                        addTimelineEvent(student.id, firestore, {
                            category: 'teaching',
                            entityTitle: course?.name ?? 'Curso',
                            eventDescription: 'APROVADO',
                            statusBadge: 'APROVADO',
                            source: 'automatic',
                            authorId: currentUser?.uid ?? 'system',
                            relatedId: courseId,
                        }).catch(console.error);
                    }
                    // ── Fim do trigger ────────────────────────────────────────

                    return updatePromise;
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
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-dashed">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2.5 rounded-xl text-primary shadow-sm">
                            <Filter className="size-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 leading-none">Matriz de Aproveitamento</h3>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Controle de frequência e conclusão</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        {Object.values(columnFilters).some(v => v !== 'all') && (
                            <Button variant="ghost" size="sm" onClick={() => setColumnFilters({})} className="text-[10px] font-bold uppercase text-destructive">
                                Limpar Filtros
                            </Button>
                        )}
                        <div className="relative min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar aluno por nome..."
                                className="w-full h-11 pl-9 pr-4 rounded-lg border bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1); // Volta para a primeira página
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-3 bg-white p-1.5 rounded-lg border shadow-sm min-w-[200px]">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Turma:</Label>
                            <Select value={selectedClassId} onValueChange={(v) => { setSelectedClassId(v); setCurrentPage(1); }}>
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
                    </div>
                </div>

                <div className="rounded-xl border bg-background overflow-x-auto shadow-sm">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="min-w-[250px] sticky left-0 bg-white z-[2] border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                    <div className="flex items-center justify-between">
                                        <span>Aluno</span>
                                        <Badge variant="outline" className="text-[9px]">{filteredStudents.length} filtrados</Badge>
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
                                        // Encontrar qual turma tem esta aula (para pegar o módulo certo)
                                        const relevantClass = filteredClasses.find(c => getModuleIndexForDate(date, c, course?.syllabus || []) !== -1) || filteredClasses[0];
                                        const modIndex = getModuleIndexForDate(date, relevantClass, course?.syllabus || []);
                                        const mod = modIndex !== -1 ? course?.syllabus?.[modIndex] : null;
                                        const isExtra = date.includes('T');
                                        const displayDate = date.includes('T') ? parseISO(date) : parseISO(date);

                                        return (
                                            <TableHead key={date} className="text-center min-w-[200px] px-2 py-4 group">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="flex items-center gap-1">
                                                        <span className={cn(
                                                            "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                                            isExtra ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"
                                                        )}>
                                                            {isExtra ? 'Reposição' : `Aula ${index + 1}`}
                                                        </span>
                                                        {mod && (
                                                            <Tooltip>
                                                                 <TooltipTrigger asChild>
                                                                    <div className="cursor-help">
                                                                        <Info className="size-3 text-slate-400 group-hover:text-primary transition-colors" />
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-[250px] p-3 bg-slate-900 text-white border-none shadow-2xl">
                                                                    <p className="text-[10px] font-black uppercase text-primary mb-1">Módulo Vinculado</p>
                                                                    <p className="text-xs font-bold mb-1">{mod.title}</p>
                                                                    <p className="text-[10px] opacity-70 leading-relaxed line-clamp-4">{mod.description}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                    <span className="font-bold text-slate-900 leading-none">
                                                        {format(displayDate, 'dd/MM')}
                                                        {isExtra && <span className="text-[9px] opacity-50 ml-1">{format(displayDate, 'HH:mm')}</span>}
                                                    </span>
                                                    {mod && (
                                                        <span className="text-[10px] font-medium text-slate-500 truncate w-full px-2" title={mod.title}>
                                                            {mod.title}
                                                        </span>
                                                    )}
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
                            {paginatedStudents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isMembership ? modules.length + 2 : allDates.length + 2} className="h-32 text-center text-muted-foreground italic">
                                        Nenhum aluno atende aos filtros selecionados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedStudents.map(student => {
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
                                                                const ownClassAtt = studentClass.attendance?.find(a => 
                                                                    getModuleIndexForDate(a.date, studentClass, course?.syllabus || []) === (parseInt(mod.id) - 1)
                                                                );
                                                                if (ownClassAtt?.date) {
                                                                    originalDate = format(parseISO(ownClassAtt.date), 'dd/MM/yyyy');
                                                                } else {
                                                                    originalDate = "Pendente na Turma";
                                                                }
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
                                                    
                                                    // Verifica reposições nativas ou via aula extra
                                                    let isRepo = false;
                                                    let repoDateStr: string | undefined;

                                                    const nativeRepo = attendanceRecord?.repositions?.find(r => r.studentId === student.id);
                                                    if (nativeRepo) {
                                                        isRepo = true;
                                                        repoDateStr = nativeRepo.dateStr;
                                                    }
                                                    
                                                    // Verifica se houve uma aula extra de reposição para este módulo
                                                    if (!isInPerson && !isOnlineLive && !isRepo) {
                                                        const relevantClass = filteredClasses.find(c => getModuleIndexForDate(date, c, course?.syllabus || []) !== -1) || filteredClasses[0];
                                                        const modIndex = getModuleIndexForDate(date, relevantClass, course?.syllabus || []);
                                                        const mod = modIndex !== -1 ? course?.syllabus?.[modIndex] : null;
                                                        
                                                        if (mod) {
                                                            const repositionSessions = relevantClass.extraSessions?.filter(s => s.isRepositionOnly && s.syllabusId === mod.id) || [];
                                                            for (const session of repositionSessions) {
                                                                const sessionDateStr = `${session.date}T${session.startTime}`;
                                                                const attRecord = relevantClass.attendance?.find(a => a.date === sessionDateStr);
                                                                if (attRecord?.presentStudentIds?.includes(student.id) || attRecord?.onlineStudentIds?.includes(student.id)) {
                                                                    isRepo = true;
                                                                    repoDateStr = sessionDateStr;
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                    }

                                                    const isDone = isInPerson || isOnlineLive || isRepo;
                                                    if (isDone) completedCount++;

                                                    let icon = <Minus className="text-slate-300 size-5 mx-auto" />;
                                                    if (isInPerson) icon = <CheckCircle2 className="size-5 mx-auto text-emerald-500" />;
                                                    else if (isOnlineLive) icon = <PlayCircle className="size-5 mx-auto text-indigo-500" />;
                                                    else if (isRepo) {
                                                        icon = (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                                                        <div className="cursor-help mx-auto w-fit">
                                                                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 h-5 w-5 p-0 flex items-center justify-center font-black">
                                                                            R
                                                                        </Badge>
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="bg-slate-900 text-white border-none p-3 shadow-xl">
                                                                    <div className="space-y-1 text-left">
                                                                        <p className="text-[10px] font-black uppercase text-amber-400">Reposição Realizada</p>
                                                                        <p className="text-xs">
                                                                            Data da Reposição: {repoDateStr ? format(parseISO(repoDateStr), 'dd/MM/yyyy') : '-'}
                                                                        </p>
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        );
                                                    }

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

                {/* Controles de Paginação */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-dashed text-sm text-muted-foreground font-medium">
                        <div className="flex items-center gap-2">
                            <span>Mostrar</span>
                            <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                                <SelectTrigger className="h-8 w-16 bg-white font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="15">15</SelectItem>
                                    <SelectItem value="30">30</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                            <span>por página</span>
                            <span className="mx-2 text-slate-300">|</span>
                            <span>Exibindo de {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredStudents.length)} de {filteredStudents.length} alunos</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                                disabled={currentPage === 1}
                                className="h-8 px-3 font-bold uppercase text-xs"
                            >
                                Anterior
                            </Button>
                            <div className="flex items-center gap-1 mx-2">
                                <span className="font-bold text-slate-800">{currentPage}</span>
                                <span className="opacity-50">/</span>
                                <span>{totalPages}</span>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                                disabled={currentPage === totalPages}
                                className="h-8 px-3 font-bold uppercase text-xs"
                            >
                                Próxima
                            </Button>
                        </div>
                    </div>
                )}

                <Legend />
            </div>
        </TooltipProvider>
    );
}
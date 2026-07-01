'use client';
import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useVolunteering, type Class, type Course, getMonthlyOccurrences, getSlotsPerOccurrence, weekDayMap } from '@/contexts/volunteering-context';
import { format, addWeeks, addDays, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, ArrowUpDown, Clock, User, BookOpen, AlertTriangle, CheckCircle2, XCircle, RotateCcw, PlusCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useMembersData, useCoursesData } from "@/hooks/useDomainData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ClassScheduleManagerProps {
    classData: Class;
}

export function ClassScheduleManager({ classData }: ClassScheduleManagerProps) {
    const { users } = useMembersData();
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();

    const { updateClass } = useVolunteering();
    const { toast } = useToast();
    const course = useMemo(() => courses.find(c => c.id === classData.courseId), [courses, classData.courseId]);
    const syllabus = course?.syllabus || [];
    const teachers = useMemo(() => users.filter(u => u.isTeacher), [users]);

    // Novos states para o modal de Aula Extra
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newClassDate, setNewClassDate] = useState('');
    const [newClassSyllabusId, setNewClassSyllabusId] = useState('');
    const [newClassStartTime, setNewClassStartTime] = useState('09:00');
    const [newClassEndTime, setNewClassEndTime] = useState('10:00');

    // Calcular as datas base do cronograma
    const schedule = useMemo(() => {
        if (!classData.startDate) return [];
        
        const items: any[] = [];
        const start = parseISO(classData.startDate);
        const holidaySet = new Set(classData.holidayDates || []);
        const overrides = classData.scheduleOverrides || {};
        const slots = getSlotsPerOccurrence(classData);
        const slotsPerDay = slots.length;

        // 1. Gerar datas de ocorrência (incluindo as que podem ser canceladas)
        let occurrenceDates: Date[] = [];
        const end = classData.endDate ? parseISO(classData.endDate) : addWeeks(start, 52); // Buscar até 1 ano

        if (classData.frequency === 'pontual') {
            occurrenceDates = [start];
        } else if (classData.frequency === 'mensal' && classData.weekOfMonth && classData.dayOfWeek) {
            const dayName = classData.dayOfWeek.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace('-feira', '');
            const weekday = weekDayMap[dayName] ?? 0;
            occurrenceDates = getMonthlyOccurrences(start, end, weekday, classData.weekOfMonth);
        } else {
            // Semanal / Quinzenal
            let currentDate = start;
            let safeCounter = 0;
            const step = classData.frequency === 'quinzenal' ? 2 : 1;
            while (safeCounter++ < 300 && currentDate <= end) {
                occurrenceDates.push(new Date(currentDate));
                currentDate = addWeeks(currentDate, step);
            }
        }

        // Se tiver ementa, vamos gerar tantas datas quanto itens na ementa
        const targetCount = syllabus.length > 0 ? syllabus.length : 12;
        let syllabusIndex = 0;

        for (const occDate of occurrenceDates) {
            if (syllabusIndex >= targetCount) break;

            const dateStr = format(occDate, 'yyyy-MM-dd');
            
            // Pular se for feriado e não houver override forçando
            if (holidaySet.has(dateStr) && !overrides[dateStr]) {
                continue;
            }

            // Coletar overrides para este dia (principal e sufixados, ex: YYYY-MM-DD, YYYY-MM-DD-1, YYYY-MM-DD-2)
            const dayOverridesForThisDate: { key: string; val: any }[] = [];
            if (overrides[dateStr]) {
                dayOverridesForThisDate.push({ key: dateStr, val: overrides[dateStr] });
            }
            let suffixIdx = 1;
            while (overrides[`${dateStr}-${suffixIdx}`]) {
                dayOverridesForThisDate.push({ key: `${dateStr}-${suffixIdx}`, val: overrides[`${dateStr}-${suffixIdx}`] });
                suffixIdx++;
            }

            // Se não houver overrides, usamos o comportamento padrão (aula regular)
            if (dayOverridesForThisDate.length === 0) {
                dayOverridesForThisDate.push({ key: dateStr, val: null });
            }

            for (const { key: activeKey, val: activeOverride } of dayOverridesForThisDate) {
                if (syllabusIndex >= targetCount) break;
                if (activeOverride?.isCancelled) {
                    continue;
                }

                // Gerar entrada para cada slot do dia
                for (let slotIdx = 0; slotIdx < slotsPerDay; slotIdx++) {
                    if (syllabusIndex >= targetCount) break;

                    const slot = slots[slotIdx];
                    const slotDateStr = slotsPerDay > 1 
                        ? (activeKey === dateStr ? `${dateStr}T${slot.startTime}` : `${activeKey}T${slot.startTime}`)
                        : activeKey;
                    
                    const syllabusItem = activeOverride?.syllabusId 
                        ? syllabus.find(s => s.id === activeOverride.syllabusId) 
                        : syllabus[syllabusIndex];

                    const teacher = activeOverride?.teacherId
                        ? users.find(u => u.id === activeOverride.teacherId)
                        : users.find(u => u.id === classData.teacherId);

                    items.push({
                        date: occDate,
                        dateStr: slotDateStr,
                        dayDateStr: dateStr,
                        syllabusItem,
                        teacher,
                        isOverride: !!activeOverride,
                        isCancelled: activeOverride?.isCancelled,
                        notes: activeOverride?.notes,
                        originalIndex: syllabusIndex,
                        startTime: activeOverride?.startTime || slot.startTime,
                        endTime: activeOverride?.endTime || slot.endTime,
                        slotIndex: slotIdx,
                        slotsPerDay
                    });

                    if (!activeOverride) {
                        syllabusIndex++;
                    } else if (activeOverride.syllabusId) {
                        if (syllabus[syllabusIndex]?.id === activeOverride.syllabusId) {
                            syllabusIndex++;
                        }
                    }
                }
            }
        }

        return items;
    }, [classData, syllabus, users]);

    const handleUpdateOverride = async (dateStr: string, data: any) => {
        const newOverrides = { ...(classData.scheduleOverrides || {}) };
        if (data === null) {
            delete newOverrides[dateStr];
        } else {
            newOverrides[dateStr] = { ...(newOverrides[dateStr] || {}), ...data };
        }

        try {
            await updateClass(classData.id, { scheduleOverrides: newOverrides });
            toast({ title: "Cronograma atualizado", description: "As alterações foram salvas com sucesso." });
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao salvar", description: "Não foi possível atualizar o cronograma." });
        }
    };

    const handleMoveDate = async (oldDateStr: string, newDateStr: string, item: any) => {
        const newOverrides = { ...(classData.scheduleOverrides || {}) };
        
        // 1. Cancelar a ocorrência na data anterior. Se ela possuía dados, desativamos
        if (newOverrides[oldDateStr]) {
            newOverrides[oldDateStr] = { ...newOverrides[oldDateStr], isCancelled: true };
        } else {
            // Criar entrada de cancelamento para o dia regular antigo
            newOverrides[oldDateStr] = { isCancelled: true };
        }
        
        // 2. Definir a nova chave de destino. Se já houver aula ativa no dia, usamos sufixo indexado
        let targetKey = newDateStr;
        const isTargetOccupied = schedule.some(i => i.dayDateStr === newDateStr && !i.isCancelled && i.dateStr !== oldDateStr);
        
        if (isTargetOccupied) {
            let suffix = 1;
            while (newOverrides[`${newDateStr}-${suffix}`] && !newOverrides[`${newDateStr}-${suffix}`].isCancelled) {
                suffix++;
            }
            targetKey = `${newDateStr}-${suffix}`;
        }

        // Criar ou atualizar a ocorrência de destino, mantendo a ementa correta e adicionando campo para horário customizado
        newOverrides[targetKey] = { 
            ...(newOverrides[targetKey] || {}), 
            syllabusId: item.syllabusItem?.id, 
            teacherId: item.teacher?.id,
            startTime: item.startTime || classData.startTime,
            endTime: item.endTime || classData.endTime,
            isCancelled: false 
        };

        try {
            await updateClass(classData.id, { scheduleOverrides: newOverrides });
            toast({ title: "Aula reagendada", description: "A data foi alterada com sucesso." });
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao reagendar" });
        }
    };

    const handleAddClass = async () => {
        if (!newClassDate || !newClassSyllabusId) {
            toast({ variant: "destructive", title: "Campos obrigatórios", description: "Defina a data e o tema da aula extra." });
            return;
        }

        const newOverrides = { ...(classData.scheduleOverrides || {}) };
        
        let targetKey = newClassDate;
        // Se a data de destino já estiver ocupada no cronograma, criamos um sufixo
        const isTargetOccupied = schedule.some(i => i.dayDateStr === newClassDate && !i.isCancelled);
        if (isTargetOccupied) {
            let suffix = 1;
            while (newOverrides[`${newClassDate}-${suffix}`] && !newOverrides[`${newClassDate}-${suffix}`].isCancelled) {
                suffix++;
            }
            targetKey = `${newClassDate}-${suffix}`;
        }

        newOverrides[targetKey] = {
            syllabusId: newClassSyllabusId,
            teacherId: classData.teacherId || '',
            startTime: newClassStartTime,
            endTime: newClassEndTime,
            isCancelled: false
        };

        try {
            await updateClass(classData.id, { scheduleOverrides: newOverrides });
            toast({ title: "Aula extra adicionada", description: "O cronograma foi atualizado com sucesso." });
            setIsAddOpen(false);
            setNewClassDate('');
            setNewClassSyllabusId('');
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao adicionar", description: "Não foi possível registrar a nova aula." });
        }
    };

    const handleSwap = async (date1: string, date2: string) => {
        const item1 = schedule.find(i => i.dateStr === date1);
        const item2 = schedule.find(i => i.dateStr === date2);
        
        if (!item1 || !item2) return;

        const newOverrides = { ...(classData.scheduleOverrides || {}) };
        
        // Trocar os syllabusIds e teacherIds
        const s1 = item1.syllabusItem?.id;
        const s2 = item2.syllabusItem?.id;
        const t1 = item1.teacher?.id;
        const t2 = item2.teacher?.id;

        newOverrides[date1] = { ...(newOverrides[date1] || {}), syllabusId: s2, teacherId: t2 };
        newOverrides[date2] = { ...(newOverrides[date2] || {}), syllabusId: s1, teacherId: t1 };

        try {
            await updateClass(classData.id, { scheduleOverrides: newOverrides });
            toast({ title: "Permuta realizada", description: "As aulas foram trocadas com sucesso." });
        } catch (error) {
            toast({ variant: "destructive", title: "Erro na permuta" });
        }
    };

    if (syllabus.length === 0) {
        return (
            <Card className="border-dashed border-2">
                <CardContent className="pt-10 pb-10 text-center">
                    <BookOpen className="mx-auto size-12 text-muted-foreground opacity-20 mb-4" />
                    <h3 className="text-lg font-bold">Ementa não configurada</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                        Para gerenciar o cronograma detalhado, primeiro adicione os temas das aulas na ementa do curso.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-black uppercase tracking-tighter text-primary flex items-center gap-2">
                        <Clock className="size-5" /> Planejamento de Aulas
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">Ajuste datas, temas e professores conforme a necessidade.</p>
                </div>
                
                {/* Botão para disparar o Dialog de Aula Extra */}
                <Button 
                    onClick={() => {
                        setNewClassSyllabusId(syllabus[0]?.id || '');
                        setIsAddOpen(true);
                    }}
                    className="bg-primary hover:bg-primary/95 text-white font-bold h-9 text-xs flex items-center gap-2 px-3 shadow"
                >
                    <PlusCircle className="size-4" /> Nova Aula Extra
                </Button>
            </div>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            Nova Aula Extra
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">
                            Crie uma ocorrência fora do cronograma padrão e vincule a um tema da ementa.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="extra_date" className="text-xs text-slate-400 font-bold uppercase">Data da Aula</Label>
                            <Input
                                id="extra_date"
                                type="date"
                                value={newClassDate}
                                onChange={(e) => setNewClassDate(e.target.value)}
                                className="bg-slate-950 border-slate-800 text-white"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="extra_start" className="text-xs text-slate-400 font-bold uppercase">Início</Label>
                                <Input
                                    id="extra_start"
                                    type="time"
                                    value={newClassStartTime}
                                    onChange={(e) => setNewClassStartTime(e.target.value)}
                                    className="bg-slate-950 border-slate-800 text-white"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="extra_end" className="text-xs text-slate-400 font-bold uppercase">Término</Label>
                                <Input
                                    id="extra_end"
                                    type="time"
                                    value={newClassEndTime}
                                    onChange={(e) => setNewClassEndTime(e.target.value)}
                                    className="bg-slate-950 border-slate-800 text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="extra_syllabus" className="text-xs text-slate-400 font-bold uppercase">Tema da Ementa</Label>
                            <select
                                id="extra_syllabus"
                                value={newClassSyllabusId}
                                onChange={(e) => setNewClassSyllabusId(e.target.value)}
                                className="w-full rounded-md bg-slate-950 border border-slate-800 text-white text-xs h-9 px-2 focus:ring-blue-500"
                            >
                                {syllabus.map(s => (
                                    <option key={s.id} value={s.id}>{s.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        <DialogClose asChild>
                            <Button variant="outline" className="border-slate-800 text-slate-350 hover:bg-slate-800 w-full sm:w-auto">
                                Cancelar
                            </Button>
                        </DialogClose>
                        <Button 
                            onClick={handleAddClass} 
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold w-full sm:w-auto"
                        >
                            Adicionar Aula
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 gap-4">
                {schedule.map((item, index) => (
                    <Card key={item.dateStr} className={cn(
                        "relative overflow-hidden transition-all border-l-4",
                        item.isCancelled ? "border-l-destructive bg-destructive/5 opacity-60" : 
                        item.isOverride ? "border-l-amber-500 bg-amber-50/30" : "border-l-primary"
                    )}>
                        <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                {/* Coluna Data */}
                                <div className="flex items-center gap-3 md:w-48 shrink-0">
                                    <div className="size-10 rounded-xl bg-muted flex flex-col items-center justify-center text-muted-foreground shrink-0 border">
                                        <span className="text-[10px] font-black uppercase leading-none">{format(item.date, 'MMM', { locale: ptBR })}</span>
                                        <span className="text-lg font-black leading-none">{format(item.date, 'dd')}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold capitalize">{format(item.date, 'EEEE', { locale: ptBR })}</span>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <input 
                                                type="time" 
                                                value={item.startTime || ''} 
                                                className="bg-transparent border-none text-[10px] text-slate-500 hover:text-slate-900 font-mono w-10 focus:ring-0 p-0"
                                                onChange={(e) => handleUpdateOverride(item.dateStr, { startTime: e.target.value })}
                                            />
                                            <span className="text-[10px] text-slate-400 font-mono">-</span>
                                            <input 
                                                type="time" 
                                                value={item.endTime || ''} 
                                                className="bg-transparent border-none text-[10px] text-slate-500 hover:text-slate-900 font-mono w-10 focus:ring-0 p-0"
                                                onChange={(e) => handleUpdateOverride(item.dateStr, { endTime: e.target.value })}
                                            />
                                        </div>
                                        <Popover modal={false}>
                                            <PopoverTrigger asChild>
                                                <button className="text-[10px] text-primary hover:underline font-black uppercase tracking-widest text-left mt-1">
                                                    Alterar Data
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={item.date}
                                                    onSelect={(d) => d && handleMoveDate(item.dateStr, format(d, 'yyyy-MM-dd'), item)}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                {/* Coluna Conteúdo */}
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[9px] uppercase font-black px-1.5 h-4 bg-white">Aula {index + 1}</Badge>
                                        {item.isOverride && <Badge className="text-[9px] uppercase font-black px-1.5 h-4 bg-amber-500 hover:bg-amber-600">Alterado</Badge>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select 
                                            value={item.syllabusItem?.id} 
                                            onValueChange={(val) => handleUpdateOverride(item.dateStr, { syllabusId: val })}
                                        >
                                            <SelectTrigger className="h-auto p-0 border-none shadow-none bg-transparent hover:bg-muted/50 transition-colors focus:ring-0">
                                                <SelectValue className="text-base font-black text-left" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {syllabus.map(s => (
                                                    <SelectItem key={s.id} value={s.id} className="font-bold">{s.title}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-1 italic">{item.syllabusItem?.description || 'Sem descrição.'}</p>
                                </div>

                                {/* Coluna Professor */}
                                <div className="flex items-center gap-3 md:w-56 shrink-0 pt-2 md:pt-0 md:border-l md:pl-4">
                                    <User className="size-4 text-muted-foreground" />
                                    <div className="flex-1">
                                        <Popover modal={false}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    role="combobox"
                                                    className="h-7 w-full justify-between border-none shadow-none bg-transparent p-0 text-xs font-bold focus:ring-0 hover:bg-muted/50"
                                                >
                                                    <span className="truncate">
                                                        {item.teacher?.name || "Sem professor"}
                                                    </span>
                                                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[280px] p-0" align="start">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center border-b px-3 bg-muted/5">
                                                        <Search className="mr-2 h-3 w-3 shrink-0 opacity-50 text-primary" />
                                                        <input 
                                                            className="flex h-9 w-full rounded-md bg-transparent py-2 text-xs outline-none placeholder:text-muted-foreground" 
                                                            placeholder="Buscar professor..." 
                                                            onChange={(e) => {
                                                                // Filtro local simples se necessário, mas o Popover já é pequeno
                                                                const val = e.target.value.toLowerCase();
                                                                const items = document.querySelectorAll(`[data-teacher-item="${item.dateStr}"]`);
                                                                items.forEach((el: any) => {
                                                                    const text = el.innerText.toLowerCase();
                                                                    el.style.display = text.includes(val) ? 'flex' : 'none';
                                                                });
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="max-h-[250px] overflow-y-auto p-1">
                                                        <button
                                                            onClick={() => handleUpdateOverride(item.dateStr, { teacherId: '' })}
                                                            className="flex items-center gap-2 w-full p-2 hover:bg-primary/5 rounded-md transition-all text-left text-xs font-bold group"
                                                        >
                                                            <div className={cn("size-3 border rounded-full shrink-0", !item.teacher ? "bg-primary border-primary" : "border-muted-foreground/30")} />
                                                            Nenhum (Remover)
                                                        </button>
                                                        {teachers.map((t) => (
                                                            <button
                                                                key={t.id}
                                                                data-teacher-item={item.dateStr}
                                                                onClick={() => handleUpdateOverride(item.dateStr, { teacherId: t.id })}
                                                                className="flex items-center gap-2 w-full p-2 hover:bg-primary/5 rounded-md transition-all text-left text-xs font-bold group"
                                                            >
                                                                <div className={cn("size-3 border rounded-full shrink-0", item.teacher?.id === t.id ? "bg-primary border-primary" : "border-muted-foreground/30")} />
                                                                {t.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                {/* Ações Rápidas */}
                                <div className="flex items-center gap-1 shrink-0 pt-2 md:pt-0">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="size-8 hover:bg-primary/10">
                                                <ArrowUpDown className="size-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-56 p-2 space-y-1">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground p-2 tracking-widest">Trocar ordem com:</p>
                                            {schedule.filter(i => i.dateStr !== item.dateStr).map(i => (
                                                <Button 
                                                    key={i.dateStr}
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="w-full justify-start text-xs font-bold h-8"
                                                    onClick={() => handleSwap(item.dateStr, i.dateStr)}
                                                >
                                                    {format(i.date, 'dd/MM')} - {i.syllabusItem?.title || 'Sem título'}
                                                </Button>
                                            ))}
                                        </PopoverContent>
                                    </Popover>

                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className={cn("size-8", item.isCancelled ? "text-emerald-600 hover:bg-emerald-50" : "text-destructive hover:bg-destructive/5")}
                                        onClick={() => handleUpdateOverride(item.dateStr, { isCancelled: !item.isCancelled })}
                                        title={item.isCancelled ? "Ativar Aula" : "Cancelar Aula"}
                                    >
                                        {item.isCancelled ? <RotateCcw className="size-4" /> : <XCircle className="size-4" />}
                                    </Button>

                                    {item.isOverride && !item.isCancelled && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="size-8 text-muted-foreground hover:text-primary"
                                            onClick={() => handleUpdateOverride(item.dateStr, null)}
                                            title="Restaurar padrão"
                                        >
                                            <RotateCcw className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            
            <div className="flex justify-center pt-4">
                <div className="flex items-center gap-8 text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">
                    <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-primary" /> Padrão</div>
                    <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-amber-500" /> Alterado (Override)</div>
                    <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-destructive" /> Cancelado</div>
                </div>
            </div>
        </div>
    );
}

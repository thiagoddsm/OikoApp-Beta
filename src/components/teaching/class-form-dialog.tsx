'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Calendar as CalendarIcon, X, PlusCircle, Users, Clock, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVolunteering, Class, Course } from '@/contexts/volunteering-context';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Search } from "lucide-react";

type User = { id: string; name: string; isTeacher?: boolean; };
const weekDays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

interface ClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingClass?: Class;
  courseId: string;
}

export function ClassFormDialog({ open, onOpenChange, existingClass, courseId }: ClassFormDialogProps) {
  const { addClass, updateClass, users, rooms, courses, isLoading: isLoadingContext } = useVolunteering();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [maxStudents, setMaxStudents] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [frequency, setFrequency] = useState<'pontual' | 'semanal' | 'quinzenal' | 'mensal'>('pontual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [weekOfMonth, setWeekOfMonth] = useState('');
  const [holidayDates, setHolidayDates] = useState<string[]>([]);
  const [extraDates, setExtraDates] = useState<string[]>([]); // Mantido para retrocompatibilidade
  const [extraSessions, setExtraSessions] = useState<{ id: string; date: string; startTime: string; endTime: string; syllabusId?: string; isRepositionOnly?: boolean; }[]>([]);
  const [scheduleOverrides, setScheduleOverrides] = useState<Record<string, any>>({});
  
  const [locationType, setLocationType] = useState<'ibm' | 'the_school' | ''>('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [ibmRoomId, setIbmRoomId] = useState('');


  const teachers = useMemo(() => users?.filter(u => u.isTeacher) || [], [users]);
  const isLoading = isLoadingContext;

  useEffect(() => {
    if (open) {
      if (existingClass) {
        setName(existingClass.name || '');
        setTeacherId(existingClass.teacherId || '');
        setMaxStudents(existingClass.maxStudents?.toString() || '');
        setFrequency(existingClass.frequency || 'pontual');
        setStartDate(existingClass.startDate || '');
        setEndDate(existingClass.endDate || '');
        setStartTime(existingClass.startTime || '');
        setEndTime(existingClass.endTime || '');
        setDayOfWeek(existingClass.dayOfWeek || '');
        setWeekOfMonth(existingClass.weekOfMonth || '');
        setHolidayDates(existingClass.holidayDates || []);
        setExtraDates(existingClass.extraDates || []);
        setExtraSessions(existingClass.extraSessions || []);
        setScheduleOverrides(existingClass.scheduleOverrides || {});
        setRegistrationDeadline(existingClass.registrationDeadline || '');
        
        if (existingClass.locationId === 'the_school') {
            setLocationType('the_school');
            setIbmRoomId('');
        } else if (existingClass.locationId) {
            setLocationType('ibm');
            setIbmRoomId(existingClass.locationId);
        } else {
            setLocationType('');
            setIbmRoomId('');
        }

      } else {
        setName('');
        setTeacherId('');
        setMaxStudents('');
        setFrequency('pontual');
        setStartDate('');
        setEndDate('');
        setStartTime('');
        setEndTime('');
        setDayOfWeek('');
        setWeekOfMonth('');
        setHolidayDates([]);
        setExtraDates([]);
        setRegistrationDeadline('');
        setLocationType('');
        setIbmRoomId('');
      }
    }
  }, [open, existingClass]);

  const handleSave = async () => {
    if (!name.trim() || !courseId) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Nome da turma é obrigatório.' });
      return;
    }
    setIsSaving(true);
    
    let finalLocationId = '';
    if (locationType === 'the_school') {
        finalLocationId = 'the_school';
    } else if (locationType === 'ibm' && ibmRoomId && ibmRoomId !== 'null') {
        finalLocationId = ibmRoomId;
    }

    const classData = { 
        courseId, 
        name, 
        teacherId: teacherId === 'null' ? '' : teacherId, 
        maxStudents: maxStudents ? parseInt(maxStudents, 10) : undefined,
        students: existingClass?.students || [],
        frequency,
        startDate,
        endDate,
        startTime,
        endTime,
        dayOfWeek,
        weekOfMonth: frequency === 'mensal' ? (weekOfMonth as any) : '',
        locationId: finalLocationId,
        holidayDates,
        extraDates,
        extraSessions,
        scheduleOverrides,
        registrationDeadline,
    };

    try {
        if (existingClass) {
            await updateClass(existingClass.id, classData);
        } else {
            await addClass(classData);
        }
        onOpenChange(false);
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Ocorreu um erro técnico.' });
    } finally {
        setIsSaving(false);
    }
  };

  const handleHolidaySelect = (dates: Date[] | undefined) => {
    const formatted = dates ? dates.map(d => format(d, 'yyyy-MM-dd')) : [];
    setHolidayDates(formatted);
  };

  const handleExtraDateSelect = (dates: Date[] | undefined) => {
    const formatted = dates ? dates.map(d => format(d, 'yyyy-MM-dd')) : [];
    setExtraDates(formatted);
  };

  const removeHoliday = (dateStr: string) => {
    setHolidayDates(prev => prev.filter(d => d !== dateStr));
  };

  const removeExtraDate = (dateStr: string) => {
    setExtraDates(prev => prev.filter(d => d !== dateStr));
  };

  const handleAddExtraSession = () => {
    const newSession = {
      id: Math.random().toString(36).substr(2, 9),
      date: startDate || format(new Date(), 'yyyy-MM-dd'),
      startTime: startTime || '09:00',
      endTime: endTime || '10:00',
    };
    setExtraSessions([...extraSessions, newSession]);
  };

  const updateExtraSession = (id: string, field: string, value: any) => {
    setExtraSessions(extraSessions.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeExtraSession = (id: string) => {
    setExtraSessions(extraSessions.filter(s => s.id !== id));
  };

  const selectedCourse = useMemo(() => courses.find(c => c.id === courseId), [courses, courseId]);
  const syllabus = selectedCourse?.syllabus || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl border-none">
        <DialogHeader className="p-6 border-b bg-muted/20 shrink-0">
          <DialogTitle className="text-xl font-black italic tracking-tighter uppercase text-primary">
            {existingClass ? 'Editar Turma' : 'Nova Turma'}
          </DialogTitle>
          <DialogDescription className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
            Configure os detalhes, horários e exceções da turma.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Nome da Turma</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Turma de Sábado" className="h-11 font-bold" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacherId" className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Professor Responsável</Label>
                <Popover modal={false}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={isLoading}
                      className="h-11 w-full justify-between"
                    >
                      {teacherId && teacherId !== 'null'
                        ? teachers.find((t) => t.id === teacherId)?.name
                        : "Selecione um professor"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <div className="flex flex-col">
                        <div className="flex items-center border-b px-3 bg-muted/5">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-primary" />
                            <input 
                                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground" 
                                placeholder="Buscar professor..." 
                                onChange={(e) => {
                                    const val = e.target.value.toLowerCase();
                                    const items = document.querySelectorAll('[data-teacher-item-dialog]');
                                    items.forEach((el: any) => {
                                        const text = el.innerText.toLowerCase();
                                        el.style.display = text.includes(val) ? 'flex' : 'none';
                                    });
                                }}
                            />
                        </div>
                        <div className="max-h-[300px] overflow-y-auto p-1">
                            <button
                                onClick={() => setTeacherId('null')}
                                className="flex items-center gap-2 w-full p-3 hover:bg-primary/5 rounded-md transition-all text-left text-sm font-bold group"
                            >
                                <div className={cn("size-4 border rounded-full shrink-0", teacherId === 'null' ? "bg-primary border-primary" : "border-muted-foreground/30")} />
                                Nenhum (Remover)
                            </button>
                            {teachers.map((t) => (
                                <button
                                    key={t.id}
                                    data-teacher-item-dialog
                                    onClick={() => setTeacherId(t.id)}
                                    className="flex items-center gap-2 w-full p-3 hover:bg-primary/5 rounded-md transition-all text-left text-sm font-bold group"
                                >
                                    <div className={cn("size-4 border rounded-full shrink-0", teacherId === t.id ? "bg-primary border-primary" : "border-muted-foreground/30")} />
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxStudents" className="text-[10px] uppercase font-black text-muted-foreground tracking-wider flex items-center gap-2">
                    <Users className="size-3 text-primary"/> Limite de Vagas (Capacidade)
                </Label>
                <Input id="maxStudents" type="number" value={maxStudents} onChange={e => setMaxStudents(e.target.value)} placeholder="Ex: 20" className="h-11" />
              </div>
          </div>
          
           <div className="pt-6 border-t space-y-6">
             <h3 className="font-black text-xs uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                <Clock className="size-4" /> Agendamento & Espaço
             </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="frequency" className="text-[10px] uppercase font-black text-muted-foreground">Frequência</Label>
                   <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                      <SelectTrigger id="frequency" className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="pontual">Pontual (uma vez)</SelectItem>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="quinzenal">Quinzenal</SelectItem>
                          <SelectItem value="mensal">Mensal</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
                 {frequency !== 'pontual' && (
                  <div className="space-y-2">
                    <Label htmlFor="dayOfWeek" className="text-[10px] uppercase font-black text-muted-foreground">Dia da Semana</Label>
                    <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                        <SelectTrigger id="dayOfWeek" className="h-11"><SelectValue placeholder="Selecione um dia" /></SelectTrigger>
                        <SelectContent>
                            {weekDays.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                        </SelectContent>
                    </Select>
                  </div>
                )}
                {frequency === 'mensal' && (
                    <div className="space-y-2">
                        <Label htmlFor="weekOfMonth" className="text-[10px] uppercase font-black text-muted-foreground">Semana do Mês</Label>
                        <Select value={weekOfMonth} onValueChange={(v: any) => setWeekOfMonth(v)}>
                            <SelectTrigger id="weekOfMonth" className="h-11"><SelectValue placeholder="Selecione a semana" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1ª Semana</SelectItem>
                                <SelectItem value="2">2ª Semana</SelectItem>
                                <SelectItem value="3">3ª Semana</SelectItem>
                                <SelectItem value="4">4ª Semana</SelectItem>
                                <SelectItem value="5">5ª Semana (Opcional)</SelectItem>
                                <SelectItem value="last">Última Semana</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
                 <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-[10px] uppercase font-black text-muted-foreground">Data de Início</Label>
                    <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="h-11"/>
                </div>
                {frequency !== 'pontual' && (
                    <div className="space-y-2">
                        <Label htmlFor="endDate" className="text-[10px] uppercase font-black text-muted-foreground">Data de Término</Label>
                        <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-11" />
                    </div>
                )}
                 <div className="space-y-2">
                    <Label htmlFor="startTime" className="text-[10px] uppercase font-black text-muted-foreground">Horário de Início</Label>
                    <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="h-11 font-mono"/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime" className="text-[10px] uppercase font-black text-muted-foreground">Horário de Término</Label>
                    <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="h-11 font-mono"/>
                  </div>
                  
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="registrationDeadline" className="text-[10px] uppercase font-black text-primary tracking-widest flex items-center gap-2 italic">
                        Data Limite de Inscrição (Opcional)
                    </Label>
                    <Input 
                        id="registrationDeadline" 
                        type="date" 
                        value={registrationDeadline} 
                        onChange={e => setRegistrationDeadline(e.target.value)} 
                        className="h-11 font-bold border-primary/20 bg-primary/5" 
                    />
                    <p className="text-[10px] text-muted-foreground font-medium">Se definida, a turma não aparecerá para novas matrículas após esta data.</p>
                  </div>
                    <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="locationType" className="text-[10px] uppercase font-black text-muted-foreground">Local das Aulas</Label>
                        <Select value={locationType} onValueChange={(v: any) => setLocationType(v)}>
                            <SelectTrigger id="locationType" className="h-11"><SelectValue placeholder="Selecione o local..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ibm">IBM (Sala interna)</SelectItem>
                                <SelectItem value="the_school">The School (Externo)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {locationType === 'ibm' && (
                        <div className="md:col-span-2 space-y-2 animate-in slide-in-from-top-2">
                            <Label htmlFor="ibmRoomId" className="text-[10px] uppercase font-black text-primary">Ambiente Interno (Calendário Geral)</Label>
                            <Select value={ibmRoomId || 'null'} onValueChange={setIbmRoomId} disabled={isLoading}>
                                <SelectTrigger id="ibmRoomId" className="h-11"><SelectValue placeholder={isLoading ? "Carregando..." : "Selecione o ambiente"} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="null">Não definido</SelectItem>
                                    {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>


                <div className="pt-6 border-t grid grid-cols-1 md:grid-cols-2 gap-8 pb-8">
                    <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-[10px] uppercase text-destructive tracking-widest">Recessos (Feriados)</h3>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-black border-destructive/20 text-destructive hover:bg-destructive/5">
                                    <CalendarIcon className="size-3 mr-1" /> Marcar
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="multiple"
                                    selected={holidayDates.map(d => parseISO(d))}
                                    onSelect={handleHolidaySelect}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex flex-wrap gap-1.5 min-h-[40px] p-3 rounded-xl border-2 border-dashed">
                        {holidayDates.length === 0 ? (
                            <p className="text-[9px] text-muted-foreground italic font-medium uppercase tracking-tighter self-center mx-auto">Nenhum recesso configurado.</p>
                        ) : (
                            holidayDates.sort().map(date => (
                                <Badge key={date} variant="secondary" className="pl-2 pr-1 h-6 gap-1 text-[10px] bg-red-50 text-red-700 border-red-100 font-bold">
                                    {format(parseISO(date), 'dd/MM')}
                                    <button onClick={() => removeHoliday(date)} className="hover:text-destructive p-0.5"><X className="size-2.5" /></button>
                                </Badge>
                            ))
                        )}
                    </div>
                </div>

                <div className="space-y-4 md:col-span-2">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="font-black text-[10px] uppercase text-emerald-600 tracking-widest">Aulas Extras (Avulsas / Reposição)</h3>
                            <p className="text-[9px] text-muted-foreground font-medium italic">Configure horários específicos e vincule tópicos da ementa.</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={handleAddExtraSession} className="h-7 text-[10px] uppercase font-black border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                            <PlusCircle className="size-3 mr-1" /> Adicionar Aula
                        </Button>
                    </div>
                    
                    <div className="space-y-3">
                        {extraSessions.length === 0 ? (
                            <div className="p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center bg-slate-50/50">
                                <Clock className="size-6 text-slate-300 mb-2" />
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Nenhuma aula extra cadastrada.</p>
                            </div>
                        ) : (
                            extraSessions.map((session) => (
                                <div key={session.id} className="p-4 rounded-xl border bg-white shadow-sm flex flex-wrap gap-4 items-end relative group">
                                    <button 
                                        onClick={() => removeExtraSession(session.id)}
                                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-red-200"
                                    >
                                        <X className="size-3" />
                                    </button>
                                    
                                    <div className="space-y-1.5 flex-1 min-w-[120px]">
                                        <Label className="text-[9px] font-black uppercase text-muted-foreground">Data</Label>
                                        <Input type="date" value={session.date} onChange={e => updateExtraSession(session.id, 'date', e.target.value)} className="h-9 text-xs" />
                                    </div>
                                    
                                    <div className="space-y-1.5 w-24">
                                        <Label className="text-[9px] font-black uppercase text-muted-foreground">Início</Label>
                                        <Input type="time" value={session.startTime} onChange={e => updateExtraSession(session.id, 'startTime', e.target.value)} className="h-9 text-xs" />
                                    </div>
                                    
                                    <div className="space-y-1.5 w-24">
                                        <Label className="text-[9px] font-black uppercase text-muted-foreground">Fim</Label>
                                        <Input type="time" value={session.endTime} onChange={e => updateExtraSession(session.id, 'endTime', e.target.value)} className="h-9 text-xs" />
                                    </div>
                                    
                                    <div className="space-y-1.5 flex-[2] min-w-[200px]">
                                        <Label className="text-[9px] font-black uppercase text-muted-foreground">Conteúdo da Ementa</Label>
                                        <Select value={session.syllabusId || 'null'} onValueChange={val => updateExtraSession(session.id, 'syllabusId', val === 'null' ? undefined : val)}>
                                            <SelectTrigger className="h-9 text-xs">
                                                <SelectValue placeholder="Vincular módulo..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="null">Nenhum (Livre)</SelectItem>
                                                {syllabus.map(s => (
                                                    <SelectItem key={s.id} value={s.id} className="text-xs">
                                                        {s.title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        
                                        <div className="flex items-center space-x-2 pt-2">
                                            <Checkbox 
                                                id={`repo-${session.id}`} 
                                                checked={!!session.isRepositionOnly}
                                                onCheckedChange={(checked) => updateExtraSession(session.id, 'isRepositionOnly', !!checked)}
                                            />
                                            <label 
                                                htmlFor={`repo-${session.id}`} 
                                                className="text-[10px] font-bold text-muted-foreground cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                Aula apenas para reposição de alunos (Não gera coluna)
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>

        <DialogFooter className="p-6 border-t bg-muted/20 shrink-0">
          <DialogClose asChild><Button variant="outline" className="font-bold">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={isSaving} className="font-black uppercase tracking-widest shadow-lg shadow-primary/20">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
            {existingClass ? 'Salvar Alterações' : 'Criar Turma Agora'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

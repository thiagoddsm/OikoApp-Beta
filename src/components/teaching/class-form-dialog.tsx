'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Calendar as CalendarIcon, X, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

type User = { id: string; name: string; isTeacher?: boolean; };
const weekDays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export function ClassFormDialog({ open, onOpenChange, existingClass, courseId }) {
  const { addClass, updateClass, users, rooms, isLoading: isLoadingContext } = useVolunteering();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [frequency, setFrequency] = useState<'pontual' | 'semanal' | 'quinzenal' | 'mensal'>('pontual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [weekOfMonth, setWeekOfMonth] = useState('');
  const [holidayDates, setHolidayDates] = useState<string[]>([]);
  const [extraDates, setExtraDates] = useState<string[]>([]);
  
  const [locationType, setLocationType] = useState<'ibm' | 'the_school' | ''>('');
  const [ibmRoomId, setIbmRoomId] = useState('');


  const teachers = useMemo(() => users?.filter(u => u.isTeacher) || [], [users]);
  const isLoading = isLoadingContext;

  useEffect(() => {
    if (open) {
      if (existingClass) {
        setName(existingClass.name || '');
        setTeacherId(existingClass.teacherId || '');
        setFrequency(existingClass.frequency || 'pontual');
        setStartDate(existingClass.startDate || '');
        setEndDate(existingClass.endDate || '');
        setStartTime(existingClass.startTime || '');
        setEndTime(existingClass.endTime || '');
        setDayOfWeek(existingClass.dayOfWeek || '');
        setWeekOfMonth(existingClass.weekOfMonth || '');
        setHolidayDates(existingClass.holidayDates || []);
        setExtraDates(existingClass.extraDates || []);
        
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
        setFrequency('pontual');
        setStartDate('');
        setEndDate('');
        setStartTime('');
        setEndTime('');
        setDayOfWeek('');
        setWeekOfMonth('');
        setHolidayDates([]);
        setExtraDates([]);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 border-b bg-muted/20">
          <DialogTitle>{existingClass ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
          <DialogDescription>Configure os detalhes, horários e exceções da turma.</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="name">Nome da Turma</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Turma de Sábado" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacherId">Professor</Label>
                <Select value={teacherId || 'null'} onValueChange={setTeacherId} disabled={isLoading}>
                  <SelectTrigger id="teacherId"><SelectValue placeholder={isLoading ? "Carregando..." : "Selecione um professor"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Nenhum</SelectItem>
                    {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
          </div>
          
           <div className="pt-4 border-t space-y-4">
             <h3 className="font-bold text-sm uppercase text-primary">Agendamento & Espaço</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequência</Label>
                   <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                      <SelectTrigger id="frequency"><SelectValue /></SelectTrigger>
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
                    <Label htmlFor="dayOfWeek">Dia da Semana</Label>
                    <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                        <SelectTrigger id="dayOfWeek"><SelectValue placeholder="Selecione um dia" /></SelectTrigger>
                        <SelectContent>
                            {weekDays.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                        </SelectContent>
                    </Select>
                  </div>
                )}
                {frequency === 'mensal' && (
                    <div className="space-y-2">
                        <Label htmlFor="weekOfMonth">Semana do Mês</Label>
                        <Select value={weekOfMonth} onValueChange={(v: any) => setWeekOfMonth(v)}>
                            <SelectTrigger id="weekOfMonth"><SelectValue placeholder="Selecione a semana" /></SelectTrigger>
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
                    <Label htmlFor="startDate">Data de Início {frequency !== 'pontual' && '(primeira ocorrência)'}</Label>
                    <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required/>
                </div>
                {frequency !== 'pontual' && (
                    <div className="space-y-2">
                        <Label htmlFor="endDate">Data de Término</Label>
                        <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                )}
                 <div className="space-y-2">
                    <Label htmlFor="startTime">Horário de Início</Label>
                    <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">Horário de Término</Label>
                    <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required/>
                  </div>
                    <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="locationType">Local</Label>
                        <Select value={locationType} onValueChange={(v: any) => setLocationType(v)}>
                            <SelectTrigger id="locationType"><SelectValue placeholder="Selecione o local..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ibm">IBM (Ocupa sala interna)</SelectItem>
                                <SelectItem value="the_school">The School (Local Externo)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {locationType === 'ibm' && (
                        <div className="md:col-span-2 space-y-2">
                            <Label htmlFor="ibmRoomId">Ambiente (IBM)</Label>
                            <Select value={ibmRoomId || 'null'} onValueChange={setIbmRoomId} disabled={isLoading}>
                                <SelectTrigger id="ibmRoomId"><SelectValue placeholder={isLoading ? "Carregando..." : "Selecione o ambiente"} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="null">Não definido</SelectItem>
                                    {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
              </div>
           </div>

           <div className="pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Seção de Feriados */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-xs uppercase text-destructive">Datas sem Aula (Feriados)</h3>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-[10px]">
                                    <CalendarIcon className="size-3 mr-1" /> Marcar Recesso
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
                    <div className="flex flex-wrap gap-1.5 min-h-[40px]">
                        {holidayDates.length === 0 ? (
                            <p className="text-[9px] text-muted-foreground italic">Nenhum recesso configurado.</p>
                        ) : (
                            holidayDates.sort().map(date => (
                                <Badge key={date} variant="secondary" className="pl-2 pr-1 h-5 gap-1 text-[10px] bg-red-50 text-red-700 border-red-100">
                                    {format(parseISO(date), 'dd/MM')}
                                    <button onClick={() => removeHoliday(date)} className="hover:text-destructive"><X className="size-2.5" /></button>
                                </Badge>
                            ))
                        )}
                    </div>
                </div>

                {/* Seção de Datas Extras */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-xs uppercase text-emerald-600">Datas Extras (Aulas Avulsas)</h3>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-[10px]">
                                    <PlusCircle className="size-3 mr-1" /> Adicionar Aula
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="multiple"
                                    selected={extraDates.map(d => parseISO(d))}
                                    onSelect={handleExtraDateSelect}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex flex-wrap gap-1.5 min-h-[40px]">
                        {extraDates.length === 0 ? (
                            <p className="text-[9px] text-muted-foreground italic">Nenhuma aula extra agendada.</p>
                        ) : (
                            extraDates.sort().map(date => (
                                <Badge key={date} variant="secondary" className="pl-2 pr-1 h-5 gap-1 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-100">
                                    {format(parseISO(date), 'dd/MM')}
                                    <button onClick={() => removeExtraDate(date)} className="hover:text-emerald-600"><X className="size-2.5" /></button>
                                </Badge>
                            ))
                        )}
                    </div>
                </div>
           </div>
        </div>

        <DialogFooter className="p-6 border-t bg-muted/20">
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

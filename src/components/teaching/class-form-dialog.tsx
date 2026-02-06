
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVolunteering } from '@/contexts/volunteering-context';

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
        locationId: finalLocationId,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existingClass ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <Label htmlFor="name">Nome da Turma</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Turma de Sábado" />
              </div>
              <div>
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
          
           <div className="pt-4 border-t">
             <h3 className="font-semibold mb-2">Agendamento & Espaço</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
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
                  <div>
                    <Label htmlFor="dayOfWeek">Dia da Semana</Label>
                    <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                        <SelectTrigger id="dayOfWeek"><SelectValue placeholder="Selecione um dia" /></SelectTrigger>
                        <SelectContent>
                            {weekDays.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                        </SelectContent>
                    </Select>
                  </div>
                )}
                 <div>
                    <Label htmlFor="startDate">Data de Início {frequency !== 'pontual' && '(primeira ocorrência)'}</Label>
                    <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required/>
                </div>
                {frequency !== 'pontual' && (
                    <div>
                        <Label htmlFor="endDate">Data de Término</Label>
                        <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                )}
                 <div>
                    <Label htmlFor="startTime">Horário de Início</Label>
                    <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required/>
                  </div>
                  <div>
                    <Label htmlFor="endTime">Horário de Término</Label>
                    <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required/>
                  </div>
                    <div className="md:col-span-2">
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
                        <div className="md:col-span-2">
                            <Label htmlFor="ibmRoomId">Ambiente (IBM)</Label>
                            <Select value={ibmRoomId || 'null'} onValueChange={setIbmRoomId} disabled={isLoading}>
                                <SelectTrigger id="ibmRoomId"><SelectValue placeholder={isLoading ? "Carregando..." : "Selecione o ambiente"} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="null">Não definido</SelectItem>
                                    {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground mt-1">Ao selecionar uma sala IBM, uma reserva automática será criada no calendário.</p>
                        </div>
                    )}
              </div>
           </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useVolunteering } from '@/contexts/volunteering-context';

type User = { id: string; name: string; isTeacher?: boolean; };
const weekDays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export function ClassFormDialog({ open, onOpenChange, existingClass, courseId }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { users, rooms, isLoading: isLoadingContext } = useVolunteering();

  const [name, setName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [frequency, setFrequency] = useState<'pontual' | 'semanal' | 'quinzenal' | 'mensal'>('pontual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [locationId, setLocationId] = useState('');

  const teachers = useMemo(() => users?.filter(u => u.isTeacher) || [], [users]);
  const isLoading = isLoadingContext;

  useEffect(() => {
    if (open) {
      setName(existingClass?.name || '');
      setTeacherId(existingClass?.teacherId || '');
      setFrequency(existingClass?.frequency || 'pontual');
      setStartDate(existingClass?.startDate || '');
      setEndDate(existingClass?.endDate || '');
      setStartTime(existingClass?.startTime || '');
      setEndTime(existingClass?.endTime || '');
      setDayOfWeek(existingClass?.dayOfWeek || '');
      setLocationId(existingClass?.locationId || '');
    }
  }, [open, existingClass]);

  const handleSave = async () => {
    if (!name.trim() || !courseId) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Nome da turma é obrigatório.' });
      return;
    }
    setIsSaving(true);
    const classData = { 
        courseId, 
        name, 
        teacherId, 
        students: existingClass?.students || [],
        frequency,
        startDate,
        endDate,
        startTime,
        endTime,
        dayOfWeek,
        locationId,
    };

    if (existingClass) {
      const docRef = doc(firestore, 'classes', existingClass.id);
      await updateDocumentNonBlocking(docRef, classData);
      toast({ title: 'Turma atualizada!' });
    } else {
      const collectionRef = collection(firestore, 'classes');
      await addDocumentNonBlocking(collectionRef, classData);
      toast({ title: 'Turma criada!' });
    }

    setIsSaving(false);
    onOpenChange(false);
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
                <Select value={teacherId} onValueChange={setTeacherId} disabled={isLoading}>
                  <SelectTrigger id="teacherId"><SelectValue placeholder={isLoading ? "Carregando..." : "Selecione um professor"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Nenhum</SelectItem>
                    {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
          </div>
          
           <div className="pt-4 border-t">
             <h3 className="font-semibold mb-2">Agendamento</h3>
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
                    <Label htmlFor="startDate">Data de Início</Label>
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
                    <Label htmlFor="locationId">Local/Sala</Label>
                    <Select value={locationId} onValueChange={setLocationId} disabled={isLoading}>
                      <SelectTrigger id="locationId"><SelectValue placeholder={isLoading ? "Carregando..." : "Selecione o local"} /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="null">Não definido</SelectItem>
                          {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
              </div>
           </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 size-4 animate-spin"/>} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

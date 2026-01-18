'use client';
import React, { useState, useEffect } from 'react';
import { useVolunteering, type RoomReservation } from '@/contexts/volunteering-context';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Timestamp } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CreateReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingReservation?: RoomReservation | null;
}

const weekDays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export function CreateReservationDialog({ open, onOpenChange, existingReservation }: CreateReservationDialogProps) {
  const { user } = useFirebase();
  const { addReservation, updateReservation, users, rooms: availableRooms, isLoading } = useVolunteering();

  const [eventName, setEventName] = useState('');
  const [requesterId, setRequesterId] = useState('');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [frequency, setFrequency] = useState<'pontual' | 'semanal' | 'quinzenal' | 'mensal'>('pontual');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [weekOfMonth, setWeekOfMonth] = useState<'1' | '2' | '3' | '4' | 'last'>('1');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (existingReservation) {
        setEventName(existingReservation.eventName || '');
        setRequesterId(existingReservation.requesterId || user?.uid || '');
        setSelectedRooms(existingReservation.rooms || []);
        setNotes(existingReservation.notes || '');
        setFrequency(existingReservation.frequency || 'pontual');
        setDayOfWeek(existingReservation.dayOfWeek || '');
        setWeekOfMonth(existingReservation.weekOfMonth || '1');

        const start = existingReservation.startDateTime?.toDate();
        const end = existingReservation.endDateTime?.toDate();

        setStartDate(start ? start.toISOString().split('T')[0] : '');
        setStartTime(start ? start.toTimeString().split(' ')[0].substring(0, 5) : '');
        setEndDate(end ? end.toISOString().split('T')[0] : '');
        setEndTime(end ? end.toTimeString().split(' ')[0].substring(0, 5) : '');
      } else {
        // Reset form for new reservation
        setEventName('');
        setRequesterId(user?.uid || '');
        setSelectedRooms([]);
        setNotes('');
        setFrequency('pontual');
        setDayOfWeek('');
        setWeekOfMonth('1');
        const now = new Date();
        setStartDate(now.toISOString().split('T')[0]);
        setStartTime(now.toTimeString().split(' ')[0].substring(0, 5));
        setEndDate(now.toISOString().split('T')[0]);
        setEndTime(new Date(now.getTime() + 60 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5));
      }
    }
  }, [open, existingReservation, user]);


  const handleSave = async () => {
    if (!eventName || !requesterId || selectedRooms.length === 0 || !startDate || !startTime || !endDate || !endTime) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    setIsSaving(true);
    
    const startDateTime = Timestamp.fromDate(new Date(`${startDate}T${startTime}`));
    const endDateTime = Timestamp.fromDate(new Date(`${endDate}T${endTime}`));
    
    let reservationData: any = {
      eventName,
      requesterId,
      rooms: selectedRooms,
      startDateTime,
      endDateTime,
      notes,
      status: existingReservation?.status || 'pending',
      frequency,
      dayOfWeek: ['semanal', 'quinzenal', 'mensal'].includes(frequency) ? dayOfWeek : '',
    };
    
    if (frequency === 'mensal') {
      reservationData.weekOfMonth = weekOfMonth;
    } else {
      // Explicitly ensure weekOfMonth is not in the object if not applicable
      delete reservationData.weekOfMonth;
    }

    if (existingReservation) {
      await updateReservation(existingReservation.id, reservationData);
    } else {
       reservationData.createdAt = Timestamp.now();
      await addReservation(reservationData as Omit<RoomReservation, 'id'>);
    }

    setIsSaving(false);
    onOpenChange(false);
  };

  const handleRoomSelection = (roomName: string, checked: boolean) => {
    setSelectedRooms(prev => {
      if (checked) {
        return [...prev, roomName];
      } else {
        return prev.filter(r => r !== roomName);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existingReservation ? 'Editar Reserva' : 'Solicitar Nova Reserva de Sala'}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes abaixo. A sua solicitação será enviada para aprovação.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
            <div>
              <Label htmlFor="eventName">Nome do Evento/Atividade</Label>
              <Input id="eventName" value={eventName} onChange={e => setEventName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="requesterId">Solicitante</Label>
              <Select value={requesterId} onValueChange={setRequesterId} disabled={isLoading}>
                <SelectTrigger id="requesterId"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
                <Label>Salas/Ambientes</Label>
                <ScrollArea className="h-32 w-full rounded-md border p-4">
                    <div className="space-y-2">
                        {availableRooms.map(room => (
                            <div key={room.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`room-${room.id}`}
                                    checked={selectedRooms.includes(room.name)}
                                    onCheckedChange={checked => handleRoomSelection(room.name, !!checked)}
                                />
                                <Label htmlFor={`room-${room.id}`} className="font-normal cursor-pointer">
                                    {room.name}
                                </Label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

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
            
            {['semanal', 'quinzenal', 'mensal'].includes(frequency) && (
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
            
            {frequency === 'mensal' && (
                 <div>
                    <Label htmlFor="weekOfMonth">Semana do Mês</Label>
                    <Select value={weekOfMonth} onValueChange={(v: any) => setWeekOfMonth(v)}>
                        <SelectTrigger id="weekOfMonth"><SelectValue placeholder="Selecione a semana" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">1ª Semana</SelectItem>
                            <SelectItem value="2">2ª Semana</SelectItem>
                            <SelectItem value="3">3ª Semana</SelectItem>
                            <SelectItem value="4">4ª Semana</SelectItem>
                            <SelectItem value="last">Última Semana</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="startDate">Data de Início {frequency !== 'pontual' && '(primeira ocorrência)'}</Label>
                    <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required/>
                </div>
                <div>
                    <Label htmlFor="startTime">Horário de Início</Label>
                    <Input id="startTime" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required/>
                </div>
            </div>

            {frequency === 'pontual' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="endDate">Data de Fim</Label>
                        <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required/>
                    </div>
                    <div>
                        <Label htmlFor="endTime">Horário de Fim</Label>
                        <Input id="endTime" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required/>
                    </div>
                </div>
            )}

            {frequency !== 'pontual' && (
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <Label htmlFor="endTime">Horário de Fim</Label>
                        <Input id="endTime" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required/>
                    </div>
                </div>
            )}

             <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Equipamentos necessários, número de pessoas, etc."/>
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingReservation ? "Salvar Alterações" : "Enviar Solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

interface CreateReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingReservation?: RoomReservation | null;
}

const roomOptions = ["Auditório Principal", "Sala de Reunião 1", "Sala de Reunião 2", "Estúdio Wave", "Hall de Entrada"];

export function CreateReservationDialog({ open, onOpenChange, existingReservation }: CreateReservationDialogProps) {
  const { user } = useFirebase();
  const { addReservation, updateReservation, users, isLoading } = useVolunteering();

  const [eventName, setEventName] = useState('');
  const [requesterId, setRequesterId] = useState('');
  const [room, setRoom] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (existingReservation) {
        setEventName(existingReservation.eventName || '');
        setRequesterId(existingReservation.requesterId || user?.uid || '');
        setRoom(existingReservation.room || '');
        setNotes(existingReservation.notes || '');

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
        setRoom('');
        setNotes('');
        const now = new Date();
        setStartDate(now.toISOString().split('T')[0]);
        setStartTime(now.toTimeString().split(' ')[0].substring(0, 5));
        setEndDate(now.toISOString().split('T')[0]);
        setEndTime(new Date(now.getTime() + 60 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5));
      }
    }
  }, [open, existingReservation, user]);


  const handleSave = async () => {
    if (!eventName || !requesterId || !room || !startDate || !startTime || !endDate || !endTime) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    setIsSaving(true);
    
    const startDateTime = Timestamp.fromDate(new Date(`${startDate}T${startTime}`));
    const endDateTime = Timestamp.fromDate(new Date(`${endDate}T${endTime}`));
    
    const reservationData = {
      eventName,
      requesterId,
      room,
      startDateTime,
      endDateTime,
      notes,
      status: existingReservation?.status || 'pending',
      createdAt: existingReservation?.createdAt || Timestamp.now(),
    };

    if (existingReservation) {
      await updateReservation(existingReservation.id, reservationData);
    } else {
      await addReservation(reservationData as Omit<RoomReservation, 'id'>);
    }

    setIsSaving(false);
    onOpenChange(false);
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
              <Label htmlFor="room">Sala/Ambiente</Label>
              <Select value={room} onValueChange={setRoom}>
                <SelectTrigger id="room"><SelectValue placeholder="Selecione um ambiente"/></SelectTrigger>
                <SelectContent>
                    {roomOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="startDate">Data de Início</Label>
                    <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required/>
                </div>
                <div>
                    <Label htmlFor="startTime">Horário de Início</Label>
                    <Input id="startTime" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required/>
                </div>
            </div>
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

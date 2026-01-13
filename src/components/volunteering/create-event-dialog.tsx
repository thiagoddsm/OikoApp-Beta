'use client';
import React, { useState, useEffect } from 'react';
import { useVolunteering, type VolunteeringEvent } from '@/contexts/volunteering-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Minus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingEvent: VolunteeringEvent | null;
  isDuplicating: boolean;
}

type RequiredAreaState = {
    areaId: string;
    quantity: number;
}

export function CreateEventDialog({ open, onOpenChange, existingEvent, isDuplicating }: CreateEventDialogProps) {
  const { rooms, areas, addEvent, updateEvent } = useVolunteering();
  
  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [room, setRoom] = useState('');
  const [requiredAreas, setRequiredAreas] = useState<RequiredAreaState[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(existingEvent?.name || '');
      setTime(existingEvent?.time || '');
      setDate(existingEvent?.date || '');
      setRoom(existingEvent?.room || '');
      setRequiredAreas(existingEvent?.requiredAreas?.map(a => ({...a})) || []);
    }
  }, [open, existingEvent]);

  const handleAreaChange = (areaId: string, checked: boolean) => {
    if (checked) {
        setRequiredAreas(prev => [...prev, { areaId, quantity: 1 }]);
    } else {
        setRequiredAreas(prev => prev.filter(a => a.areaId !== areaId));
    }
  };

  const handleQuantityChange = (areaId: string, increment: boolean) => {
    setRequiredAreas(prev => prev.map(a => {
        if (a.areaId === areaId) {
            const newQuantity = increment ? a.quantity + 1 : Math.max(1, a.quantity - 1);
            return { ...a, quantity: newQuantity };
        }
        return a;
    }));
  };

  const handleSelectAllAreas = () => {
    const allAreaIds = areas.map(a => a.id);
    const newAreas = allAreaIds.filter(id => !requiredAreas.some(ra => ra.areaId === id));
    setRequiredAreas(prev => [...prev, ...newAreas.map(id => ({ areaId: id, quantity: 1 }))]);
  };

  const handleSave = async () => {
    if (!name.trim() || !time.trim() || !date) return;
    
    setIsSaving(true);
    
    const eventData = {
      name,
      time,
      date,
      requiredAreas,
      room,
    };

    if (existingEvent && !isDuplicating) {
      await updateEvent(existingEvent.id, eventData);
    } else {
      await addEvent(eventData);
    }

    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existingEvent && !isDuplicating ? 'Editar Evento' : 'Criar Novo Evento'}</DialogTitle>
          <DialogDescription>
            Defina os detalhes do evento, o ambiente e as áreas de serviço necessárias.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
            <div>
              <Label htmlFor="event-name">Nome do Evento</Label>
              <Input id="event-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="date">Data</Label>
                    <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                 <div>
                    <Label htmlFor="time">Horário</Label>
                    <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
                </div>
            </div>
            
            <div>
              <Label htmlFor="room">Ambiente</Label>
              <Select value={room} onValueChange={setRoom}>
                <SelectTrigger id="room"><SelectValue placeholder="Selecione um ambiente"/></SelectTrigger>
                <SelectContent>
                    {rooms.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div>
                <div className="flex justify-between items-center mb-2">
                    <Label>Áreas de Serviço Necessárias</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleSelectAllAreas}>Selecionar Todas</Button>
                </div>
                <ScrollArea className="h-48 rounded-md border p-4">
                    <div className="space-y-4">
                        {areas.map(area => {
                            const isSelected = requiredAreas.some(ra => ra.areaId === area.id);
                            const selectedArea = requiredAreas.find(ra => ra.areaId === area.id);
                            return (
                                <div key={area.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id={`area-${area.id}`}
                                            checked={isSelected}
                                            onCheckedChange={(checked) => handleAreaChange(area.id, !!checked)}
                                        />
                                        <Label htmlFor={`area-${area.id}`}>{area.name}</Label>
                                    </div>
                                    {isSelected && (
                                        <div className="flex items-center gap-2">
                                            <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQuantityChange(area.id, false)}><Minus className="h-3 w-3"/></Button>
                                            <span className="font-bold w-4 text-center">{selectedArea?.quantity}</span>
                                            <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQuantityChange(area.id, true)}><Plus className="h-3 w-3"/></Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancelar</Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

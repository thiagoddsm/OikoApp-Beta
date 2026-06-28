'use client';
import React, { useState, useEffect } from 'react';
import { useVolunteering, type RoomReservation } from '@/contexts/volunteering-context';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Trash2, Calendar, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Timestamp, query, collection } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PersonSearchInput } from '@/components/common/person-search-input';
import { useMembersData, useEventsData } from "@/hooks/useDomainData";

interface CreateReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingReservation?: RoomReservation | null;
}

const weekDays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export function CreateReservationDialog({ open, onOpenChange, existingReservation }: CreateReservationDialogProps) {
  const { user, firestore } = useFirebase();
    const { users } = useMembersData();
    const { events, reservations, rooms: availableRooms, strategicEvents, reservationCategories } = useEventsData();

  const { addReservation, updateReservation, deleteReservation, addReservationCategory, isLoading: isLoadingContext } = useVolunteering();
  
  const patrimonioQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'patrimonio')) : null, [firestore]);
  const { data: patrimonioItems, isLoading: isLoadingPatrimonio } = useCollection(patrimonioQuery);

  const [eventName, setEventName] = useState('');
  const [requesterId, setRequesterId] = useState('');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState(''); // This will be the end of the RECURRENCE if recurring
  const [endTime, setEndTime] = useState(''); // This is the end of the session time
  const [notes, setNotes] = useState('');
  const [equipmentNotes, setEquipmentNotes] = useState('');
  const [kitchenUsage, setKitchenUsage] = useState(false);
  const [requiredPatrimonyIds, setRequiredPatrimonyIds] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<'pontual' | 'semanal' | 'quinzenal' | 'mensal' | 'multiplas'>('pontual');
  const [specificDates, setSpecificDates] = useState<string[]>([]);
  const [tempDate, setTempDate] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [weekOfMonth, setWeekOfMonth] = useState<'1' | '2' | '3' | '4' | 'last'>('1');
  const [categoryId, setCategoryId] = useState('regular');
  const [ministry, setMinistry] = useState('geral');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [flowChoice, setFlowChoice] = useState<'selection' | 'reservation'>('selection');
  
  const isLoading = isLoadingContext || isLoadingPatrimonio;

  const allRooms = React.useMemo(() => {
    const list = [...availableRooms];
    if (!list.some(r => r.name.toLowerCase() === 'online')) {
      list.push({ id: 'online_room', name: 'Online' } as any);
    }
    return list;
  }, [availableRooms]);

  useEffect(() => {
    if (open) {
      if (existingReservation) {
        setFlowChoice('reservation');
        setEventName(existingReservation.eventName || '');
        setRequesterId(existingReservation.requesterId || user?.uid || '');
        setSelectedRooms(existingReservation.rooms || []);
        setNotes(existingReservation.notes || '');
        setEquipmentNotes(existingReservation.equipmentNotes || '');
        setKitchenUsage(existingReservation.kitchenUsage || false);
        setRequiredPatrimonyIds(existingReservation.requiredPatrimonyIds || []);
        setFrequency(existingReservation.frequency || 'pontual');
        setSpecificDates((existingReservation as any).specificDates || []);
        setTempDate('');
        setDayOfWeek(existingReservation.dayOfWeek || '');
        setWeekOfMonth(existingReservation.weekOfMonth || '1');
        setCategoryId(existingReservation.categoryId || 'regular');
        setMinistry((existingReservation as any).ministry || 'geral');
        setIsCreatingCategory(false);
        setNewCategoryName('');

        const start = existingReservation.startDateTime?.toDate();
        const end = existingReservation.endDateTime?.toDate();
        const recEnd = existingReservation.recurrenceEndDate?.toDate();

        setStartDate(start ? start.toISOString().split('T')[0] : '');
        setStartTime(start ? start.toTimeString().split(' ')[0].substring(0, 5) : '');
        
        // For recurring, the recurrence limit is stored separately
        if (existingReservation.frequency !== 'pontual') {
            setEndDate(recEnd ? recEnd.toISOString().split('T')[0] : (start ? start.toISOString().split('T')[0] : ''));
        } else {
            setEndDate(end ? end.toISOString().split('T')[0] : '');
        }
        
        setEndTime(end ? end.toTimeString().split(' ')[0].substring(0, 5) : '');
      } else {
        // Reset form for new reservation
        setFlowChoice('selection');
        setEventName('');
        setRequesterId(user?.uid || '');
        setSelectedRooms([]);
        setNotes('');
        setEquipmentNotes('');
        setKitchenUsage(false);
        setRequiredPatrimonyIds([]);
        setFrequency('pontual');
        setSpecificDates([]);
        setTempDate('');
        setDayOfWeek('');
        setWeekOfMonth('1');
        const now = new Date();
        setStartDate(now.toISOString().split('T')[0]);
        setStartTime("19:00");
        setEndDate(now.toISOString().split('T')[0]);
        setEndTime("21:00");
        setCategoryId('regular');
        setMinistry('geral');
        setIsCreatingCategory(false);
        setNewCategoryName('');
      }
    }
  }, [open, existingReservation, user]);

  const handleDelete = async () => {
    if (!existingReservation) return;
    setIsDeleting(true);
    try {
      await deleteReservation(existingReservation.id);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };


  const handleSave = async () => {
    const isMultiplas = frequency === 'multiplas';
    
    if (isMultiplas && specificDates.length === 0) {
      alert("Por favor, selecione pelo menos uma data para o evento.");
      return;
    }

    if (!eventName || !requesterId || selectedRooms.length === 0 || !startTime || !endTime) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (!isMultiplas && (!startDate || !endDate)) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsSaving(true);
    
    let finalCategoryId = categoryId;
    if (isCreatingCategory && newCategoryName.trim()) {
      // Create new category
      const newCat = await addReservationCategory({ name: newCategoryName.trim() });
      finalCategoryId = (newCat as any)?.id || '';
    }

    let startDateTime: Timestamp;
    let endDateTime: Timestamp;
    let recurrenceEndDate: Timestamp | null = null;

    if (isMultiplas) {
        const sorted = [...specificDates].sort();
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        startDateTime = Timestamp.fromDate(new Date(`${first}T${startTime}`));
        endDateTime = Timestamp.fromDate(new Date(`${last}T${endTime}`));
    } else if (frequency === 'pontual') {
        startDateTime = Timestamp.fromDate(new Date(`${startDate}T${startTime}`));
        endDateTime = Timestamp.fromDate(new Date(`${endDate}T${endTime}`));
    } else {
        startDateTime = Timestamp.fromDate(new Date(`${startDate}T${startTime}`));
        endDateTime = Timestamp.fromDate(new Date(`${startDate}T${endTime}`));
        recurrenceEndDate = Timestamp.fromDate(new Date(`${endDate}T23:59:59`));
    }
    
    let reservationData: any = {
      eventName,
      requesterId,
      rooms: selectedRooms,
      startDateTime,
      endDateTime,
      recurrenceEndDate,
      notes,
      equipmentNotes,
      kitchenUsage,
      requiredPatrimonyIds,
      status: existingReservation?.status || 'pending',
      frequency,
      dayOfWeek: ['semanal', 'quinzenal', 'mensal'].includes(frequency) ? dayOfWeek : '',
      categoryId: categoryId,
      ministry: ministry,
      specificDates: isMultiplas ? specificDates : [],
    };
    
    if (frequency === 'mensal') {
      reservationData.weekOfMonth = weekOfMonth;
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

  const handlePatrimonySelection = (itemId: string, checked: boolean) => {
    setRequiredPatrimonyIds(prev => {
        if (checked) {
            return [...prev, itemId];
        } else {
            return prev.filter(id => id !== itemId);
        }
    });
  };

  const isStrategic = existingReservation && (existingReservation as any).isStrategicEvent;

  if (isStrategic) {
    const sEvt = existingReservation as any;
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold">
              <span>⭐ Evento Estratégico</span>
            </DialogTitle>
            <DialogDescription>
              Este evento foi planejado e protocolado como evento estratégico da igreja.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Nome do Evento</Label>
                <p className="font-bold text-slate-800 text-sm">{sEvt.eventName}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ministério / Organizador</Label>
                <p className="font-semibold text-slate-700 text-sm">{sEvt.ministry || sEvt.organizer || 'IBM'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Data</Label>
                <p className="text-sm text-slate-700 font-semibold">
                  {sEvt.startDate ? sEvt.startDate.split('-').reverse().join('/') : ''}
                  {sEvt.endDate && sEvt.endDate !== sEvt.startDate ? ` a ${sEvt.endDate.split('-').reverse().join('/')}` : ''}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Horário</Label>
                <p className="text-sm text-slate-700 font-semibold">{sEvt.timeStart || '00:00'} às {sEvt.timeEnd || '23:59'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Espaço / Sala</Label>
                <p className="text-sm text-slate-700 font-semibold">{sEvt.space || 'Não especificado'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tipo de Inscrição</Label>
                <p className="text-sm text-slate-700 font-semibold">
                  {sEvt.isPaid === 'pago' ? `Pago (R$ ${sEvt.ticketPrice || '0.00'})` : 'Gratuito'}
                </p>
              </div>
            </div>

            {sEvt.visionAlignment && (
              <div>
                <Label className="text-xs text-muted-foreground">Alinhamento de Visão</Label>
                <p className="text-sm text-slate-700 italic">"{sEvt.visionAlignment}"</p>
              </div>
            )}

            {sEvt.phaseAlignment && (
              <div>
                <Label className="text-xs text-muted-foreground">Alinhamento de Fase</Label>
                <p className="text-sm text-slate-700 italic">"{sEvt.phaseAlignment}"</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <DialogClose asChild>
              <Button variant="outline">Fechar</Button>
            </DialogClose>
            <Button asChild>
              <a href="/dashboard/events">Ver Detalhes do Protocolo</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (open && flowChoice === 'selection') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>O que você deseja solicitar?</DialogTitle>
            <DialogDescription>
              Selecione o tipo de solicitação que deseja criar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <button
              onClick={() => setFlowChoice('reservation')}
              className="flex items-start gap-4 p-4 rounded-xl border border-outline-variant/30 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Calendar className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors">Agendamento de Espaço</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
                  Reserve salas, auditório ou equipamentos para ensaios, reuniões de GC, cultos e atividades internas de rotina.
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                onOpenChange(false);
                window.location.href = '/dashboard/events/planning';
              }}
              className="flex items-start gap-4 p-4 rounded-xl border border-outline-variant/30 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors">Planejamento de Evento</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
                  Cadastre um novo evento estratégico completo (ex: IBM CAMP, retiros, congressos) contendo metas, orçamento, equipes e divulgação pública.
                </p>
              </div>
            </button>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="w-full">Cancelar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existingReservation ? 'Editar Reserva' : 'Solicitar Nova Entrada no Calendário Geral'}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes abaixo. A sua solicitação será enviada para aprovação.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[70vh] overflow-y-auto pr-4">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">Informações Gerais</TabsTrigger>
              <TabsTrigger value="resources">Recursos Adicionais</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="mt-4 space-y-4">
              <div>
                <Label htmlFor="eventName">Nome do Evento/Atividade</Label>
                <Input id="eventName" value={eventName} onChange={e => setEventName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="requesterId">Solicitante</Label>
            <div className="mt-1">
              <PersonSearchInput
                value={requesterId}
                onChange={setRequesterId}
                users={users}
                placeholder="Buscar solicitante..."
              />
            </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="categoryId">Categoria</Label>
                  <Select value={categoryId} onValueChange={(v) => setCategoryId(v)}>
                    <SelectTrigger id="categoryId"><SelectValue placeholder="Categoria" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="eventual">Eventual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ministry">Ministério</Label>
                  <Select value={ministry} onValueChange={(v) => setMinistry(v)}>
                    <SelectTrigger id="ministry"><SelectValue placeholder="Ministério" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geral">Geral / Outro</SelectItem>
                      <SelectItem value="gleed">Gleed</SelectItem>
                      <SelectItem value="homens">Homens</SelectItem>
                      <SelectItem value="mulheres">Mulheres</SelectItem>
                      <SelectItem value="greem">Greem</SelectItem>
                      <SelectItem value="kids">Kids</SelectItem>
                      <SelectItem value="jovens">Jovens</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                  <Label>Salas/Ambientes</Label>
                  <ScrollArea className="h-32 w-full rounded-md border p-4">
                      <div className="space-y-2">
                          {allRooms.map(room => (
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
                          <SelectItem value="multiplas">Múltiplas datas</SelectItem>
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

              {frequency !== 'multiplas' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <Label htmlFor="startDate">Data de Início {frequency !== 'pontual' && '(primeira ocorrência)'}</Label>
                          <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required/>
                      </div>
                      <div>
                          <Label htmlFor="startTime">Início da Ocupação</Label>
                          <Input id="startTime" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required/>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <Label htmlFor="endDateRecurrence">{frequency === 'pontual' ? 'Data de Fim' : 'Data Final da Recorrência'}</Label>
                          <Input id="endDateRecurrence" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required/>
                      </div>
                      <div>
                          <Label htmlFor="endTime">Fim da Ocupação (Mesmo Dia)</Label>
                          <Input id="endTime" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required/>
                      </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Datas do Evento</Label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={tempDate}
                        onChange={e => setTempDate(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (tempDate && !specificDates.includes(tempDate)) {
                            setSpecificDates(prev => [...prev, tempDate].sort());
                            setTempDate('');
                          }
                        }}
                      >
                        Adicionar
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2 max-h-28 overflow-y-auto p-2 border rounded-md bg-slate-50/50">
                      {specificDates.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Nenhuma data adicionada. Insira uma data acima.</span>
                      ) : (
                        specificDates.map(d => (
                          <Badge key={d} variant="secondary" className="flex items-center gap-1 text-xs py-1 px-2.5">
                            {d.split('-').reverse().join('/')}
                            <button
                              type="button"
                              onClick={() => setSpecificDates(prev => prev.filter(x => x !== d))}
                              className="text-muted-foreground hover:text-red-500 font-bold ml-1.5 text-sm leading-none"
                            >
                              ×
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <Label htmlFor="startTime">Início da Ocupação</Label>
                          <Input id="startTime" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required/>
                      </div>
                      <div>
                          <Label htmlFor="endTime">Fim da Ocupação</Label>
                          <Input id="endTime" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required/>
                      </div>
                  </div>
                </>
              )}

              <div>
                  <Label htmlFor="notes">Observações Gerais</Label>
                  <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalhes importantes sobre a reserva."/>
              </div>
            </TabsContent>
            <TabsContent value="resources" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="equipmentNotes">Equipamentos/Utensílios (não catalogados)</Label>
                <Textarea id="equipmentNotes" value={equipmentNotes} onChange={(e) => setEquipmentNotes(e.target.value)} placeholder="Ex: 10 toalhas de mesa, 50 copos..." rows={2} />
              </div>
              <div className="space-y-2">
                  <Label>Selecionar Itens do Patrimônio</Label>
                  <ScrollArea className="h-40 w-full rounded-md border p-4">
                      {isLoadingPatrimonio ? (
                          <div className="flex items-center justify-center h-full">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                      ) : (
                          <div className="space-y-2">
                              {patrimonioItems?.map(item => (
                                  <div key={item.id} className="flex items-center space-x-2">
                                      <Checkbox
                                          id={`item-${item.id}`}
                                          checked={requiredPatrimonyIds.includes(item.id)}
                                          onCheckedChange={checked => handlePatrimonySelection(item.id, !!checked)}
                                      />
                                      <Label htmlFor={`item-${item.id}`} className="font-normal cursor-pointer flex-1">
                                          {item.name} <span className="text-xs text-muted-foreground">({item.category})</span>
                                      </Label>
                                  </div>
                              ))}
                              {patrimonioItems?.length === 0 && <p className="text-sm text-muted-foreground text-center">Nenhum item no patrimônio.</p>}
                          </div>
                      )}
                  </ScrollArea>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="kitchenUsage" checked={kitchenUsage} onCheckedChange={(checked) => setKitchenUsage(!!checked)} />
                <Label htmlFor="kitchenUsage">Necessita utilizar a cozinha?</Label>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-2">
          {/* Botão de excluir — só aparece no modo edição */}
          {existingReservation ? (
            <div className="flex-1">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 font-medium">Confirmar exclusão?</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="h-8"
                  >
                    {isDeleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
                    Sim, excluir
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} className="h-8">
                    Não
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </Button>
              )}
            </div>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {existingReservation ? 'Salvar Alterações' : 'Enviar Solicitação'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

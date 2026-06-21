'use client';
import React, { useState, useMemo } from 'react';
import { useVolunteering, type VolunteeringEvent } from '@/contexts/volunteering-context';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, PlusCircle, MoreHorizontal, Pencil, Trash2, Copy, Download } from 'lucide-react';
import { CreateEventDialog } from './create-event-dialog';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { useEventsData, useVolunteeringServiceData } from "@/hooks/useDomainData";

function ImportEventsButton() {
    const { events, reservations, rooms, strategicEvents, reservationCategories } = useEventsData();
    const { serviceAreas: areas, teams, savedSchedules } = useVolunteeringServiceData();

    const { addEvent } = useVolunteering();
    const { toast } = useToast();
    const [isImporting, setIsImporting] = useState(false);

    const eventsToImport = [
        { name: 'Culto Propósitos', time: '20:00', frequency: 'semanal', dayOfWeek: 'Quinta-feira' },
        { name: 'Culto clássico', time: '07:30', frequency: 'semanal', dayOfWeek: 'Domingo' },
        { name: 'Culto da Família', time: '10:15', frequency: 'semanal', dayOfWeek: 'Domingo' },
        { name: 'Culto da noite', time: '19:30', frequency: 'semanal', dayOfWeek: 'Domingo' },
        { name: 'Culto da tarde', time: '17:30', frequency: 'semanal', dayOfWeek: 'Domingo' },
    ];

    const handleImport = async () => {
        setIsImporting(true);
        let importedCount = 0;
        const importPromises = eventsToImport.map(eventData => {
            const eventExists = events.some(e => e.name.toLowerCase() === eventData.name.toLowerCase());
            if (!eventExists) {
                importedCount++;
                return addEvent(eventData as any);
            }
            return Promise.resolve();
        });

        await Promise.all(importPromises);

        if (importedCount > 0) {
            toast({
                title: 'Importação Concluída!',
                description: `${importedCount} eventos padrão foram adicionados.`,
            });
        } else {
             toast({
                title: 'Nenhuma Novidade',
                description: 'Todos os eventos padrão já estavam cadastrados.',
            });
        }
        setIsImporting(false);
    };

    return (
        <Button onClick={handleImport} variant="outline" size="sm" disabled={isImporting}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Importar Eventos
        </Button>
    );
}

function ImportAreasButton() {
    const { addArea } = useVolunteering();
    const { toast } = useToast();
    const [isImporting, setIsImporting] = useState(false);

    const areasToImport = [
        "Apoio", "Bistrô", "Boutique", "Broadcasting", "Cleaning", "Coffe Break", 
        "Coordenação De Culto", "Dis", "Eklesia", "Espaço Vip", "Estacionamento", 
        "Fotografia", "Iluminação", "Intercessão", "Live", "Musikids", "Professores", 
        "Projeção", "Recepção", "Saúde", "Security", "Som", "Staff", "Stories"
    ];

    const handleImport = async () => {
        setIsImporting(true);
        let importedCount = 0;
        const importPromises = areasToImport.map(areaName => {
            const areaExists = areas.some(a => a.name.toLowerCase() === areaName.toLowerCase());
            if (!areaExists) {
                importedCount++;
                return addArea({ name: areaName });
            }
            return Promise.resolve();
        });

        await Promise.all(importPromises);

        if (importedCount > 0) {
            toast({
                title: 'Importação Concluída!',
                description: `${importedCount} áreas de serviço foram adicionadas.`,
            });
        } else {
             toast({
                title: 'Nenhuma Novidade',
                description: 'Todas as áreas de serviço já estavam cadastradas.',
            });
        }
        setIsImporting(false);
    };

    return (
        <Button onClick={handleImport} variant="outline" size="sm" disabled={isImporting}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Importar Áreas
        </Button>
    );
}

export function EventsManagement() {
  const { serviceAreas: areas } = useVolunteeringServiceData();
  const { events } = useEventsData();
  const { isLoading, deleteEvent } = useVolunteering();
  const [isFormOpen, setFormOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<VolunteeringEvent | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const areaMap = useMemo(() => new Map(areas.map(a => [a.id, a.name])), [areas]);

  const handleEdit = (event: VolunteeringEvent) => {
    setSelectedEvent(event);
    setIsDuplicating(false);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedEvent(null);
    setIsDuplicating(false);
    setFormOpen(true);
  };

  const handleDuplicate = (event: VolunteeringEvent) => {
    setSelectedEvent({ ...event, name: `${event.name} (Cópia)` });
    setIsDuplicating(true);
    setFormOpen(true);
  };
  
  const handleDelete = (event: VolunteeringEvent) => {
    setSelectedEvent(event);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedEvent) {
      deleteEvent(selectedEvent.id);
      setDeleteOpen(false);
      setSelectedEvent(null);
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Lista de Eventos</h3>
        <div className="flex items-center gap-2">
            <ImportAreasButton />
            <ImportEventsButton />
            <Button onClick={handleAdd} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Evento
            </Button>
        </div>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Frequência</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Áreas de Serviço</TableHead>
              <TableHead className="text-right w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        Nenhum evento cadastrado.
                    </TableCell>
                </TableRow>
            ) : (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.name}</TableCell>
                    <TableCell>
                      {(event as any).frequency ? (event as any).frequency : (event.date || (event as any).dayOfWeek || 'Recorrente')}
                    </TableCell>
                    <TableCell>
                      {event.time}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {event.requiredAreas?.map(({ areaId, quantity }) => (
                          <Badge key={areaId} variant="outline" className="font-normal">
                            {areaMap.get(areaId) || 'Área removida'} ({quantity})
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(event)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(event)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(event)} className="text-destructive">
                               <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <CreateEventDialog
        open={isFormOpen}
        onOpenChange={setFormOpen}
        existingEvent={selectedEvent}
        isDuplicating={isDuplicating}
      />
      
      {selectedEvent && (
        <DeleteConfirmationDialog
            open={isDeleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={confirmDelete}
            itemName={selectedEvent.name}
            itemType="Evento"
        />
      )}
    </>
  );
}
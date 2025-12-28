'use client';
import React, { useState, useMemo } from 'react';
import { useVolunteering, type VolunteeringEvent } from '@/contexts/volunteering-context';
import { useFirebase } from '@/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, PlusCircle, MoreHorizontal, Pencil, Trash2, Copy, FlaskConical } from 'lucide-react';
import { CreateEventDialog } from './create-event-dialog';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';

function FirestoreWriteTestButton() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isTesting, setIsTesting] = useState(false);

    const handleTestWrite = async () => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Firestore não está disponível.' });
            return;
        }
        setIsTesting(true);
        try {
            const testCollection = collection(firestore, 'test_writes');
            await addDoc(testCollection, {
                message: 'Hello Firestore!',
                timestamp: Timestamp.now(),
            });
            toast({ variant: 'default', title: 'Sucesso!', description: 'Documento de teste escrito na coleção "test_writes".' });
        } catch (error: any) {
            console.error("Firestore test write failed:", error);
            toast({ variant: 'destructive', title: 'Falha na Escrita', description: `Erro: ${error.message}` });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <Button onClick={handleTestWrite} variant="outline" size="sm" disabled={isTesting}>
            {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
            Teste de Escrita
        </Button>
    );
}

export function EventsManagement() {
  const { events, areas, isLoading, deleteEvent } = useVolunteering();
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
            <FirestoreWriteTestButton />
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
              <TableHead>Detalhes</TableHead>
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
                      <Badge variant={event.frequency === 'semanal' ? 'default' : 'secondary'} className="capitalize">
                        {event.frequency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {event.frequency === 'semanal' 
                        ? `${event.dayOfWeek} às ${event.time}` 
                        : `${event.date} às ${event.time}`}
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

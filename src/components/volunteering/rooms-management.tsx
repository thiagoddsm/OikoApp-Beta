'use client';
import React, { useState } from 'react';
import { useVolunteering, type Room } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { useEventsData } from "@/hooks/useDomainData";

export function RoomsManagement() {
    const { events, reservations, rooms, strategicEvents, reservationCategories } = useEventsData();

  const { isLoading, addRoom, deleteRoom } = useVolunteering();
  const [newRoomName, setNewRoomName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const handleAddRoom = async () => {
    if (!newRoomName.trim()) return;
    setIsSaving(true);
    await addRoom({ name: newRoomName });
    setNewRoomName('');
    setIsSaving(false);
  };

  const handleDelete = (room: Room) => {
    setSelectedRoom(room);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedRoom) {
      deleteRoom(selectedRoom.id);
      setDeleteOpen(false);
      setSelectedRoom(null);
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
      <div className="space-y-4">
        <div className="flex items-end gap-2">
            <div className="flex-1">
                <label htmlFor="new-room" className="text-sm font-medium">Novo Ambiente</label>
                <Input
                    id="new-room"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Ex: Sala de Reunião 3"
                />
            </div>
            <Button onClick={handleAddRoom} disabled={isSaving || !newRoomName.trim()}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />}
                Adicionar
            </Button>
        </div>

        <div className="rounded-lg border">
          <div className="overflow-x-auto w-full">
<Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Ambiente</TableHead>
                <TableHead className="text-right w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    Nenhum ambiente cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(room)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
</div>
        </div>
      </div>
      
      {selectedRoom && (
        <DeleteConfirmationDialog
            open={isDeleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={confirmDelete}
            itemName={selectedRoom.name}
            itemType="Ambiente"
        />
      )}
    </>
  );
}


'use client';
import React, { useState } from 'react';
import { useVolunteering, type AreaOfService } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { CreateAreaDialog } from './create-area-dialog';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';

export function AreasManagement() {
  const { areas, isLoading, deleteArea } = useVolunteering();
  const [isFormOpen, setFormOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<AreaOfService | null>(null);

  const handleEdit = (area: AreaOfService) => {
    setSelectedArea(area);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedArea(null);
    setFormOpen(true);
  };
  
  const handleDelete = (area: AreaOfService) => {
    setSelectedArea(area);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedArea) {
      deleteArea(selectedArea.id);
      setDeleteOpen(false);
      setSelectedArea(null);
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2" />
          Adicionar Área
        </Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome da Área</TableHead>
              <TableHead className="text-right w-32">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areas.map((area) => (
              <TableRow key={area.id}>
                <TableCell className="font-medium">{area.name}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(area)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(area)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <CreateAreaDialog
        open={isFormOpen}
        onOpenChange={setFormOpen}
        existingArea={selectedArea}
      />
      
      {selectedArea && (
        <DeleteConfirmationDialog
            open={isDeleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={confirmDelete}
            itemName={selectedArea.name}
            itemType="Área de Serviço"
        />
      )}
    </>
  );
}

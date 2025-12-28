
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, PlusCircle, Pencil, Trash2, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVolunteering } from '@/contexts/volunteering-context';
import { CreateAreaDialog } from './create-area-dialog';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';

type AreaOfService = {
  id: string;
  name: string;
};

export default function AreasManagement() {
  const { areas, deleteArea, isLoading } = useVolunteering();
  const [isFormOpen, setFormOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<AreaOfService | null>(null);
  const { toast } = useToast();

  const handleCreate = () => {
    setSelectedArea(null);
    setFormOpen(true);
  };

  const handleEdit = (area: AreaOfService) => {
    setSelectedArea(area);
    setFormOpen(true);
  };

  const handleDelete = (area: AreaOfService) => {
    setSelectedArea(area);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedArea) return;
    try {
      await deleteArea(selectedArea.id);
      toast({ title: 'Área excluída!', description: `A área "${selectedArea.name}" foi removida com sucesso.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: (error as Error).message });
    }
    setDeleteOpen(false);
    setSelectedArea(null);
  };

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2" />
          Criar Área de Serviço
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Briefcase className="inline-block mr-2" />Nome da Área</TableHead>
                <TableHead className="text-right w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas && areas.length > 0 ? (
                areas.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell className="font-medium">{area.name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(area)}>
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(area)}>
                        <Trash2 className="text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    Nenhuma área de serviço encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {isFormOpen && (
        <CreateAreaDialog
          open={isFormOpen}
          onOpenChange={setFormOpen}
          existingArea={selectedArea}
        />
      )}

      {isDeleteOpen && selectedArea && (
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

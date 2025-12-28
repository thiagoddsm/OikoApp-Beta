'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Loader2, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { useVolunteering } from '@/contexts/volunteering-context'; // Import the hook

type AreaOfService = {
  id: string;
  name: string;
};

function AreaFormDialog({ open, onOpenChange, existingArea }) {
  const { addArea, updateArea } = useVolunteering();
  const [name, setName] = useState(existingArea?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setName(existingArea?.name || '');
  }, [existingArea, open]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (existingArea) {
        await updateArea(existingArea.id, { name });
        toast({ title: 'Área atualizada!', description: `A área "${name}" foi salva.` });
      } else {
        await addArea({ name });
        toast({ title: 'Área criada!', description: `A área "${name}" foi adicionada.` });
      }
      onOpenChange(false);
    } catch (error) {
       toast({ variant: 'destructive', title: 'Erro ao salvar', description: (error as Error).message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existingArea ? 'Editar Área' : 'Criar Nova Área'}</DialogTitle>
          <DialogDescription>
            {existingArea ? 'Altere o nome da área de serviço.' : 'Crie uma nova área onde os voluntários podem servir.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="area-name">Nome da Área</Label>
          <Input id="area-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Mídia, Louvor, Infantil" />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
          <Button type="button" onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AreasManagement() {
  const { areas, deleteArea, isLoading } = useVolunteering();
  const [isFormOpen, setFormOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<AreaOfService | null>(null);
  const { toast } = useToast();

  const openCreateDialog = () => {
    setSelectedArea(null);
    setFormOpen(true);
  };

  const openEditDialog = (area: AreaOfService) => {
    setSelectedArea(area);
    setFormOpen(true);
  };

  const openDeleteDialog = (area: AreaOfService) => {
    setSelectedArea(area);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedArea) return;
    try {
        await deleteArea(selectedArea.id);
        toast({ title: 'Área excluída!', description: `A área "${selectedArea.name}" foi removida com sucesso.` });
    } catch(error) {
        toast({ variant: 'destructive', title: 'Erro ao excluir', description: (error as Error).message });
    }
    setDeleteOpen(false);
    setSelectedArea(null);
  };

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <Button onClick={openCreateDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
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
                <TableHead>Nome da Área</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas && areas.length > 0 ? (
                areas.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell className="font-medium">{area.name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(area)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(area)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
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
        <AreaFormDialog
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

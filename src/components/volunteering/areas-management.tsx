
'use client';

import React, { useState } from 'react';
import { useCollection, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Loader2, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';

type AreaOfService = {
  id: string;
  name: string;
};

function AreaFormDialog({ open, onOpenChange, existingArea, onSave }) {
  const [name, setName] = useState(existingArea?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(existingArea?.name || '');
  }, [existingArea, open]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ ...existingArea, name });
    setIsSaving(false);
    onOpenChange(false);
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
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { data: areas, isLoading } = useCollection<AreaOfService>('areas_of_service');

  const [isFormOpen, setFormOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<AreaOfService | null>(null);

  const handleSave = (areaData: Partial<AreaOfService>) => {
    if (!firestore) return;
    if (areaData.id) {
      // Update
      const docRef = doc(firestore, 'areas_of_service', areaData.id);
      updateDocumentNonBlocking(docRef, { name: areaData.name });
      toast({ title: 'Área atualizada!', description: `A área "${areaData.name}" foi salva.` });
    } else {
      // Create
      const collRef = collection(firestore, 'areas_of_service');
      addDocumentNonBlocking(collRef, { name: areaData.name });
      toast({ title: 'Área criada!', description: `A área "${areaData.name}" foi adicionada.` });
    }
  };

  const handleDelete = () => {
    if (!selectedArea || !firestore) return;
    const docRef = doc(firestore, 'areas_of_service', selectedArea.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Área excluída!', description: `A área "${selectedArea.name}" será removida.` });
    setDeleteOpen(false);
    setSelectedArea(null);
  };

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
          onSave={handleSave}
        />
      )}

      {isDeleteOpen && selectedArea && (
        <DeleteConfirmationDialog
          open={isDeleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={handleDelete}
          itemName={selectedArea.name}
          itemType="Área de Serviço"
        />
      )}
    </>
  );
}

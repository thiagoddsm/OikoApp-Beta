
'use client';
import React, { useState, useEffect } from 'react';
import { useVolunteering, type AreaOfService } from '@/contexts/volunteering-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface CreateAreaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingArea: AreaOfService | null;
}

export function CreateAreaDialog({ open, onOpenChange, existingArea }: CreateAreaDialogProps) {
  const { addArea, updateArea } = useVolunteering();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(existingArea?.name || '');
    }
  }, [open, existingArea]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    if (existingArea) {
      await updateArea(existingArea.id, name);
    } else {
      await addArea(name);
    }
    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingArea ? 'Editar Área' : 'Criar Nova Área'}</DialogTitle>
          <DialogDescription>
            Defina o nome para a área de serviço. Ex: Mídia, Recepção, Infantil.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="area-name">Nome da Área</Label>
          <Input
            id="area-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Louvor"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

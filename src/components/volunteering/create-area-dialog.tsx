
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVolunteering } from '@/contexts/volunteering-context';

export function CreateAreaDialog({ open, onOpenChange, existingArea }) {
  const { addArea, updateArea } = useVolunteering();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setName(existingArea?.name || '');
  }, [existingArea, open]);

  const handleSave = async () => {
    if (!name.trim()) {
        toast({
            variant: 'destructive',
            title: 'Nome é obrigatório',
            description: 'Por favor, insira um nome para a área de serviço.'
        });
        return;
    }
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
          <DialogTitle>{existingArea ? 'Editar Área de Serviço' : 'Criar Nova Área de Serviço'}</DialogTitle>
          <DialogDescription>
            {existingArea ? 'Altere o nome da área.' : 'Crie uma nova área onde os voluntários podem servir.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="area-name">Nome da Área</Label>
          <Input id="area-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Mídia, Louvor, Infantil" />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
          <Button type="button" onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving && <Loader2 className="mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

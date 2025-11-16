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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from './actions';

const integrationStatusColumns = [
    { id: 'visitante_culto', title: 'SALA VIP' },
    { id: 'visitante_celula', title: 'VISITANTE EM GC' },
    { id: 'contatado', title: 'PARTICIPANTE EM GC' },
    { id: 'em_discipulado', title: 'Em Discipulado' },
    { id: 'membro', title: 'Membro' },
    { id: 'lider_treinamento', title: 'Líder em Treinamento' },
    { id: 'lider_gc', title: 'LÍDER DE GC' },
    { id: 'lider_area', title: 'LÍDER DE ÁREA' },
    { id: 'lider_rede', title: 'LÍDER DE REDE' },
];

export function EditUserDialog({ user, open, onOpenChange }) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    integrationStatus: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        integrationStatus: user.integrationStatus || 'visitante_culto',
      });
    }
  }, [user, open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, integrationStatus: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateUserProfile(user.id, formData);
    setIsSaving(false);

    if (result.success) {
      toast({
        title: 'Sucesso!',
        description: 'O perfil do usuário foi atualizado.',
      });
      onOpenChange(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: result.error || 'Não foi possível atualizar o perfil.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Perfil do Usuário</DialogTitle>
          <DialogDescription>
            Altere as informações abaixo e clique em salvar.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nome
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Telefone
            </Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="integrationStatus" className="text-right">
              Status
            </Label>
            <Select value={formData.integrationStatus} onValueChange={handleSelectChange}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {integrationStatusColumns.map(status => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

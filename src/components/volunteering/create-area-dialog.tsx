
'use client';
import React, { useState, useEffect } from 'react';
import { useVolunteering, type AreaOfService } from '@/contexts/volunteering-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreateAreaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingArea: AreaOfService | null;
}

export function CreateAreaDialog({ open, onOpenChange, existingArea }: CreateAreaDialogProps) {
  const { users, addArea, updateArea, isLoading } = useVolunteering();
  
  const [name, setName] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [leaderContact, setLeaderContact] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(existingArea?.name || '');
      setLeaderId(existingArea?.leaderId || '');
      setLeaderContact(existingArea?.leaderContact || '');
    }
  }, [open, existingArea]);

  useEffect(() => {
    if (leaderId) {
      const selectedLeader = users.find(u => u.id === leaderId);
      if (selectedLeader) {
        setLeaderContact(selectedLeader.phone || selectedLeader.email || '');
      }
    }
  }, [leaderId, users]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    
    const areaData = {
      name,
      leaderId,
      leaderContact,
    };

    if (existingArea) {
      await updateArea(existingArea.id, areaData);
    } else {
      await addArea(areaData);
    }

    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingArea ? 'Editar Área' : 'Criar Nova Área de Serviço'}</DialogTitle>
          <DialogDescription>
            Defina o nome para a área de serviço e, opcionalmente, um líder.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="area-name">Nome da Área</Label>
            <Input
              id="area-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mídia"
              required
            />
          </div>
          <div>
            <Label htmlFor="leader-id">Líder (Opcional)</Label>
            <Select value={leaderId} onValueChange={setLeaderId} disabled={isLoading}>
              <SelectTrigger id="leader-id">
                <SelectValue placeholder="Selecione um líder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <div>
            <Label htmlFor="leader-contact">Contato do Líder (Opcional)</Label>
            <Input
              id="leader-contact"
              value={leaderContact}
              onChange={(e) => setLeaderContact(e.target.value)}
              placeholder="Telefone ou e-mail"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isSaving || !name.trim()}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
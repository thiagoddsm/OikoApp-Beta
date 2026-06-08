
'use client';
import React, { useState, useEffect } from 'react';
import { useVolunteering, type AreaOfService } from '@/contexts/volunteering-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PersonSearchInput } from '@/components/common/person-search-input';

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
  const [unifiedCelebrations, setUnifiedCelebrations] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(existingArea?.name || '');
      setLeaderId(existingArea?.leaderId || '');
      setLeaderContact(existingArea?.leaderContact || '');
      setUnifiedCelebrations(existingArea?.unifiedCelebrations || false);
    }
  }, [open, existingArea]);

  useEffect(() => {
    if (leaderId && leaderId !== 'null') {
      const selectedLeader = users.find(u => u.id === leaderId);
      if (selectedLeader) {
        setLeaderContact(selectedLeader.phone || selectedLeader.email || '');
      }
    } else {
        setLeaderContact('');
    }
  }, [leaderId, users]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    
    const areaData = {
      name,
      leaderId: leaderId === 'null' ? '' : leaderId,
      leaderContact,
      unifiedCelebrations,
      unifiedGroups: unifiedCelebrations ? [
        { name: "Manhã", eventNames: ["Culto Clássico", "Culto da Manhã", "Clássico", "Manhã"] },
        { name: "Noite/Tarde", eventNames: ["Culto da Tarde", "Culto da Noite", "Tarde", "Noite"] }
      ] : []
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
          <DialogTitle>{existingArea ? 'Editar Área de Serviço' : 'Criar Nova Área de Serviço'}</DialogTitle>
          <DialogDescription>
            Defina o nome da área de serviço, configurações de escala e líder responsável.
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
          <div className="flex items-center space-x-2 py-2 border rounded-xl px-4 bg-slate-50/50">
            <input
              type="checkbox"
              id="unified-celebrations"
              checked={unifiedCelebrations}
              onChange={(e) => setUnifiedCelebrations(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
            />
            <div className="grid gap-0.5 leading-none">
              <Label htmlFor="unified-celebrations" className="text-sm font-bold cursor-pointer text-slate-800">
                Celebrações Unificadas
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Cultos agrupados compartilham da mesma escala de voluntários (Ex: Clássico e Manhã).
              </p>
            </div>
          </div>
          <div>
            <Label htmlFor="leader-id">Líder (Opcional)</Label>
            <PersonSearchInput
              value={leaderId}
              onChange={setLeaderId}
              users={users}
              placeholder="Buscar líder..."
              optional
            />
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
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

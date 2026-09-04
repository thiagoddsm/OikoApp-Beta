
'use client';
import React, { useState, useEffect } from 'react';
import { useVolunteering, type Team } from '@/contexts/volunteering-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface TeamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTeam: Team | null;
}

export function TeamFormDialog({ open, onOpenChange, existingTeam }: TeamFormDialogProps) {
  const { addTeam, updateTeam } = useVolunteering();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(existingTeam?.name || '');
    }
  }, [open, existingTeam]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    
    const teamData = { name };

    if (existingTeam) {
      await updateTeam(existingTeam.id, teamData);
    } else {
      await addTeam(teamData);
    }

    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingTeam ? 'Editar Equipe' : 'Criar Nova Equipe'}</DialogTitle>
          <DialogDescription>
            As equipes são usadas no rodízio de escalas (Ex: Alpha, Bravo, Charlie, Delta).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="team-name">Nome da Equipe</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Alpha"
              required
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

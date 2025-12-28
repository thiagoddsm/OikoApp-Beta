
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
import { MultiSelect, OptionType } from '@/components/ui/multi-select';
import { useVolunteering } from '@/contexts/volunteering-context';

type Team = {
  id: string;
  name: string;
  members: string[]; // array of user IDs
  areaIds: string[]; // array of area IDs
};

interface TeamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTeam: Team | null;
}

export function TeamFormDialog({ open, onOpenChange, existingTeam }: TeamFormDialogProps) {
  const { addTeam, updateTeam, areas } = useVolunteering();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingTeam) {
      setName(existingTeam.name || '');
      setSelectedAreas(existingTeam.areaIds || []);
    } else {
      setName('');
      setSelectedAreas([]);
    }
  }, [existingTeam, open]);

  const areaOptions: OptionType[] = React.useMemo(() =>
    areas.map(area => ({
      value: area.id,
      label: area.name,
    })), [areas]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Nome Obrigatório",
        description: "Por favor, dê um nome para a equipe.",
      });
      return;
    }

    setIsSaving(true);

    const teamData = {
      name,
      areaIds: selectedAreas,
      members: existingTeam?.members || [], // Keep existing members
    };

    try {
      if (existingTeam) {
        await updateTeam(existingTeam.id, teamData);
        toast({
          title: "Sucesso!",
          description: `A equipe "${name}" foi atualizada.`,
        });
      } else {
        await addTeam(teamData);
        toast({
          title: "Sucesso!",
          description: `A equipe "${name}" foi criada.`,
        });
      }
      onOpenChange(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao Salvar", description: (error as Error).message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existingTeam ? 'Editar Equipe' : 'Criar Nova Equipe'}</DialogTitle>
          <DialogDescription>
            Defina o nome da equipe e a(s) área(s) de serviço onde ela atuará.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome da Equipe
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Equipe Alfa" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="areas">
              Áreas de Serviço
            </Label>
            <MultiSelect
              options={areaOptions}
              selected={selectedAreas}
              onChange={setSelectedAreas}
              placeholder="Selecione as áreas..."
              className="w-full"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Cancelar</Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2" />}
            Salvar Equipe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

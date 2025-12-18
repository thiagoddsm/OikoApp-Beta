'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { MultiSelect } from '@/components/ui/multi-select';

type User = {
  id: string;
  name: string;
  avatar?: string;
};

type Team = {
  id: string;
  name: string;
  members: string[];
};

interface TeamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allUsers: User[];
  existingTeam: Team | null;
}

export function TeamFormDialog({ open, onOpenChange, allUsers, existingTeam }: TeamFormDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingTeam) {
      setName(existingTeam.name || '');
      setSelectedMembers(existingTeam.members || []);
    } else {
      setName('');
      setSelectedMembers([]);
    }
  }, [existingTeam, open]);

  const userOptions = allUsers.map(user => ({
    value: user.id,
    label: user.name,
  }));

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Nome Obrigatório",
        description: "Por favor, dê um nome para a equipe.",
      });
      return;
    }
    if (!firestore) {
        toast({
            variant: "destructive",
            title: "Erro de Conexão",
            description: "Não foi possível conectar ao banco de dados.",
        });
        return;
    }
    setIsSaving(true);
    
    const teamData = {
      name,
      members: selectedMembers,
    };

    if (existingTeam) {
      const teamDocRef = doc(firestore, 'teams', existingTeam.id);
      updateDocumentNonBlocking(teamDocRef, teamData);
      toast({
        title: "Sucesso!",
        description: `A equipe "${name}" será atualizada em breve.`,
      });
    } else {
      const teamsCollection = collection(firestore, 'teams');
      addDocumentNonBlocking(teamsCollection, teamData);
      toast({
        title: "Sucesso!",
        description: `A equipe "${name}" será criada em breve.`,
      });
    }

    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existingTeam ? 'Editar Equipe' : 'Criar Nova Equipe'}</DialogTitle>
          <DialogDescription>
            {existingTeam ? 'Altere as informações da equipe abaixo.' : 'Preencha o nome e selecione os membros para criar a equipe.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nome
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="Ex: Mídia, Louvor, Recepção" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="members" className="text-right pt-2">
              Membros
            </Label>
            <div className="col-span-3">
                <MultiSelect
                    options={userOptions}
                    selected={selectedMembers}
                    onChange={setSelectedMembers}
                    placeholder="Selecione os voluntários..."
                />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Cancelar</Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Equipe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

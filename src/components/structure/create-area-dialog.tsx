'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { PersonSearchInput } from '@/components/common/person-search-input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

interface CreateAreaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: any[];
  redes: any[];
  existingArea: any;
}

export function CreateAreaDialog({ open, onOpenChange, users, redes, existingArea }: CreateAreaDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [nome, setNome] = useState('');
  const [liderId, setLiderId] = useState('');
  const [redeId, setRedeId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter users who can be area leaders
  const areaLeaders = useMemo(() => {
    if (!users) return [];
    const leaderRoles = ['lider_area', 'lider_rede', 'pastor_senior', 'admin'];
    return users.filter((u: any) => u.hierarchy?.role && leaderRoles.includes(u.hierarchy.role));
  }, [users]);
  
  useEffect(() => {
    if (existingArea) {
      setNome(existingArea.nome || '');
      setLiderId(existingArea.liderId || '');
      setRedeId(existingArea.redeId || '');
    } else {
      setNome('');
      setLiderId('');
      setRedeId('');
    }
  }, [existingArea, open]);

  const handleSave = async () => {
    if (!nome || !liderId || !redeId || !firestore) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
      });
      return;
    }
    setIsSaving(true);
    
    const areaData = {
      nome,
      liderId,
      redeId,
    };

    try {
        if (existingArea) {
          const areaDocRef = doc(firestore, 'areas', existingArea.id);
          await updateDocumentNonBlocking(areaDocRef, areaData);
          toast({ title: "Sucesso!", description: `A área "${nome}" foi atualizada.` });
        } else {
          const areasCollection = collection(firestore, 'areas');
          await addDocumentNonBlocking(areasCollection, areaData);
          toast({ title: "Sucesso!", description: `A área "${nome}" foi criada.` });
        }
        onOpenChange(false);
    } catch (error) {
        console.error("Error saving area:", error);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingArea ? 'Editar Área' : 'Criar Nova Área'}</DialogTitle>
          <DialogDescription>
            {existingArea ? 'Altere as informações da área abaixo.' : 'Preencha as informações abaixo para criar uma nova área de supervisão.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nome</Label>
            <Input id="name" value={nome} onChange={(e) => setNome(e.target.value)} className="col-span-3" placeholder="Nome da Área"/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rede" className="text-right">Rede</Label>
            <Select value={redeId} onValueChange={setRedeId}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione a Rede" />
                </SelectTrigger>
                <SelectContent>
                    {redes.map((rede: any) => (
                        <SelectItem key={rede.id} value={rede.id}>{rede.nome}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="leader" className="text-right">Líder (Área)</Label>
            <div className="col-span-3">
              <PersonSearchInput
                value={liderId}
                onChange={setLiderId}
                users={users}
                suggestions={areaLeaders}
                placeholder="Selecione ou busque pelo nome..."
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

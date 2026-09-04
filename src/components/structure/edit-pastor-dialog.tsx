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
import { Label } from '@/components/ui/label';
import { PersonSearchInput } from '@/components/common/person-search-input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

interface EditPastorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: any[];
  currentPastorId: string;
}

export function EditPastorDialog({ open, onOpenChange, users, currentPastorId }: EditPastorDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [pastorId, setPastorId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter users who can be pastors/admins for quick suggestions
  const pastorSuggestions = useMemo(() => {
    if (!users) return [];
    const roles = ['pastor_senior', 'pastor', 'admin'];
    return users.filter((u: any) => u.hierarchy?.role && roles.includes(u.hierarchy.role));
  }, [users]);

  useEffect(() => {
    setPastorId(currentPastorId || '');
  }, [currentPastorId, open]);

  const handleSave = async () => {
    if (!pastorId || !firestore) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Por favor, selecione um pastor.",
      });
      return;
    }
    
    if (pastorId === currentPastorId) {
      onOpenChange(false);
      return;
    }

    setIsSaving(true);

    try {
      // Find the old pastor and update their role to 'pastor' (to demote/transfer the role)
      if (currentPastorId) {
        const oldPastor = users.find(u => u.id === currentPastorId);
        if (oldPastor) {
          const oldPastorRef = doc(firestore, 'users', currentPastorId);
          const updatedHierarchy = {
            ...oldPastor.hierarchy,
            role: 'pastor' // Demote to simple pastor role
          };
          await updateDocumentNonBlocking(oldPastorRef, { hierarchy: updatedHierarchy });
        }
      }

      // Find the new pastor and update their role to 'pastor_senior'
      const newPastor = users.find(u => u.id === pastorId);
      if (newPastor) {
        const newPastorRef = doc(firestore, 'users', pastorId);
        const updatedHierarchy = {
          ...(newPastor.hierarchy || {}),
          role: 'pastor_senior'
        };
        await updateDocumentNonBlocking(newPastorRef, { hierarchy: updatedHierarchy });
        toast({ title: "Sucesso!", description: `${newPastor.name} foi definido como Pastor Sênior.` });
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving senior pastor:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao atualizar o Pastor Sênior.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alterar Pastor Sênior</DialogTitle>
          <DialogDescription>
            Selecione o novo Pastor Sênior do topo da hierarquia. O pastor anterior será atualizado para a função de Pastor comum.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pastor" className="text-right">Pastor Sênior</Label>
            <div className="col-span-3">
              <PersonSearchInput
                value={pastorId}
                onChange={setPastorId}
                users={users}
                suggestions={pastorSuggestions}
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

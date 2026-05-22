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
import { PersonSearchInput } from '@/components/common/person-search-input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

interface CreateRedeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: any[];
  existingRede: any;
}

export function CreateRedeDialog({ open, onOpenChange, users, existingRede }: CreateRedeDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [nome, setNome] = useState('');
  const [liderId, setLiderId] = useState('');
  const [pastorId, setPastorId] = useState('');
  const [cor, setCor] = useState('#6366F1');
  const [isSaving, setIsSaving] = useState(false);

  // Filter users who can be pastors
  const pastors = useMemo(() => {
    if (!users) return [];
    const pastorRoles = ['pastor_senior', 'admin'];
    return users.filter((u: any) => u.hierarchy?.role && pastorRoles.includes(u.hierarchy.role));
  }, [users]);

  // Filter users who can be network leaders
  const networkLeaders = useMemo(() => {
    if (!users) return [];
    const leaderRoles = ['lider_rede', 'pastor_senior', 'admin'];
    return users.filter((u: any) => u.hierarchy?.role && leaderRoles.includes(u.hierarchy.role));
  }, [users]);
  
  useEffect(() => {
    if (existingRede) {
      setNome(existingRede.nome || '');
      setLiderId(existingRede.liderId || '');
      setPastorId(existingRede.pastorId || '');
      setCor(existingRede.cor || '#6366F1');
    } else {
      setNome('');
      setLiderId('');
      setPastorId('');
      setCor('#6366F1');
    }
  }, [existingRede, open]);

  const handleSave = async () => {
    if (!nome || !liderId || !pastorId || !firestore) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
      });
      return;
    }
    setIsSaving(true);
    
    const redeData = {
      nome,
      liderId,
      pastorId,
      cor,
    };

    try {
        if (existingRede) {
            const redeDocRef = doc(firestore, 'redes', existingRede.id);
            await updateDocumentNonBlocking(redeDocRef, redeData);
            toast({ title: "Sucesso!", description: `A rede "${nome}" foi atualizada.` });
        } else {
            const redesCollection = collection(firestore, 'redes');
            await addDocumentNonBlocking(redesCollection, redeData);
            toast({ title: "Sucesso!", description: `A rede "${nome}" foi criada.` });
        }
        onOpenChange(false);
    } catch (error) {
        console.error("Error saving network:", error);
    } finally {
        setIsSaving(false);
    }
  };

  const presetColors = [
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#3B82F6', // Blue
    '#06B6D4', // Cyan
    '#14B8A6', // Teal
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#F97316', // Orange
    '#EF4444', // Red
    '#EC4899', // Pink
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingRede ? 'Editar Rede' : 'Criar Nova Rede'}</DialogTitle>
          <DialogDescription>
            {existingRede ? 'Altere as informações da rede abaixo.' : 'Preencha as informações abaixo para criar uma nova rede.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nome</Label>
            <Input id="name" value={nome} onChange={(e) => setNome(e.target.value)} className="col-span-3" placeholder="Nome da Rede"/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="leader" className="text-right">Líder (Rede)</Label>
            <div className="col-span-3">
              <PersonSearchInput
                value={liderId}
                onChange={setLiderId}
                users={users}
                suggestions={networkLeaders}
                placeholder="Selecione ou busque pelo nome..."
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pastor" className="text-right">Pastor</Label>
            <div className="col-span-3">
              <PersonSearchInput
                value={pastorId}
                onChange={setPastorId}
                users={users}
                suggestions={pastors}
                placeholder="Selecione ou busque pelo nome..."
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Cor da Rede</Label>
            <div className="col-span-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-6 h-6 rounded-full border transition-all duration-200 ${
                      cor === color ? 'ring-2 ring-primary scale-110 border-white' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setCor(color)}
                    title={color}
                  />
                ))}
                <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-200 cursor-pointer flex items-center justify-center bg-slate-100 hover:scale-105 transition-transform">
                  <input
                    type="color"
                    value={cor}
                    onChange={(e) => setCor(e.target.value)}
                    className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-150"
                    title="Cor Personalizada"
                  />
                  <span className="text-[10px] pointer-events-none text-slate-500">🎨</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted px-2.5 py-1 rounded-md w-fit">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cor }} />
                {cor.toUpperCase()}
              </div>
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

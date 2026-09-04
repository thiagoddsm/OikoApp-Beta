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
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';

type PatrimonioItem = {
    id: string;
    name: string;
    category: string;
    location: string;
    status: 'Disponível' | 'Emprestado' | 'Manutenção';
    purchaseDate?: string;
    purchaseValue?: number;
    qrCodeValue?: string;
};

interface PatrimonyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingItem: PatrimonioItem | null;
}

const statusOptions = ["Disponível", "Emprestado", "Manutenção"];
const categoryOptions = ["Áudio", "Instrumentos", "Mobília", "Vídeo", "Iluminação", "Cozinha", "Decoração", "Cabos", "Outros"];

export function PatrimonyFormDialog({ open, onOpenChange, existingItem }: PatrimonyFormDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    location: '',
    status: 'Disponível',
    purchaseValue: '',
    purchaseDate: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (existingItem) {
        setFormData({
            name: existingItem.name || '',
            category: existingItem.category || '',
            location: existingItem.location || '',
            status: existingItem.status || 'Disponível',
            purchaseValue: existingItem.purchaseValue?.toString() || '',
            purchaseDate: existingItem.purchaseDate || '',
        });
      } else {
        // Reset for new item
         setFormData({
            name: '',
            category: '',
            location: '',
            status: 'Disponível',
            purchaseValue: '',
            purchaseDate: '',
        });
      }
    }
  }, [open, existingItem]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.category.trim() || !formData.location.trim()) {
        toast({
            variant: "destructive",
            title: "Campos Obrigatórios",
            description: "Nome, Categoria e Localização são obrigatórios."
        });
        return;
    }
    setIsSaving(true);
    
    const dataToSave = {
        ...formData,
        purchaseValue: Number(formData.purchaseValue) || 0,
    };

    try {
        if (existingItem) {
            const itemDoc = doc(firestore, 'patrimonio', existingItem.id);
            updateDocumentNonBlocking(itemDoc, dataToSave);
            toast({ title: 'Sucesso!', description: 'O item será atualizado em breve.' });
        } else {
            const collectionRef = collection(firestore, 'patrimonio');
            const newItemData = {
                ...dataToSave,
                createdAt: serverTimestamp(),
                qrCodeValue: '', // Será gerado no backend ou em outro fluxo
            };
            addDocumentNonBlocking(collectionRef, newItemData);
            toast({ title: 'Sucesso!', description: 'O novo item será adicionado.' });
        }
        onOpenChange(false);
    } catch(e) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar o item.' });
    } finally {
        setIsSaving(false);
    }

  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingItem ? 'Editar Item' : 'Adicionar Novo Item'}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes do bem que está sendo adicionado ao inventário da igreja.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
            <div>
                <Label htmlFor="name">Nome do Item *</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} />
            </div>
             <div className="grid grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="category">Categoria *</Label>
                    <Select value={formData.category} onValueChange={(v) => handleSelectChange('category', v)}>
                        <SelectTrigger id="category"><SelectValue placeholder="Selecione..."/></SelectTrigger>
                        <SelectContent>
                            {categoryOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div>
                    <Label htmlFor="status">Status *</Label>
                    <Select value={formData.status} onValueChange={(v) => handleSelectChange('status', v)}>
                        <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div>
                <Label htmlFor="location">Localização Padrão *</Label>
                <Input id="location" name="location" value={formData.location} onChange={handleChange} placeholder="Ex: Depósito de Mídia, Sala 3"/>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="purchaseValue">Valor de Compra (R$)</Label>
                    <Input id="purchaseValue" name="purchaseValue" type="number" value={formData.purchaseValue} onChange={handleChange} placeholder="Ex: 1200.50"/>
                </div>
                 <div>
                    <Label htmlFor="purchaseDate">Data da Compra</Label>
                    <Input id="purchaseDate" name="purchaseDate" type="date" value={formData.purchaseDate} onChange={handleChange}/>
                </div>
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
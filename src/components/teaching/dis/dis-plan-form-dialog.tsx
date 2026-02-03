
'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useVolunteering, type DisPlan } from '@/contexts/volunteering-context';

interface DisPlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPlan: DisPlan | null;
}

export function DisPlanFormDialog({ open, onOpenChange, existingPlan }: DisPlanFormDialogProps) {
  const { addDisPlan, updateDisPlan } = useVolunteering();
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(existingPlan?.name || '');
      setPrice(existingPlan?.price?.toString() || '');
    }
  }, [open, existingPlan]);

  const handleSave = async () => {
    const numericPrice = Number(price);
    if (!name.trim() || !price || isNaN(numericPrice)) {
      alert('Por favor, preencha todos os campos com valores válidos.');
      return;
    }
    setIsSaving(true);
    
    const planData = { name, price: numericPrice };

    if (existingPlan) {
      await updateDisPlan(existingPlan.id, planData);
    } else {
      await addDisPlan(planData);
    }

    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingPlan ? 'Editar Plano DIS' : 'Criar Novo Plano DIS'}</DialogTitle>
          <DialogDescription>
            Defina o nome e o preço mensal do plano de investimento para o curso de Libras.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="plan-name">Nome do Plano</Label>
            <Input
              id="plan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Libras Iniciante"
              required
            />
          </div>
          <div>
            <Label htmlFor="plan-price">Preço Mensal (R$)</Label>
            <Input
              id="plan-price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ex: 150.00"
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
            Salvar Plano
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

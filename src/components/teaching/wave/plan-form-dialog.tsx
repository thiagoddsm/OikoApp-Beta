
'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useVolunteering, type WavePlan } from '@/contexts/volunteering-context';

interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPlan: WavePlan | null;
}

export function PlanFormDialog({ open, onOpenChange, existingPlan }: PlanFormDialogProps) {
  const { addWavePlan, updateWavePlan } = useVolunteering();
  
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
      await updateWavePlan(existingPlan.id, planData);
    } else {
      await addWavePlan(planData);
    }

    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingPlan ? 'Editar Plano' : 'Criar Novo Plano'}</DialogTitle>
          <DialogDescription>
            Defina o nome e o preço mensal do plano de mensalidade.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="plan-name">Nome do Plano</Label>
            <Input
              id="plan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Violão (Membro IBM)"
              required
            />
          </div>
          <div>
            <Label htmlFor="plan-price">Preço (R$)</Label>
            <Input
              id="plan-price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ex: 130.00"
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

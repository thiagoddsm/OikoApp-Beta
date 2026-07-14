
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
  const [dueDay, setDueDay] = useState('10');
  const [installments, setInstallments] = useState('6');
  const [periodicityMonths, setPeriodicityMonths] = useState('1');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(existingPlan?.name || '');
      setPrice(existingPlan?.price?.toString() || '');
      setDueDay(existingPlan?.dueDay?.toString() || '10');
      setInstallments(existingPlan?.installments?.toString() || '6');
      setPeriodicityMonths(existingPlan?.periodicityMonths?.toString() || '1');
    }
  }, [open, existingPlan]);

  const handleSave = async () => {
    const numericPrice = Number(price);
    const numericDue = Number(dueDay);
    const numericInstallments = Number(installments);
    const numericPeriodicity = Number(periodicityMonths);

    if (!name.trim() || !price || isNaN(numericPrice) || isNaN(numericDue) || isNaN(numericInstallments) || isNaN(numericPeriodicity)) {
      alert('Por favor, preencha todos os campos com valores válidos.');
      return;
    }
    setIsSaving(true);
    
    const planData = { 
      name, 
      price: numericPrice, 
      dueDay: numericDue, 
      installments: numericInstallments, 
      periodicityMonths: numericPeriodicity 
    };

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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="plan-due">Dia Vencimento</Label>
              <Input
                id="plan-due"
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="plan-installments">Nº Parcelas</Label>
              <Input
                id="plan-installments"
                type="number"
                min="1"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="plan-periodicity">Intervalo (Meses)</Label>
              <Input
                id="plan-periodicity"
                type="number"
                min="1"
                value={periodicityMonths}
                onChange={(e) => setPeriodicityMonths(e.target.value)}
                required
              />
            </div>
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

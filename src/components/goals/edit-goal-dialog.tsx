
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
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

export function EditGoalDialog({ open, onOpenChange, kpi, title, year, existingGoal }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [target, setTarget] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingGoal) {
      setTarget(existingGoal.target?.toString() || '');
    } else {
      setTarget('');
    }
  }, [existingGoal, open]);

  const handleSave = async () => {
    const numericTarget = Number(target);
    if (!target || isNaN(numericTarget) || numericTarget < 0) {
      toast({
        variant: 'destructive',
        title: 'Valor Inválido',
        description: 'Por favor, insira um número válido para a meta.',
      });
      return;
    }
    
    setIsSaving(true);

    const goalId = `${kpi}_${year}`;
    const goalRef = doc(firestore, 'goals', goalId);
    
    const goalData = {
      id: goalId,
      kpi,
      year,
      target: numericTarget,
      // Se já existiam, mantém os valores mensais
      monthlyTargets: existingGoal?.monthlyTargets || Array(12).fill(Math.round(numericTarget / 12)),
      monthlyActuals: existingGoal?.monthlyActuals || Array(12).fill(0),
    };

    setDocumentNonBlocking(goalRef, goalData, { merge: true });

    toast({
        title: "Meta Atualizada!",
        description: `A meta para "${title}" foi salva.`,
    });
    
    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Definir Meta para {title}</DialogTitle>
          <DialogDescription>
            Defina o alvo anual para este indicador em {year}. O sistema distribuirá a meta mensalmente de forma igual, mas você poderá ajustar depois.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="target-value">Meta Anual</Label>
            <Input
              id="target-value"
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Ex: 100"
              min="0"
            />
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
            Salvar Meta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

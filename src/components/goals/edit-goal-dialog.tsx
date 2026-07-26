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
import { useTenant } from '@/contexts/tenant-context';
import { doc } from 'firebase/firestore';

interface EditGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi: string;
  title: string;
  year: number;
  existingGoal: any;
}

export function EditGoalDialog({ open, onOpenChange, kpi, title, year, existingGoal }: EditGoalDialogProps) {
  const { tenantId } = useTenant();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [target, setTarget] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (existingGoal) {
        setTarget(existingGoal.target?.toString() || '');
      } else {
        setTarget('');
      }
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

    if (!firestore || !tenantId) return;

    const goalId = `${kpi}_${year}`;
    // Salva na subcoleção por tenant para isolamento SaaS
    const goalRef = doc(firestore, `goals/${tenantId}/items`, goalId);
    
    const goalData = {
      id: goalId,
      tenantId,
      kpiId: kpi,
      kpi,
      year,
      target: numericTarget,
      monthlyTargets: existingGoal?.monthlyTargets || Array(12).fill(Math.round(numericTarget / 12)),
      monthlyActuals: existingGoal?.monthlyActuals || Array(12).fill(0),
      updatedAt: new Date(),
    };

    await setDocumentNonBlocking(goalRef, goalData, { merge: true });

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
            Defina o alvo anual para este indicador em {year}.
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

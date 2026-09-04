
'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useVolunteering, type WavePayment, type User, type WavePlan } from '@/contexts/volunteering-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { useMembersData, useTeachingFinance } from "@/hooks/useDomainData";

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPayment: WavePayment | null;
}

export function PaymentFormDialog({ open, onOpenChange, existingPayment }: PaymentFormDialogProps) {
    const { users } = useMembersData();
    const { wavePayments, disPayments, wavePlans, disPlans, waveExpenses } = useTeachingFinance();

  const { addWavePayment, updateWavePayment, isLoading } = useVolunteering();
  
  const [userId, setUserId] = useState('');
  const [planId, setPlanId] = useState('');
  const [month, setMonth] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'pending' | 'paid' | 'overdue'>('pending');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (existingPayment) {
        setUserId(existingPayment.userId);
        setPlanId(existingPayment.planId);
        setMonth(existingPayment.month);
        setAmount(existingPayment.amount.toString());
        setStatus(existingPayment.status);
      } else {
        // Reset for new payment
        setUserId('');
        setPlanId('');
        setMonth(format(new Date(), 'yyyy-MM'));
        setAmount('');
        setStatus('pending');
      }
    }
  }, [open, existingPayment]);
  
  // Auto-fill amount when plan is selected
  useEffect(() => {
      if (!existingPayment && planId) {
          const selectedPlan = wavePlans.find(p => p.id === planId);
          if (selectedPlan) {
              setAmount(selectedPlan.price.toString());
          }
      }
  }, [planId, existingPayment, wavePlans]);

  const handleSave = async () => {
    const numericAmount = Number(amount);
    if (!userId || !planId || !month || isNaN(numericAmount)) {
      alert('Por favor, preencha todos os campos com valores válidos.');
      return;
    }
    setIsSaving(true);
    
    const paymentData = { userId, planId, month, amount: numericAmount, status };

    if (existingPayment) {
      await updateWavePayment(existingPayment.id, paymentData);
    } else {
      await addWavePayment(paymentData);
    }

    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingPayment ? 'Editar Mensalidade' : 'Registrar Nova Mensalidade'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="user-id">Aluno</Label>
            <Select value={userId} onValueChange={setUserId} disabled={isLoading}>
                <SelectTrigger id="user-id"><SelectValue placeholder="Selecione um aluno..." /></SelectTrigger>
                <SelectContent>
                    {users.filter(u => u.financialStatus).map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="plan-id">Plano</Label>
             <Select value={planId} onValueChange={setPlanId} disabled={isLoading}>
                <SelectTrigger id="plan-id"><SelectValue placeholder="Selecione um plano..." /></SelectTrigger>
                <SelectContent>
                    {wavePlans.map(plan => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <Label htmlFor="month">Mês de Referência</Label>
                <Input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div>
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
           <div>
            <Label htmlFor="status">Status</Label>
             <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

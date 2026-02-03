
'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useVolunteering, type DisPayment } from '@/contexts/volunteering-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

interface DisPaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPayment: DisPayment | null;
}

export function DisPaymentFormDialog({ open, onOpenChange, existingPayment }: DisPaymentFormDialogProps) {
  const { users, disPlans, addDisPayment, updateDisPayment, isLoading } = useVolunteering();
  
  const [userId, setUserId] = useState('');
  const [planId, setPlanId] = useState('');
  const [month, setMonth] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'pending' | 'paid' | 'overdue'>('pending');
  const [contaAzulInvoiceId, setContaAzulInvoiceId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (existingPayment) {
        setUserId(existingPayment.userId);
        setPlanId(existingPayment.planId);
        setMonth(existingPayment.month);
        setAmount(existingPayment.amount.toString());
        setStatus(existingPayment.status);
        setContaAzulInvoiceId(existingPayment.contaAzulInvoiceId || '');
      } else {
        setUserId('');
        setPlanId('');
        setMonth(format(new Date(), 'yyyy-MM'));
        setAmount('');
        setStatus('pending');
        setContaAzulInvoiceId('');
      }
    }
  }, [open, existingPayment]);
  
  useEffect(() => {
      if (!existingPayment && planId) {
          const selectedPlan = disPlans.find(p => p.id === planId);
          if (selectedPlan) {
              setAmount(selectedPlan.price.toString());
          }
      }
  }, [planId, existingPayment, disPlans]);

  const handleSave = async () => {
    const numericAmount = Number(amount);
    if (!userId || !planId || !month || isNaN(numericAmount)) {
      alert('Por favor, preencha todos os campos com valores válidos.');
      return;
    }
    setIsSaving(true);
    
    const paymentData = { userId, planId, month, amount: numericAmount, status, contaAzulInvoiceId };

    if (existingPayment) {
      await updateDisPayment(existingPayment.id, paymentData);
    } else {
      await addDisPayment(paymentData);
    }

    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingPayment ? 'Editar Fatura DIS' : 'Lançar Nova Fatura DIS'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="user-id">Aluno do Curso</Label>
            <Select value={userId} onValueChange={setUserId} disabled={isLoading}>
                <SelectTrigger id="user-id"><SelectValue placeholder="Selecione um aluno..." /></SelectTrigger>
                <SelectContent>
                    {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="plan-id">Plano Selecionado</Label>
             <Select value={planId} onValueChange={setPlanId} disabled={isLoading}>
                <SelectTrigger id="plan-id"><SelectValue placeholder="Selecione um plano..." /></SelectTrigger>
                <SelectContent>
                    {disPlans.map(plan => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <Label htmlFor="month">Mês de Referência</Label>
                <Input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div>
                <Label htmlFor="amount">Valor da Fatura (R$)</Label>
                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
           <div className="grid grid-cols-2 gap-4">
            <div>
                <Label htmlFor="status">Status Atual</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                        <SelectItem value="overdue">Atrasado</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="ca-id">ID Fatura Conta Azul</Label>
                <Input id="ca-id" value={contaAzulInvoiceId} onChange={(e) => setContaAzulInvoiceId(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Fatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

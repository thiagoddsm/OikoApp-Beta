
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useVolunteering, type WaveExpense } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Trash2, Edit, FileUp } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

interface ExpenseFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    existingExpense: WaveExpense | null;
}

function ExpenseFormDialog({ open, onOpenChange, existingExpense }: ExpenseFormDialogProps) {
  const { addWaveExpense, updateWaveExpense } = useVolunteering();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDescription(existingExpense?.description || '');
      setAmount(existingExpense?.amount?.toString() || '');
      setDate(existingExpense?.date ? format(existingExpense.date.toDate(), 'yyyy-MM-dd') : new Date().toISOString().split('T')[0]);
    }
  }, [open, existingExpense]);

  const handleSave = async () => {
    const numericAmount = Number(amount);
    if (!description.trim() || !date || isNaN(numericAmount)) {
      alert('Por favor, preencha todos os campos com valores válidos.');
      return;
    }
    setIsSaving(true);
    
    const expenseData = {
      description,
      amount: numericAmount,
      date: new Date(`${date}T12:00:00`)
    };

    if (existingExpense) {
      await updateWaveExpense(existingExpense.id, expenseData);
    } else {
      await addWaveExpense(expenseData as any);
    }

    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingExpense ? 'Editar Despesa' : 'Registrar Nova Despesa'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="expense-description">Descrição</Label>
            <Input id="expense-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Compra de cabos P10" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expense-amount">Valor (R$)</Label>
              <Input id="expense-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="expense-date">Data</Label>
              <Input id="expense-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
           <div>
              <Label htmlFor="receipt">Comprovante</Label>
              <Input id="receipt" type="file" disabled/>
               <p className="text-xs text-muted-foreground mt-1">O upload de arquivos será implementado em breve.</p>
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


export function WaveExpensesManagement() {
  const { waveExpenses, isLoading, deleteWaveExpense } = useVolunteering();
  const [isFormOpen, setFormOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<WaveExpense | null>(null);

  const handleEdit = (expense: WaveExpense) => {
    setSelectedExpense(expense);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedExpense(null);
    setFormOpen(true);
  };
  
  const handleDelete = (expense: WaveExpense) => {
    setSelectedExpense(expense);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedExpense) {
      deleteWaveExpense(selectedExpense.id);
      setDeleteOpen(false);
      setSelectedExpense(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row justify-between items-center">
            <div>
                <CardTitle>Controle de Despesas</CardTitle>
                <CardDescription>Registre e acompanhe todas as saídas de caixa da escola.</CardDescription>
            </div>
             <Button onClick={handleAdd} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Registrar Despesa
            </Button>
        </CardHeader>
        <CardContent>
            <div className="rounded-lg border">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Comprovante</TableHead>
                    <TableHead className="text-right w-[100px]">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {waveExpenses.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                Nenhuma despesa registrada.
                            </TableCell>
                        </TableRow>
                    ) : (
                        waveExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                            <TableCell>{format(expense.date.toDate(), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="font-medium">{expense.description}</TableCell>
                            <TableCell className="text-red-600 font-semibold">- R$ {expense.amount.toFixed(2).replace('.', ',')}</TableCell>
                            <TableCell>
                                <Button variant="outline" size="icon" className="h-8 w-8" disabled={!expense.receiptUrl}>
                                    <FileUp className="h-4 w-4" />
                                </Button>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(expense)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </TableCell>
                        </TableRow>
                        ))
                    )}
                </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      
      <ExpenseFormDialog
        open={isFormOpen}
        onOpenChange={setFormOpen}
        existingExpense={selectedExpense}
      />
      
      {selectedExpense && (
        <DeleteConfirmationDialog
            open={isDeleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={confirmDelete}
            itemName={`a despesa "${selectedExpense.description}"`}
            itemType="Despesa"
        />
      )}
    </>
  );
}

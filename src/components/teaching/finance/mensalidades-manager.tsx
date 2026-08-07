'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, CheckCircle2, Clock, AlertCircle, ShieldAlert, CreditCard, Search, FileText, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TuitionFee } from '@/lib/finance/financial-plan-types';
import { useToast } from '@/hooks/use-toast';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

interface MensalidadesManagerProps {
  fees?: TuitionFee[];
  canUpdateStatus?: boolean;
}

export function MensalidadesManager({
  fees = [],
  canUpdateStatus = true
}: MensalidadesManagerProps) {
  const { toast } = useToast();
  const [feeList, setFeeList] = useState<TuitionFee[]>(fees);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Sincroniza props.fees com o estado interno quando props mudar
  React.useEffect(() => {
    setFeeList(fees);
  }, [fees]);

  const filteredFees = feeList.filter(fee => {
    const matchesSearch = !searchQuery || 
      fee.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      fee.courseName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || fee.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const { updateDisPayment, deleteDisPayment } = useVolunteering();
  const { firestore } = useFirebase();

  // Dialog State para Edição de Cobrança
  const [editingFee, setEditingFee] = useState<TuitionFee | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDueDate, setEditDueDate] = useState<string>('');
  const [editStatus, setEditStatus] = useState<TuitionFee['status']>('em_aberto');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const handleOpenEdit = (fee: TuitionFee) => {
    setEditingFee(fee);
    setEditAmount(fee.amount.toString());
    setEditDueDate(fee.dueDate || '');
    setEditStatus(fee.status);
  };

  const handleSaveEdit = async () => {
    if (!editingFee) return;
    const numericAmount = Number(editAmount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      toast({ variant: 'destructive', title: 'Valor Inválido', description: 'Digite um valor numérico válido.' });
      return;
    }

    setIsSavingEdit(true);
    try {
      const dbStatus = editStatus === 'pago' ? 'paid' : editStatus === 'em_aberto' ? 'pending' : editStatus;
      
      const isDisFee = (editingFee.courseName || '').toLowerCase().includes('dis') || (editingFee.courseName || '').toLowerCase().includes('libras');

      if (isDisFee && updateDisPayment && editingFee.id) {
        try {
          await updateDisPayment(editingFee.id, {
            amount: numericAmount,
            dueDate: editDueDate,
            status: dbStatus,
            paidAt: editStatus === 'pago' ? new Date().toISOString() : null
          });
        } catch (e) {
          // Ignora se não existir no dis_payments
        }
      }

      if (firestore) {
        const feeRef = doc(firestore, 'tuition_fees', editingFee.id);
        await setDocumentNonBlocking(feeRef, {
          amount: numericAmount,
          dueDate: editDueDate,
          status: editStatus,
          paidAt: editStatus === 'pago' ? new Date().toISOString() : null
        }, { merge: true });
      }

      toast({ title: 'Cobrança Atualizada ✅', description: `Valores de ${editingFee.studentName} salvos com sucesso.` });
      setEditingFee(null);
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro ao Salvar', description: err.message });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteFee = async (fee: TuitionFee) => {
    if (!confirm(`Deseja realmente EXCLUIR a cobrança de R$ ${fee.amount.toFixed(2)} de ${fee.studentName}?`)) return;

    // Atualiza estado local imediatamente para refletir na UI sem delay
    setFeeList(prev => prev.filter(f => f.id !== fee.id));

    try {
      const isDisFee = (fee.courseName || '').toLowerCase().includes('dis') || (fee.courseName || '').toLowerCase().includes('libras');
      
      if (isDisFee && deleteDisPayment && fee.id) {
        try {
          await deleteDisPayment(fee.id);
        } catch (e) {
          // Ignora se não existir no dis_payments
        }
      }
      if (firestore && fee.id) {
        const feeRef = doc(firestore, 'tuition_fees', fee.id);
        await deleteDoc(feeRef);
      }
      toast({ title: 'Cobrança Excluída 🗑️', description: `A cobrança de ${fee.studentName} foi removida com sucesso.` });
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro ao Excluir', description: err.message });
      // Rollback se falhar
      setFeeList(fees);
    }
  };

  const handleToggleStatus = async (feeId: string) => {
    if (!canUpdateStatus) return;

    let targetStudentName = '';
    let targetNextStatus = '';

    setFeeList(prev => prev.map(f => {
      if (f.id === feeId) {
        const nextStatus = f.status === 'pago' ? 'em_aberto' : 'pago';
        targetStudentName = f.studentName;
        targetNextStatus = nextStatus;
        return {
          ...f,
          status: nextStatus,
          paidAt: nextStatus === 'pago' ? new Date().toISOString() : undefined
        };
      }
      return f;
    }));

    if (targetStudentName) {
      toast({
        title: targetNextStatus === 'pago' ? 'Baixa Efetuada ✅' : 'Status Alterado',
        description: `Mensalidade de ${targetStudentName} marcada como ${targetNextStatus.toUpperCase()}.`
      });

      try {
        const dbStatus = targetNextStatus === 'pago' ? 'paid' : 'pending';
        const targetFee = feeList.find(f => f.id === feeId);
        const isDisFee = (targetFee?.courseName || '').toLowerCase().includes('dis') || (targetFee?.courseName || '').toLowerCase().includes('libras');

        if (isDisFee && updateDisPayment && feeId) {
          try {
            await updateDisPayment(feeId, { 
              status: dbStatus,
              paidAt: targetNextStatus === 'pago' ? new Date().toISOString() : null
            });
          } catch (e) {
            // Ignora se o ID não existir em dis_payments
          }
        }
        if (firestore) {
          const feeRef = doc(firestore, 'tuition_fees', feeId);
          await setDocumentNonBlocking(feeRef, {
            status: targetNextStatus,
            paidAt: targetNextStatus === 'pago' ? new Date().toISOString() : null
          }, { merge: true });
        }
      } catch (err) {
        console.error('Erro ao atualizar status da mensalidade no Firestore:', err);
      }
    }
  };

  const getBadgeForStatus = (status: TuitionFee['status']) => {
    switch (status) {
      case 'pago':
        return <Badge className="bg-emerald-600 text-white font-bold gap-1"><CheckCircle2 className="size-3" /> Pago</Badge>;
      case 'em_aberto':
        return <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50 font-bold gap-1"><Clock className="size-3" /> Em Aberto</Badge>;
      case 'isento':
        return <Badge variant="secondary" className="bg-slate-200 text-slate-700 font-bold">Isento</Badge>;
      case 'bolsa':
        return <Badge className="bg-indigo-600 text-white font-bold">Bolsista</Badge>;
      case 'cancelado':
        return <Badge variant="destructive" className="font-bold">Cancelado</Badge>;
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <DollarSign className="size-5 text-emerald-600" />
              Gestão Financeira & Mensalidades
            </CardTitle>
            <CardDescription className="text-xs">
              Controle de carnês, mensalidades por competência e liquidação manual / via Asaas.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button size="sm" variant={filterStatus === 'all' ? 'default' : 'outline'} onClick={() => setFilterStatus('all')} className="h-8 text-xs font-bold">Todas</Button>
              <Button size="sm" variant={filterStatus === 'em_aberto' ? 'default' : 'outline'} onClick={() => setFilterStatus('em_aberto')} className="h-8 text-xs font-bold text-amber-600">Em Aberto</Button>
              <Button size="sm" variant={filterStatus === 'pago' ? 'default' : 'outline'} onClick={() => setFilterStatus('pago')} className="h-8 text-xs font-bold text-emerald-600">Pagas</Button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="size-3.5 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Buscar aluno ou curso..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-9 pl-9 text-xs"
              />
            </div>
          </div>

          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                <TableRow>
                  <TableHead className="text-xs">Aluno</TableHead>
                  <TableHead className="text-xs">Curso</TableHead>
                  <TableHead className="text-xs text-center">Competência</TableHead>
                  <TableHead className="text-xs text-center">Vencimento</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs text-center">Status</TableHead>
                  <TableHead className="text-xs text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFees.map(fee => (
                  <TableRow key={fee.id}>
                    <TableCell className="font-bold text-xs">{fee.studentName}</TableCell>
                    <TableCell className="text-xs text-slate-600">{fee.courseName}</TableCell>
                    <TableCell className="text-xs text-center font-mono">{fee.competence}</TableCell>
                    <TableCell className="text-xs text-center">{fee.dueDate}</TableCell>
                    <TableCell className="text-xs text-right font-bold text-slate-800 dark:text-slate-200">
                      R$ {fee.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">{getBadgeForStatus(fee.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button 
                          size="sm" 
                          variant={fee.status === 'pago' ? 'outline' : 'default'} 
                          onClick={() => handleToggleStatus(fee.id)}
                          className={fee.status === 'pago' ? 'h-7 text-xs border-emerald-300 text-emerald-700 font-bold' : 'h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold'}
                        >
                          {fee.status === 'pago' ? 'Desfazer Baixa' : 'Dar Baixa'}
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleOpenEdit(fee)}
                          className="size-7 text-slate-600 hover:text-indigo-600"
                          title="Editar cobrança"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleDeleteFee(fee)}
                          className="size-7 text-slate-400 hover:text-rose-600"
                          title="Excluir cobrança"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredFees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground italic">
                      Nenhuma mensalidade encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* DIALOG DE EDIÇÃO DE COBRANÇA */}
      {editingFee && (
        <Dialog open={Boolean(editingFee)} onOpenChange={(open) => !open && setEditingFee(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Editar Cobrança</DialogTitle>
              <DialogDescription className="text-xs">
                Ajuste o valor, vencimento ou status da mensalidade de <strong>{editingFee.studentName}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Valor (R$)</Label>
                <Input 
                  type="number" 
                  value={editAmount} 
                  onChange={e => setEditAmount(e.target.value)} 
                  placeholder="85.00"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Data de Vencimento</Label>
                <Input 
                  type="date" 
                  value={editDueDate} 
                  onChange={e => setEditDueDate(e.target.value)} 
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Status da Cobrança</Label>
                <Select value={editStatus} onValueChange={(val: any) => setEditStatus(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_aberto">Em Aberto</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="isento">Isento</SelectItem>
                    <SelectItem value="bolsa">Bolsista</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingFee(null)} disabled={isSavingEdit} className="text-xs font-bold">
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSavingEdit} className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
                {isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

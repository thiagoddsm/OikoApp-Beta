
'use client';
import React, { useState, useMemo } from 'react';
import { useVolunteering, type FinancialTransaction } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Trash2, ArrowUpCircle, ArrowDownCircle, Filter, CheckCircle, Clock } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMinisterialFinance } from "@/hooks/useDomainData";

export function CashFlowManager() {
    const { financialTransactions, financeRequests } = useMinisterialFinance();

  const { addFinancialTransaction, updateFinancialTransaction, deleteFinancialTransaction, isLoading } = useVolunteering();
  
  const [isSaving, setIsSaving] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [formData, setFormData] = useState({
    type: 'expense' as any,
    category: 'Outros',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    status: 'paid' as any,
  });

  const categories = {
    expense: ["Aluguel", "Energia", "Água", "Internet", "Salários", "Manutenção", "Missões", "Social", "Material", "Outros"],
    income: ["Doação", "Venda de Livros", "Eventos", "Outros"]
  };

  const filteredTransactions = useMemo(() => {
    return financialTransactions.filter(t => filterType === 'all' || t.type === filterType);
  }, [financialTransactions, filterType]);

  const handleSave = async () => {
    if (!formData.amount || isNaN(Number(formData.amount))) return;
    setIsSaving(true);

    const transactionData = {
      type: formData.type,
      category: formData.category,
      amount: Number(formData.amount),
      date: Timestamp.fromDate(new Date(`${formData.date}T12:00:00`)),
      description: formData.description,
      status: formData.status,
    };

    await addFinancialTransaction(transactionData);
    setFormData(prev => ({ ...prev, amount: '', description: '' }));
    setIsSaving(false);
  };

  const handleToggleStatus = async (transaction: FinancialTransaction) => {
    const newStatus = transaction.status === 'paid' ? 'pending' : 'paid';
    await updateFinancialTransaction(transaction.id, { status: newStatus });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="size-5 text-primary" />
            Lançar Movimentação
          </CardTitle>
          <CardDescription>Registre entradas gerais ou despesas fixas e variáveis.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData(p => ({...p, type: v, category: categories[v as 'income'|'expense'][0]}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Entrada (Geral)</SelectItem>
                <SelectItem value="expense">Saída / Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={formData.category} onValueChange={(v) => setFormData(p => ({...p, category: v}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories[formData.type as 'income'|'expense'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input 
              type="number" 
              placeholder="0,00" 
              value={formData.amount} 
              onChange={e => setFormData(p => ({...p, amount: e.target.value}))} 
            />
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input 
              type="date" 
              value={formData.date} 
              onChange={e => setFormData(p => ({...p, date: e.target.value}))} 
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData(p => ({...p, status: v}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Pago / Recebido</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input 
              placeholder="Ex: Aluguel do mês" 
              value={formData.description}
              onChange={e => setFormData(p => ({...p, description: e.target.value}))}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t pt-4">
          <Button onClick={handleSave} disabled={isSaving || !formData.amount}>
            {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Adicionar ao Fluxo
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Fluxo de Caixa Consolidado</CardTitle>
            <CardDescription>Todas as movimentações financeiras da igreja.</CardDescription>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Entradas</SelectItem>
              <SelectItem value="expense">Saídas</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto w-full">
<Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Nenhuma movimentação registrada.</TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs">{format(t.date.toDate(), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          {t.type === 'income' ? <ArrowUpCircle className="size-4 text-emerald-500" /> : <ArrowDownCircle className="size-4 text-red-500" />}
                          {t.description || t.category}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground uppercase">{t.category}</TableCell>
                      <TableCell>
                        <button onClick={() => handleToggleStatus(t)} className="outline-none">
                          <Badge variant="outline" className={cn(
                            "cursor-pointer hover:opacity-80 transition-all",
                            t.status === 'paid' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"
                          )}>
                            {t.status === 'paid' ? <CheckCircle className="size-3 mr-1" /> : <Clock className="size-3 mr-1" />}
                            {t.status === 'paid' ? 'Pago' : 'Pendente'}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className={cn("text-right font-bold", t.type === 'income' ? "text-emerald-600" : "text-red-600")}>
                        {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteFinancialTransaction(t.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DollarSign, CheckCircle2, Clock, AlertCircle, Search, PlusCircle, TrendingUp, ArrowUpRight, ArrowDownRight, Edit, Trash2, ShieldCheck, Tag, Receipt, MinusCircle } from 'lucide-react';
import { MensalidadesManager } from './mensalidades-manager';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useTeachingFinance } from '@/hooks/useDomainData';
import { useToast } from '@/hooks/use-toast';
import { Timestamp } from 'firebase/firestore';

interface DisFinanceHubProps {
  disPayments: any[];
}

export function DisFinanceHub({ disPayments }: DisFinanceHubProps) {
  const { disPlans, disExpenses } = useTeachingFinance();
  const { addDisPlan, updateDisPlan, deleteDisPlan, addDisExpense, updateDisExpense, deleteDisExpense } = useVolunteering();
  const { toast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState('overview');

  // Plan Dialog State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planDueDateDay, setPlanDueDateDay] = useState('5');
  const [planDiscountPercent, setPlanDiscountPercent] = useState('0');
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Expense Dialog State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Material Didático');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  // Financial KPIs including expenses
  const metrics = useMemo(() => {
    const totalCount = disPayments.length;
    const paidList = disPayments.filter(p => p.status === 'paid' || p.status === 'pago');
    const pendingList = disPayments.filter(p => p.status === 'pending' || p.status === 'em_aberto');
    const overdueList = disPayments.filter(p => p.status === 'overdue' || p.status === 'atrasado');

    const totalRevenue = paidList.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalPending = pendingList.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalOverdue = overdueList.reduce((acc, p) => acc + (p.amount || 0), 0);

    const totalExpenses = (disExpenses || []).reduce((acc: number, e: any) => acc + (e.amount || 0), 0);
    const netBalance = totalRevenue - totalExpenses;

    const defaultPrice = disPlans.length > 0 ? disPlans[0].price : 100;
    const projectedRevenue = totalCount > 0 ? totalCount * defaultPrice : (totalRevenue + totalPending + totalOverdue);

    const adimplenciaRate = totalCount > 0 ? Math.round((paidList.length / totalCount) * 100) : 100;

    return {
      totalRevenue,
      totalPending,
      totalOverdue,
      totalExpenses,
      netBalance,
      projectedRevenue,
      adimplenciaRate,
      paidCount: paidList.length,
      pendingCount: pendingList.length,
      overdueCount: overdueList.length,
      totalCount
    };
  }, [disPayments, disPlans, disExpenses]);

  // Handle Plan Modal
  const handleOpenPlanModal = (plan?: any) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanName(plan.name || '');
      setPlanPrice(plan.price?.toString() || '100');
      setPlanDueDateDay(plan.dueDateDay?.toString() || '5');
      setPlanDiscountPercent(plan.discountPercent?.toString() || '0');
    } else {
      setEditingPlan(null);
      setPlanName('Mensalidade Padrão Libras');
      setPlanPrice('100');
      setPlanDueDateDay('5');
      setPlanDiscountPercent('0');
    }
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async () => {
    if (!planName.trim() || !planPrice) {
      toast({ variant: 'destructive', title: 'Campos Obrigatórios', description: 'Informe o nome e o valor mensal.' });
      return;
    }

    setIsSavingPlan(true);
    try {
      const payload = {
        name: planName.trim(),
        price: Number(planPrice) || 100,
        dueDateDay: Number(planDueDateDay) || 5,
        discountPercent: Number(planDiscountPercent) || 0
      };

      if (editingPlan) {
        await updateDisPlan(editingPlan.id, payload);
        toast({ title: 'Plano Atualizado', description: 'As regras de valor e vencimento foram salvas.' });
      } else {
        await addDisPlan(payload);
        toast({ title: 'Novo Plano Criado', description: 'Plano cadastrado com sucesso para o DIS.' });
      }
      setIsPlanModalOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao Salvar', description: e.message });
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleDeletePlanClick = async (planId: string) => {
    if (confirm('Deseja realmente remover este plano de mensalidade?')) {
      try {
        await deleteDisPlan(planId);
        toast({ title: 'Plano Removido' });
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Erro ao Excluir', description: e.message });
      }
    }
  };

  // Handle Expense Modal
  const handleOpenExpenseModal = (expense?: any) => {
    if (expense) {
      setEditingExpense(expense);
      setExpenseDescription(expense.description || '');
      setExpenseAmount(expense.amount?.toString() || '');
      setExpenseCategory(expense.category || 'Material Didático');
      setExpenseDate(expense.dateStr || new Date().toISOString().split('T')[0]);
    } else {
      setEditingExpense(null);
      setExpenseDescription('');
      setExpenseAmount('');
      setExpenseCategory('Material Didático');
      setExpenseDate(new Date().toISOString().split('T')[0]);
    }
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async () => {
    const numAmount = Number(expenseAmount);
    if (!expenseDescription.trim() || !expenseAmount || isNaN(numAmount)) {
      toast({ variant: 'destructive', title: 'Campos Obrigatórios', description: 'Informe a descrição e o valor da despesa.' });
      return;
    }

    setIsSavingExpense(true);
    try {
      const payload = {
        description: expenseDescription.trim(),
        amount: numAmount,
        category: expenseCategory,
        dateStr: expenseDate,
        createdAt: Timestamp.now()
      };

      if (editingExpense) {
        await updateDisExpense(editingExpense.id, payload);
        toast({ title: 'Despesa Atualizada' });
      } else {
        await addDisExpense(payload);
        toast({ title: 'Despesa Registrada', description: 'Lançamento de saída adicionado com sucesso.' });
      }
      setIsExpenseModalOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao Salvar Despesa', description: e.message });
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteExpenseClick = async (expenseId: string) => {
    if (confirm('Deseja remover este lançamento de despesa?')) {
      try {
        await deleteDisExpense(expenseId);
        toast({ title: 'Despesa Excluída' });
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Erro ao Excluir', description: e.message });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid grid-cols-4 max-w-xl mb-4 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="overview" className="font-bold text-xs">Visão & Métricas</TabsTrigger>
          <TabsTrigger value="fees" className="font-bold text-xs">Carnês & Baixas</TabsTrigger>
          <TabsTrigger value="expenses" className="font-bold text-xs">Despesas & Saídas</TabsTrigger>
          <TabsTrigger value="plans" className="font-bold text-xs">Planos & Regras</TabsTrigger>
        </TabsList>

        {/* SUBTAB 1: OVERVIEW & DASHBOARD */}
        <TabsContent value="overview" className="space-y-6 animate-in fade-in-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-emerald-50/60 border-emerald-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-emerald-700 font-bold uppercase text-[10px] tracking-wider">Arrecadado (Entradas)</CardDescription>
                <CardTitle className="text-2xl font-black text-emerald-800 flex items-center justify-between">
                  R$ {metrics.totalRevenue.toFixed(2)}
                  <ArrowUpRight className="size-5 text-emerald-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-emerald-700 font-semibold">{metrics.paidCount} mensalidades pagas</p>
              </CardContent>
            </Card>

            <Card className="bg-rose-50/60 border-rose-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-rose-700 font-bold uppercase text-[10px] tracking-wider">Despesas (Saídas)</CardDescription>
                <CardTitle className="text-2xl font-black text-rose-800 flex items-center justify-between">
                  R$ {metrics.totalExpenses.toFixed(2)}
                  <ArrowDownRight className="size-5 text-rose-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-rose-700 font-semibold">{(disExpenses || []).length} despesas lançadas</p>
              </CardContent>
            </Card>

            <Card className={metrics.netBalance >= 0 ? "bg-indigo-50/60 border-indigo-200" : "bg-red-50/60 border-red-200"}>
              <CardHeader className="pb-2">
                <CardDescription className="text-indigo-700 font-bold uppercase text-[10px] tracking-wider">Saldo Líquido DIS</CardDescription>
                <CardTitle className="text-2xl font-black text-indigo-900 flex items-center justify-between">
                  R$ {metrics.netBalance.toFixed(2)}
                  <DollarSign className="size-5 text-indigo-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-indigo-700 font-semibold">Receitas líquidas descontando saídas</p>
              </CardContent>
            </Card>

            <Card className="bg-amber-50/60 border-amber-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-amber-700 font-bold uppercase text-[10px] tracking-wider">A Vencer (Pendentes)</CardDescription>
                <CardTitle className="text-2xl font-black text-amber-800 flex items-center justify-between">
                  R$ {metrics.totalPending.toFixed(2)}
                  <Clock className="size-5 text-amber-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-amber-700 font-semibold">{metrics.pendingCount} cobranças em aberto</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="size-4 text-emerald-600" /> Resumo de Desempenho Financeiro
                </CardTitle>
                <CardDescription className="text-xs">Valores projetados vs liquidados no curso de Libras/DIS</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                  <span className="text-xs font-semibold">Previsão Bruta do Semestre</span>
                  <span className="text-sm font-black">R$ {metrics.projectedRevenue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg text-emerald-900 border border-emerald-100">
                  <span className="text-xs font-semibold">Total Recebido (Entradas)</span>
                  <span className="text-sm font-black text-emerald-700">R$ {metrics.totalRevenue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-rose-50 rounded-lg text-rose-900 border border-rose-100">
                  <span className="text-xs font-semibold">Total de Despesas (Saídas)</span>
                  <span className="text-sm font-black text-rose-700">R$ {metrics.totalExpenses.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg text-amber-900 border border-amber-100">
                  <span className="text-xs font-semibold">A Receber no Ciclo</span>
                  <span className="text-sm font-black text-amber-700">R$ {metrics.totalPending.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Tag className="size-4 text-indigo-600" /> Regra de Cobrança Atual
                  </CardTitle>
                  <CardDescription className="text-xs">Configuração padrão aplicada aos novos alunos</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => setActiveSubTab('plans')} className="text-xs font-bold">
                  Editar Regra
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 border rounded-lg space-y-1 bg-slate-50 dark:bg-slate-900">
                  <p className="text-xs font-bold">Valor da Mensalidade: <span className="text-emerald-600 font-black">R$ {disPlans[0]?.price?.toFixed(2) || '100,00'}</span></p>
                  <p className="text-xs text-muted-foreground">Vencimento: Todo dia <strong className="text-foreground">{disPlans[0]?.dueDateDay || 5}</strong> do mês subsequente à aprovação</p>
                  <p className="text-xs text-muted-foreground">Desconto para pontualidade: <strong>{disPlans[0]?.discountPercent || 0}%</strong></p>
                </div>
                <p className="text-[11px] text-muted-foreground italic">
                  * Ao aprovar uma solicitação na aba "Solicitações", o sistema gera a fatura do mês automaticamente com base nestes parâmetros.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SUBTAB 2: MENSLIDADES & BAIXAS */}
        <TabsContent value="fees" className="animate-in fade-in-50">
          <MensalidadesManager 
            fees={disPayments.map((p: any) => ({
              id: p.id,
              studentName: p.studentName || 'Aluno',
              courseName: p.courseName || 'Curso de Libras',
              competence: p.competence || '2026-07',
              dueDate: p.dueDate || '2026-08-05',
              amount: p.amount || 100,
              status: (p.status === 'paid' ? 'pago' : p.status === 'pending' ? 'em_aberto' : p.status) || 'em_aberto'
            }))} 
            canUpdateStatus={true} 
          />
        </TabsContent>

        {/* SUBTAB 3: DESPESAS & SAÍDAS */}
        <TabsContent value="expenses" className="animate-in fade-in-50">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Receipt className="size-4 text-rose-600" /> Despesas & Custos do DIS
                </CardTitle>
                <CardDescription className="text-xs">Registre materiais didáticos, impressões, lanches e custos operacionais do curso</CardDescription>
              </div>
              <Button size="sm" onClick={() => handleOpenExpenseModal()} className="font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5">
                <PlusCircle className="size-4" /> Lançar Despesa
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow>
                      <TableHead className="text-xs">Descrição</TableHead>
                      <TableHead className="text-xs">Categoria</TableHead>
                      <TableHead className="text-xs text-center">Data</TableHead>
                      <TableHead className="text-xs text-right">Valor (R$)</TableHead>
                      <TableHead className="text-xs text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!disExpenses || disExpenses.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                          Nenhuma despesa lançada para o programa DIS ainda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      disExpenses.map((exp: any) => (
                        <TableRow key={exp.id}>
                          <TableCell className="font-bold text-xs">{exp.description}</TableCell>
                          <TableCell className="text-xs text-slate-600"><Badge variant="outline">{exp.category || 'Geral'}</Badge></TableCell>
                          <TableCell className="text-xs text-center font-mono">{exp.dateStr || '—'}</TableCell>
                          <TableCell className="text-xs text-right font-black text-rose-600">
                            - R$ {(exp.amount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" className="size-7" onClick={() => handleOpenExpenseModal(exp)}>
                                <Edit className="size-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => handleDeleteExpenseClick(exp.id)}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUBTAB 4: CONFIGURAR PLANOS E VENCIMENTOS */}
        <TabsContent value="plans" className="animate-in fade-in-50">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Planos de Mensalidade & Valores</CardTitle>
                <CardDescription className="text-xs">Defina os valores padrão, dia fixo de vencimento e regras de desconto para o DIS</CardDescription>
              </div>
              <Button size="sm" onClick={() => handleOpenPlanModal()} className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                <PlusCircle className="size-4" /> Criar / Novo Plano
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow>
                      <TableHead className="text-xs">Nome do Plano</TableHead>
                      <TableHead className="text-xs text-center">Dia de Vencimento</TableHead>
                      <TableHead className="text-xs text-center">Desconto Pontualidade</TableHead>
                      <TableHead className="text-xs text-right">Valor Mensal</TableHead>
                      <TableHead className="text-xs text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disPlans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                          Nenhum plano customizado. O sistema está usando o valor padrão de R$ 100,00 com vencimento dia 5.
                        </TableCell>
                      </TableRow>
                    ) : (
                      disPlans.map((plan: any) => (
                        <TableRow key={plan.id}>
                          <TableCell className="font-bold text-xs">{plan.name}</TableCell>
                          <TableCell className="text-xs text-center font-mono">Dia {plan.dueDateDay || 5}</TableCell>
                          <TableCell className="text-xs text-center font-bold text-emerald-600">{plan.discountPercent || 0}%</TableCell>
                          <TableCell className="text-xs text-right font-black text-slate-800 dark:text-slate-200">
                            R$ {(plan.price || 100).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" className="size-7" onClick={() => handleOpenPlanModal(plan)}>
                                <Edit className="size-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => handleDeletePlanClick(plan.id)}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* PLAN DIALOG */}
      <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar Plano de Mensalidade' : 'Novo Plano de Mensalidade'}</DialogTitle>
            <DialogDescription className="text-xs">
              Configure o valor cobrado e a data de vencimento padrão das mensalidades.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Nome do Plano</Label>
              <Input 
                value={planName} 
                onChange={e => setPlanName(e.target.value)} 
                placeholder="Ex: Mensalidade Padrão Libras"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Valor Mensal (R$)</Label>
                <Input 
                  type="number" 
                  value={planPrice} 
                  onChange={e => setPlanPrice(e.target.value)} 
                  placeholder="100.00"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Dia Vencimento (Mês Subsequente)</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="31" 
                  value={planDueDateDay} 
                  onChange={e => setPlanDueDateDay(e.target.value)} 
                  placeholder="5"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Desconto Pontualidade (%)</Label>
              <Input 
                type="number" 
                min="0" 
                max="100" 
                value={planDiscountPercent} 
                onChange={e => setPlanDiscountPercent(e.target.value)} 
                placeholder="0"
                className="h-9 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Desconto opcional aplicado caso o pagamento ocorra até a data limite.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPlanModalOpen(false)} disabled={isSavingPlan} className="text-xs font-bold">
              Cancelar
            </Button>
            <Button onClick={handleSavePlan} disabled={isSavingPlan} className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSavingPlan ? 'Salvando...' : 'Salvar Plano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EXPENSE DIALOG */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Editar Lançamento de Despesa' : 'Lançar Nova Despesa do DIS'}</DialogTitle>
            <DialogDescription className="text-xs">
              Registre os custos com materiais, lanches ou impressões do curso.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Descrição da Despesa</Label>
              <Input 
                value={expenseDescription} 
                onChange={e => setExpenseDescription(e.target.value)} 
                placeholder="Ex: Impressão de apostilas de Libras 1º Nível"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Valor da Saída (R$)</Label>
                <Input 
                  type="number" 
                  value={expenseAmount} 
                  onChange={e => setExpenseAmount(e.target.value)} 
                  placeholder="50.00"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Data do Pagamento</Label>
                <Input 
                  type="date" 
                  value={expenseDate} 
                  onChange={e => setExpenseDate(e.target.value)} 
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Categoria</Label>
              <Input 
                value={expenseCategory} 
                onChange={e => setExpenseCategory(e.target.value)} 
                placeholder="Ex: Material Didático, Lanche, Eventos"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExpenseModalOpen(false)} disabled={isSavingExpense} className="text-xs font-bold">
              Cancelar
            </Button>
            <Button onClick={handleSaveExpense} disabled={isSavingExpense} className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white">
              {isSavingExpense ? 'Salvar Despesa...' : 'Salvar Despesa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

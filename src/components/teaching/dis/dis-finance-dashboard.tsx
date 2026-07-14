'use client';
import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, CheckCircle, Clock, XCircle, PlusCircle, Filter, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useVolunteering, type DisPayment } from '@/contexts/volunteering-context';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DisPlansManagement } from './dis-plans-management';
import { DisPaymentFormDialog } from './dis-payment-form-dialog';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { useMembersData, useTeachingFinance, useCoursesData } from "@/hooks/useDomainData";

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string; }> = {
  paid: { label: 'Pago', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  pending: { label: 'Pendente', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  overdue: { label: 'Atrasado', icon: XCircle, color: 'bg-red-100 text-red-800' },
};

interface VirtualDisPayment {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  month: string;
  status: 'pending' | 'paid' | 'overdue';
  isVirtual: boolean;
  contaAzulInvoiceId?: string;
}

export function DisFinanceDashboard() {
    const { users } = useMembersData();
    const { wavePayments, disPayments, wavePlans, disPlans, waveExpenses } = useTeachingFinance();
    const { courses, classes } = useCoursesData();

  const { isLoading, deleteDisPayment, addDisPayment } = useVolunteering();
  const { toast } = useToast();
  const [filter, setFilter] = useState('all');
  const [isFormOpen, setFormOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<DisPayment | null>(null);

  const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);
  const planMap = useMemo(() => new Map(disPlans.map(p => [p.id, p.name])), [disPlans]);

  // Generates physical + virtual payments for manual billing methods
  const allPaymentsAndVirtuals = useMemo(() => {
    if (!disPayments || !classes || !courses || !disPlans) return [];

    const list: (DisPayment | VirtualDisPayment)[] = [...disPayments];
    const physicalMonthsByUserPlan = new Map<string, Set<string>>();
    disPayments.forEach(p => {
      const key = `${p.userId}-${p.planId}`;
      if (!physicalMonthsByUserPlan.has(key)) {
        physicalMonthsByUserPlan.set(key, new Set());
      }
      physicalMonthsByUserPlan.get(key)!.add(p.month);
    });

    const disCourses = courses.filter(c => c.ministryName?.toLowerCase() === 'dis' || c.name?.toLowerCase().includes('libras'));
    const disCourseIds = disCourses.map(c => c.id);

    classes.forEach(cls => {
      if (!disCourseIds.includes(cls.courseId)) return;
      const courseObj = disCourses.find(c => c.id === cls.courseId);
      const billingMethod = courseObj?.billingMethod || 'manual';
      if (billingMethod !== 'manual') return;

      // Find the associated dis plan. Since planId might not be directly on Class in TS type, cast to any or use fallback
      const classAny = cls as any;
      const planObj = disPlans.find(p => p.id === classAny.planId || p.name === cls.cycle);
      if (!planObj) return;

      const durationMonths = 10;
      
      let startDate = new Date();
      if (cls.startDate) {
        startDate = new Date(cls.startDate);
      } else if (classAny.createdAt) {
        const createdAtVal = classAny.createdAt;
        if (typeof createdAtVal.toDate === 'function') {
          startDate = createdAtVal.toDate();
        } else {
          startDate = new Date(createdAtVal);
        }
      }

      cls.students?.forEach((studentId: string) => {
        for (let i = 0; i < durationMonths; i++) {
          const checkDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
          const monthStr = checkDate.toISOString().slice(0, 7);

          const key = `${studentId}-${planObj.id}`;
          const hasPaid = physicalMonthsByUserPlan.get(key)?.has(monthStr);

          if (!hasPaid) {
            const virtualId = `virtual-${studentId}-${monthStr}`;
            if (!list.some(item => item.id === virtualId)) {
              list.push({
                id: virtualId,
                userId: studentId,
                planId: planObj.id,
                amount: planObj.price || (planObj as any).amount || 0,
                month: monthStr,
                status: 'pending',
                isVirtual: true,
              });
            }
          }
        }
      });
    });

    return list;
  }, [disPayments, classes, courses, disPlans]);

  const filteredTransactions = useMemo(() => {
    return allPaymentsAndVirtuals.filter(t => filter === 'all' || t.status === filter);
  }, [allPaymentsAndVirtuals, filter]);

  const kpiData = useMemo(() => {
    if (!disPayments) return { monthlyRevenue: "R$ 0,00", overdueCount: 0 };
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const monthlyRevenue = disPayments
        .filter(p => p.month.startsWith(currentMonth) && p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

    const overduePayments = disPayments.filter(p => p.status === 'overdue');

    return {
        monthlyRevenue: `R$ ${monthlyRevenue.toFixed(2).replace('.', ',')}`,
        overdueCount: overduePayments.length,
    };
  }, [disPayments]);

  const handleAdd = () => {
    setSelectedPayment(null);
    setFormOpen(true);
  };
  
  const handleEdit = (payment: DisPayment) => {
    setSelectedPayment(payment);
    setFormOpen(true);
  };

  const handleDelete = (payment: DisPayment) => {
    setSelectedPayment(payment);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedPayment) {
        deleteDisPayment(selectedPayment.id);
        setDeleteOpen(false);
        setSelectedPayment(null);
    }
  };

  const handleReceiveVirtual = async (t: VirtualDisPayment) => {
    try {
      await addDisPayment({
        status: 'paid',
        amount: t.amount,
        month: t.month,
        userId: t.userId,
        planId: t.planId,
        contaAzulInvoiceId: '',
        createdAt: new Date(),
      });
      toast({
        title: "Sucesso!",
        description: "Pagamento Pix registrado e fatura consolidada com sucesso."
      });
    } catch (e: any) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Erro ao receber pagamento',
        description: e.message || 'Não foi possível registrar o pagamento.'
      });
    }
  };
  
  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <Tabs defaultValue="payments">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="payments">Faturas e Pagamentos</TabsTrigger>
            <TabsTrigger value="plans">Planos do Curso</TabsTrigger>
            <TabsTrigger value="overview">Relatório Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardDescription>Arrecadação DIS (Mês Atual)</CardDescription>
                        <CardTitle className="text-2xl">{kpiData.monthlyRevenue}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className={cn(kpiData.overdueCount > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200")}>
                    <CardHeader className="pb-2">
                        <CardDescription>Pendências de Pagamento</CardDescription>
                        <CardTitle className="text-2xl">{kpiData.overdueCount} faturas atrasadas</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <CardTitle>Gestão de Faturas</CardTitle>
                            <CardDescription>Acompanhe os pagamentos internos da escola DIS.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="sm" onClick={handleAdd}>
                                <PlusCircle className="mr-2 size-4"/>
                                Nova Fatura
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                        <Input placeholder="Buscar por aluno..." className="max-w-xs" />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="ml-auto"><Filter className="mr-2 size-4"/>Filtrar</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => setFilter('all')}>Todos</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setFilter('paid')}>Pago</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setFilter('pending')}>Pendente</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setFilter('overdue')}>Atrasado</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Aluno</TableHead>
                                    <TableHead>Plano</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Mês</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right w-[120px]">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTransactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">Nenhum pagamento encontrado.</TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTransactions.map((t) => {
                                        const isVirtual = 'isVirtual' in t && t.isVirtual;
                                        const StatusIcon = statusConfig[t.status].icon;
                                        return (
                                            <TableRow key={t.id}>
                                                <TableCell className="font-medium">{userMap.get(t.userId) || 'Aluno não encontrado'}</TableCell>
                                                <TableCell>{planMap.get(t.planId) || '-'}</TableCell>
                                                <TableCell>R$ {t.amount.toFixed(2).replace('.', ',')}</TableCell>
                                                <TableCell>{t.month}</TableCell>
                                                <TableCell>
                                                    {isVirtual ? (
                                                        <Badge variant="outline" className="font-medium bg-amber-100 text-amber-800">
                                                            <Clock className="mr-1.5 h-3.5 w-3.5" />
                                                            Pendente (Pix/Manual)
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className={cn("font-medium", statusConfig[t.status].color)}>
                                                            <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
                                                            {statusConfig[t.status].label}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {isVirtual ? (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="text-xs" 
                                                            onClick={() => handleReceiveVirtual(t as VirtualDisPayment)}
                                                        >
                                                            Receber Pix
                                                        </Button>
                                                    ) : (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="size-4"/></Button></DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleEdit(t as DisPayment)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleDelete(t as DisPayment)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="plans" className="mt-6">
            <DisPlansManagement />
        </TabsContent>

        <TabsContent value="overview" className="mt-6">
             <Card>
                <CardHeader>
                    <CardTitle>Relatório Consolidado</CardTitle>
                    <CardDescription>Indicadores financeiros do curso de Libras.</CardDescription>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground text-center">Gráficos de performance financeira em desenvolvimento.</p>
                </CardContent>
            </Card>
        </TabsContent>

        <DisPaymentFormDialog open={isFormOpen} onOpenChange={setFormOpen} existingPayment={selectedPayment} />
        
        {selectedPayment && (
            <DeleteConfirmationDialog 
                open={isDeleteOpen}
                onOpenChange={setDeleteOpen}
                onConfirm={confirmDelete}
                itemName={`pagamento de ${userMap.get(selectedPayment.userId)}`}
                itemType="Mensalidade DIS"
            />
        )}
    </Tabs>
  );
}

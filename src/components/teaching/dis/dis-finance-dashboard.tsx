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
import { useMembersData, useTeachingFinance } from "@/hooks/useDomainData";

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string; }> = {
  paid: { label: 'Pago', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  pending: { label: 'Pendente', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  overdue: { label: 'Atrasado', icon: XCircle, color: 'bg-red-100 text-red-800' },
};

export function DisFinanceDashboard() {
    const { users } = useMembersData();
    const { wavePayments, disPayments, wavePlans, disPlans, waveExpenses } = useTeachingFinance();

  const { isLoading, deleteDisPayment } = useVolunteering();
  const { toast } = useToast();
  const [filter, setFilter] = useState('all');
  const [isFormOpen, setFormOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<DisPayment | null>(null);

  const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);
  const planMap = useMemo(() => new Map(disPlans.map(p => [p.id, p.name])), [disPlans]);

  const filteredTransactions = useMemo(() => {
    if (!disPayments) return [];
    return disPayments.filter(t => filter === 'all' || t.status === filter);
  }, [disPayments, filter]);

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
                                    <TableHead className="text-right w-[100px]">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTransactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">Nenhum pagamento encontrado.</TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTransactions.map((t) => {
                                        const StatusIcon = statusConfig[t.status].icon;
                                        return (
                                            <TableRow key={t.id}>
                                                <TableCell className="font-medium">{userMap.get(t.userId) || 'Aluno não encontrado'}</TableCell>
                                                <TableCell>{planMap.get(t.planId) || '-'}</TableCell>
                                                <TableCell>R$ {t.amount.toFixed(2).replace('.', ',')}</TableCell>
                                                <TableCell>{t.month}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn("font-medium", statusConfig[t.status].color)}>
                                                        <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
                                                        {statusConfig[t.status].label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="size-4"/></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEdit(t)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDelete(t)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
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

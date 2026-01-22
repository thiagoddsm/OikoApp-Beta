
'use client';
import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, DollarSign, CheckCircle, Clock, XCircle, PlusCircle, MinusCircle, FileDown, Filter, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useVolunteering, type WavePayment } from '@/contexts/volunteering-context';
import { Loader2 } from 'lucide-react';
import { WavePlansManagement } from './wave-plans-management';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentFormDialog } from './payment-form-dialog';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WaveExpensesManagement } from './wave-expenses-management';


const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string; }> = {
  paid: { label: 'Pago', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  pending: { label: 'Pendente', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  overdue: { label: 'Atrasado', icon: XCircle, color: 'bg-red-100 text-red-800' },
};

export function WaveFinanceDashboard() {
  const { wavePayments, users, wavePlans, isLoading, deleteWavePayment } = useVolunteering();
  const [filter, setFilter] = useState('all');
  const [isFormOpen, setFormOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<WavePayment | null>(null);

  const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);
  const planMap = useMemo(() => new Map(wavePlans.map(p => [p.id, p.name])), [wavePlans]);

  const filteredTransactions = useMemo(() => {
    if (!wavePayments) return [];
    return wavePayments.filter(t => filter === 'all' || t.status === filter);
  }, [wavePayments, filter]);

  const kpiData = useMemo(() => {
    if (!wavePayments) return { monthlyRevenue: "R$ 0,00", overduePercentage: "0%", overdueCount: "0" };
    
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    const monthlyRevenue = wavePayments
        .filter(p => p.month.startsWith(currentMonth) && p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

    const overduePayments = wavePayments.filter(p => p.status === 'overdue');
    const overduePercentage = wavePayments.length > 0 ? (overduePayments.length / wavePayments.length) * 100 : 0;

    return {
        monthlyRevenue: `R$ ${monthlyRevenue.toFixed(2).replace('.', ',')}`,
        overduePercentage: `${overduePercentage.toFixed(1)}%`,
        overdueCount: `${overduePayments.length} alunos pendentes`,
    };
  }, [wavePayments]);

  const handleAdd = () => {
    setSelectedPayment(null);
    setFormOpen(true);
  };
  
  const handleEdit = (payment: WavePayment) => {
    setSelectedPayment(payment);
    setFormOpen(true);
  };

  const handleDelete = (payment: WavePayment) => {
    setSelectedPayment(payment);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedPayment) {
        deleteWavePayment(selectedPayment.id);
        setDeleteOpen(false);
        setSelectedPayment(null);
    }
  };
  
  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <TooltipProvider>
    <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="payments">Mensalidades</TabsTrigger>
            <TabsTrigger value="expenses">Despesas</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardDescription>Receita (Mês)</CardDescription><CardTitle className="text-2xl">{kpiData.monthlyRevenue}</CardTitle></CardHeader>
                    <CardContent><div className="text-xs text-muted-foreground">+5.2% vs. mês anterior</div></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="pb-2"><CardDescription>Despesas (Mês)</CardDescription><CardTitle className="text-2xl">R$ 14.000,00</CardTitle></CardHeader>
                    <CardContent><div className="text-xs text-muted-foreground">-1.5% vs. mês anterior</div></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="pb-2"><CardDescription>Lucro Líquido (Mês)</CardDescription><CardTitle className="text-2xl">R$ 4.450,00</CardTitle></CardHeader>
                    <CardContent><div className="text-xs text-green-600">+21% vs. mês anterior</div></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="pb-2"><CardDescription>Inadimplência</CardDescription><CardTitle className="text-2xl">{kpiData.overduePercentage}</CardTitle></CardHeader>
                    <CardContent><div className="text-xs text-red-600">{kpiData.overdueCount}</div></CardContent>
                </Card>
            </div>
        </TabsContent>
        <TabsContent value="payments" className="mt-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Transações de Mensalidades</CardTitle>
                            <CardDescription>Acompanhe todos os pagamentos.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handleAdd}><PlusCircle className="mr-2 size-4"/>Novo Pagamento</Button>
                            <Button variant="outline" size="sm"><FileDown className="mr-2 size-4"/>Exportar</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                        <Input placeholder="Buscar por aluno, plano..." className="max-w-xs" />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="ml-auto"><Filter className="mr-2 size-4"/>Filtrar Status</Button>
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
                                    <TableHead>Repasse Prof.</TableHead>
                                    <TableHead>Mês Referência</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTransactions.map((t) => {
                                    const StatusIcon = statusConfig[t.status].icon;
                                    return (
                                        <TableRow key={t.id}>
                                            <TableCell className="font-medium">{userMap.get(t.userId) || 'Aluno não encontrado'}</TableCell>
                                            <TableCell className="text-muted-foreground">{planMap.get(t.planId) || 'Plano não encontrado'}</TableCell>
                                            <TableCell>R$ {t.amount.toFixed(2).replace('.', ',')}</TableCell>
                                            <TableCell>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="font-medium cursor-help border-b border-dashed border-muted-foreground">
                                                        R$ {(t.splits?.teacher || 0).toFixed(2).replace('.', ',')}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <div className="text-sm p-1">
                                                        <h4 className="font-bold mb-2">Rateio do Pagamento</h4>
                                                        <p>Professor: R$ {(t.splits?.teacher || 0).toFixed(2).replace('.', ',')} (40%)</p>
                                                        <p>Wave: R$ {(t.splits?.wave || 0).toFixed(2).replace('.', ',')} (30%)</p>
                                                        <p>IBM: R$ {(t.splits?.ibm || 0).toFixed(2).replace('.', ',')} (20%)</p>
                                                        <p>ADM: R$ {(t.splits?.admin || 0).toFixed(2).replace('.', ',')} (10%)</p>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TableCell>
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
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => handleEdit(t)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDelete(t)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem>Marcar como Pago</DropdownMenuItem>
                                                        <DropdownMenuItem>Enviar Lembrete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="expenses" className="mt-6">
            <WaveExpensesManagement />
        </TabsContent>
        <TabsContent value="plans" className="mt-6">
            <WavePlansManagement />
        </TabsContent>
    </Tabs>

    <PaymentFormDialog open={isFormOpen} onOpenChange={setFormOpen} existingPayment={selectedPayment} />
    
    {selectedPayment && (
        <DeleteConfirmationDialog 
            open={isDeleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={confirmDelete}
            itemName={`pagamento de ${userMap.get(selectedPayment.userId)}`}
            itemType="Mensalidade"
        />
    )}
    </TooltipProvider>
  );
}

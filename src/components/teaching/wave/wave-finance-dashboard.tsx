
'use client';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, DollarSign, CheckCircle, Clock, XCircle, PlusCircle, MinusCircle, FileDown, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const kpiData = [
  { title: "Receita (Mês)", value: "R$ 18.450,00", change: "+5.2% vs. mês anterior", changeColor: "text-green-600" },
  { title: "Despesas (Mês)", value: "R$ 14.000,00", change: "-1.5% vs. mês anterior", changeColor: "text-green-600" },
  { title: "Lucro Líquido (Mês)", value: "R$ 4.450,00", change: "+21% vs. mês anterior", changeColor: "text-green-600" },
  { title: "Inadimplência", value: "8.1%", change: "11 alunos pendentes", changeColor: "text-red-600" },
];

const transactionsData = [
  { id: 'TR001', student: 'João Silva', course: 'Violão Intermediário', amount: 150.00, status: 'paid', dueDate: '05/08/2024' },
  { id: 'TR002', student: 'Maria Oliveira', course: 'Piano Iniciante', amount: 180.00, status: 'pending', dueDate: '10/08/2024' },
  { id: 'TR003', student: 'Carlos Pereira', course: 'Bateria Avançado', amount: 200.00, status: 'overdue', dueDate: '01/08/2024' },
  { id: 'TR004', student: 'Ana Costa', course: 'Canto Popular', amount: 160.00, status: 'paid', dueDate: '05/08/2024' },
  { id: 'TR005', student: 'Pedro Martins', course: 'Teoria Musical', amount: 100.00, status: 'pending', dueDate: '10/08/2024' },
  { id: 'TR006', student: 'Sofia Almeida', course: 'Violão Iniciante', amount: 150.00, status: 'paid', dueDate: '05/08/2024' },
];

const statusConfig = {
  paid: { label: 'Pago', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  pending: { label: 'Pendente', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  overdue: { label: 'Atrasado', icon: XCircle, color: 'bg-red-100 text-red-800' },
};

export function WaveFinanceDashboard() {
  const [filter, setFilter] = useState('all');

  const filteredTransactions = transactionsData.filter(t => filter === 'all' || t.status === filter);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <CardDescription>{kpi.title}</CardDescription>
              <CardTitle className="text-2xl">{kpi.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-xs", kpi.changeColor)}>{kpi.change}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Transações Recentes</CardTitle>
                    <CardDescription>Acompanhe todas as mensalidades e pagamentos.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm"><MinusCircle className="mr-2 size-4"/>Nova Despesa</Button>
                    <Button variant="outline" size="sm"><PlusCircle className="mr-2 size-4"/>Novo Pagamento</Button>
                    <Button variant="outline" size="sm"><FileDown className="mr-2 size-4"/>Exportar</Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
             <div className="flex items-center gap-2 mb-4">
                <Input placeholder="Buscar por aluno, curso..." className="max-w-xs" />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="ml-auto">
                            <Filter className="mr-2 size-4"/>
                            Filtrar Status
                        </Button>
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
                            <TableHead>Curso</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTransactions.map((t) => {
                            const StatusIcon = statusConfig[t.status].icon;
                            return (
                                <TableRow key={t.id}>
                                    <TableCell className="font-medium">{t.student}</TableCell>
                                    <TableCell className="text-muted-foreground">{t.course}</TableCell>
                                    <TableCell>R$ {t.amount.toFixed(2).replace('.', ',')}</TableCell>
                                    <TableCell>{t.dueDate}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("font-medium", statusConfig[t.status].color)}>
                                            <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
                                            {statusConfig[t.status].label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="size-4"/></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
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
    </div>
  );
}

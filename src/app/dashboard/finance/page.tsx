
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, LayoutDashboard, HeartHandshake, TrendingUp, Settings, FileText
} from 'lucide-react';
import { TithesOfferingsManager } from '@/components/finance/tithes-offerings-manager';
import { CashFlowManager } from '@/components/finance/cash-flow-manager';
import { FinanceRequestsManager } from '@/components/finance/finance-requests-manager';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';

function FinancePageContent() {
    const { financialTransactions } = useVolunteering();
    const [activeTab, setActiveTab] = useState('dashboard');

    const summaryData = useMemo(() => {
        if (!financialTransactions) return { income: 0, expense: 0, balance: 0 };
        let totalIncome = 0; 
        let totalExpense = 0;
        financialTransactions.forEach(t => {
            if (t.status === 'paid') {
                if (t.type === 'income') totalIncome += t.amount;
                else totalExpense += t.amount;
            }
        });
        return { income: totalIncome, expense: totalExpense, balance: totalIncome - totalExpense };
    }, [financialTransactions]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-emerald-50 border-emerald-100">
            <CardHeader className="pb-2">
              <CardDescription className="text-emerald-700 text-[10px] font-bold uppercase">Entradas (Pagos)</CardDescription>
              <CardTitle className="text-xl">R$ {summaryData.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-red-50 border-red-100">
            <CardHeader className="pb-2">
              <CardDescription className="text-red-700 text-[10px] font-bold uppercase">Saídas (Pagos)</CardDescription>
              <CardTitle className="text-xl">R$ {summaryData.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-primary/5 border-primary/10 border-2">
            <CardHeader className="pb-2">
              <CardDescription className="text-primary text-[10px] font-bold uppercase">Saldo Atual</CardDescription>
              <CardTitle className="text-xl font-black">R$ {summaryData.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle>
            </CardHeader>
          </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="flex h-auto justify-start bg-muted/50 p-1 rounded-xl w-fit">
            <TabsTrigger value="dashboard" className="rounded-lg font-bold"><LayoutDashboard className="size-4 mr-2" /> Geral</TabsTrigger>
            <TabsTrigger value="tithes" className="rounded-lg font-bold"><HeartHandshake className="size-4 mr-2" /> Dízimos</TabsTrigger>
            <TabsTrigger value="cashflow" className="rounded-lg font-bold"><TrendingUp className="size-4 mr-2" /> Fluxo</TabsTrigger>
            <TabsTrigger value="requests" className="rounded-lg font-bold"><FileText className="size-4 mr-2" /> Solicitações</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Indicadores de Performance</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center italic text-muted-foreground">
                Gráficos de performance financeira em desenvolvimento.
              </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="tithes" className="mt-6"><TithesOfferingsManager /></TabsContent>
        <TabsContent value="cashflow" className="mt-6"><CashFlowManager /></TabsContent>
        <TabsContent value="requests" className="mt-6"><FinanceRequestsManager /></TabsContent>
      </Tabs>
    </div>
  );
}

export default function FinancePage() {
    return (
        <VolunteeringProvider>
            <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>}>
                <FinancePageContent />
            </Suspense>
        </VolunteeringProvider>
    );
}

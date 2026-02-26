
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Key, Link as LinkIcon, BarChart, ExternalLink, ShieldCheck, 
  AlertCircle, DollarSign, TrendingUp, ArrowUpCircle, ArrowDownCircle,
  LayoutDashboard, HeartHandshake, History, RefreshCw, Wallet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { doc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TithesOfferingsManager } from '@/components/finance/tithes-offerings-manager';
import { CashFlowManager } from '@/components/finance/cash-flow-manager';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useSearchParams } from 'next/navigation';

type ContaAzulConfig = {
    id: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
}

function ContaAzulConnect() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { firestore } = useFirebase();
  const configDocRef = useMemo(() => firestore ? doc(firestore, 'config', 'conta_azul') : null, [firestore]);
  
  const { data: config, isLoading: isLoadingConfig } = useDoc<ContaAzulConfig>(configDocRef?.path);

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncData, setSyncData] = useState<any>(null);
  
  const isConnected = !!config?.accessToken || !!config?.refreshToken;
  const hasCredentials = !!config?.clientId && !!config?.clientSecret;

  useEffect(() => {
    if (config) {
        setClientId(config.clientId || '');
        setClientSecret(config.clientSecret || '');
    }
  }, [config]);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'connected') {
        toast({ title: "Conta Azul Conectada!", description: "A integração foi realizada com sucesso." });
    } else if (status === 'error') {
        toast({ variant: 'destructive', title: "Erro na Conexão", description: searchParams.get('message') || "Falha ao autorizar Conta Azul." });
    }
  }, [searchParams, toast]);


  const handleConnect = () => {
    if (!clientId || !clientSecret || !configDocRef) {
      toast({
        variant: 'destructive',
        title: 'Credenciais ausentes',
        description: 'Por favor, insira o Client ID e o Client Secret.',
      });
      return;
    }
    setIsSaving(true);
    
    setDocumentNonBlocking(configDocRef, { 
        clientId, 
        clientSecret 
    }, { merge: true });

    setTimeout(() => {
        setIsSaving(false);
        toast({
            title: 'Credenciais Salvas!',
            description: 'Suas credenciais da Conta Azul foram salvas com segurança.',
        });
    }, 1000);
  };
  
   const handleDisconnect = () => {
    if (!configDocRef) return;
    if (confirm("Tem certeza que deseja remover a conexão com o Conta Azul? Isso interromperá a sincronização financeira.")) {
        setDocumentNonBlocking(configDocRef, {
            clientId: '',
            clientSecret: '',
            accessToken: '',
            refreshToken: '',
            expiresAt: 0
        }, { merge: true });
        toast({
            title: 'Desconectado',
            description: 'A conexão com a Conta Azul foi removida.',
        });
    }
  };

  const handleSync = async () => {
      setIsSyncing(true);
      try {
          const response = await fetch('/api/finance/conta-azul/sync', { method: 'POST' });
          const result = await response.json();
          
          if (response.ok) {
              setSyncData(result.data);
              toast({
                  title: "Sincronização Concluída",
                  description: "Os dados do Conta Azul foram atualizados no sistema.",
              });
          } else {
              throw new Error(result.error);
          }
      } catch (e: any) {
          toast({ variant: 'destructive', title: "Erro na Sincronização", description: e.message });
      } finally {
          setIsSyncing(false);
      }
  };

  if (isLoadingConfig) return null;

  if (isConnected) {
    return (
      <div className="space-y-4">
        <Card className="border-green-200 bg-green-50/30">
            <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-700 text-sm">
                <ShieldCheck className="size-4" />
                Conexão Ativa com Conta Azul
            </CardTitle>
            </CardHeader>
            <CardContent className="pb-2 space-y-4">
                <Button onClick={handleSync} disabled={isSyncing} variant="outline" size="sm" className="w-full bg-white border-green-200 text-green-700 hover:bg-green-50">
                    {isSyncing ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
                    Sincronizar Agora
                </Button>

                {syncData?.bankAccounts && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-green-600 tracking-widest">Contas Vinculadas:</p>
                        {syncData.bankAccounts.map((account: any) => (
                            <div key={account.id} className="flex items-center justify-between text-xs p-2 bg-white rounded border border-green-100">
                                <span className="flex items-center gap-2"><Wallet className="size-3"/> {account.name}</span>
                                <span className="font-bold">R$ {account.current_balance.toLocaleString('pt-BR')}</span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between py-2 border-t border-green-100">
            <span className="text-[10px] text-green-600 font-semibold flex items-center gap-1 uppercase tracking-widest">
                <LinkIcon className="size-3" /> Integração OK
            </span>
            <Button variant="link" size="sm" className="text-destructive h-auto p-0" onClick={handleDisconnect}>Desconectar</Button>
            </CardFooter>
        </Card>
      </div>
    );
  }

  const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/api/finance/conta-azul/callback` : '';
  const authUrl = `https://api.contaazul.com/auth/authorize?client_id=${clientId}&scope=sales%20shipping%20inventory%20products%20customers%20finance&redirect_uri=${encodeURIComponent(redirectUri)}&state=oiko_auth`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Key className="size-4" />Integração Conta Azul</CardTitle>
        <CardDescription className="text-xs">Configure seu Client ID e Secret do Portal do Desenvolvedor.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
                <Label htmlFor="client-id" className="text-xs">Client ID</Label>
                <Input id="client-id" size={32} className="h-8 text-xs" value={clientId} onChange={(e) => setClientId(e.target.value)} />
            </div>
            <div className="space-y-1">
                <Label htmlFor="client-secret" className="text-xs">Client Secret</Label>
                <Input id="client-secret" type="password" size={32} className="h-8 text-xs" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} />
            </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={handleConnect} disabled={isSaving} size="sm" className="flex-1">
          {isSaving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <LinkIcon className="mr-2 h-3 w-3" />}
          Salvar Credenciais
        </Button>
        {hasCredentials && !isConnected && (
            <Button variant="outline" size="sm" className="flex-1" asChild>
                <a href={authUrl}>
                    <ExternalLink className="mr-2 h-3 w-3"/>
                    Autorizar App
                </a>
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function FinancePageContent() {
    const { financialTransactions, isLoading: isLoadingFinances } = useVolunteering();
    const [activeTab, setActiveTab] = useState('dashboard');

    const summaryData = useMemo(() => {
        if (!financialTransactions) return { income: 0, expense: 0, balance: 0, chartData: [] };

        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const now = new Date();
        const last6Months = [];
        
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            last6Months.push({
                name: monthNames[d.getMonth()],
                month: d.getMonth(),
                year: d.getFullYear(),
                income: 0,
                expense: 0
            });
        }

        let totalIncome = 0;
        let totalExpense = 0;

        financialTransactions.forEach(t => {
            const date = t.date.toDate();
            if (t.status === 'paid') {
                if (t.type === 'income') totalIncome += t.amount;
                else totalExpense += t.amount;
            }

            // Chart data
            const monthData = last6Months.find(m => m.month === date.getMonth() && m.year === date.getFullYear());
            if (monthData) {
                if (t.type === 'income') monthData.income += t.amount;
                else monthData.expense += t.amount;
            }
        });

        return {
            income: totalIncome,
            expense: totalExpense,
            balance: totalIncome - totalExpense,
            chartData: last6Months
        };
    }, [financialTransactions]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-emerald-50 border-emerald-100">
                      <CardHeader className="pb-2">
                          <CardDescription className="text-emerald-700 flex items-center gap-1 font-semibold uppercase text-[10px]">Entradas Totais</CardDescription>
                          <CardTitle className="text-2xl text-emerald-800">R$ {summaryData.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle>
                      </CardHeader>
                  </Card>
                  <Card className="bg-red-50 border-red-100">
                      <CardHeader className="pb-2">
                          <CardDescription className="text-red-700 flex items-center gap-1 font-semibold uppercase text-[10px]">Saídas Totais</CardDescription>
                          <CardTitle className="text-2xl text-red-800">R$ {summaryData.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle>
                      </CardHeader>
                  </Card>
                  <Card className="bg-primary/5 border-primary/10">
                      <CardHeader className="pb-2">
                          <CardDescription className="text-primary flex items-center gap-1 font-semibold uppercase text-[10px]">Saldo Consolidado</CardDescription>
                          <CardTitle className="text-2xl text-primary">R$ {summaryData.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle>
                      </CardHeader>
                  </Card>
              </div>
          </div>
          <React.Suspense fallback={<Card className="h-40 animate-pulse bg-muted" />}>
            <ContaAzulConnect />
          </React.Suspense>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="dashboard"><LayoutDashboard className="size-4 mr-2" /> Visão Geral</TabsTrigger>
          <TabsTrigger value="tithes"><HeartHandshake className="size-4 mr-2" /> Dízimos e Ofertas</TabsTrigger>
          <TabsTrigger value="cashflow"><TrendingUp className="size-4 mr-2" /> Fluxo de Caixa</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Performance Financeira (Últimos 6 Meses)</CardTitle>
                    <CardDescription>Gráfico comparativo de entradas e saídas pagas.</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                    {isLoadingFinances ? (
                        <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={summaryData.chartData}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
                                <Tooltip />
                                <Legend />
                                <Area type="monotone" dataKey="income" name="Entradas" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="expense" name="Saídas" stroke="hsl(var(--chart-1))" fillOpacity={1} fill="url(#colorExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="tithes" className="mt-6">
            <TithesOfferingsManager />
        </TabsContent>

        <TabsContent value="cashflow" className="mt-6">
            <CashFlowManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function FinancePage() {
    return (
        <VolunteeringProvider>
            <FinancePageContent />
        </VolunteeringProvider>
    );
}

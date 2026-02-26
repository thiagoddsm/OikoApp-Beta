
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
  LayoutDashboard, HeartHandshake, History, RefreshCw, Wallet, Info, Copy,
  Settings, FlaskConical, CheckCircle2, PlayCircle, HardDriveDownload, DatabaseZap
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
import { cn } from '@/lib/utils';

type ContaAzulConfig = {
    id: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
}

function IntegrationLaboratory() {
    const { toast } = useToast();
    const [isTestingRead, setIsTestingRead] = useState(false);
    const [isTestingWrite, setIsTestingWrite] = useState(false);
    const [log, setLog] = useState<string[]>([]);

    const addLog = (msg: string) => {
        setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
    };

    const handleReadTest = async () => {
        setIsTestingRead(true);
        addLog("Iniciando teste de leitura...");
        try {
            const res = await fetch('/api/finance/conta-azul/sync', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                addLog(`Sucesso! ${data.data.bankAccounts?.length || 0} contas bancárias encontradas.`);
                toast({ title: "Teste de Leitura OK", description: "Conexão estabelecida com sucesso." });
            } else {
                throw new Error(data.error);
            }
        } catch (e: any) {
            addLog(`ERRO: ${e.message}`);
            toast({ variant: 'destructive', title: "Falha na Leitura", description: e.message });
        } finally {
            setIsTestingRead(false);
        }
    };

    const handleWriteTest = async () => {
        setIsTestingWrite(true);
        addLog("Iniciando teste de escrita (Gerar Fatura)...");
        try {
            const res = await fetch('/api/finance/conta-azul/test-write', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                addLog("Sucesso! Recebível de teste criado no Conta Azul.");
                toast({ title: "Teste de Escrita OK", description: "Fatura de teste gerada com sucesso." });
            } else {
                throw new Error(data.error);
            }
        } catch (e: any) {
            addLog(`ERRO: ${e.message}`);
            toast({ variant: 'destructive', title: "Falha na Escrita", description: e.message });
        } finally {
            setIsTestingWrite(false);
        }
    };

    return (
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <FlaskConical className="size-4 text-primary" />
                    Laboratório de Integração
                </CardTitle>
                <CardDescription>Valide as permissões de leitura e escrita da sua API Key.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button 
                        variant="outline" 
                        className="h-16 bg-white border-primary/20 hover:bg-primary/5 group"
                        onClick={handleReadTest}
                        disabled={isTestingRead}
                    >
                        {isTestingRead ? <Loader2 className="animate-spin mr-2" /> : <HardDriveDownload className="mr-2 size-5 text-primary group-hover:scale-110 transition-transform" />}
                        <div className="text-left">
                            <p className="font-bold text-xs">Testar Leitura</p>
                            <p className="text-[10px] text-muted-foreground font-normal">Puxar contas bancárias</p>
                        </div>
                    </Button>

                    <Button 
                        variant="outline" 
                        className="h-16 bg-white border-primary/20 hover:bg-primary/5 group"
                        onClick={handleWriteTest}
                        disabled={isTestingWrite}
                    >
                        {isTestingWrite ? <Loader2 className="animate-spin mr-2" /> : <DatabaseZap className="mr-2 size-5 text-primary group-hover:scale-110 transition-transform" />}
                        <div className="text-left">
                            <p className="font-bold text-xs">Testar Escrita</p>
                            <p className="text-[10px] text-muted-foreground font-normal">Gerar fatura teste (R$ 1,00)</p>
                        </div>
                    </Button>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Logs de Atividade</Label>
                    <div className="bg-black/90 p-3 rounded-lg font-mono text-[10px] text-emerald-400 h-32 overflow-y-auto shadow-inner">
                        {log.length === 0 ? (
                            <p className="opacity-40 italic">Aguardando comando...</p>
                        ) : (
                            log.map((m, i) => <p key={i} className="mb-1">{m}</p>)
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
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
  
  const isConnected = !!config?.accessToken || !!config?.refreshToken;
  const hasCredentials = !!config?.clientId && !!config?.clientSecret;

  useEffect(() => {
    if (config) {
        setClientId(config.clientId || '');
        setClientSecret(config.clientSecret || '');
    }
  }, [config]);

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

  if (isLoadingConfig) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const redirectUri = `${origin}/api/finance/conta-azul/callback`;
  const authUrl = `https://app.contaazul.com/auth/authorize?client_id=${clientId}&scope=sales%20shipping%20inventory%20products%20customers%20finance&redirect_uri=${encodeURIComponent(redirectUri)}&state=oiko_auth`;

  const copyRedirectUri = () => {
      navigator.clipboard.writeText(redirectUri);
      toast({ title: "Copiado!", description: "Use este link no campo 'URL de Redirecionamento' do Conta Azul." });
  };

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg border-2">
                <CardHeader className="bg-muted/30 border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base font-black uppercase tracking-tighter">
                            <Key className="size-4 text-primary" />
                            1. Credenciais de API
                        </CardTitle>
                        {isConnected ? (
                            <Badge className="bg-emerald-500 text-white font-black">CONECTADO</Badge>
                        ) : (
                            <Badge variant="outline" className="text-amber-600 bg-amber-50">AGUARDANDO</Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="client-id" className="text-xs font-bold uppercase text-muted-foreground">Client ID</Label>
                            <Input id="client-id" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="881cq0o..." />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="client-secret" className="text-xs font-bold uppercase text-muted-foreground">Client Secret</Label>
                            <Input id="client-secret" type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="••••••••" />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <div>
                                <p className="text-[10px] font-black uppercase text-blue-700">URL de Redirecionamento</p>
                                <code className="text-[10px] text-blue-900 truncate block mt-1">{redirectUri}</code>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={copyRedirectUri}><Copy size={14}/></Button>
                        </div>
                        <Button onClick={handleConnect} disabled={isSaving} className="w-full h-11 font-bold">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                            Salvar e Validar Credenciais
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-6">
                <Card className={cn("shadow-lg border-2 transition-all", isConnected ? "border-emerald-200" : "opacity-50")}>
                    <CardHeader className={cn("border-b", isConnected ? "bg-emerald-50" : "bg-muted/30")}>
                        <CardTitle className="text-base font-black uppercase tracking-tighter flex items-center gap-2">
                            <PlayCircle className={cn("size-4", isConnected ? "text-emerald-600" : "text-slate-400")} />
                            2. Autorização de Acesso
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 text-center space-y-4">
                        {!isConnected ? (
                            <>
                                <p className="text-sm text-muted-foreground">Após salvar as credenciais acima, clique abaixo para vincular sua conta real ou sandbox.</p>
                                <Button 
                                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-base font-black shadow-xl" 
                                    disabled={!hasCredentials} 
                                    asChild
                                >
                                    <a href={authUrl}>
                                        <ExternalLink className="mr-2 size-5"/>
                                        Autorizar App Agora
                                    </a>
                                </Button>
                            </>
                        ) : (
                            <div className="py-4 space-y-4">
                                <div className="size-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                    <CheckCircle2 size={32} />
                                </div>
                                <div>
                                    <h4 className="font-black text-emerald-900">Integração Ativa</h4>
                                    <p className="text-xs text-emerald-700">Seu sistema está sincronizado com a Conta Azul.</p>
                                </div>
                                <Button variant="outline" className="text-destructive border-destructive/20 hover:bg-red-50" onClick={handleDisconnect}>
                                    Encerrar Conexão
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {isConnected && <IntegrationLaboratory />}
            </div>
        </div>
    </div>
  );
}

function FinancePageContent() {
    const { financialTransactions, isLoading: isLoadingFinances } = useVolunteering();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('dashboard');

    useEffect(() => {
        const status = searchParams.get('status');
        if (status === 'connected') {
            toast({ title: "Conta Azul Conectada!", description: "A integração foi realizada com sucesso." });
        } else if (status === 'error') {
            toast({ variant: 'destructive', title: "Erro na Conexão", description: searchParams.get('message') || "Falha ao autorizar Conta Azul." });
        }
    }, [searchParams, toast]);

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
          <div className="lg:col-span-3">
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
                  <Card className="bg-primary/5 border-primary/10 shadow-sm border-2">
                      <CardHeader className="pb-2">
                          <CardDescription className="text-primary flex items-center gap-1 font-semibold uppercase text-[10px]">Saldo Consolidado</CardDescription>
                          <CardTitle className="text-2xl text-primary font-black">R$ {summaryData.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle>
                      </CardHeader>
                  </Card>
              </div>
          </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="dashboard" className="rounded-lg font-bold"><LayoutDashboard className="size-4 mr-2" /> Visão Geral</TabsTrigger>
          <TabsTrigger value="tithes" className="rounded-lg font-bold"><HeartHandshake className="size-4 mr-2" /> Dízimos</TabsTrigger>
          <TabsTrigger value="cashflow" className="rounded-lg font-bold"><TrendingUp className="size-4 mr-2" /> Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg font-bold"><Settings className="size-4 mr-2" /> Integração</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6 animate-in fade-in-50">
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

        <TabsContent value="tithes" className="mt-6 animate-in slide-in-from-left-4">
            <TithesOfferingsManager />
        </TabsContent>

        <TabsContent value="cashflow" className="mt-6 animate-in slide-in-from-left-4">
            <CashFlowManager />
        </TabsContent>

        <TabsContent value="settings" className="mt-6 animate-in zoom-in-95">
            <ContaAzulConnect />
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

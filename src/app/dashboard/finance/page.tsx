
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, Key, Link as LinkIcon, BarChart, ExternalLink, ShieldCheck, 
  AlertCircle, DollarSign, TrendingUp, ArrowUpCircle, ArrowDownCircle,
  LayoutDashboard, HeartHandshake, History, RefreshCw, Wallet, Info, Copy,
  Settings, FlaskConical, CheckCircle2, PlayCircle, HardDriveDownload, DatabaseZap,
  HelpCircle, ShieldAlert, Terminal, FileText, BookOpen, Bug, Eye, EyeOff
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
import { ScrollArea } from '@/components/ui/scroll-area';

type ContaAzulConfig = {
    id: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    lastError?: string;
    lastErrorAt?: string;
}

function IntegrationLaboratory({ isConnected, lastError }: { isConnected: boolean, lastError?: string }) {
    const { toast } = useToast();
    const [isTestingRead, setIsTestingRead] = useState(false);
    const [isTestingWrite, setIsTestingWrite] = useState(false);
    const [log, setLog] = useState<string[]>([]);

    const addLog = (msg: string) => {
        setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 15));
    };

    useEffect(() => {
        if (lastError) {
            addLog(`ERRO DO SERVIDOR: ${lastError}`);
        }
    }, [lastError]);

    const handleReadTest = async () => {
        setIsTestingRead(true);
        addLog("Iniciando teste de leitura...");
        
        if (!isConnected) {
            addLog("AVISO: Tokens não encontrados no banco. O teste provavelmente falhará com 'Não Autorizado'.");
        }

        try {
            const res = await fetch('/api/finance/conta-azul/sync', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                addLog(`Sucesso! ${data.data.bankAccounts?.length || 0} contas bancárias encontradas.`);
                toast({ title: "Teste de Leitura OK", description: "Conexão estabelecida com sucesso." });
            } else {
                throw new Error(data.error || "Erro desconhecido na API");
            }
        } catch (e: any) {
            addLog(`FALHA NA LEITURA: ${e.message}`);
            toast({ variant: 'destructive', title: "Falha na Leitura", description: e.message });
        } finally {
            setIsTestingRead(false);
        }
    };

    const handleWriteTest = async () => {
        setIsTestingWrite(true);
        addLog("Iniciando teste de escrita (Gerar Fatura)...");

        if (!isConnected) {
            addLog("AVISO: Tokens não encontrados. A tentativa de escrita será negada pela API.");
        }

        try {
            const res = await fetch('/api/finance/conta-azul/test-write', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                addLog("Sucesso! Recebível de teste criado no Conta Azul.");
                toast({ title: "Teste de Escrita OK", description: "Fatura de teste gerada com sucesso." });
            } else {
                throw new Error(data.error || "Erro desconhecido na API");
            }
        } catch (e: any) {
            addLog(`FALHA NA ESCRITA: ${e.message}`);
            toast({ variant: 'destructive', title: "Falha na Escrita", description: e.message });
        } finally {
            setIsTestingWrite(false);
        }
    };

    return (
        <Card className="border-primary/20 bg-primary/5 shadow-inner">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                            <FlaskConical className="size-4" />
                            Laboratório de Integração
                        </CardTitle>
                        <CardDescription>Valide as permissões de leitura e escrita em tempo real.</CardDescription>
                    </div>
                    {isConnected ? (
                        <Badge className="bg-emerald-500">CONECTADO</Badge>
                    ) : (
                        <Badge variant="outline" className="text-amber-600 bg-amber-50">DESCONECTADO</Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button 
                        variant="outline" 
                        className={cn("h-16 bg-white border-primary/20 group")}
                        onClick={handleReadTest}
                        disabled={isTestingRead}
                    >
                        {isTestingRead ? <Loader2 className="animate-spin mr-2" /> : <HardDriveDownload className="mr-2 size-5 text-primary group-hover:scale-110 transition-transform" />}
                        <div className="text-left">
                            <p className="font-bold text-xs uppercase">1. Testar Leitura</p>
                            <p className="text-[9px] text-muted-foreground font-normal">Puxar contas bancárias</p>
                        </div>
                    </Button>

                    <Button 
                        variant="outline" 
                        className={cn("h-16 bg-white border-primary/20 group")}
                        onClick={handleWriteTest}
                        disabled={isTestingWrite}
                    >
                        {isTestingWrite ? <Loader2 className="animate-spin mr-2" /> : <DatabaseZap className="mr-2 size-5 text-primary group-hover:scale-110 transition-transform" />}
                        <div className="text-left">
                            <p className="font-bold text-xs uppercase">2. Testar Escrita</p>
                            <p className="text-[9px] text-muted-foreground font-normal">Gerar fatura teste (R$ 1,00)</p>
                        </div>
                    </Button>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                        <Terminal size={12} /> Console de Depuração
                    </Label>
                    <div className="bg-black/90 p-3 rounded-lg font-mono text-[10px] text-emerald-400 h-40 overflow-y-auto shadow-2xl border border-white/10">
                        {log.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 italic gap-2">
                                <Bug size={24} />
                                <p>Clique em um dos testes para iniciar o diagnóstico...</p>
                            </div>
                        ) : (
                            log.map((m, i) => <p key={i} className="mb-1 leading-tight border-b border-white/5 pb-1">{m}</p>)
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function TechnicalDossier() {
    return (
        <Card className="border-indigo-200 bg-indigo-50/20">
            <CardHeader className="bg-indigo-100/50">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2 text-indigo-900">
                    <FileText className="size-4" />
                    Dossiê Técnico: Integração Conta Azul
                </CardTitle>
                <CardDescription className="text-indigo-700/80">Arquitetura de Software e Desafios de Ambiente</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <ScrollArea className="h-[450px] pr-4">
                    <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
                        <Alert className="bg-amber-50 border-amber-200 mb-4">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-amber-800 font-bold uppercase text-xs">Atenção ao Ambiente Studio</AlertTitle>
                            <AlertDescription className="text-amber-700 text-xs">
                                O Firebase Studio usa um sistema de traços no endereço. Se você reiniciar seu workspace, o link muda e você **precisa** atualizar o portal da Conta Azul.
                            </AlertDescription>
                        </Alert>

                        <section>
                            <h4 className="font-bold text-indigo-900 mb-2 uppercase text-xs tracking-tighter flex items-center gap-2">
                                <div className="size-1.5 rounded-full bg-indigo-500" />
                                1. Desafio da Identidade Binária (Redirect URI)
                            </h4>
                            <p>O protocolo OAuth 2.0 exige que a <code className="bg-indigo-100 px-1 rounded">redirect_uri</code> enviada pela aplicação seja "binariamente idêntica" à cadastrada no portal de desenvolvedores. No ambiente do Firebase Studio, surge uma discrepância de portas: enquanto o portal pode esperar uma requisição na porta :6000, o servidor interno detecta a porta :9002.</p>
                            <p className="mt-2 text-xs font-bold text-indigo-700 italic">Solução: Detecção dinâmica baseada em cabeçalhos de proxy para garantir que a aplicação se apresente com o endereço exato visualizado no navegador.</p>
                        </section>

                        <section>
                            <h4 className="font-bold text-indigo-900 mb-2 uppercase text-xs tracking-tighter flex items-center gap-2">
                                <div className="size-1.5 rounded-full bg-indigo-500" />
                                2. Formatação de Requisição de Token
                            </h4>
                            <p>A Conta Azul exige estritamente que a troca do "Código de Autorização" pelo "Token de Acesso" seja feita no formato de formulário web: <code className="bg-indigo-100 px-1 rounded">application/x-www-form-urlencoded</code>. O envio como JSON resulta em erros de "Invalid Client".</p>
                        </section>

                        <section>
                            <h4 className="font-bold text-indigo-900 mb-2 uppercase text-xs tracking-tighter flex items-center gap-2">
                                <div className="size-1.5 rounded-full bg-indigo-500" />
                                3. Restrições de Acesso no Sandbox
                            </h4>
                            <p>Os aplicativos em modo de "Desenvolvimento" operam em um ecossistema isolado. Tentativas de login com e-mails reais resultam em erro de permissão. É obrigatório o uso exclusivo dos e-mails de teste (ex: f79c80da...@devportal.com).</p>
                        </section>

                        <section>
                            <h4 className="font-bold text-indigo-900 mb-2 uppercase text-xs tracking-tighter flex items-center gap-2">
                                <div className="size-1.5 rounded-full bg-indigo-500" />
                                4. Higiene de Credenciais e Sanitização
                            </h4>
                            <p>Devido à extensão das chaves, espaços em branco acidentais ao copiar invalidam o acesso por completo. Implementamos limpeza automática via <code className="bg-indigo-100 px-1 rounded">.trim()</code> em todos os campos de entrada.</p>
                        </section>
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

function ContaAzulConnect() {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const configDocRef = useMemo(() => firestore ? doc(firestore, 'config', 'conta_azul') : null, [firestore]);
  
  const { data: config, isLoading: isLoadingConfig } = useDoc<ContaAzulConfig>(configDocRef?.path);

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [origin, setOrigin] = useState('');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
        setOrigin(window.location.origin);
    }
  }, []);

  const isConnected = !!config?.accessToken || !!config?.refreshToken;
  const hasCredentials = !!config?.clientId && !!config?.clientSecret;

  useEffect(() => {
    if (config) {
        setClientId(config.clientId || '');
        setClientSecret(config.clientSecret || '');
    }
  }, [config]);

  const handleConnect = () => {
    const cleanId = clientId.trim();
    const cleanSecret = clientSecret.trim();

    if (!cleanId || !cleanSecret || !configDocRef) {
      toast({
        variant: 'destructive',
        title: 'Credenciais ausentes',
        description: 'Por favor, insira o Client ID e o Client Secret.',
      });
      return;
    }
    setIsSaving(true);
    
    setDocumentNonBlocking(configDocRef, { 
        clientId: cleanId, 
        clientSecret: cleanSecret 
    }, { merge: true });

    setTimeout(() => {
        setIsSaving(false);
        toast({ title: 'Credenciais Salvas!', description: 'Suas credenciais foram sincronizadas com sucesso.' });
    }, 1000);
  };
  
   const handleDisconnect = () => {
    if (!configDocRef) return;
    if (confirm("Tem certeza que deseja remover a conexão?")) {
        setDocumentNonBlocking(configDocRef, {
            clientId: '', clientSecret: '', accessToken: '', refreshToken: '', expiresAt: 0
        }, { merge: true });
        toast({ title: 'Desconectado', description: 'A conexão foi removida.' });
    }
  };

  if (isLoadingConfig) return null;

  // Use HTTPS fixo para redirect_uri no Studio/Cloud
  const redirectUri = `${origin}/api/finance/conta-azul/callback`;
  const scopes = 'finance customers sales'; // Adicionado sales por segurança em Sandbox
  const authUrl = `https://app.contaazul.com/auth/authorize?client_id=${clientId.trim()}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=oiko_auth&response_type=code`;

  return (
    <div className="space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
            <HelpCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800 font-bold uppercase text-xs tracking-tighter">Redirect URI Dinâmico (Compliance OAuth 2.0)</AlertTitle>
            <AlertDescription className="text-blue-700 text-xs space-y-2 mt-2">
                <p>No seu Portal Conta Azul, o campo <strong>URL de Redirecionamento</strong> deve estar EXATAMENTE como o link abaixo:</p>
                <div className="flex items-center gap-2 bg-white/50 p-2 rounded border border-blue-200 mt-1">
                    <code className="font-mono text-[10px] flex-1 truncate">{redirectUri}</code>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(redirectUri); toast({title: "Link Copiado!"}); }}><Copy size={12}/></Button>
                </div>
                <p className="font-bold text-amber-700">⚠️ Verifique se a porta (número após os dois pontos) no portal é a mesma que você vê na barra do seu navegador agora.</p>
            </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
                <Card className="shadow-lg border-2">
                    <CardHeader className="bg-muted/30 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-tighter">
                                <Key className="size-4 text-primary" />
                                1. Credenciais da API
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
                                <Input id="client-id" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="881cq0o..." className="font-mono" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="client-secret" className="text-xs font-bold uppercase text-muted-foreground">Client Secret</Label>
                                <div className="relative">
                                    <Input 
                                        id="client-secret" 
                                        type={showSecret ? "text" : "password"} 
                                        value={clientSecret} 
                                        onChange={(e) => setClientSecret(e.target.value)} 
                                        placeholder="••••••••" 
                                        className="font-mono pr-10"
                                    />
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="absolute right-0 top-0 h-10 w-10 text-muted-foreground"
                                        onClick={() => setShowSecret(!showSecret)}
                                    >
                                        {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <Button onClick={handleConnect} disabled={isSaving} className="w-full h-11 font-bold mt-4">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                            Salvar e Higienizar Chaves
                        </Button>
                    </CardContent>
                </Card>

                <IntegrationLaboratory isConnected={isConnected} lastError={config?.lastError} />
            </div>

            <div className="space-y-6">
                <Card className={cn("shadow-lg border-2 transition-all", isConnected ? "border-emerald-200" : "border-primary/20")}>
                    <CardHeader className={cn("border-b", isConnected ? "bg-emerald-50" : "bg-muted/30")}>
                        <CardTitle className="text-sm font-black uppercase tracking-tighter flex items-center gap-2">
                            <PlayCircle className="size-4" />
                            2. Fluxo de Autorização
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 text-center space-y-4">
                        {!isConnected ? (
                            <>
                                <p className="text-sm text-muted-foreground">O acesso deve ser autorizado por um usuário administrador da Conta Azul.</p>
                                <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-base font-black shadow-xl" disabled={!hasCredentials} asChild>
                                    <a href={authUrl}><ExternalLink className="mr-2 size-5"/>Autorizar App Agora</a>
                                </Button>
                                <p className="text-[10px] text-amber-600 font-bold uppercase">Lembre-se: Use o e-mail @devportal.com para logar.</p>
                            </>
                        ) : (
                            <div className="py-4 space-y-4">
                                <div className="size-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg"><CheckCircle2 size={32} /></div>
                                <div>
                                    <h4 className="font-black text-emerald-900">Integração Ativa</h4>
                                    <p className="text-xs text-emerald-700">Tokens obtidos e renovação automática habilitada.</p>
                                </div>
                                <Button variant="outline" className="text-destructive border-destructive/20 hover:bg-red-50" onClick={handleDisconnect}>Encerrar Conexão</Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <TechnicalDossier />
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
            toast({ title: "Sucesso!", description: "Conta Azul conectada com sucesso." });
        } else if (status === 'error') {
            const msg = searchParams.get('message');
            toast({ variant: 'destructive', title: "Erro na Autorização", description: msg ? decodeURIComponent(msg) : "Verifique o Redirect URI." });
        }
    }, [searchParams, toast]);

    const summaryData = useMemo(() => {
        if (!financialTransactions) return { income: 0, expense: 0, balance: 0, chartData: [] };
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const now = new Date();
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            last6Months.push({ name: monthNames[d.getMonth()], month: d.getMonth(), year: d.getFullYear(), income: 0, expense: 0 });
        }
        let totalIncome = 0; let totalExpense = 0;
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
        return { income: totalIncome, expense: totalExpense, balance: totalIncome - totalExpense, chartData: last6Months };
    }, [financialTransactions]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-emerald-50 border-emerald-100">
              <CardHeader className="pb-2"><CardDescription className="text-emerald-700 text-[10px] font-bold">Entradas Totais</CardDescription><CardTitle className="text-xl">R$ {summaryData.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle></CardHeader>
          </Card>
          <Card className="bg-red-50 border-red-100">
              <CardHeader className="pb-2"><CardDescription className="text-red-700 text-[10px] font-bold">Saídas Totais</CardDescription><CardTitle className="text-xl">R$ {summaryData.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle></CardHeader>
          </Card>
          <Card className="bg-primary/5 border-primary/10 border-2">
              <CardHeader className="pb-2"><CardDescription className="text-primary text-[10px] font-bold">Saldo Consolidado</CardDescription><CardTitle className="text-xl font-black">R$ {summaryData.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle></CardHeader>
          </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="dashboard" className="rounded-lg font-bold"><LayoutDashboard className="size-4 mr-2" /> Dashboard</TabsTrigger>
          <TabsTrigger value="tithes" className="rounded-lg font-bold"><HeartHandshake className="size-4 mr-2" /> Dízimos</TabsTrigger>
          <TabsTrigger value="cashflow" className="rounded-lg font-bold"><TrendingUp className="size-4 mr-2" /> Fluxo</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg font-bold"><Settings className="size-4 mr-2" /> Integração</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6 animate-in fade-in-50">
            <Card>
                <CardHeader><CardTitle>Performance Financeira</CardTitle></CardHeader>
                <CardContent className="h-[350px]">
                    {isLoadingFinances ? <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div> : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={summaryData.chartData}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1}/><stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/></linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/><stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Legend />
                                <Area type="monotone" dataKey="income" name="Entradas" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="expense" name="Saídas" stroke="hsl(var(--chart-1))" fillOpacity={1} fill="url(#colorExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="tithes" className="mt-6"><TithesOfferingsManager /></TabsContent>
        <TabsContent value="cashflow" className="mt-6"><CashFlowManager /></TabsContent>
        <TabsContent value="settings" className="mt-6"><ContaAzulConnect /></TabsContent>
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

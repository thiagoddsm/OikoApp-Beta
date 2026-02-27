
'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, Key, Link as LinkIcon, ExternalLink, PlayCircle, 
  CheckCircle2, HardDriveDownload, DatabaseZap, Settings, FlaskConical,
  LogOut, Eye, EyeOff, Fingerprint, LayoutDashboard, HeartHandshake, TrendingUp, AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useDoc } from '@/firebase';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { doc, updateDoc } from 'firebase/firestore';
import { TithesOfferingsManager } from '@/components/finance/tithes-offerings-manager';
import { CashFlowManager } from '@/components/finance/cash-flow-manager';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

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

function IntegrationLaboratory({ lastError }: { lastError?: string }) {
    const { toast } = useToast();
    const [isTestingRead, setIsTestingRead] = useState(false);
    const [isTestingWrite, setIsTestingWrite] = useState(false);
    const [log, setLog] = useState<string[]>([]);

    const addLog = (msg: string) => {
        setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 15));
    };

    useEffect(() => {
        if (lastError) addLog(lastError);
    }, [lastError]);

    const handleReadTest = async () => {
        setIsTestingRead(true);
        addLog("Iniciando teste de leitura (Contas Financeiras)...");
        try {
            const res = await fetch('/api/finance/conta-azul/sync', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                const count = data.data.bankAccounts?.length || 0;
                addLog(`Sucesso! ${count} contas encontradas.`);
                toast({ title: "Leitura OK", description: "Conexão estabelecida com sucesso." });
            } else {
                throw new Error(data.error || "Erro na API");
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
        addLog("Iniciando teste de escrita (Contas a Receber)...");
        try {
            const res = await fetch('/api/finance/conta-azul/test-write', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                addLog(`Sucesso! Protocolo: ${data.data.protocolId}`);
                toast({ title: "Escrita OK", description: "Lançamento de teste gerado." });
            } else {
                const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
                addLog(`ERRO: ${errorMsg}`);
                throw new Error(errorMsg || "Erro na API");
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
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                    <FlaskConical className="size-4" /> Laboratório de Integração
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="outline" className="h-16 bg-white border-primary/20 hover:bg-primary/5 transition-all shadow-sm" onClick={handleReadTest} disabled={isTestingRead}>
                        {isTestingRead ? <Loader2 className="animate-spin mr-2" /> : <HardDriveDownload className="mr-2 size-5 text-primary" />}
                        <div className="text-left">
                            <p className="font-bold text-xs">1. Testar Leitura</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-black">BANCOS (V2)</p>
                        </div>
                    </Button>
                    <Button variant="outline" className="h-16 bg-white border-primary/20 hover:bg-primary/5 transition-all shadow-sm" onClick={handleWriteTest} disabled={isTestingWrite}>
                        {isTestingWrite ? <Loader2 className="animate-spin mr-2" /> : <DatabaseZap className="mr-2 size-5 text-primary" />}
                        <div className="text-left">
                            <p className="font-bold text-xs">2. Testar Escrita</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-black">LANÇAR R$ 1,00</p>
                        </div>
                    </Button>
                </div>
                <div className="bg-black/90 p-3 rounded-lg font-mono text-[10px] text-emerald-400 h-48 overflow-y-auto border border-white/10 shadow-2xl">
                    {log.length === 0 ? (
                        <p className="opacity-30 italic text-center py-10">Aguardando testes de conexão...</p>
                    ) : (
                        log.map((m, i) => <p key={i} className="mb-1 leading-tight border-b border-white/5 pb-1">{m}</p>)
                    )}
                </div>
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
  const [accessToken, setAccessToken] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [origin, setOrigin] = useState('');
  
  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (config) {
        setClientId(config.clientId || '');
        setClientSecret(config.clientSecret || '');
        setAccessToken(config.accessToken || '');
    }
  }, [config]);

  const handleSave = async () => {
    if (!configDocRef) return;
    setIsSaving(true);
    try {
        await updateDoc(configDocRef, { 
            clientId: clientId.trim(), 
            clientSecret: clientSecret.trim(),
            accessToken: accessToken.trim(),
            updatedAt: new Date().toISOString()
        });
        toast({ title: 'Configurações Salvas!', description: 'As credenciais foram atualizadas.' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Erro ao salvar' });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleDisconnect = async () => {
    if (!configDocRef) {
        console.error("Referência do documento não encontrada.");
        return;
    }
    
    if (confirmDisconnect) {
        setIsDisconnecting(true);
        console.log("Iniciando limpeza de tokens no Firestore...");
        try {
            await updateDoc(configDocRef, { 
                accessToken: '', 
                refreshToken: '', 
                expiresAt: 0, 
                lastError: 'Desconectado pelo usuário.',
                updatedAt: new Date().toISOString()
            });
            setConfirmDisconnect(false);
            toast({ title: 'Conexão Encerrada', description: 'Todos os tokens foram removidos.' });
        } catch (e: any) {
            console.error("Erro ao limpar tokens:", e);
            toast({ variant: 'destructive', title: 'Erro ao desconectar', description: e.message });
        } finally {
            setIsDisconnecting(false);
        }
    } else {
        console.log("Clique de confirmação ativado.");
        setConfirmDisconnect(true);
        setTimeout(() => setConfirmDisconnect(false), 5000);
    }
  };

  if (isLoadingConfig) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  const isConnected = !!config?.accessToken || !!config?.refreshToken;
  const redirectUri = `${origin}/api/finance/conta-azul/callback`;
  
  // Escopo corrigido conforme documentação oficial para dar permissão a todos os recursos
  const fullScope = 'read:vendas+write:vendas+read:clientes+write:clientes+read:produtos+write:produtos+read:financeiro+write:financeiro+read:notas_fiscais+read:contratos+write:contratos';
  const authUrl = `https://auth.contaazul.com/login?response_type=code&client_id=${clientId.trim()}&redirect_uri=${encodeURIComponent(redirectUri)}&state=oiko_auth&scope=${fullScope}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
            <Card className="shadow-lg border-2">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                        <Key className="size-4 text-primary" /> Credenciais da API
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Client ID</Label>
                        <Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="ID da aplicação" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Client Secret</Label>
                        <div className="relative">
                            <Input type={showSecret ? "text" : "password"} value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="••••••••" />
                            <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-10 w-10" onClick={() => setShowSecret(!showSecret)}>
                                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2 border-t pt-4">
                        <Label className="text-xs font-bold uppercase text-primary flex items-center gap-2">
                            <Fingerprint size={14} /> Access Token (Manual)
                        </Label>
                        <Input value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="Cole um token se necessário..." className="text-xs font-mono" />
                    </div>
                    <Button onClick={handleSave} disabled={isSaving} className="w-full font-bold">
                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                        Salvar Credenciais
                    </Button>
                </CardContent>
            </Card>
            <IntegrationLaboratory lastError={config?.lastError} />
        </div>

        <Card className={cn("shadow-lg border-2", isConnected ? "border-emerald-200" : "border-primary/20")}>
            <CardHeader className={cn("border-b", isConnected ? "bg-emerald-50" : "bg-muted/30")}>
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                    <PlayCircle className="size-4" /> Status da Autorização
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 text-center">
                {!isConnected ? (
                    <>
                        <div className="p-6 bg-muted/20 rounded-xl border border-dashed text-left space-y-3">
                            <p className="text-sm font-medium">Próximos Passos:</p>
                            <ol className="text-xs space-y-2 text-muted-foreground list-decimal pl-4">
                                <li>Insira o <strong>Client ID</strong> e <strong>Secret</strong> e salve.</li>
                                <li>Configure o <strong>Redirect URI</strong> no portal.</li>
                                <li>Clique abaixo para autorizar.</li>
                            </ol>
                        </div>
                        <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-black shadow-xl" asChild disabled={!clientId || !clientSecret}>
                            <a href={authUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 size-5"/>Conectar com Conta Azul</a>
                        </Button>
                    </>
                ) : (
                    <div className="py-8 space-y-4">
                        <div className="size-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><CheckCircle2 size={32} /></div>
                        <div>
                            <h4 className="font-black text-emerald-900">IBM Conectada</h4>
                            <p className="text-xs text-muted-foreground mt-1">O motor de sincronização está ativo.</p>
                        </div>
                        <Button 
                            variant="outline" 
                            className={cn(
                                "transition-all font-bold w-full max-w-xs", 
                                confirmDisconnect ? "bg-red-600 text-white border-red-600" : "text-destructive border-destructive/20 hover:bg-red-50"
                            )} 
                            onClick={handleDisconnect}
                            disabled={isDisconnecting}
                        >
                            {isDisconnecting ? <Loader2 className="animate-spin size-4 mr-2" /> : confirmDisconnect ? <AlertCircle className="size-4 mr-2" /> : <LogOut className="size-4 mr-2" />}
                            {confirmDisconnect ? "Clique para Confirmar" : "Encerrar Conexão"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}

function FinancePageContent() {
    const { financialTransactions } = useVolunteering();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('dashboard');

    useEffect(() => {
        const status = searchParams.get('status');
        if (status === 'connected') toast({ title: "Sucesso!", description: "Conta Azul conectada com permissões totais." });
        else if (status === 'error') toast({ variant: 'destructive', title: "Erro na Autorização", description: searchParams.get('message') || "Verifique as credenciais e escopos." });
    }, [searchParams, toast]);

    const summaryData = useMemo(() => {
        if (!financialTransactions) return { income: 0, expense: 0, balance: 0 };
        let totalIncome = 0; let totalExpense = 0;
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
          <Card className="bg-emerald-50 border-emerald-100"><CardHeader className="pb-2"><CardDescription className="text-emerald-700 text-[10px] font-bold uppercase">Entradas (Pagos)</CardDescription><CardTitle className="text-xl">R$ {summaryData.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle></CardHeader></Card>
          <Card className="bg-red-50 border-red-100"><CardHeader className="pb-2"><CardDescription className="text-red-700 text-[10px] font-bold uppercase">Saídas (Pagos)</CardDescription><CardTitle className="text-xl">R$ {summaryData.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle></CardHeader></Card>
          <Card className="bg-primary/5 border-primary/10 border-2"><CardHeader className="pb-2"><CardDescription className="text-primary text-[10px] font-bold uppercase">Saldo Atual</CardDescription><CardTitle className="text-xl font-black">R$ {summaryData.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle></CardHeader></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="dashboard" className="rounded-lg font-bold"><LayoutDashboard className="size-4 mr-2" /> Geral</TabsTrigger>
          <TabsTrigger value="tithes" className="rounded-lg font-bold"><HeartHandshake className="size-4 mr-2" /> Dízimos</TabsTrigger>
          <TabsTrigger value="cashflow" className="rounded-lg font-bold"><TrendingUp className="size-4 mr-2" /> Fluxo</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg font-bold"><Settings className="size-4 mr-2" /> Integração</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
            <Card><CardHeader><CardTitle>Indicadores de Performance</CardTitle></CardHeader><CardContent className="h-[300px] flex items-center justify-center italic text-muted-foreground">Gráficos de performance financeira em desenvolvimento.</CardContent></Card>
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
            <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>}>
                <FinancePageContent />
            </Suspense>
        </VolunteeringProvider>
    );
}

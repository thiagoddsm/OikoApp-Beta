'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, MessageSquare, ShieldCheck, Send, Settings2, 
    RefreshCw, CheckCircle2, XCircle, Zap, Copy, Info, 
    Smartphone, QrCode, CheckCircle, LogOut, MessageCircle
} from 'lucide-react';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, Timestamp, getDoc } from 'firebase/firestore';
import { sendTestWhatsAppMessage, getWhatsAppConfig } from '@/app/actions/whatsapp-actions';
import { useMembersData } from "@/hooks/useDomainData";
import { cn } from '@/lib/utils';

export default function NotificationSettingsPage() {
    const { toast } = useToast();
    const { firestore, user } = useFirebase();
    
    const { users: allMembers = [] } = useMembersData();

    // Config States
    const [serverUrl, setServerUrl] = useState('');
    const [instanceName, setInstanceName] = useState('');
    const [instanceKey, setInstanceKey] = useState('');
    const [evolutionUrl, setEvolutionUrl] = useState('');
    const [evolutionInstance, setEvolutionInstance] = useState('');
    const [evolutionKey, setEvolutionKey] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [enabled, setEnabled] = useState(true);
    
    // Automation States
    const [notifyWelcome, setNotifyWelcome] = useState(true);
    const [notifyEnrollment, setNotifyEnrollment] = useState(true);
    const [notifyJourney, setNotifyJourney] = useState(true);

    // Safety / Anti-Ban States
    const [delayMin, setDelayMin] = useState(20);
    const [delayMax, setDelayMax] = useState(45);
    const [microPauseFrequency, setMicroPauseFrequency] = useState(5);
    const [microPauseMin, setMicroPauseMin] = useState(30);
    const [microPauseMax, setMicroPauseMax] = useState(50);
    const [deepSleepFrequency, setDeepSleepFrequency] = useState(20);
    const [deepSleepMin, setDeepSleepMin] = useState(180);
    const [deepSleepMax, setDeepSleepMax] = useState(300);

    // Test States
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('Olá! Este é um teste do sistema Oiko Studio. 🚀');
    const [isTesting, setIsTesting] = useState(false);

    // Group Test States
    const [testGroupName, setTestGroupName] = useState('Grupo Teste Oiko');
    const [searchMemberQuery, setSearchMemberQuery] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [isCreatingTestGroup, setIsCreatingTestGroup] = useState(false);
    
    // UI States
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [instanceStatus, setInstanceStatus] = useState<any>(null);
    const [evolutionStatus, setEvolutionStatus] = useState<any>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isRefreshingEvolution, setIsRefreshingEvolution] = useState(false);
    const [isLoggingOutEvolution, setIsLoggingOutEvolution] = useState(false);
    const [isSyncingContacts, setIsSyncingContacts] = useState(false);

    const isConnected = instanceStatus?.parsedStatus === 'connected';
    const isEvolutionConnected = evolutionStatus?.parsedStatus === 'connected';

    const checkStatus = async () => {
        if (!instanceKey) {
            setInstanceStatus(null);
            return;
        }
        setIsRefreshing(true);
        try {
            const res = await fetch(`/api/notifications/instance?key=${instanceKey}&server=${encodeURIComponent(serverUrl)}&instance=${encodeURIComponent(instanceName)}`, { 
                cache: 'no-store' 
            });
            const data = await res.json();
            
            if (data.status === 'error' || data.error) {
                 setInstanceStatus((prev: any) => ({ ...prev, status: 'offline', message: data.message || data.error || 'Erro na API' }));
            } else {
                 setInstanceStatus((prev: any) => {
                     // The GET instance route doesn't return the QR code, but POST does.
                     // Preserve the previous QR code if we are still pairing.
                     const parsedStatus = data.parsedStatus;
                     const qr = parsedStatus === 'connected' ? null : (data.qr || data.instance?.qr || data.data?.qr || data.qrcode || prev?.qr);
                     return { ...data, qr, parsedStatus };
                 });
            }
        } catch (e) {
            setInstanceStatus({ status: 'offline', message: 'Erro de rede' });
        } finally { 
            setIsRefreshing(false); 
        }
    };

    const checkEvolutionStatus = async () => {
        if (!evolutionKey) {
            setEvolutionStatus(null);
            return;
        }
        try {
            const res = await fetch(`/api/notifications/instance?key=${evolutionKey}&server=${encodeURIComponent(evolutionUrl)}&instance=${encodeURIComponent(evolutionInstance)}`, { 
                cache: 'no-store' 
            });
            const data = await res.json();
            
            if (data.status === 'error' || data.error) {
                 setEvolutionStatus((prev: any) => ({ ...prev, status: 'offline', message: data.message || data.error || 'Erro na API' }));
            } else {
                 setEvolutionStatus((prev: any) => {
                     const parsedStatus = data.parsedStatus;
                     const qr = parsedStatus === 'connected' ? null : (data.qr || data.instance?.qr || data.data?.qr || data.qrcode || prev?.qr);
                     return { ...data, qr, parsedStatus };
                 });
            }
        } catch (e) {
            setEvolutionStatus({ status: 'offline', message: 'Erro de rede' });
        } finally {
            setIsRefreshingEvolution(false);
        }
    };

    // Auto-polling when in pairing mode
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (instanceStatus?.parsedStatus === 'pairing' && !isConnected) {
            interval = setInterval(() => {
                checkStatus();
            }, 5000); // Check every 5 seconds
        }
        if (evolutionStatus?.parsedStatus === 'pairing' && !isEvolutionConnected) {
            interval = setInterval(() => {
                checkEvolutionStatus();
            }, 5000); // Check every 5 seconds
        }
        return () => { if (interval) clearInterval(interval); };
    }, [instanceStatus?.parsedStatus, isConnected, evolutionStatus?.parsedStatus, isEvolutionConnected]);

    useEffect(() => {
        async function load() {
            if (!firestore) return;
            setIsLoading(true);
            try {
                const configRef = doc(firestore, 'config', 'notifications');
                const configSnap = await getDoc(configRef);
                
                if (configSnap.exists()) {
                    const config = configSnap.data();
                    setServerUrl(config.serverUrl || 'https://us.api-wa.me');
                    setInstanceName(config.instanceName || '');
                    setInstanceKey(config.instanceKey || '');
                    setEvolutionUrl(config.evolutionUrl || 'https://api.ibmanha.com.br');
                    setEvolutionInstance(config.evolutionInstance || 'IBM');
                    setEvolutionKey(config.evolutionKey || '');
                    // Forçamos o webhook para o domínio atual para corrigir o problema de localhost salvo
                    const currentWebhook = typeof window !== 'undefined' ? `${window.location.origin}/api/notifications/webhook` : '';
                    setWebhookUrl(currentWebhook);
                    setEnabled(config.enabled !== false);
                    setNotifyWelcome(config.notifyWelcome !== false);
                    setNotifyEnrollment(config.notifyEnrollment !== false);
                    setNotifyJourney(config.notifyJourney !== false);
                    
                    // Anti-ban settings
                    setDelayMin(config.delayMin !== undefined ? Number(config.delayMin) : 20);
                    setDelayMax(config.delayMax !== undefined ? Number(config.delayMax) : 45);
                    setMicroPauseFrequency(config.microPauseFrequency !== undefined ? Number(config.microPauseFrequency) : 5);
                    setMicroPauseMin(config.microPauseMin !== undefined ? Number(config.microPauseMin) : 30);
                    setMicroPauseMax(config.microPauseMax !== undefined ? Number(config.microPauseMax) : 50);
                    setDeepSleepFrequency(config.deepSleepFrequency !== undefined ? Number(config.deepSleepFrequency) : 20);
                    setDeepSleepMin(config.deepSleepMin !== undefined ? Number(config.deepSleepMin) : 180);
                    setDeepSleepMax(config.deepSleepMax !== undefined ? Number(config.deepSleepMax) : 300);
                } else {
                    // Default values if no config exists yet
                    setServerUrl('https://us.api-wa.me');
                }
            } catch (error) {
                console.error("Error loading config:", error);
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, [firestore]);

    // Check status when instance key is loaded
    useEffect(() => {
        if (instanceKey && !isLoading) {
            checkStatus();
        }
        if (evolutionKey && !isLoading) {
            checkEvolutionStatus();
        }
    }, [instanceKey, evolutionKey, isLoading]);

    const handleSaveConfig = async () => {
        if (!firestore) return;
        setIsSaving(true);
        
        try {
            const configRef = doc(firestore, 'config', 'notifications');
            await setDocumentNonBlocking(configRef, {
                serverUrl,
                instanceName,
                instanceKey,
                evolutionUrl,
                evolutionInstance,
                evolutionKey,
                enabled,
                webhookUrl,
                notifyWelcome,
                notifyEnrollment,
                notifyJourney,
                delayMin,
                delayMax,
                microPauseFrequency,
                microPauseMin,
                microPauseMax,
                deepSleepFrequency,
                deepSleepMin,
                deepSleepMax,
                updatedAt: Timestamp.now()
            }, { merge: true });

            toast({ title: "Configurações Salvas", description: "O gateway de WhatsApp foi atualizado com sucesso." });
            checkStatus();
            checkEvolutionStatus();
        } catch (error: any) {
            toast({ title: "Erro ao Salvar", description: error.message || "Erro de permissão no Firebase.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleConnect = async () => {
        if (!instanceKey) return;
        setIsRefreshing(true);
        try {
            // Passamos as chaves no corpo do POST
            const res = await fetch('/api/notifications/instance', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: instanceKey, server: serverUrl, instance: instanceName }),
                cache: 'no-store' 
            });
            const data = await res.json();
            
            if (data.status === 'error' || data.error) {
                toast({ variant: 'destructive', title: "Erro na API", description: data.message || data.error });
            } else {
                setInstanceStatus((prev: any) => {
                    const qr = data.qr || data.qrcode || prev?.qr;
                    return { ...data, qr, parsedStatus: data.parsedStatus || 'pairing' };
                });
                toast({ title: "Comando Enviado", description: "Escaneie o QR Code para conectar." });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao conectar" });
        } finally { setIsRefreshing(false); }
    };

    const handleEvolutionConnect = async () => {
        if (!evolutionKey) return;
        setIsRefreshingEvolution(true);
        try {
            const res = await fetch('/api/notifications/instance', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: evolutionKey, server: evolutionUrl, instance: evolutionInstance }),
                cache: 'no-store' 
            });
            const data = await res.json();
            
            if (data.status === 'error' || data.error) {
                toast({ title: "Erro ao Conectar Evolution", description: data.message || data.error, variant: "destructive" });
            } else {
                setEvolutionStatus((prev: any) => {
                    const parsedStatus = data.parsedStatus || (data?.instance?.state === 'open' ? 'connected' : 'pairing');
                    const qr = parsedStatus === 'connected' ? null : (data.qr || data.instance?.qr || data.data?.qr || data.qrcode || prev?.qr);
                    return { ...data, qr, parsedStatus };
                });
                toast({ title: "Comando Enviado", description: "Escaneie o QR Code para conectar a Evolution API." });
            }
        } catch (error: any) {
            toast({ title: "Erro na Conexão Evolution", description: error.message || "Erro desconhecido", variant: "destructive" });
        } finally {
            setIsRefreshingEvolution(false);
        }
    };

    const handleTestMessage = async () => {
        if (!testPhone) {
            toast({ title: "Número necessário", description: "Digite um número de telefone para o teste.", variant: "destructive" });
            return;
        }

        setIsTesting(true);
        const result = await sendTestWhatsAppMessage(testPhone, testMessage, {
            serverUrl,
            instanceName,
            instanceKey
        });

        if (result.success) {
            toast({ title: "Mensagem Enviada!", description: "Verifique o seu WhatsApp." });
            checkStatus();
            checkEvolutionStatus();
        } else {
            toast({ title: "Falha no Envio", description: result.error, variant: "destructive" });
        }
        setIsTesting(false);
    };

    const handleCreateTestGroup = async () => {
        if (!testGroupName.trim()) {
            toast({ title: "Nome do grupo necessário", description: "Escreva um nome para o grupo de teste.", variant: "destructive" });
            return;
        }

        setIsCreatingTestGroup(true);
        try {
            // Resolve selected member phone numbers / jids
            const participantNumbers: string[] = [];
            selectedMembers.forEach(mId => {
                const u = allMembers.find(usr => usr.id === mId);
                if (u) {
                    const phone = u.phone || u.phoneNumber || '';
                    if (u.lid) {
                        participantNumbers.push(u.lid);
                    } else if (phone) {
                        participantNumbers.push(phone);
                    }
                }
            });

            // Auto-include current logged user to ensure they are added to the group immediately
            if (user) {
                const me = allMembers.find(usr => usr.id === user.uid);
                if (me) {
                    const myPhone = me.phone || me.phoneNumber || '';
                    const myJid = me.lid || myPhone;
                    if (myJid && !participantNumbers.includes(myJid)) {
                        participantNumbers.push(myJid);
                    }
                }
            }

            console.log("Sending group creation request with participants:", participantNumbers);

            const res = await fetch('/api/notifications/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupName: testGroupName,
                    participants: participantNumbers
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast({
                    title: "Grupo de Teste Criado!",
                    description: `Grupo "${testGroupName}" criado com sucesso no WhatsApp (JID: ${data.jid || 'Gerado'}).`
                });
                setSelectedMembers([]);
            } else {
                toast({
                    variant: "destructive",
                    title: "Falha ao criar grupo",
                    description: data.error || "A instância do WhatsApp rejeitou os participantes informados."
                });
            }
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Erro de conexão",
                description: err.message || "Não foi possível conectar à API de grupos."
            });
        } finally {
            setIsCreatingTestGroup(false);
        }
    };

    const handleCopyWebhook = () => {
        navigator.clipboard.writeText(webhookUrl);
        toast({ title: "Copiado!", description: "Cole esta URL no portal api-wa.me" });
    };

    const handleLogout = async () => {
        if (!confirm('Desconectar o WhatsApp desta instância? Você precisará escanear o QR Code novamente para reconectar.')) return;
        setIsLoggingOut(true);
        try {
            const params = new URLSearchParams({ key: instanceKey });
            if (serverUrl) params.set('server', serverUrl);
            if (instanceName) params.set('instance', instanceName);
            const res = await fetch(`/api/notifications/instance?${params.toString()}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.error) {
                toast({ variant: 'destructive', title: 'Erro ao desconectar', description: data.error });
            } else {
                toast({ title: 'Desconectado!', description: 'A sessão do WhatsApp foi encerrada.' });
                setInstanceStatus(null);
            }
        } catch (e) {
            toast({ variant: 'destructive', title: 'Erro ao desconectar' });
        } finally {
            setIsLoggingOut(false);
        }
    };

    const handleEvolutionLogout = async () => {
        if (!evolutionKey) return;
        setIsLoggingOutEvolution(true);
        try {
            const res = await fetch(`/api/notifications/instance?key=${evolutionKey}&server=${encodeURIComponent(evolutionUrl)}&instance=${encodeURIComponent(evolutionInstance)}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success || data.error) {
                toast({ title: "Evolution Desconectado", description: "O gateway secundário foi desligado." });
                setEvolutionStatus(null);
            }
        } catch (e) {
            toast({ variant: 'destructive', title: 'Erro ao desconectar Evolution' });
        } finally {
            setIsLoggingOutEvolution(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium animate-pulse">Carregando configurações de notificação...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Configurações de Notificação</h1>
                    <p className="text-muted-foreground mt-1">Gerencie seu gateway de WhatsApp e automações de mensagens.</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm",
                        isConnected ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                        instanceStatus?.status === 'offline' ? "bg-red-50 text-red-700 border-red-200" : 
                        "bg-slate-50 text-slate-500 border-slate-200"
                    )}>
                        <div className={cn("size-2 rounded-full animate-pulse", 
                            isConnected ? "bg-emerald-500" : instanceStatus?.status === 'offline' ? "bg-red-500" : "bg-slate-400"
                        )} />
                        WAME: {isConnected ? "Ativo" : instanceStatus?.status === 'offline' ? "Desconectado" : "Desconhecido"}
                    </div>
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm",
                        isEvolutionConnected ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                        evolutionStatus?.status === 'offline' ? "bg-red-50 text-red-700 border-red-200" : 
                        "bg-slate-50 text-slate-500 border-slate-200"
                    )}>
                        <div className={cn("size-2 rounded-full animate-pulse", 
                            isEvolutionConnected ? "bg-emerald-500" : evolutionStatus?.status === 'offline' ? "bg-red-500" : "bg-slate-400"
                        )} />
                        Evolution: {isEvolutionConnected ? "Ativo" : evolutionStatus?.status === 'offline' ? "Desconectado" : "Desconhecido"}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-slate-900">
                {/* Left Column: API Settings */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="border-2 shadow-md">
                        <CardHeader className="bg-slate-50/50">
                            <div className="flex items-center gap-2 text-primary">
                                <Settings2 className="size-5" />
                                <CardTitle>Configuração do Gateway</CardTitle>
                            </div>
                            <CardDescription>Insira as credenciais do seu servidor api-wa.me para habilitar o envio.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="serverUrl" className="text-xs font-black uppercase text-muted-foreground">URL do Servidor</Label>
                                    <Input 
                                        id="serverUrl" 
                                        value={serverUrl} 
                                        onChange={(e) => setServerUrl(e.target.value)} 
                                        placeholder="https://us.api-wa.me"
                                        className="h-11 font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="instanceKey" className="text-xs font-black uppercase text-muted-foreground">Instance Key (Chave)</Label>
                                    <Input 
                                        id="instanceKey" 
                                        type="password"
                                        value={instanceKey} 
                                        onChange={(e) => setInstanceKey(e.target.value)} 
                                        placeholder="2836x..."
                                        className="h-11 font-medium"
                                    />
                                </div>
                                <div className="space-y-2 pt-4 border-t border-dashed">
                                    <Label className="text-xs font-black uppercase text-muted-foreground">URL do Webhook do Sistema</Label>
                                    <div className="flex gap-2">
                                        <Input value={webhookUrl} readOnly className="font-mono text-xs h-11 bg-muted/30 border-dashed" />
                                        <Button onClick={handleCopyWebhook} variant="outline" size="icon" className="h-11 w-11 shrink-0"><Copy size={16}/></Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                                        <Info size={10} /> Copie esta URL e cole nos campos de Webhook do portal api-wa.me e Evolution API para capturar respostas.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-2 shadow-md">
                        <CardHeader className="bg-slate-50/50">
                            <div className="flex items-center gap-2 text-primary">
                                <Zap className="size-5" />
                                <CardTitle>Gateway Secundário (Evolution API)</CardTitle>
                            </div>
                            <CardDescription>Usado exclusivamente para envio de Enquetes e Contatos.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="evolutionUrl" className="text-xs font-black uppercase text-muted-foreground">URL da Evolution API</Label>
                                    <Input 
                                        id="evolutionUrl" 
                                        value={evolutionUrl} 
                                        onChange={(e) => setEvolutionUrl(e.target.value)} 
                                        placeholder="https://api.ibmanha.com.br"
                                        className="h-11 font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="evolutionInstance" className="text-xs font-black uppercase text-muted-foreground">Nome da Instância</Label>
                                    <Input 
                                        id="evolutionInstance" 
                                        value={evolutionInstance} 
                                        onChange={(e) => setEvolutionInstance(e.target.value)} 
                                        placeholder="Ex: IBM"
                                        className="h-11 font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="evolutionKey" className="text-xs font-black uppercase text-muted-foreground">Global API Key</Label>
                                    <Input 
                                        id="evolutionKey" 
                                        type="password"
                                        value={evolutionKey} 
                                        onChange={(e) => setEvolutionKey(e.target.value)} 
                                        placeholder="Sua chave secreta..."
                                        className="h-11 font-medium"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10 mt-6">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold">Ativar Disparos</Label>
                                    <p className="text-xs text-muted-foreground">Habilita ou desabilita todos os disparos automáticos.</p>
                                </div>
                                <Switch checked={enabled} onCheckedChange={setEnabled} />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button 
                                    onClick={handleSaveConfig} 
                                    disabled={isSaving}
                                    className="flex-1 font-bold h-11"
                                >
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                    Salvar Alterações
                                </Button>
                                <Button 
                                     variant="outline" 
                                     onClick={async () => {
                                         const activeKey = evolutionKey || instanceKey;
                                         const activeServer = evolutionUrl || serverUrl;
                                         const activeInstance = evolutionInstance || instanceName;
                                         if (!activeKey) return;
                                         setIsSyncingContacts(true);
                                         try {
                                             const res = await fetch(`/api/notifications/contacts?key=${activeKey}&server=${encodeURIComponent(activeServer)}&instance=${encodeURIComponent(activeInstance)}`);
                                             const data = await res.json();
                                             if (data.success || data.count !== undefined) {
                                                 toast({ title: "Sincronização Concluída", description: `${data.count || 0} contatos importados.` });
                                             } else {
                                                 toast({ variant: 'destructive', title: "Erro na Sincronização", description: data.error });
                                             }
                                         } catch (e) {
                                             toast({ variant: 'destructive', title: "Erro ao sincronizar" });
                                         } finally { setIsSyncingContacts(false); }
                                     }} 
                                     disabled={isSyncingContacts || (!evolutionKey && !instanceKey)} 
                                     className="gap-2 h-11 font-bold"
                                 >
                                    <RefreshCw className={cn("size-4", isSyncingContacts && "animate-spin")} />
                                    {isSyncingContacts ? 'Sincronizando...' : 'Sincronizar Contatos'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Anti-Ban Safety Parameters */}
                    <Card className="border-2 shadow-md">
                        <CardHeader className="bg-slate-50/50">
                            <div className="flex items-center gap-2 text-primary">
                                <ShieldCheck className="size-5" />
                                <CardTitle>Parâmetros de Segurança Anti-Ban</CardTitle>
                            </div>
                            <CardDescription>
                                Ajuste os intervalos de envio de mensagens para simular o comportamento humano e mitigar riscos de bloqueio.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6 text-slate-900">
                            <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">1. Atraso Base entre Mensagens</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="delayMin" className="text-[10px] font-black uppercase text-muted-foreground">Mínimo (segundos)</Label>
                                        <Input 
                                            id="delayMin" 
                                            type="number" 
                                            min={5} 
                                            value={delayMin} 
                                            onChange={(e) => setDelayMin(Number(e.target.value))} 
                                            className="h-10 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="delayMax" className="text-[10px] font-black uppercase text-muted-foreground">Máximo (segundos)</Label>
                                        <Input 
                                            id="delayMax" 
                                            type="number" 
                                            min={5} 
                                            value={delayMax} 
                                            onChange={(e) => setDelayMax(Number(e.target.value))} 
                                            className="h-10 font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 border-t pt-4">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">2. Micro-Pausas (Cooldown Curto)</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="microPauseFrequency" className="text-[10px] font-black uppercase text-muted-foreground">Frequência (mensagens)</Label>
                                        <Input 
                                            id="microPauseFrequency" 
                                            type="number" 
                                            min={1} 
                                            value={microPauseFrequency} 
                                            onChange={(e) => setMicroPauseFrequency(Number(e.target.value))} 
                                            className="h-10 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="microPauseMin" className="text-[10px] font-black uppercase text-muted-foreground">Pausa Mín (segundos)</Label>
                                        <Input 
                                            id="microPauseMin" 
                                            type="number" 
                                            min={5} 
                                            value={microPauseMin} 
                                            onChange={(e) => setMicroPauseMin(Number(e.target.value))} 
                                            className="h-10 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="microPauseMax" className="text-[10px] font-black uppercase text-muted-foreground">Pausa Máx (segundos)</Label>
                                        <Input 
                                            id="microPauseMax" 
                                            type="number" 
                                            min={5} 
                                            value={microPauseMax} 
                                            onChange={(e) => setMicroPauseMax(Number(e.target.value))} 
                                            className="h-10 font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 border-t pt-4">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">3. Deep Sleep (Cooldown Longo)</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="deepSleepFrequency" className="text-[10px] font-black uppercase text-muted-foreground">Frequência (mensagens)</Label>
                                        <Input 
                                            id="deepSleepFrequency" 
                                            type="number" 
                                            min={1} 
                                            value={deepSleepFrequency} 
                                            onChange={(e) => setDeepSleepFrequency(Number(e.target.value))} 
                                            className="h-10 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="deepSleepMin" className="text-[10px] font-black uppercase text-muted-foreground">Pausa Mín (segundos)</Label>
                                        <Input 
                                            id="deepSleepMin" 
                                            type="number" 
                                            min={10} 
                                            value={deepSleepMin} 
                                            onChange={(e) => setDeepSleepMin(Number(e.target.value))} 
                                            className="h-10 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="deepSleepMax" className="text-[10px] font-black uppercase text-muted-foreground">Pausa Máx (segundos)</Label>
                                        <Input 
                                            id="deepSleepMax" 
                                            type="number" 
                                            min={10} 
                                            value={deepSleepMax} 
                                            onChange={(e) => setDeepSleepMax(Number(e.target.value))} 
                                            className="h-10 font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Automation Rules */}
                    <Card className="border-2 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2 text-primary">
                                <Zap className="size-5" />
                                <CardTitle>Automações Inteligentes</CardTitle>
                            </div>
                            <CardDescription>Defina quais eventos devem disparar mensagens automáticas.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-0">
                            {[
                                { 
                                    id: 'welcome', 
                                    title: 'Mensagem de Boas-vindas', 
                                    desc: 'Envia para novos membros cadastrados no sistema.',
                                    checked: notifyWelcome,
                                    setter: setNotifyWelcome
                                },
                                { 
                                    id: 'enrollment', 
                                    title: 'Confirmação de Matrícula', 
                                    desc: 'Envia quando um aluno é inserido em uma turma.',
                                    checked: notifyEnrollment,
                                    setter: setNotifyEnrollment
                                },
                                { 
                                    id: 'journey', 
                                    title: 'Avanço na Jornada', 
                                    desc: 'Notifica quando o membro muda de fase na trilha IBM.',
                                    checked: notifyJourney,
                                    setter: setNotifyJourney
                                }
                            ].map((item, idx) => (
                                <div key={item.id} className={cn(
                                    "flex items-center justify-between py-4",
                                    idx !== 2 && "border-b border-slate-100"
                                )}>
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold">{item.title}</Label>
                                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                                    </div>
                                    <Switch checked={item.checked} onCheckedChange={item.setter} />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Connection & Testing */}
                <div className="space-y-8">
                    {/* Status Card WAME */}
                    <Card className={cn(
                        "border-2 shadow-lg",
                        isConnected ? "border-emerald-200 bg-emerald-50/30" : 
                        instanceStatus?.parsedStatus === 'pairing' ? "border-amber-200 bg-amber-50/30" :
                        "border-slate-200 bg-slate-50/30"
                    )}>
                        <CardHeader className="border-b bg-white/50">
                            <CardTitle className="text-xs font-black uppercase flex items-center gap-2">Status do Gateway (WAME)</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-8 flex flex-col items-center justify-center text-center min-h-[250px]">
                            {isRefreshing ? <Loader2 className="animate-spin size-8 text-primary opacity-40" /> : 
                            isConnected ? (
                                <div className="space-y-4">
                                    <div className="size-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-200"><CheckCircle size={32} /></div>
                                    <div>
                                        <h4 className="font-black text-emerald-900 uppercase">Gateway Conectado</h4>
                                        <p className="text-[10px] text-emerald-700 font-bold mt-1">Sua instância está pronta para uso.</p>
                                    </div>
                                    <div className="flex gap-2 justify-center">
                                        <Button size="sm" variant="ghost" onClick={checkStatus} className="text-[10px] font-black uppercase tracking-widest text-emerald-800">
                                            <RefreshCw className="size-3 mr-2" /> Sincronizar
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            onClick={handleLogout} 
                                            disabled={isLoggingOut}
                                            className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            {isLoggingOut 
                                                ? <Loader2 className="size-3 mr-2 animate-spin" /> 
                                                : <LogOut className="size-3 mr-2" />} 
                                            Desconectar
                                        </Button>
                                    </div>
                                </div>
                            ) : instanceStatus?.parsedStatus === 'pairing' && instanceStatus?.qr ? (
                                <div className="space-y-4">
                                    <div className="bg-white p-3 border-2 border-primary/20 rounded-2xl shadow-md inline-block">
                                        <img 
                                            src={instanceStatus.qr.startsWith('data:image') ? instanceStatus.qr : `data:image/png;base64,${instanceStatus.qr}`} 
                                            alt="QR Code" 
                                            className="w-44 h-44" 
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-primary uppercase animate-pulse">Escaneie o QR Code</p>
                                        <p className="text-[10px] text-muted-foreground mt-1 px-4">Abra o WhatsApp {'>'} Configurações {'>'} Dispositivos Conectados</p>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={checkStatus} className="text-[10px] font-black uppercase tracking-widest w-full"><RefreshCw className="size-3 mr-2" /> Já escaneei</Button>
                                </div>
                            ) : (
                                <div className="space-y-4 opacity-70">
                                    <Smartphone size={48} className="mx-auto text-slate-400" />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-600">Desconectado</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">Gere um QR Code para conectar seu número.</p>
                                    </div>
                                    <div className="flex gap-2 justify-center pt-2">
                                        <Button size="sm" variant="default" onClick={handleConnect} className="text-[10px] font-black uppercase tracking-widest">
                                            <QrCode className="size-3 mr-2" /> Gerar QR Code
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={checkStatus} className="text-[10px] font-black uppercase tracking-widest"><RefreshCw className="size-3" /></Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Status Card Evolution */}
                    <Card className={cn(
                        "border-2 shadow-lg",
                        isEvolutionConnected ? "border-emerald-200 bg-emerald-50/30" : 
                        evolutionStatus?.parsedStatus === 'pairing' ? "border-amber-200 bg-amber-50/30" :
                        "border-slate-200 bg-slate-50/30"
                    )}>
                        <CardHeader className="border-b bg-white/50">
                            <CardTitle className="text-xs font-black uppercase flex items-center gap-2">Status do Gateway (Evolution)</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-8 flex flex-col items-center justify-center text-center min-h-[250px]">
                            {isRefreshingEvolution ? <Loader2 className="animate-spin size-8 text-primary opacity-40" /> : 
                            isEvolutionConnected ? (
                                <div className="space-y-4">
                                    <div className="size-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-200"><CheckCircle size={32} /></div>
                                    <div>
                                        <h4 className="font-black text-emerald-900 uppercase">Evolution Conectado</h4>
                                        <p className="text-[10px] text-emerald-700 font-bold mt-1">Gateway secundário pronto.</p>
                                    </div>
                                    <div className="flex gap-2 justify-center">
                                        <Button size="sm" variant="ghost" onClick={checkEvolutionStatus} className="text-[10px] font-black uppercase tracking-widest text-emerald-800">
                                            <RefreshCw className="size-3 mr-2" /> Sincronizar
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            onClick={handleEvolutionLogout} 
                                            disabled={isLoggingOutEvolution}
                                            className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            {isLoggingOutEvolution 
                                                ? <Loader2 className="size-3 mr-2 animate-spin" /> 
                                                : <LogOut className="size-3 mr-2" />} 
                                            Desconectar
                                        </Button>
                                    </div>
                                </div>
                            ) : evolutionStatus?.parsedStatus === 'pairing' && evolutionStatus?.qr ? (
                                <div className="space-y-4">
                                    <div className="bg-white p-3 border-2 border-primary/20 rounded-2xl shadow-md inline-block">
                                        <img 
                                            src={evolutionStatus.qr.startsWith('data:image') ? evolutionStatus.qr : `data:image/png;base64,${evolutionStatus.qr}`} 
                                            alt="QR Code Evolution" 
                                            className="w-44 h-44" 
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-primary uppercase animate-pulse">Escaneie o QR Code</p>
                                        <p className="text-[10px] text-muted-foreground mt-1 px-4">Abra o WhatsApp {'>'} Configurações {'>'} Dispositivos Conectados</p>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={checkEvolutionStatus} className="text-[10px] font-black uppercase tracking-widest w-full"><RefreshCw className="size-3 mr-2" /> Já escaneei</Button>
                                </div>
                            ) : (
                                <div className="space-y-4 opacity-70">
                                    <Smartphone size={48} className="mx-auto text-slate-400" />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-600">Desconectado</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">Gere o QR Code da Evolution API.</p>
                                    </div>
                                    <div className="flex gap-2 justify-center pt-2">
                                        <Button size="sm" variant="default" onClick={handleEvolutionConnect} className="text-[10px] font-black uppercase tracking-widest">
                                            <QrCode className="size-3 mr-2" /> Gerar QR Code
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={checkEvolutionStatus} className="text-[10px] font-black uppercase tracking-widest"><RefreshCw className="size-3" /></Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Test Card */}
                    <Card className="border-2 border-primary/20 shadow-md">
                        <CardHeader>
                            <div className="flex items-center gap-2 text-primary">
                                <Send className="size-5" />
                                <CardTitle>Mensagem de Teste</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground">Destinatário</Label>
                                <Input 
                                    value={testPhone} 
                                    onChange={(e) => setTestPhone(e.target.value)} 
                                    placeholder="21999999999"
                                    className="h-10"
                                />
                            </div>
                            <Button 
                                onClick={handleTestMessage} 
                                disabled={isTesting || !instanceKey}
                                className="w-full font-black uppercase h-10"
                                variant="outline"
                            >
                                {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Enviar Teste"}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Grupo de Teste Card */}
                    <Card className="border-2 border-primary/20 shadow-md">
                        <CardHeader>
                            <div className="flex items-center gap-2 text-primary">
                                <MessageCircle className="size-5" />
                                <CardTitle>Criar Grupo de Teste</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="testGroupName" className="text-[10px] font-black uppercase text-muted-foreground">Nome do Grupo</Label>
                                <Input 
                                    id="testGroupName"
                                    value={testGroupName} 
                                    onChange={(e) => setTestGroupName(e.target.value)} 
                                    placeholder="Ex: Grupo Teste Liderança"
                                    className="h-10 font-bold"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground flex justify-between">
                                    <span>Selecionar Membros ({selectedMembers.length} selecionados)</span>
                                </Label>
                                <Input 
                                    value={searchMemberQuery} 
                                    onChange={(e) => setSearchMemberQuery(e.target.value)} 
                                    placeholder="Buscar membro..."
                                    className="h-9 text-xs"
                                />
                                
                                <div className="border rounded-lg max-h-48 overflow-y-auto divide-y bg-white">
                                    {allMembers
                                        .filter(m => {
                                            if (!searchMemberQuery.trim()) return true;
                                            return m.name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(
                                                searchMemberQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                                            );
                                        })
                                        .slice(0, 50)
                                        .map(member => {
                                            const isSelected = selectedMembers.includes(member.id);
                                            const phone = member.phone || member.phoneNumber || 'Sem telefone';
                                            return (
                                                <div 
                                                    key={member.id} 
                                                    onClick={() => {
                                                        setSelectedMembers(prev => 
                                                            isSelected ? prev.filter(id => id !== member.id) : [...prev, member.id]
                                                        );
                                                    }}
                                                    className={cn(
                                                        "flex items-center justify-between p-2.5 text-xs cursor-pointer hover:bg-slate-50 transition-colors",
                                                        isSelected && "bg-primary/5"
                                                    )}
                                                >
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{member.name}</p>
                                                        <p className="text-[10px] text-muted-foreground font-mono">{phone}</p>
                                                    </div>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isSelected}
                                                        onChange={() => {}}
                                                        className="rounded border-slate-300 text-primary focus:ring-primary size-3.5"
                                                    />
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            <Button 
                                onClick={handleCreateTestGroup} 
                                disabled={isCreatingTestGroup || !instanceKey || selectedMembers.length === 0}
                                className="w-full font-black uppercase h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {isCreatingTestGroup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Criar Grupo"}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Help Card */}
                    <Card className="border shadow-sm bg-slate-50 border-slate-200">
                        <CardContent className="pt-6 space-y-4">
                            <h4 className="text-sm font-black uppercase tracking-widest text-slate-700">Dicas Úteis</h4>
                            <ul className="space-y-3">
                                {[
                                    { icon: <CheckCircle2 className="size-4 text-emerald-500" />, text: "Use números com DDD e sem o 55." },
                                    { icon: <CheckCircle2 className="size-4 text-emerald-500" />, text: "Cole o Webhook no portal da api-wa.me para receber respostas." },
                                    { icon: <XCircle className="size-4 text-red-500" />, text: "Se o QR Code não carregar, verifique a Instance Key." }
                                ].map((tip, i) => (
                                    <li key={i} className="flex items-start gap-3 text-[11px] text-muted-foreground leading-tight">
                                        <span className="shrink-0 mt-0.5">{tip.icon}</span>
                                        {tip.text}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

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
    Smartphone, QrCode, CheckCircle
} from 'lucide-react';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, Timestamp, getDoc } from 'firebase/firestore';
import { sendTestWhatsAppMessage, getWhatsAppConfig } from '@/app/actions/whatsapp-actions';
import { cn } from '@/lib/utils';

export default function NotificationSettingsPage() {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    
    // Config States
    const [serverUrl, setServerUrl] = useState('');
    const [instanceKey, setInstanceKey] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [enabled, setEnabled] = useState(true);
    
    // Automation States
    const [notifyWelcome, setNotifyWelcome] = useState(true);
    const [notifyEnrollment, setNotifyEnrollment] = useState(true);
    const [notifyJourney, setNotifyJourney] = useState(true);

    // Test States
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('Olá! Este é um teste do sistema Oiko Studio. 🚀');
    const [isTesting, setIsTesting] = useState(false);
    
    // UI States
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [instanceStatus, setInstanceStatus] = useState<any>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const isConnected = instanceStatus?.parsedStatus === 'connected';

    const checkStatus = async () => {
        if (!instanceKey) {
            setInstanceStatus(null);
            return;
        }
        setIsRefreshing(true);
        try {
            const res = await fetch(`/api/notifications/instance?key=${instanceKey}&server=${encodeURIComponent(serverUrl)}`, { 
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

    // Auto-polling when in pairing mode
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (instanceStatus?.parsedStatus === 'pairing' && !isConnected) {
            interval = setInterval(() => {
                checkStatus();
            }, 5000); // Check every 5 seconds
        }
        return () => { if (interval) clearInterval(interval); };
    }, [instanceStatus?.parsedStatus, isConnected]);

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
                    setInstanceKey(config.instanceKey || '');
                    // Forçamos o webhook para o domínio atual para corrigir o problema de localhost salvo
                    const currentWebhook = typeof window !== 'undefined' ? `${window.location.origin}/api/notifications/webhook` : '';
                    setWebhookUrl(currentWebhook);
                    setEnabled(config.enabled !== false);
                    setNotifyWelcome(config.notifyWelcome !== false);
                    setNotifyEnrollment(config.notifyEnrollment !== false);
                    setNotifyJourney(config.notifyJourney !== false);
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
    }, [instanceKey, isLoading]);

    const handleSaveConfig = async () => {
        if (!firestore) return;
        setIsSaving(true);
        
        try {
            const configRef = doc(firestore, 'config', 'notifications');
            await setDocumentNonBlocking(configRef, {
                serverUrl,
                instanceKey,
                enabled,
                webhookUrl,
                notifyWelcome,
                notifyEnrollment,
                notifyJourney,
                updatedAt: Timestamp.now()
            }, { merge: true });

            toast({ title: "Configurações Salvas", description: "O gateway de WhatsApp foi atualizado com sucesso." });
            checkStatus();
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
                body: JSON.stringify({ key: instanceKey, server: serverUrl }),
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

    const handleTestMessage = async () => {
        if (!testPhone) {
            toast({ title: "Número necessário", description: "Digite um número de telefone para o teste.", variant: "destructive" });
            return;
        }

        setIsTesting(true);
        const result = await sendTestWhatsAppMessage(testPhone, testMessage, {
            serverUrl,
            instanceKey
        });

        if (result.success) {
            toast({ title: "Mensagem Enviada!", description: "Verifique o seu WhatsApp." });
            checkStatus();
        } else {
            toast({ title: "Falha no Envio", description: result.error, variant: "destructive" });
        }
        setIsTesting(false);
    };

    const handleCopyWebhook = () => {
        navigator.clipboard.writeText(webhookUrl);
        toast({ title: "Copiado!", description: "Cole esta URL no portal api-wa.me" });
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
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm",
                        isConnected ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                        instanceStatus?.status === 'offline' ? "bg-red-50 text-red-700 border-red-200" : 
                        "bg-slate-50 text-slate-500 border-slate-200"
                    )}>
                        <div className={cn("size-2 rounded-full animate-pulse", 
                            isConnected ? "bg-emerald-500" : instanceStatus?.status === 'offline' ? "bg-red-500" : "bg-slate-400"
                        )} />
                        {isConnected ? "Gateway Ativo" : instanceStatus?.status === 'offline' ? "Desconectado" : "Status Desconhecido"}
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
                                        <Info size={10} /> Copie esta URL e cole nos campos de Webhook do portal api-wa.me para capturar respostas.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold">Ativar Disparos</Label>
                                    <p className="text-xs text-muted-foreground">Habilita ou desabilita todos os disparos automáticos.</p>
                                </div>
                                <Switch checked={enabled} onCheckedChange={setEnabled} />
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button 
                                    onClick={handleSaveConfig} 
                                    disabled={isSaving}
                                    className="px-8 font-bold"
                                >
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                    Salvar Alterações
                                </Button>
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
                    {/* Status Card */}
                    <Card className={cn(
                        "border-2 shadow-lg",
                        isConnected ? "border-emerald-200 bg-emerald-50/30" : 
                        instanceStatus?.parsedStatus === 'pairing' ? "border-amber-200 bg-amber-50/30" :
                        "border-slate-200 bg-slate-50/30"
                    )}>
                        <CardHeader className="border-b bg-white/50">
                            <CardTitle className="text-xs font-black uppercase flex items-center gap-2">Status do Gateway</CardTitle>
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
                                    <Button size="sm" variant="ghost" onClick={checkStatus} className="mt-4 text-[10px] font-black uppercase tracking-widest text-emerald-800"><RefreshCw className="size-3 mr-2" /> Sincronizar</Button>
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

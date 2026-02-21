
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Loader2, Send, Settings, Key, Bot, History, MessageSquare, Mail, 
    Users, CheckCircle2, Search, UserPlus, X, Info, Layers, RefreshCw, 
    Zap, AlertCircle, Group, LayoutTemplate, Sparkles, MessageCircle, MousePointer2,
    UserCheck, Trash2, BarChart3, FileText, Image as ImageIcon, Link as LinkIcon,
    QrCode, Smartphone, LogOut
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useDoc, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const QUICK_TEMPLATES = [
    { id: 'welcome', label: 'Boas-vindas', icon: MessageSquare, text: 'Olá {{nome}}, que alegria ter você conosco na IBM! Desejamos que se sinta em casa. Como podemos orar por você hoje?' },
    { id: 'scale', label: 'Lembrete Escala', icon: Zap, text: 'Olá {{nome}}! Passando para lembrar do seu compromisso no Reino este final de semana. Sua dedicação faz a diferença!' },
];

function WhatsappSender() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [targetAudience, setTargetAudience] = useState('all_members');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [groups, setGroups] = useState<any[]>([]);
    const [isLoadingGroups, setIsLoadingGroups] = useState(false);
    const [msgType, setMsgType] = useState<'text' | 'button' | 'survey' | 'media'>('text');

    // Survey States
    const [surveyName, setSurveyName] = useState('');
    const [surveyOptions, setSurveyOptions] = useState(['Sim', 'Não']);
    
    // Media States
    const [mediaUrl, setMediaUrl] = useState('');

    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const { data: users } = useCollection<any>(usersQuery);

    const filteredUsers = useMemo(() => {
        if (!users || !searchTerm) return [];
        return users.filter(u => 
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
            !selectedUserIds.includes(u.id)
        ).slice(0, 5);
    }, [users, searchTerm, selectedUserIds]);

    const selectedUsersList = useMemo(() => {
        if (!users) return [];
        return users.filter(u => selectedUserIds.includes(u.id));
    }, [users, selectedUserIds]);

    const fetchGroups = async () => {
        setIsLoadingGroups(true);
        try {
            const response = await fetch('/api/notifications/groups');
            const data = await response.json();
            setGroups(Array.isArray(data.groups) ? data.groups : []);
        } catch (e) {
            setGroups([]);
        } finally {
            setIsLoadingGroups(false);
        }
    };

    useEffect(() => {
        if (targetAudience === 'whatsapp_group') {
            fetchGroups();
        }
    }, [targetAudience]);

    const handleAddUser = (userId: string) => {
        setSelectedUserIds(prev => [...prev, userId]);
        setSearchTerm('');
    };

    const handleRemoveUser = (userId: string) => {
        setSelectedUserIds(prev => prev.filter(id => id !== userId));
    };

    const handleAddSurveyOption = () => {
        if (surveyOptions.length < 5) {
            setSurveyOptions([...surveyOptions, `Opção ${surveyOptions.length + 1}`]);
        }
    };

    const handleRemoveSurveyOption = (index: number) => {
        setSurveyOptions(surveyOptions.filter((_, i) => i !== index));
    };

    const handleUpdateSurveyOption = (index: number, value: string) => {
        const newOptions = [...surveyOptions];
        newOptions[index] = value;
        setSurveyOptions(newOptions);
    };

    const applyTemplate = (text: string) => {
        setMessage(text);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (targetAudience === 'specific_members' && selectedUserIds.length === 0) {
            toast({ variant: 'destructive', title: "Selecione pelo menos uma pessoa." });
            return;
        }

        setIsLoading(true);

        const payload: any = {
            channel: 'whatsapp',
            audience: targetAudience,
            message,
            userIds: targetAudience === 'specific_members' ? selectedUserIds : undefined,
            targetNumber: targetAudience === 'whatsapp_group' ? selectedGroupId : undefined,
            type: msgType,
        };

        if (msgType === 'button') {
            payload.title = message || "Confirmação de Escala";
            payload.footer = "Igreja Batista da Manhã";
            payload.buttons = [
                { id: 'confirm_yes', text: 'Confirmar Presença ✅' },
                { id: 'confirm_no', text: 'Não poderei ir ❌' }
            ];
        }

        if (msgType === 'survey') {
            payload.surveyName = surveyName || "Enquete IBM";
            payload.options = surveyOptions;
        }

        if (msgType === 'media') {
            payload.mediaUrl = mediaUrl;
        }

        try {
            const response = await fetch('/api/notifications/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            
            const result = await response.json();
            
            if (response.ok) {
                toast({ title: "Envio Concluído!", description: `${result.sentCount || 0} mensagens processadas.` });
                setMessage('');
                setSelectedUserIds([]);
                setSurveyName('');
                setMediaUrl('');
            } else {
                toast({ variant: 'destructive', title: "Erro no Envio", description: result.error || "Falha ao processar." });
            }
        } catch(error) {
             toast({ variant: 'destructive', title: "Erro crítico", description: "Falha na conexão com o servidor." });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSend} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="msgType">Formato da Mensagem</Label>
                    <Select value={msgType} onValueChange={(v:any) => setMsgType(v)}>
                        <SelectTrigger className="bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="text">Apenas Texto (Normal)</SelectItem>
                            <SelectItem value="button">Mensagem com Botões (Interativa)</SelectItem>
                            <SelectItem value="survey">Enquete / Votação</SelectItem>
                            <SelectItem value="media">Imagem ou Documento</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="targetAudience">Público-alvo</Label>
                    <Select value={targetAudience} onValueChange={setTargetAudience}>
                        <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Selecione o público" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all_members">Todos os Membros</SelectItem>
                            <SelectItem value="specific_members">Membros Específicos</SelectItem>
                            <SelectItem value="whatsapp_group">Grupo de WhatsApp</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* BUSCA DE MEMBROS ESPECÍFICOS */}
            {targetAudience === 'specific_members' && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/20 animate-in fade-in zoom-in-95 duration-200">
                    <Label className="flex items-center gap-2">
                        <Search size={14} /> Selecionar Pessoas
                    </Label>
                    <div className="relative">
                        <Input 
                            placeholder="Digite o nome para buscar..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-background"
                        />
                        {filteredUsers.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg overflow-hidden">
                                {filteredUsers.map(u => (
                                    <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => handleAddUser(u.id)}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-primary/10 flex items-center justify-between group"
                                    >
                                        <span>{u.name}</span>
                                        <UserPlus size={14} className="text-muted-foreground group-hover:text-primary" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {selectedUsersList.map(u => (
                            <Badge key={u.id} variant="secondary" className="pl-3 pr-1 py-1 gap-1">
                                {u.name}
                                <button 
                                    type="button" 
                                    onClick={() => handleRemoveUser(u.id)}
                                    className="hover:text-destructive p-0.5"
                                >
                                    <X size={12} />
                                </button>
                            </Badge>
                        ))}
                        {selectedUserIds.length === 0 && (
                            <p className="text-xs text-muted-foreground italic">Nenhuma pessoa selecionada ainda.</p>
                        )}
                    </div>
                </div>
            )}

            {/* SELEÇÃO DE GRUPO */}
            {targetAudience === 'whatsapp_group' && (
                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                    <Label htmlFor="group-select">Escolha o Grupo</Label>
                    <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                        <SelectTrigger id="group-select" className="bg-background">
                            <SelectValue placeholder={isLoadingGroups ? "Carregando grupos..." : "Selecione um grupo"} />
                        </SelectTrigger>
                        <SelectContent>
                            {isLoadingGroups ? (
                                <div className="flex items-center justify-center p-2">
                                    <Loader2 className="size-4 animate-spin mr-2" />
                                    <span className="text-xs">Buscando grupos...</span>
                                </div>
                            ) : (
                                <>
                                    {Array.isArray(groups) && groups.map(g => (
                                        <SelectItem key={g.id} value={g.id}>{g.name || g.id}</SelectItem>
                                    ))}
                                    {(!groups || groups.length === 0) && (
                                        <SelectItem value="none" disabled>Nenhum grupo encontrado</SelectItem>
                                    )}
                                </>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* CAMPOS DE ENQUETE */}
            {msgType === 'survey' && (
                <div className="space-y-4 p-4 border border-dashed rounded-lg bg-primary/5 animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><BarChart3 size={14} /> Pergunta da Enquete</Label>
                        <Input 
                            placeholder="Ex: Qual o melhor horário para o próximo ensaio?" 
                            value={surveyName}
                            onChange={e => setSurveyName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Opções de Resposta</Label>
                        {surveyOptions.map((opt, idx) => (
                            <div key={idx} className="flex gap-2">
                                <Input 
                                    value={opt} 
                                    onChange={e => handleUpdateSurveyOption(idx, e.target.value)}
                                    placeholder={`Opção ${idx + 1}`}
                                    className="bg-background"
                                />
                                {surveyOptions.length > 2 && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveSurveyOption(idx)}>
                                        <Trash2 size={14} className="text-destructive" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        {surveyOptions.length < 5 && (
                            <Button type="button" variant="outline" size="sm" onClick={handleAddSurveyOption}>
                                <PlusCircle size={12} className="mr-2" /> Adicionar Opção
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* CAMPOS DE MÍDIA */}
            {msgType === 'media' && (
                <div className="space-y-4 p-4 border border-dashed rounded-lg bg-blue-50 animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><ImageIcon size={14} /> Link da Imagem ou Documento</Label>
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-3 size-4 text-muted-foreground" />
                            <Input 
                                placeholder="https://..." 
                                value={mediaUrl}
                                onChange={e => setMediaUrl(e.target.value)}
                                className="pl-10 bg-background"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground">O sistema detecta automaticamente se é imagem (png, jpg) ou documento (pdf, docx).</p>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <Label htmlFor="message">{msgType === 'media' ? 'Legenda' : 'Texto Principal'}</Label>
                    <div className="flex gap-2">
                        {QUICK_TEMPLATES.map(t => (
                            <Button 
                                key={t.id} 
                                type="button" 
                                variant="outline" 
                                size="xs" 
                                className="h-7 text-[10px] uppercase font-black"
                                onClick={() => applyTemplate(t.text)}
                            >
                                <t.icon size={10} className="mr-1" /> {t.label}
                            </Button>
                        ))}
                    </div>
                </div>
                <Textarea 
                    id="message" 
                    placeholder={msgType === 'button' ? "Ex: Olá {{nome}}, você confirma sua escala no domingo?" : "Olá {{nome}}..."}
                    className="min-h-[120px] bg-background"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required={msgType !== 'survey'}
                />
                <p className="text-[10px] text-muted-foreground italic">Use <strong>{"{{nome}}"}</strong> para personalizar com o nome de cada membro.</p>
                
                {msgType === 'button' && (
                    <div className="p-4 bg-primary/5 border border-dashed rounded-lg">
                        <p className="text-xs font-bold text-primary flex items-center gap-2 mb-2">
                            <MousePointer2 size={14} /> Prévia dos Botões Interativos:
                        </p>
                        <div className="flex gap-2">
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Confirmar Presença ✅</Badge>
                            <Badge className="bg-red-100 text-red-800 border-red-200">Não poderei ir ❌</Badge>
                        </div>
                    </div>
                )}
            </div>

            <Button type="submit" disabled={isLoading || (msgType !== 'survey' && !message.trim())} className="w-full h-12 text-base font-bold shadow-lg">
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                {msgType === 'survey' ? 'Disparar Enquete' : msgType === 'button' ? 'Disparar Convite Interativo' : msgType === 'media' ? 'Enviar Mídia' : 'Enviar Mensagem'}
                {targetAudience === 'specific_members' && selectedUserIds.length > 0 && ` (${selectedUserIds.length} pessoas)`}
            </Button>
        </form>
    );
}

function WhatsappResponses() {
    const { firestore } = useFirebase();
    const responsesQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'notifications_responses'), orderBy('receivedAt', 'desc')) : null,
    [firestore]);
    
    const { data: responses, isLoading } = useCollection<any>(responsesQuery);

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="rounded-lg border bg-card">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead>Membro</TableHead>
                        <TableHead>Resposta</TableHead>
                        <TableHead>Data/Hora</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {responses?.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic">Nenhuma resposta interativa ainda.</TableCell></TableRow>
                    ) : (
                        responses?.map((res: any) => (
                            <TableRow key={res.id}>
                                <TableCell className="font-bold">{res.userName || res.from}</TableCell>
                                <TableCell>
                                    <Badge className={cn(
                                        res.buttonId?.includes('yes') || res.buttonId?.includes('confirm') ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                                    )}>
                                        {res.buttonText || res.buttonId}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {res.receivedAt ? format(res.receivedAt.toDate(), 'dd/MM/yy HH:mm', { locale: ptBR }) : '-'}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

function NotificationsConfig() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { data: config, isLoading: isLoadingConfig } = useDoc<any>('config/notifications');
    
    const [waKey, setWaKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingQR, setIsGeneratingQR] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [instanceStatus, setInstanceStatus] = useState<{status: string, message?: string} | null>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);

    useEffect(() => {
        if (config) setWaKey(config.whatsappApiKey || '');
    }, [config]);

    const checkStatus = async () => {
        setIsLoadingStatus(true);
        try {
            const response = await fetch('/api/notifications/instance');
            const data = await response.json();
            setInstanceStatus(data);
            
            // Se estiver conectado e tiver um QR na tela, limpa o QR
            if (data.status === 'connected') {
                setQrCode(null);
            }
        } catch (e) {
            setInstanceStatus({ status: 'error', message: 'Falha ao consultar gateway.' });
        } finally {
            setIsLoadingStatus(false);
        }
    };

    // Polling de status enquanto o QR Code está sendo exibido
    useEffect(() => {
        let interval: any;
        if (qrCode) {
            interval = setInterval(checkStatus, 5000);
        }
        return () => clearInterval(interval);
    }, [qrCode]);

    useEffect(() => {
        checkStatus();
    }, []);

    const handleSaveKey = () => {
        if (!firestore) return;
        setIsSaving(true);
        const configRef = doc(firestore, 'config', 'notifications');
        setDocumentNonBlocking(configRef, { whatsappApiKey: waKey, updatedAt: Timestamp.now() }, { merge: true })
            .then(() => {
                toast({ title: "Chave Salva!" });
                checkStatus();
            })
            .finally(() => setIsSaving(false));
    };

    const handleGenerateQR = async () => {
        setIsGeneratingQR(true);
        setQrCode(null);
        try {
            const response = await fetch('/api/notifications/instance', { method: 'POST' });
            const data = await response.json();
            
            if (data.qr) {
                setQrCode(data.qr);
                toast({ title: "QR Code Gerado", description: "Escaneie com o celular da igreja." });
            } else if (data.status === 'CONNECTED') {
                toast({ title: "Já Conectado", description: "Sua instância já está ativa." });
                checkStatus();
            } else {
                toast({ variant: 'destructive', title: "Erro", description: data.error || "Não foi possível gerar o código." });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Erro na Requisição" });
        } finally {
            setIsGeneratingQR(false);
        }
    };

    if (isLoadingConfig) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/notifications/webhook` : '';

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Key className="size-5 text-primary" />Configuração de Chave</CardTitle>
                        <CardDescription>Insira a chave da instância do api-wa.me.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="wa-key">API Key (Instância)</Label>
                            <Input id="wa-key" type="password" value={waKey} onChange={e => setWaKey(e.target.value)} placeholder="Sua chave secreta" />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end border-t pt-4">
                        <Button onClick={handleSaveKey} disabled={isSaving} size="sm">
                            {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Settings className="mr-2 size-4" />}
                            Salvar Chave
                        </Button>
                    </CardFooter>
                </Card>

                <Card className={cn(
                    "border-2 transition-all",
                    instanceStatus?.status === 'connected' ? "border-emerald-200 bg-emerald-50/30" : "border-amber-200 bg-amber-50/30"
                )}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center justify-between">
                            Status da Instância
                            {isLoadingStatus && <Loader2 className="size-3 animate-spin" />}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <div className={cn(
                                "size-4 rounded-full animate-pulse",
                                instanceStatus?.status === 'connected' ? "bg-emerald-500" : "bg-amber-500"
                            )} />
                            <span className="font-black uppercase text-xs tracking-widest">
                                {instanceStatus?.status || 'Buscando...'}
                            </span>
                        </div>
                        
                        {instanceStatus?.status === 'connected' ? (
                            <div className="py-2">
                                <p className="text-[10px] text-muted-foreground mb-4">Seu WhatsApp está pronto para disparos.</p>
                                <Button variant="outline" size="sm" className="w-full text-destructive hover:bg-red-50 hover:text-destructive">
                                    <LogOut className="size-3 mr-1" /> Desconectar
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-[10px] text-muted-foreground">Instância offline ou aguardando conexão.</p>
                                <Button 
                                    onClick={handleGenerateQR} 
                                    disabled={isGeneratingQR || !waKey}
                                    className="w-full h-9 text-xs font-bold"
                                >
                                    {isGeneratingQR ? <Loader2 className="size-3 animate-spin mr-1" /> : <QrCode className="size-3 mr-1" />}
                                    Gerar Novo QR Code
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* AREA DO QR CODE WHITE LABEL */}
            {qrCode && (
                <Card className="border-primary border-2 bg-primary/5 animate-in zoom-in-95 duration-300">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-primary flex items-center justify-center gap-2">
                            <Smartphone className="size-5" />
                            Escaneie para Conectar
                        </CardTitle>
                        <CardDescription>Abra o WhatsApp no celular da igreja &gt; Dispositivos Conectados &gt; Conectar.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-6 gap-6">
                        <div className="p-4 bg-white rounded-2xl shadow-xl border-4 border-primary/20">
                            <Image 
                                src={qrCode} 
                                alt="WhatsApp QR Code" 
                                width={256} 
                                height={256} 
                                className="rounded-lg"
                            />
                        </div>
                        <div className="flex items-center gap-3 text-sm font-bold text-primary animate-pulse">
                            <RefreshCw className="size-4 animate-spin" />
                            Aguardando escaneamento...
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-muted/30">
                <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2"><Layers className="size-4 text-primary" /> Configuração de Webhook</CardTitle>
                    <CardDescription>Para receber as respostas dos botões, configure esta URL no painel da api-wa.me:</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-3 bg-white border rounded font-mono text-xs break-all select-all shadow-inner">
                        {webhookUrl}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function WhatsappGroups() {
    const { toast } = useToast();
    const [groups, setGroups] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchGroups = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/notifications/groups');
            const data = await response.json();
            if (response.ok) {
                setGroups(Array.isArray(data.groups) ? data.groups : []);
            } else {
                setError(data.error || "Erro ao buscar grupos.");
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const handleUpdateMural = async (groupId: string) => {
        const description = prompt("Digite a nova descrição (Mural) do grupo:");
        if (!description) return;

        try {
            const response = await fetch('/api/notifications/groups', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId, description })
            });
            if (response.ok) {
                toast({ title: "Mural Atualizado!", description: "A descrição do grupo foi alterada no WhatsApp." });
            } else {
                const errData = await response.json();
                toast({ variant: 'destructive', title: "Erro", description: errData.error || "Não foi possível atualizar a descrição." });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro na conexão" });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Meus Grupos no WhatsApp</h3>
                <Button variant="ghost" size="sm" onClick={fetchGroups} disabled={isLoading}>
                    <RefreshCw className={cn("size-4 mr-2", isLoading && "animate-spin")} /> Atualizar Lista
                </Button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-lg flex items-center gap-3">
                    <AlertCircle />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(Array.isArray(groups) ? groups : []).map(group => (
                    <Card key={group.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="p-4">
                            <CardTitle className="text-sm font-bold flex items-center justify-between">
                                <span className="truncate">{group.name || "Sem Nome"}</span>
                                <Badge variant="secondary" className="text-[10px]">{group.participants?.length || 0} p.</Badge>
                            </CardTitle>
                            <CardDescription className="text-[10px] truncate">{group.id}</CardDescription>
                        </CardHeader>
                        <CardFooter className="p-4 pt-0 flex justify-end gap-2">
                            <Button variant="outline" size="xs" className="h-7 text-[10px] uppercase font-black" onClick={() => handleUpdateMural(group.id)}>
                                <LayoutTemplate size={12} className="mr-1" /> Mural / Descrição
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
                {(Array.isArray(groups) ? groups.length : 0) === 0 && !isLoading && !error && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg">
                        <Group className="size-12 text-muted-foreground mx-auto mb-2 opacity-20" />
                        <p className="text-muted-foreground text-sm">Nenhum grupo encontrado nesta instância.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
            <CardHeader>
                <CardTitle className="text-2xl font-black flex items-center gap-3">
                    <Send className="text-primary" />
                    Central de Notificações
                </CardTitle>
                <CardDescription className="text-slate-600">Comunicação estratégica e interativa para o organismo da igreja.</CardDescription>
            </CardHeader>
        </Card>

        <Tabs defaultValue="sender" className="w-full">
            <TabsList className="grid w-full grid-cols-5 max-w-3xl bg-muted/50 p-1">
                <TabsTrigger value="sender" className="font-bold"><Send className="mr-2 size-4" /> Disparador</TabsTrigger>
                <TabsTrigger value="groups" className="font-bold"><Group className="mr-2 size-4" /> Grupos</TabsTrigger>
                <TabsTrigger value="responses" className="font-bold"><MessageCircle className="mr-2 size-4" /> Respostas</TabsTrigger>
                <TabsTrigger value="history" className="font-bold"><History className="mr-2 size-4" /> Histórico</TabsTrigger>
                <TabsTrigger value="config" className="font-bold"><Settings className="mr-2 size-4" /> Configs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sender" className="mt-6">
                <Card>
                    <CardHeader><CardTitle>Novo Disparo</CardTitle></CardHeader>
                    <CardContent><WhatsappSender /></CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="groups" className="mt-6">
                <WhatsappGroups />
            </TabsContent>

            <TabsContent value="responses" className="mt-6">
                <WhatsappResponses />
            </TabsContent>

            <TabsContent value="history" className="mt-6">
                <NotificationsHistory />
            </TabsContent>

            <TabsContent value="config" className="mt-6">
                <NotificationsConfig />
            </TabsContent>
        </Tabs>
    </div>
  );
}

function NotificationsHistory() {
    const { firestore } = useFirebase();
    const historyQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'notifications_history'), orderBy('sentAt', 'desc')) : null,
    [firestore]);
    
    const { data: history, isLoading } = useCollection<any>(historyQuery);

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="rounded-lg border bg-card overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Mensagem</TableHead>
                        <TableHead>Impacto</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history?.map((item: any) => (
                        <TableRow key={item.id}>
                            <TableCell className="text-xs">
                                {item.sentAt ? format(item.sentAt.toDate(), 'dd/MM/yy HH:mm', { locale: ptBR }) : '-'}
                            </TableCell>
                            <TableCell className="text-xs max-w-xs truncate">{item.message}</TableCell>
                            <TableCell><Badge variant="secondary">{item.recipientCount} pessoas</Badge></TableCell>
                            <TableCell>
                                <div className={cn("flex items-center gap-1.5 font-bold text-[10px]", item.status === 'success' ? "text-emerald-600" : "text-amber-600")}>
                                    <CheckCircle2 size={12} /> {item.status === 'success' ? 'SUCESSO' : 'PARCIAL'}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {history?.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">Nenhum histórico disponível.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

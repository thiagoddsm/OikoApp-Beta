
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
    Zap, AlertCircle, Group, LayoutTemplate, Sparkles, MessageCircle, MousePointer2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useDoc, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
    const [msgType, setMsgType] = useState<'text' | 'button'>('text');

    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const { data: users } = useCollection<any>(usersQuery);

    const filteredUsers = useMemo(() => {
        if (!users || !searchTerm) return [];
        return users.filter(u => 
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
            !selectedUserIds.includes(u.id)
        ).slice(0, 5);
    }, [users, searchTerm, selectedUserIds]);

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

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
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

        try {
            const response = await fetch('/api/notifications/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            
            const result = await response.json();
            toast({ title: response.ok ? "Envio Concluído!" : "Erro no Envio", description: result.message || "Processado com sucesso." });
            if(response.ok) setMessage('');
        } catch(error) {
             toast({ variant: 'destructive', title: "Erro crítico", description: "Falha na conexão." });
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

            <div className="space-y-4">
                <Label htmlFor="message">Texto Principal</Label>
                <Textarea 
                    id="message" 
                    placeholder={msgType === 'button' ? "Ex: Olá {{nome}}, você confirma sua escala no domingo?" : "Olá {{nome}}..."}
                    className="min-h-[120px] bg-background"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                />
                {msgType === 'button' && (
                    <div className="p-4 bg-primary/5 border border-dashed rounded-lg">
                        <p className="text-xs font-bold text-primary flex items-center gap-2 mb-2">
                            <MousePointer2 size={14} /> Prévia dos Botões:
                        </p>
                        <div className="flex gap-2">
                            <Badge variant="secondary">Confirmar Presença ✅</Badge>
                            <Badge variant="secondary">Não poderei ir ❌</Badge>
                        </div>
                    </div>
                )}
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-12 text-base font-bold shadow-lg">
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                {msgType === 'button' ? 'Disparar Convite Interativo' : 'Enviar Mensagem'}
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
                                        res.buttonId.includes('yes') ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                                    )}>
                                        {res.buttonText}
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
    const { data: config, isLoading } = useDoc<any>('config/notifications');
    
    const [waKey, setWaKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (config) setWaKey(config.whatsappApiKey || '');
    }, [config]);

    const handleSave = () => {
        if (!firestore) return;
        setIsSaving(true);
        const configRef = doc(firestore, 'config', 'notifications');
        setDocumentNonBlocking(configRef, { whatsappApiKey: waKey, updatedAt: Timestamp.now() }, { merge: true })
            .then(() => toast({ title: "Configurações Salvas!" }))
            .finally(() => setIsSaving(false));
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/notifications/webhook` : '';

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Key className="size-5 text-primary" />API WhatsApp</CardTitle>
                    <CardDescription>Configure sua instância do api-wa.me.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="wa-key">Chave da Instância (API Key)</Label>
                        <Input id="wa-key" type="password" value={waKey} onChange={e => setWaKey(e.target.value)} placeholder="Sua chave secreta" />
                    </div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
                        Salvar Configurações
                    </Button>
                </CardFooter>
            </Card>

            <Card className="bg-muted/30">
                <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2"><Zap className="size-4 text-primary" /> Configuração de Webhook</CardTitle>
                    <CardDescription>Para receber as respostas dos botões, configure esta URL no painel da api-wa.me:</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-3 bg-white border rounded font-mono text-xs break-all select-all">
                        {webhookUrl}
                    </div>
                </CardContent>
            </Card>
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
                <CardDescription className="text-slate-600">Comunicação interativa para o organismo da igreja.</CardDescription>
            </CardHeader>
        </Card>

        <Tabs defaultValue="sender" className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-2xl bg-muted/50 p-1">
                <TabsTrigger value="sender" className="font-bold"><Send className="mr-2 size-4" /> Disparador</TabsTrigger>
                <TabsTrigger value="responses" className="font-bold"><MessageCircle className="mr-2 size-4" /> Respostas</TabsTrigger>
                <TabsTrigger value="history" className="font-bold"><History className="mr-2 size-4" /> Histórico</TabsTrigger>
                <TabsTrigger value="config" className="font-bold"><Settings className="mr-2 size-4" /> Configurações</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sender" className="mt-6">
                <Card>
                    <CardHeader><CardTitle>Novo Disparo</CardTitle></CardHeader>
                    <CardContent><WhatsappSender /></CardContent>
                </Card>
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
                </TableBody>
            </Table>
        </div>
    );
}

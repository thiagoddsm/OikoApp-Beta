
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
    Loader2, Send, Settings, Key, History, MessageSquare, 
    Users, CheckCircle2, Search, UserPlus, X, Info, RefreshCw, 
    Smartphone, MessageCircle, Trash2, CheckCircle, 
    Copy, Globe, HeartHandshake, CalendarDays
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useDoc, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc, where, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const QUICK_TEMPLATES = [
    { id: 'welcome', label: 'Boas-vindas', text: 'Olá {{nome}}, seja muito bem-vindo à Igreja Batista da Manhã! É um prazer ter você conosco.', icon: UserPlus },
    { id: 'gc_invite', label: 'Convite GC', text: 'Olá {{nome}}! Gostaria de te convidar para o nosso GC que acontece esta semana. Vamos adorar te receber!', icon: HeartHandshake },
    { id: 'event', label: 'Evento', text: 'Olá {{nome}}, passando para lembrar do nosso evento que acontecerá em breve. Não perca!', icon: CalendarDays },
];

function WhatsappChats() {
    const { firestore } = useFirebase();
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const chatsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'notifications_chats'), orderBy('lastMessageAt', 'desc')) : null,
    [firestore]);
    const { data: chats, isLoading: isLoadingChats } = useCollection<any>(chatsQuery);

    const messagesQuery = useMemoFirebase(() => {
        if (!firestore || !selectedChat) return null;
        return query(
            collection(firestore, 'notifications_messages'),
            where('from', '==', selectedChat),
            orderBy('receivedAt', 'asc'),
            limit(100)
        );
    }, [firestore, selectedChat]);
    const { data: messages, isLoading: isLoadingMessages } = useCollection<any>(messagesQuery);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    if (isLoadingChats) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[650px] text-slate-900">
            <Card className="md:col-span-1 flex flex-col overflow-hidden border-2 shadow-sm">
                <CardHeader className="bg-muted/30 border-b py-4">
                    <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                        <MessageCircle className="size-4 text-primary" /> Conversas
                    </CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1">
                    <div className="divide-y">
                        {chats?.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-xs italic">Nenhuma conversa encontrada.</div>
                        ) : (
                            chats?.map((chat: any) => (
                                <button
                                    key={chat.id}
                                    onClick={() => setSelectedChat(chat.id)}
                                    className={cn(
                                        "w-full p-4 text-left hover:bg-muted/50 transition-colors flex gap-3 items-center relative",
                                        selectedChat === chat.id && "bg-primary/5 border-r-4 border-primary"
                                    )}
                                >
                                    <Avatar className="h-10 w-10 border">
                                        <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">{chat.userName?.charAt(0) || '?'}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <p className="font-bold text-sm truncate">{chat.userName || chat.id}</p>
                                            <span className="text-[9px] text-muted-foreground font-medium">
                                                {chat.lastMessageAt ? format(chat.lastMessageAt.toDate(), 'HH:mm') : ''}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate line-clamp-1 italic">
                                            {chat.lastMessage}
                                        </p>
                                    </div>
                                    {chat.unreadCount > 0 && (
                                        <Badge className="absolute right-4 bottom-4 h-5 min-w-5 flex items-center justify-center p-0 rounded-full bg-emerald-500 text-white border-none shadow-sm">
                                            {chat.unreadCount}
                                        </Badge>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </Card>

            <Card className="md:col-span-2 flex flex-col overflow-hidden border-2 shadow-sm relative">
                {!selectedChat ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50">
                        <div className="size-16 bg-white rounded-full flex items-center justify-center shadow-inner mb-4 border border-slate-100">
                            <MessageSquare className="size-8 text-muted-foreground opacity-20" />
                        </div>
                        <h4 className="font-black text-slate-400 uppercase text-xs tracking-[0.2em]">Selecione um Chat</h4>
                        <p className="text-[10px] text-muted-foreground mt-2 uppercase font-bold">Histórico sincronizado via Webhook</p>
                    </div>
                ) : (
                    <>
                        <CardHeader className="bg-white border-b py-3 px-6 flex flex-row items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 border">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-black">
                                        {chats?.find(c => c.id === selectedChat)?.userName?.charAt(0) || '?'}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-black text-sm uppercase tracking-tight">
                                        {chats?.find(c => c.id === selectedChat)?.userName || selectedChat}
                                    </p>
                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Conectado</span>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedChat(null)}><X className="size-4"/></Button>
                        </CardHeader>
                        
                        <ScrollArea className="flex-1 p-6 bg-[#f0f2f5] dark:bg-slate-900/50" ref={scrollRef}>
                            <div className="space-y-4">
                                {messages?.map((msg: any) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex flex-col max-w-[85%] animate-in fade-in slide-in-from-bottom-1",
                                            msg.fromMe ? "ml-auto items-end" : "mr-auto items-start"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-3 rounded-2xl shadow-sm text-sm font-medium leading-relaxed",
                                            msg.fromMe 
                                                ? "bg-primary text-white rounded-tr-none" 
                                                : "bg-white text-slate-800 rounded-tl-none border border-slate-200"
                                        )}>
                                            {msg.content}
                                            <div className={cn(
                                                "text-[9px] mt-1 text-right font-black uppercase opacity-60",
                                                msg.fromMe ? "text-white" : "text-slate-400"
                                            )}>
                                                {msg.receivedAt ? format(msg.receivedAt.toDate(), 'HH:mm') : ''}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isLoadingMessages && <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-primary opacity-20" /></div>}
                            </div>
                        </ScrollArea>
                        
                        <div className="p-4 border-t bg-white shrink-0">
                            <p className="text-[9px] text-center text-muted-foreground font-bold uppercase tracking-widest italic">O disparo de respostas via chat está em desenvolvimento</p>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
}

function WhatsappSender() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [targetAudience, setTargetAudience] = useState('all_members');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [msgType, setMsgType] = useState<'text' | 'button' | 'survey' | 'media'>('text');

    const [msgFooter, setMsgFooter] = useState('Igreja Batista da Manhã');
    const [msgButtons, setMsgButtons] = useState([{ id: 'btn_1', text: 'Confirmar Presença ✅' }, { id: 'btn_2', text: 'Não poderei ir ❌' }]);
    const [surveyName, setSurveyName] = useState('');
    const [surveyOptions, setSurveyOptions] = useState(['Sim', 'Não']);
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

    const handleAddUser = (userId: string) => {
        setSelectedUserIds(prev => [...prev, userId]);
        setSearchTerm('');
    };

    const handleRemoveUser = (userId: string) => {
        setSelectedUserIds(prev => prev.filter(id => id !== userId));
    };

    const handleAddBtn = () => {
        if (msgButtons.length < 3) {
            setMsgButtons([...msgButtons, { id: `btn_${msgButtons.length + 1}`, text: `Botão ${msgButtons.length + 1}` }]);
        }
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
            type: msgType,
        };

        if (msgType === 'button') {
            payload.footer = msgFooter;
            payload.buttons = msgButtons;
        } else if (msgType === 'survey') {
            payload.surveyName = surveyName || 'Enquete rápida';
            payload.options = surveyOptions;
        } else if (msgType === 'media') {
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
                toast({ title: "Envio Concluído!", description: `${result.sentCount || 0} mensagens enviadas.` });
                setMessage('');
                setSelectedUserIds([]);
            } else {
                toast({ variant: 'destructive', title: "Falha no Envio", description: result.error });
            }
        } catch(error) {
             toast({ variant: 'destructive', title: "Erro crítico", description: "Falha na conexão." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 text-slate-900">
            <form onSubmit={handleSend} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Formato da Mensagem</Label>
                        <Select value={msgType} onValueChange={(v:any) => setMsgType(v)}>
                            <SelectTrigger className="h-11">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">Texto Simples</SelectItem>
                                <SelectItem value="button">Com Botões (Singular)</SelectItem>
                                <SelectItem value="survey">Enquete do WhatsApp</SelectItem>
                                <SelectItem value="media">Mídia (Link Direto)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Público Alvo</Label>
                        <Select value={targetAudience} onValueChange={setTargetAudience}>
                            <SelectTrigger className="h-11">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all_members">Todos os Membros</SelectItem>
                                <SelectItem value="specific_members">Membros Selecionados</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {targetAudience === 'specific_members' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                        <Label>Adicionar Pessoas</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                            <Input placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-11" />
                            {filteredUsers.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg overflow-hidden">
                                    {filteredUsers.map(u => (
                                        <button key={u.id} type="button" onClick={() => handleAddUser(u.id)} className="w-full px-4 py-3 text-left hover:bg-primary/10 flex justify-between border-b last:border-0">
                                            <span className="font-medium">{u.name}</span>
                                            <UserPlus size={14} className="text-primary" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {selectedUsersList.map(u => (
                                <Badge key={u.id} variant="secondary" className="gap-1 h-7 font-bold">
                                    {u.name}
                                    <button type="button" onClick={() => handleRemoveUser(u.id)}><X size={14} /></button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {msgType === 'media' && (
                    <div className="p-4 border-2 border-dashed rounded-xl bg-slate-50 space-y-4 animate-in slide-in-from-top-2">
                        <Label className="text-xs font-black uppercase text-primary">Link da Imagem ou PDF</Label>
                        <Input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://exemplo.com/imagem.jpg" className="bg-white" />
                        <p className="text-[10px] text-muted-foreground">O gateway requer um link direto acessível publicamente.</p>
                    </div>
                )}

                {msgType === 'survey' && (
                    <div className="p-4 border-2 border-dashed rounded-xl bg-blue-50/50 space-y-4 animate-in slide-in-from-top-2">
                        <Label className="text-xs font-black uppercase text-blue-800">Título da Enquete</Label>
                        <Input value={surveyName} onChange={e => setSurveyName(e.target.value)} placeholder="Qual o melhor dia para o evento?" className="bg-white" />
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-blue-800">Opções</Label>
                            {surveyOptions.map((opt, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <Input value={opt} onChange={e => {
                                        const n = [...surveyOptions];
                                        n[idx] = e.target.value;
                                        setSurveyOptions(n);
                                    }} className="bg-white" />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => setSurveyOptions(surveyOptions.filter((_, i) => i !== idx))}><Trash2 size={14}/></Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => setSurveyOptions([...surveyOptions, 'Nova Opção'])} className="w-full">+ Adicionar Opção</Button>
                        </div>
                    </div>
                )}

                {msgType === 'button' && (
                    <div className="p-4 border-2 border-dashed rounded-xl bg-indigo-50/50 space-y-4 animate-in slide-in-from-top-2">
                        <Label className="text-xs font-black uppercase text-indigo-800">Rodapé (Footer)</Label>
                        <Input value={msgFooter} onChange={e => setMsgFooter(e.target.value)} className="bg-white" />
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-indigo-800">Botões (Máx 3)</Label>
                            {msgButtons.map((btn, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <Input value={btn.text} onChange={e => {
                                        const n = [...msgButtons];
                                        n[idx].text = e.target.value;
                                        setMsgButtons(n);
                                    }} className="bg-white" />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => setMsgButtons(msgButtons.filter((_, i) => i !== idx))}><Trash2 size={14}/></Button>
                                </div>
                            ))}
                            {msgButtons.length < 3 && <Button type="button" variant="outline" size="sm" onClick={handleAddBtn} className="w-full">+ Adicionar Botão</Button>}
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <Label>{msgType === 'button' ? 'Texto Principal' : 'Mensagem'}</Label>
                    <Textarea 
                        placeholder={msgType === 'button' ? "Título do botão..." : "Olá {{nome}}, temos um aviso..."} 
                        className="min-h-[120px]" 
                        value={message} 
                        onChange={(e) => setMessage(e.target.value)} 
                        required 
                    />
                    <p className="text-[10px] text-muted-foreground italic">Use <strong>{"{{nome}}"}</strong> para personalizar com o nome do membro.</p>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full h-12 font-black shadow-xl">
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                    Disparar Agora
                </Button>
            </form>
        </div>
    );
}

function WhatsappResponses() {
    const { firestore } = useFirebase();
    const responsesQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'notifications_responses'), orderBy('receivedAt', 'desc'), limit(100)) : null,
    [firestore]);
    
    const { data: responses, isLoading } = useCollection<any>(responsesQuery);

    const pollStats = useMemo(() => {
        if (!responses) return {};
        const stats: Record<string, Record<string, number>> = {};
        responses.filter(r => r.type === 'poll').forEach(r => {
            const pollName = r.pollName || 'Enquete';
            if (!stats[pollName]) stats[pollName] = {};
            r.selectedOptions?.forEach((opt: string) => {
                // Algumas APIs enviam a opção como string ou objeto com hash
                const optLabel = typeof opt === 'string' ? opt : (opt as any).label || (opt as any).text || JSON.stringify(opt);
                stats[pollName][optLabel] = (stats[pollName][optLabel] || 0) + 1;
            });
        });
        return stats;
    }, [responses]);

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6 text-slate-900">
            {Object.keys(pollStats).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(pollStats).map(([name, votes]) => (
                        <Card key={name} className="border-blue-100 bg-blue-50/30 shadow-sm border-2">
                            <CardHeader className="py-3">
                                <CardTitle className="text-xs font-black uppercase text-blue-800 flex items-center gap-2">
                                    <CheckCircle2 className="size-4" /> {name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {Object.entries(votes).map(([opt, count]) => (
                                    <div key={opt} className="flex justify-between items-center text-xs bg-white/50 p-2 rounded-lg">
                                        <span className="font-bold text-slate-700">{opt}</span>
                                        <Badge className="bg-blue-600 text-white font-black">{count} votos</Badge>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <div className="rounded-xl border-2 bg-card overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Membro</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Resposta / Voto</TableHead>
                            <TableHead className="text-right">Recebido em</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {responses?.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">Nenhuma interação registrada ainda.</TableCell></TableRow>
                        ) : (
                            responses?.map((res: any) => (
                                <TableRow key={res.id} className="hover:bg-muted/30">
                                    <TableCell>
                                        <div className="font-bold">{res.userName || 'Desconhecido'}</div>
                                        <div className="text-[10px] text-muted-foreground">+{res.from}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="ghost" className="text-[10px] uppercase font-black">{res.type}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-black text-[10px] border-emerald-200 bg-emerald-50 text-emerald-800 h-6">
                                            {res.type === 'poll' ? (Array.isArray(res.selectedOptions) ? res.selectedOptions.join(', ') : res.selectedOptions) : (res.buttonText || res.buttonId)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-muted-foreground">
                                        {res.receivedAt ? format(res.receivedAt.toDate(), 'dd/MM HH:mm', { locale: ptBR }) : '-'}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function NotificationsConfig() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { data: config, isLoading: isLoadingConfig } = useDoc<any>('config/notifications');
    
    const [waKey, setWaKey] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [instanceStatus, setInstanceStatus] = useState<any>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (config) {
            setWaKey(config.whatsappApiKey || '');
            // Se a URL não estiver no banco, tenta construir uma a partir do host atual
            const defaultWebhook = config.webhookUrl || `${window.location.origin}/api/notifications/webhook`;
            setWebhookUrl(defaultWebhook);
        }
    }, [config]);

    const checkStatus = async () => {
        if (!waKey) return;
        setIsRefreshing(true);
        try {
            const res = await fetch('/api/notifications/instance', { cache: 'no-store' });
            const data = await res.json();
            setInstanceStatus(data);
        } catch (e) {} finally { setIsRefreshing(false); }
    };

    const handleSaveKey = async () => {
        if (!firestore) return;
        setIsSaving(true);
        const configRef = doc(firestore, 'config', 'notifications');
        try {
            await setDocumentNonBlocking(configRef, { whatsappApiKey: waKey, webhookUrl, updatedAt: Timestamp.now() }, { merge: true });
            toast({ title: "Configurações Salvas!" });
            checkStatus();
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao salvar" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateWebhook = async () => {
        if (!webhookUrl) return;
        setIsRefreshing(true);
        try {
            const res = await fetch('/api/notifications/instance', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ allowWebhook: true, webhookMessage: webhookUrl })
            });
            if (res.ok) {
                toast({ title: "Webhook Ativado!", description: "O gateway agora enviará respostas para este sistema." });
            } else {
                const err = await res.json();
                toast({ variant: 'destructive', title: "Erro na API", description: err.error });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Falha na conexão" });
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleCopyWebhook = () => {
        navigator.clipboard.writeText(webhookUrl);
        toast({ title: "Copiado!", description: "Cole esta URL no campo 'Webhook' do portal api-wa.me" });
    };

    if (isLoadingConfig) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6 text-slate-900">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 shadow-lg border-2">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-sm font-black uppercase flex items-center gap-2">Configurações de Conexão</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">API Key (us.api-wa.me)</Label>
                            <div className="relative">
                                <Key className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                <Input type="password" value={waKey} onChange={e => setWaKey(e.target.value)} placeholder="Cole sua chave da instância aqui..." className="pl-10 h-11" />
                            </div>
                        </div>
                        <div className="space-y-2 pt-4 border-t">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">URL do Webhook do Sistema</Label>
                            <div className="flex gap-2">
                                <Input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="URL pública do seu OikoApp..." className="font-mono text-xs h-11" />
                                <Button onClick={handleCopyWebhook} variant="outline" size="icon" className="h-11 w-11"><Copy size={16}/></Button>
                                <Button onClick={handleUpdateWebhook} variant="outline" className="h-11 px-6" disabled={isRefreshing}>Ativar no Gateway</Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground italic mt-1 flex items-center gap-1">
                                <Info size={10} /> Esta URL deve ser inserida em todos os campos de Webhook do portal api-wa.me para capturar Enquetes e Botões.
                            </p>
                        </div>
                        <div className="pt-6 border-t">
                            <Button onClick={handleSaveKey} disabled={isSaving} className="w-full font-bold h-11">Salvar Credenciais</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className={cn("shadow-lg border-2", instanceStatus?.status === 'connected' ? "border-emerald-200" : "border-amber-200")}>
                    <CardHeader className="border-b bg-white/50">
                        <CardTitle className="text-sm font-black uppercase flex items-center gap-2">Status do Gateway</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-8 flex flex-col items-center justify-center text-center min-h-[250px]">
                        {isRefreshing ? <Loader2 className="animate-spin size-8 text-primary opacity-40" /> : 
                         instanceStatus?.status === 'connected' ? (
                            <div className="space-y-4">
                                <div className="size-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><CheckCircle size={32} /></div>
                                <h4 className="font-black text-emerald-900 uppercase">Instância Ativa</h4>
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 font-black">PROTOCOLO BAILEYS OK</Badge>
                                <Button size="sm" variant="ghost" onClick={checkStatus} className="mt-4"><RefreshCw className="size-3 mr-2" /> Atualizar Status</Button>
                            </div>
                        ) : (
                            <div className="space-y-4 opacity-50 text-center">
                                <Smartphone size={48} className="mx-auto" />
                                <p className="text-xs font-bold uppercase tracking-widest">Aguardando Conexão</p>
                                <Button size="sm" variant="ghost" onClick={checkStatus}><RefreshCw className="size-3 mr-2" /> Verificar Agora</Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function NotificationsHistory() {
    const { firestore } = useFirebase();
    const historyQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'notifications_history'), orderBy('sentAt', 'desc'), limit(50)) : null,
    [firestore]);
    
    const { data: history, isLoading } = useCollection<any>(historyQuery);

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="rounded-xl border-2 bg-card overflow-hidden shadow-sm text-slate-900">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead>Data de Envio</TableHead>
                        <TableHead>Mensagem / Conteúdo</TableHead>
                        <TableHead>Público</TableHead>
                        <TableHead>Sucesso</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history?.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">Nenhum registro de disparo encontrado.</TableCell></TableRow>
                    ) : (
                        history?.map((item: any) => (
                            <TableRow key={item.id}>
                                <TableCell className="text-xs font-bold">
                                    {item.sentAt ? format(item.sentAt.toDate(), 'dd/MM HH:mm', { locale: ptBR }) : '-'}
                                </TableCell>
                                <TableCell className="max-w-md truncate text-xs font-medium">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="ghost" className="text-[8px] uppercase p-0.5">{item.type || 'text'}</Badge>
                                        {item.message}
                                    </div>
                                </TableCell>
                                <TableCell className="text-[10px] uppercase font-bold text-muted-foreground">{item.audience?.replace('_', ' ')}</TableCell>
                                <TableCell className="text-xs font-black">{item.successCount} de {item.recipientCount}</TableCell>
                                <TableCell className="text-right">
                                    <Badge className={cn("text-[10px] font-black uppercase border-none", item.status === 'success' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>{item.status}</Badge>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
        <Tabs defaultValue="sender" className="w-full">
            <div className="overflow-x-auto pb-2">
                <TabsList className="flex h-auto justify-start bg-muted/50 p-1 rounded-xl w-fit min-w-max border-2">
                    <TabsTrigger value="sender" className="rounded-lg font-bold py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Disparador</TabsTrigger>
                    <TabsTrigger value="chats" className="rounded-lg font-bold py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Conversas</TabsTrigger>
                    <TabsTrigger value="responses" className="rounded-lg font-bold py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Respostas Enquetes</TabsTrigger>
                    <TabsTrigger value="history" className="rounded-lg font-bold py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Histórico Envios</TabsTrigger>
                    <TabsTrigger value="config" className="rounded-lg font-bold py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Configuração</TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="sender" className="mt-6 animate-in fade-in-50 duration-300"><WhatsappSender /></TabsContent>
            <TabsContent value="chats" className="mt-6 animate-in fade-in-50 duration-300"><WhatsappChats /></TabsContent>
            <TabsContent value="responses" className="mt-6 animate-in fade-in-50 duration-300"><WhatsappResponses /></TabsContent>
            <TabsContent value="history" className="mt-6 animate-in fade-in-50 duration-300"><NotificationsHistory /></TabsContent>
            <TabsContent value="config" className="mt-6 animate-in fade-in-50 duration-300"><NotificationsConfig /></TabsContent>
        </Tabs>
    </div>
  );
}


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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
    Loader2, Send, Settings, Key, History, MessageSquare, 
    Users, CheckCircle2, Search, UserPlus, X, Info, RefreshCw, 
    Zap, AlertCircle, MessageCircle, MousePointer2, Trash2,
    Smartphone, LogOut, PlusCircle, CheckCircle, User as UserIcon,
    Sparkles, QrCode, ShieldAlert, Phone, ChevronRight, ImageIcon,
    Globe, HeartHandshake, CalendarDays
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
            limit(50)
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px] text-slate-900">
            <Card className="md:col-span-1 flex flex-col overflow-hidden border-2 shadow-sm">
                <CardHeader className="bg-muted/30 border-b py-4">
                    <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                        <MessageCircle className="size-4 text-primary" /> Conversas Ativas
                    </CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1">
                    <div className="divide-y">
                        {chats?.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-xs italic">Nenhuma conversa iniciada.</div>
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
                                    <Avatar className="h-10 w-10 border shadow-sm">
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
                        <h4 className="font-black text-slate-400 uppercase text-xs tracking-[0.2em]">Selecione uma conversa</h4>
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
                                    <div className="flex items-center gap-1.5">
                                        <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Chat Online</span>
                                    </div>
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
                                                ? "bg-emerald-500 text-white rounded-tr-none" 
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
                            <div className="flex gap-2">
                                <Input placeholder="Responda por aqui..." className="flex-1 h-11 bg-muted/20 border-none shadow-inner" disabled />
                                <Button size="icon" className="h-11 w-11 rounded-full shadow-lg" disabled><Send className="size-4" /></Button>
                            </div>
                            <p className="text-[9px] text-center mt-2 text-muted-foreground font-bold uppercase tracking-widest italic opacity-50">Respostas diretas via painel em desenvolvimento</p>
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
    const [debugError, setDebugError] = useState<any>(null);
    const [message, setMessage] = useState('');
    const [targetAudience, setTargetAudience] = useState('all_members');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [groups, setGroups] = useState<any[]>([]);
    const [isLoadingGroups, setIsLoadingGroups] = useState(false);
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

    const fetchGroups = async () => {
        setIsLoadingGroups(true);
        try {
            const response = await fetch('/api/notifications/groups');
            const data = await response.json();
            setGroups(data.groups || []);
        } catch (e) {
            setGroups([]);
        } finally {
            setIsLoadingGroups(false);
        }
    };

    useEffect(() => {
        if (targetAudience === 'whatsapp_group') fetchGroups();
    }, [targetAudience]);

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

    const handleAddSurveyOption = () => {
        if (surveyOptions.length < 5) setSurveyOptions([...surveyOptions, `Opção ${surveyOptions.length + 1}`]);
    };

    const handleUpdateSurveyOption = (idx: number, text: string) => {
        const newOpts = [...surveyOptions];
        newOpts[idx] = text;
        setSurveyOptions(newOpts);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setDebugError(null);
        
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
                setDebugError(result);
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
                            <SelectTrigger className="bg-background h-11 border-slate-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">Apenas Texto</SelectItem>
                                <SelectItem value="button">Mensagem com Botões</SelectItem>
                                <SelectItem value="survey">Enquete / Votação</SelectItem>
                                <SelectItem value="media">Imagem ou Documento</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Público-alvo</Label>
                        <Select value={targetAudience} onValueChange={setTargetAudience}>
                            <SelectTrigger className="bg-background h-11 border-slate-200">
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

                {targetAudience === 'specific_members' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/20 animate-in slide-in-from-top-2">
                        <Label>Pessoas Selecionadas</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                            <Input placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-11 border-slate-200" />
                            {filteredUsers.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg overflow-hidden">
                                    {filteredUsers.map(u => (
                                        <button key={u.id} type="button" onClick={() => handleAddUser(u.id)} className="w-full px-4 py-3 text-left hover:bg-primary/10 flex justify-between border-b transition-colors">
                                            <span className="font-medium">{u.name}</span>
                                            <UserPlus size={14} className="text-primary" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {selectedUsersList.map(u => (
                                <Badge key={u.id} variant="secondary" className="gap-1 bg-white border pr-1 h-7 text-slate-900">
                                    {u.name}
                                    <button type="button" onClick={() => handleRemoveUser(u.id)} className="hover:text-destructive transition-colors"><X size={14} /></button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {targetAudience === 'whatsapp_group' && (
                    <div className="space-y-2 p-4 border rounded-lg bg-muted/20 animate-in slide-in-from-top-2">
                        <Label>Escolha o Grupo</Label>
                        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                            <SelectTrigger className="bg-background h-11 border-slate-200">
                                <SelectValue placeholder={isLoadingGroups ? "Carregando grupos..." : "Selecione o grupo de destino"} />
                            </SelectTrigger>
                            <SelectContent>
                                {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name} ({g.participantCount} membros)</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {msgType === 'media' && (
                    <div className="space-y-4 p-6 border-2 border-dashed rounded-xl bg-slate-50 animate-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-2">
                            <ImageIcon className="text-primary size-5" />
                            <h4 className="font-bold text-sm uppercase tracking-tight">Anexar Mídia</h4>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Link da Imagem ou Arquivo (URL direta)</Label>
                            <Input 
                                value={mediaUrl} 
                                onChange={e => setMediaUrl(e.target.value)} 
                                placeholder="https://exemplo.com/imagem.jpg" 
                                className="bg-white h-11 font-mono text-xs border-slate-200" 
                            />
                            <p className="text-[10px] text-muted-foreground italic">Certifique-se de que o link termina com .jpg, .png ou .pdf.</p>
                        </div>
                    </div>
                )}

                {msgType === 'survey' && (
                    <div className="space-y-4 p-6 border-2 border-dashed rounded-xl bg-blue-50/50 animate-in zoom-in-95">
                        <div className="space-y-2">
                            <Label className="text-xs font-black text-blue-700 uppercase tracking-widest">Pergunta da Enquete</Label>
                            <Input value={surveyName} onChange={e => setSurveyName(e.target.value)} placeholder="Ex: Qual o melhor dia para o nosso GC?" className="bg-white h-11 font-bold border-blue-200" />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground">Opções de Voto (Mín 2, Máx 5)</Label>
                            <div className="grid gap-2">
                                {surveyOptions.map((opt, idx) => (
                                    <div key={idx} className="flex gap-2 group">
                                        <Input value={opt} onChange={e => handleUpdateSurveyOption(idx, e.target.value)} className="bg-white h-10 border-blue-100" />
                                        {surveyOptions.length > 2 && (
                                            <button type="button" className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-destructive" onClick={() => setSurveyOptions(surveyOptions.filter((_, i) => i !== idx))}>
                                                <Trash2 size={16}/>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {surveyOptions.length < 5 && (
                                <Button type="button" variant="outline" size="sm" onClick={handleAddSurveyOption} className="mt-2 bg-white text-xs font-bold border-blue-200">
                                    <PlusCircle size={14} className="mr-2" /> Adicionar Opção
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {msgType === 'button' && (
                    <div className="space-y-4 p-6 border-2 border-dashed rounded-xl bg-indigo-50/50 animate-in zoom-in-95">
                        <div className="space-y-2">
                            <Label className="text-xs font-black text-indigo-700 uppercase tracking-widest">Rodapé (Opcional)</Label>
                            <Input value={msgFooter} onChange={e => setMsgFooter(e.target.value)} className="bg-white border-indigo-200 h-11" />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground">Botões Interativos</Label>
                            <div className="grid gap-2">
                                {msgButtons.map((btn, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <Input value={btn.text} onChange={e => {
                                            const n = [...msgButtons];
                                            n[idx].text = e.target.value;
                                            setMsgButtons(n);
                                        }} className="bg-white h-10 border-indigo-100" />
                                        {msgButtons.length > 1 && (
                                            <button type="button" className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-destructive" onClick={() => setMsgButtons(msgButtons.filter((_, i) => i !== idx))}>
                                                <Trash2 size={16}/>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {msgButtons.length < 3 && (
                                <Button type="button" variant="outline" size="sm" onClick={handleAddBtn} className="mt-2 bg-white font-bold text-xs">
                                    <PlusCircle size={14} className="mr-2" /> Novo Botão
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label>{msgType === 'media' ? 'Legenda da Mídia' : 'Corpo da Mensagem'}</Label>
                        <div className="flex gap-2">
                            {QUICK_TEMPLATES.map(t => (
                                <Button key={t.id} type="button" variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-black tracking-tighter text-primary" onClick={() => setMessage(t.text)}>
                                    <t.icon size={12} className="mr-1" /> {t.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <Textarea 
                        placeholder="Olá {{nome}}, temos um recado..." 
                        className="min-h-[150px] text-base leading-relaxed bg-white shadow-inner border-slate-200" 
                        value={message} 
                        onChange={(e) => setMessage(e.target.value)} 
                        required 
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 italic">Use <code className="font-bold text-primary">{"{{nome}}"}</code> para personalizar.</p>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full h-14 text-lg font-black shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all">
                    {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Send className="mr-2 h-6 w-6" />}
                    Disparar Notificações
                </Button>
            </form>

            {debugError && (
                <Alert variant="destructive" className="mt-6 border-2">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle className="font-black uppercase tracking-widest text-xs">Erro Crítico do Gateway</AlertTitle>
                    <AlertDescription className="mt-2">
                        <pre className="text-[10px] font-mono whitespace-pre-wrap p-3 bg-black/10 rounded-lg overflow-x-auto">
                            {JSON.stringify(debugError, null, 2)}
                        </pre>
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}

function WhatsappResponses() {
    const { firestore } = useFirebase();
    const responsesQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'notifications_responses'), orderBy('receivedAt', 'desc')) : null,
    [firestore]);
    
    const { data: responses, isLoading } = useCollection<any>(responsesQuery);

    const pollStats = useMemo(() => {
        if (!responses) return {};
        const stats: Record<string, Record<string, number>> = {};
        responses.filter(r => r.type === 'poll').forEach(r => {
            const pollName = r.pollName || 'Enquete';
            if (!stats[pollName]) stats[pollName] = {};
            r.selectedOptions?.forEach((opt: string) => {
                stats[pollName][opt] = (stats[pollName][opt] || 0) + 1;
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
                        <Card key={name} className="border-blue-100 bg-blue-50/30">
                            <CardHeader className="py-3">
                                <CardTitle className="text-sm font-black uppercase text-blue-800">{name}</CardTitle>
                                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Resumo de Votos</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {Object.entries(votes).map(([opt, count]) => (
                                    <div key={opt} className="flex justify-between items-center text-xs">
                                        <span className="font-medium text-slate-700">{opt}</span>
                                        <Badge className="bg-blue-600 text-white font-black">{count}</Badge>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Membro</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Escolha / Resposta</TableHead>
                            <TableHead className="text-right">Data/Hora</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {responses?.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">Nenhuma resposta captada ainda.</TableCell></TableRow>
                        ) : (
                            responses?.map((res: any) => (
                                <TableRow key={res.id} className="hover:bg-muted/30">
                                    <TableCell>
                                        <div className="font-bold">{res.userName || res.from}</div>
                                        <div className="text-[10px] text-muted-foreground font-mono">+{res.from}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="ghost" className="text-[10px] uppercase font-black">{res.type === 'poll' ? 'Enquete' : 'Botão'}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "font-black text-[10px] py-1 border-emerald-200",
                                            res.type === 'poll' ? "bg-blue-50 text-blue-800" : "bg-emerald-50 text-emerald-800"
                                        )}>
                                            {res.type === 'poll' ? (res.selectedOptions?.join(', ') || 'Votou') : (res.buttonText || res.buttonId)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-muted-foreground font-medium">
                                        {res.receivedAt ? format(res.receivedAt.toDate(), 'dd/MM/yy HH:mm') : '-'}
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
            setWebhookUrl(config.webhookUrl || '');
        }
    }, [config]);

    const checkStatus = async () => {
        setIsRefreshing(true);
        try {
            const res = await fetch('/api/notifications/instance', { cache: 'no-store' });
            const data = await res.json();
            setInstanceStatus(data);
        } catch (e) {
            console.error("Erro ao verificar status:", e);
        }
        finally { setIsRefreshing(false); }
    };

    useEffect(() => {
        if (waKey) checkStatus();
    }, [waKey, config]);

    const handleAction = async (endpoint: string, method: string = 'POST', title: string) => {
        setIsRefreshing(true);
        try {
            const res = await fetch(`/api/notifications/instance${endpoint}`, { method });
            const data = await res.json();
            if (res.ok) {
                toast({ title: "Sucesso!", description: `${title} concluído.` });
                if (data.qr || data.status) setInstanceStatus(data);
                else setTimeout(checkStatus, 2000);
            } else {
                toast({ variant: 'destructive', title: "Erro na operação", description: data.error || data.message });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Falha na conexão" });
        } finally {
            setIsRefreshing(false);
        }
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
                body: JSON.stringify({
                    allowWebhook: true,
                    webhookMessage: webhookUrl
                })
            });
            if (res.ok) {
                toast({ title: "Webhook Configurado!", description: "A API agora enviará eventos para seu sistema." });
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

    if (isLoadingConfig) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    const isConnected = instanceStatus?.status === 'connected';

    return (
        <div className="space-y-6 text-slate-900">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 shadow-lg border-2 border-slate-200">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                            <Key className="size-4 text-primary" /> Credenciais e Webhook
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">API Key (api-wa.me)</Label>
                            <Input type="password" value={waKey} onChange={e => setWaKey(e.target.value)} placeholder="Cole sua chave aqui..." className="font-mono text-xs h-11 border-slate-200" />
                        </div>

                        <div className="space-y-2 pt-4 border-t">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">URL do Webhook (IBM Portal)</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Globe className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                    <Input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://seu-dominio.com/api/notifications/webhook" className="pl-10 h-11 border-slate-200 text-xs" />
                                </div>
                                <Button onClick={handleUpdateWebhook} variant="outline" className="h-11 font-bold border-primary text-primary" disabled={isRefreshing || !webhookUrl}>
                                    Ativar Webhook
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">Necessário para receber respostas de enquetes e botões.</p>
                        </div>

                        <div className="pt-6 border-t">
                            <Button onClick={handleSaveKey} disabled={isSaving} className="w-full h-11 font-bold shadow-lg">
                                {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <ShieldAlert size={18} className="mr-2" />}
                                Salvar Configurações
                            </Button>
                        </div>

                        <div className="pt-6 border-t space-y-4">
                            <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <Settings className="size-3" /> Gestão da Instância
                            </Label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <Button variant="outline" className="h-16 flex flex-col gap-1 items-center justify-center border-amber-200 hover:bg-amber-50" onClick={() => handleAction('/restart', 'POST', 'Reinício')} disabled={isRefreshing}>
                                    <RefreshCw size={18} className={cn("text-amber-600", isRefreshing && "animate-spin")} />
                                    <span className="text-[10px] font-black uppercase">Reiniciar</span>
                                </Button>
                                <Button variant="outline" className="h-16 flex flex-col gap-1 items-center justify-center border-blue-200 hover:bg-blue-50" onClick={() => handleAction('', 'PATCH', 'Ativação de Recursos')} disabled={isRefreshing}>
                                    <Sparkles size={18} className="text-blue-600" />
                                    <span className="text-[10px] font-black uppercase">Ativar Pro</span>
                                </Button>
                                <Button variant="outline" className="h-16 flex flex-col gap-1 items-center justify-center border-indigo-200 hover:bg-indigo-50" onClick={() => handleAction('', 'POST', 'Conexão')} disabled={isRefreshing}>
                                    <QrCode size={18} className="text-indigo-600" />
                                    <span className="text-[10px] font-black uppercase">Novo QR</span>
                                </Button>
                                <Button variant="outline" className="h-16 flex flex-col gap-1 items-center justify-center border-red-200 hover:bg-red-50 text-destructive" onClick={() => handleAction('', 'DELETE', 'Logout')} disabled={isRefreshing}>
                                    <LogOut size={18} />
                                    <span className="text-[10px] font-black uppercase">Desconectar</span>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={cn("shadow-lg border-2 transition-all", isConnected ? "border-emerald-200 bg-emerald-50/10" : "border-amber-200 bg-amber-50/10")}>
                    <CardHeader className="border-b bg-white/50">
                        <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                            <Smartphone className="size-4" /> Status do Dispositivo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-8 flex flex-col items-center justify-center text-center min-h-[250px] relative">
                        {isRefreshing ? (
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="animate-spin size-12 text-primary opacity-40" />
                                <p className="text-[10px] font-bold uppercase text-muted-foreground animate-pulse">Sincronizando...</p>
                            </div>
                        ) : isConnected ? (
                            <div className="space-y-4 animate-in fade-in zoom-in-95">
                                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner ring-4 ring-emerald-50">
                                    <CheckCircle size={40} />
                                </div>
                                <div>
                                    <h4 className="font-black text-emerald-900 uppercase tracking-tight">Sistema Online</h4>
                                    <p className="text-[10px] text-emerald-700 font-bold uppercase mt-1">Conectado com Sucesso</p>
                                </div>
                                <Badge className="bg-emerald-600 text-white border-none font-black text-[10px] px-4">ATIVO</Badge>
                            </div>
                        ) : (instanceStatus?.qr || instanceStatus?.status === 'pairing') ? (
                            <div className="space-y-4 animate-in fade-in zoom-in-95">
                                {instanceStatus.qr ? (
                                    <div className="p-4 bg-white border-2 border-dashed rounded-2xl shadow-xl">
                                        <img src={instanceStatus.qr} alt="WhatsApp QR Code" className="size-48" />
                                    </div>
                                ) : (
                                    <div className="p-12 bg-white border-2 border-dashed rounded-2xl shadow-inner flex flex-col items-center justify-center">
                                        <Loader2 className="animate-spin size-8 text-primary mb-2" />
                                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Gerando código...</p>
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-black text-amber-900 uppercase">Aguardando Pareamento</h4>
                                    <p className="text-[10px] text-amber-700 font-bold uppercase mt-1">Escaneie pelo WhatsApp</p>
                                </div>
                                <Button size="sm" variant="ghost" onClick={checkStatus} className="text-[10px] font-black uppercase"><RefreshCw size={14} className="mr-2"/> Atualizar</Button>
                            </div>
                        ) : (
                            <div className="space-y-4 opacity-50">
                                <Smartphone size={64} className="text-muted-foreground mx-auto" />
                                <p className="text-xs font-bold text-muted-foreground uppercase max-w-[200px] mx-auto">
                                    {instanceStatus?.message || 'Status não identificado. Verifique a API Key.'}
                                </p>
                                <Button size="sm" variant="ghost" onClick={checkStatus} className="text-[10px] font-black uppercase"><RefreshCw size={14} className="mr-2"/> Atualizar</Button>
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
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm text-slate-900">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead>Data de Envio</TableHead>
                        <TableHead>Mensagem / Conteúdo</TableHead>
                        <TableHead>Público</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history?.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">Nenhum histórico encontrado.</TableCell></TableRow>
                    ) : (
                        history?.map((item: any) => (
                            <TableRow key={item.id} className="hover:bg-muted/30">
                                <TableCell className="text-xs font-bold">
                                    {item.sentAt ? format(item.sentAt.toDate(), 'dd/MM/yy HH:mm') : '-'}
                                </TableCell>
                                <TableCell className="max-w-md">
                                    <div className="flex flex-col">
                                        <span className="text-xs line-clamp-2">{item.message}</span>
                                        <Badge variant="ghost" className="w-fit text-[8px] h-4 mt-1 bg-slate-100 text-slate-600 uppercase">{item.type || 'text'}</Badge>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Users className="size-3 text-muted-foreground" />
                                        <span className="text-xs font-bold">{item.successCount || 0} de {item.recipientCount || 0}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge className={cn(
                                        "text-[10px] font-black uppercase border-none",
                                        item.status === 'success' ? "bg-emerald-100 text-emerald-800" : item.status === 'partial' ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                                    )}>
                                        {item.status === 'success' ? 'Sucesso' : item.status === 'partial' ? 'Parcial' : 'Falhou'}
                                    </Badge>
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
        <Card className="border-primary/20 bg-primary/5 shadow-sm text-slate-900">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-2xl font-black flex items-center gap-3 text-primary">
                        <Send className="size-7" /> Central de Notificações
                    </CardTitle>
                    <CardDescription className="text-primary/70 font-medium">Comunicação estratégica e cuidado IBM.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="bg-white font-black text-[10px] border-primary/20 text-primary">PLATAFORMA ATIVA</Badge>
                </div>
            </CardHeader>
        </Card>

        <Tabs defaultValue="sender" className="w-full">
            <div className="overflow-x-auto pb-2">
                <TabsList className="flex h-auto justify-start bg-muted/50 p-1 rounded-xl w-fit min-w-max">
                    <TabsTrigger value="sender" className="rounded-lg font-bold py-2 px-6 data-[state=active]:shadow-md">
                        <Send className="size-4 mr-2" /> Disparador
                    </TabsTrigger>
                    <TabsTrigger value="chats" className="rounded-lg font-bold py-2 px-6 data-[state=active]:shadow-md">
                        <MessageCircle className="size-4 mr-2" /> Conversas
                    </TabsTrigger>
                    <TabsTrigger value="responses" className="rounded-lg font-bold py-2 px-6 data-[state=active]:shadow-md">
                        <MousePointer2 className="size-4 mr-2" /> Respostas
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-lg font-bold py-2 px-6 data-[state=active]:shadow-md">
                        <History className="size-4 mr-2" /> Histórico
                    </TabsTrigger>
                    <TabsTrigger value="config" className="rounded-lg font-bold py-2 px-6 data-[state=active]:shadow-md">
                        <Settings className="size-4 mr-2" /> Configuração
                    </TabsTrigger>
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

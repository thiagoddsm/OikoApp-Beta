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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { 
    Loader2, Send, Settings, Key, Bot, History, MessageSquare, 
    Users, CheckCircle2, Search, UserPlus, X, Info, Layers, RefreshCw, 
    Zap, AlertCircle, MessageCircle, MousePointer2, Trash2,
    Smartphone, LogOut, PlusCircle, CheckCircle, User as UserIcon,
    Sparkles, QrCode, ShieldAlert, Phone, ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useDoc, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc, where, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const QUICK_TEMPLATES = [
    { id: 'welcome', label: 'Boas-vindas', icon: MessageSquare, text: 'Olá {{nome}}, que alegria ter você conosco na IBM! Desejamos que se sinta em casa. Como podemos orar por você hoje?' },
    { id: 'scale', label: 'Lembrete Escala', icon: Zap, text: 'Olá {{nome}}! Passando para lembrar do seu compromisso no Reino este final de semana. Sua dedicação faz a diferença!' },
];

function WhatsappChats() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [selectedChat, setSelectedChat] = useState<any>(null);
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const chatsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'notifications_chats'), orderBy('lastMessageAt', 'desc')) : null,
    [firestore]);
    const { data: chats, isLoading: isLoadingChats } = useCollection<any>(chatsQuery);

    const messagesQuery = useMemoFirebase(() => 
        (firestore && selectedChat) ? query(
            collection(firestore, 'notifications_messages'), 
            where('from', '==', selectedChat.phoneNumber),
            orderBy('receivedAt', 'asc'),
            limit(50)
        ) : null,
    [firestore, selectedChat]);
    const { data: messages } = useCollection<any>(messagesQuery);

    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users'), limit(50)) : null, [firestore]);
    const { data: allUsers } = useCollection<any>(usersQuery);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const filteredUsers = useMemo(() => {
        if (!userSearch || !allUsers) return [];
        return allUsers.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase())).slice(0, 5);
    }, [allUsers, userSearch]);

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || !selectedChat) return;

        setIsSending(true);
        try {
            const response = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel: 'whatsapp',
                    targetNumber: selectedChat.phoneNumber,
                    message: replyText,
                    type: 'text'
                }),
            });

            if (response.ok) {
                setReplyText('');
            } else {
                const err = await response.json();
                toast({ variant: 'destructive', title: "Erro ao responder", description: err.error });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Falha na conexão" });
        } finally {
            setIsSending(false);
        }
    };

    const handleStartChat = async (user: any) => {
        if (!user.phone) {
            toast({ variant: 'destructive', title: "Usuário sem telefone cadastrado." });
            return;
        }
        
        const phone = user.phone.replace(/\D/g, '');
        const formattedPhone = phone.length <= 11 ? `55${phone}` : phone;

        const chatData = {
            id: formattedPhone,
            phoneNumber: formattedPhone,
            userName: user.name,
            userId: user.id,
            lastMessage: 'Nova conversa iniciada',
            lastMessageAt: Timestamp.now(),
            unreadCount: 0,
            isGroup: false
        };

        if (firestore) {
            await setDocumentNonBlocking(doc(firestore, 'notifications_chats', formattedPhone), chatData, { merge: true });
            setSelectedChat(chatData);
            setIsNewChatOpen(false);
            setUserSearch('');
        }
    };

    if (isLoadingChats) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="flex h-[650px] border rounded-xl overflow-hidden bg-background shadow-lg">
            <div className="w-1/3 border-r bg-muted/10 flex flex-col">
                <div className="p-4 border-b bg-muted/5 flex justify-between items-center text-slate-900">
                    <h3 className="font-bold text-sm uppercase tracking-widest opacity-50">Conversas</h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => setIsNewChatOpen(true)}>
                        <PlusCircle size={18} />
                    </Button>
                </div>
                <ScrollArea className="flex-1">
                    {chats?.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground italic text-slate-900">Nenhuma conversa iniciada.</div>
                    ) : (
                        chats?.map(chat => (
                            <button
                                key={chat.id}
                                onClick={() => setSelectedChat(chat)}
                                className={cn(
                                    "w-full p-4 text-left border-b transition-all hover:bg-muted/50 flex gap-3 items-center relative",
                                    selectedChat?.id === chat.id ? "bg-white border-l-4 border-l-primary shadow-inner" : ""
                                )}
                            >
                                <Avatar className="h-10 w-10 shrink-0 border-2 border-white shadow-sm">
                                    <AvatarFallback className="bg-primary/5 text-primary"><UserIcon size={18} /></AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between items-baseline text-slate-900">
                                        <span className="font-bold text-sm truncate">{chat.userName || chat.phoneNumber}</span>
                                        <span className="text-[9px] text-muted-foreground uppercase font-bold">
                                            {chat.lastMessageAt ? format(chat.lastMessageAt.toDate(), 'HH:mm') : ''}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5 text-slate-900">{chat.lastMessage}</p>
                                </div>
                                {chat.unreadCount > 0 && <div className="size-2 bg-primary rounded-full absolute right-2 top-1/2 -translate-y-1/2" />}
                            </button>
                        ))
                    )}
                </ScrollArea>
            </div>

            <div className="flex-1 flex flex-col bg-slate-50/20 relative">
                {selectedChat ? (
                    <>
                        <div className="p-4 border-b bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10 text-slate-900">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border-2 border-primary/10">
                                    <AvatarFallback className="bg-primary text-white font-black"><UserIcon size={16} /></AvatarFallback>
                                </Avatar>
                                <div>
                                    <h4 className="font-bold text-sm leading-none">{selectedChat.userName || selectedChat.phoneNumber}</h4>
                                    <p className="text-[10px] text-muted-foreground mt-1 font-mono tracking-tighter">+{selectedChat.phoneNumber}</p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Phone size={16} /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Info size={16} /></Button>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 p-6">
                            <div className="space-y-6">
                                {messages?.map((msg: any) => (
                                    <div key={msg.id} className={cn("flex flex-col", msg.fromMe ? "items-end" : "items-start")}>
                                        <div className={cn(
                                            "max-w-[85%] p-3 px-4 rounded-2xl shadow-sm text-sm transition-all",
                                            msg.fromMe 
                                                ? "bg-primary text-primary-foreground rounded-tr-none" 
                                                : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                                        )}>
                                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                            <div className={cn(
                                                "text-[9px] mt-1.5 flex items-center gap-1",
                                                msg.fromMe ? "justify-end text-primary-foreground/60" : "text-muted-foreground"
                                            )}>
                                                {msg.receivedAt ? format(msg.receivedAt.toDate(), 'HH:mm') : ''}
                                                {msg.fromMe && <CheckCircle2 size={10} className="text-primary-foreground/40" />}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={scrollRef} className="h-4" />
                            </div>
                        </ScrollArea>

                        <div className="p-4 bg-white border-t">
                            <form onSubmit={handleSendReply} className="flex gap-3 items-end">
                                <Textarea 
                                    placeholder="Digite sua resposta..." 
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    className="min-h-[44px] max-h-[120px] bg-muted/30 border-none focus-visible:ring-primary py-3 resize-none rounded-xl"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendReply(e as any);
                                        }
                                    }}
                                />
                                <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-xl shadow-lg shadow-primary/20" disabled={isSending || !replyText?.trim()}>
                                    {isSending ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                        <div className="p-8 bg-primary/5 rounded-full mb-6">
                            <MessageSquare size={64} className="text-primary/20" />
                        </div>
                        <h3 className="font-black text-xl text-slate-900 tracking-tight">Suas Conversas</h3>
                        <p className="text-sm max-w-xs mt-2 text-slate-500 text-slate-900">Selecione um membro na lateral ou inicie uma nova conversa.</p>
                        <Button variant="outline" className="mt-6 rounded-full font-bold px-6" onClick={() => setIsNewChatOpen(true)}>
                            <UserPlus className="mr-2 size-4" /> Buscar Pessoa
                        </Button>
                    </div>
                )}
            </div>

            <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Iniciar Nova Conversa</DialogTitle>
                        <DialogDescription>Busque um membro da igreja para abrir o chat.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                            <Input 
                                placeholder="Digite o nome..." 
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                className="pl-10 h-11"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            {filteredUsers.map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => handleStartChat(u)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all text-left group"
                                >
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback className="bg-primary/5 text-primary font-black">{u.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">{u.name}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter text-slate-900">{u.phone || 'Sem telefone'}</p>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-primary" />
                                </button>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
    const [msgType, setMsgType] = useState<'text' | 'button' | 'survey' | 'media' | 'pix'>('text');

    const [msgTitle, setMsgTitle] = useState('Informativo IBM');
    const [msgFooter, setMsgFooter] = useState('Igreja Batista da Manhã');
    const [msgButtons, setMsgButtons] = useState([{ id: 'btn_1', text: 'Confirmar Presença ✅' }, { id: 'btn_2', text: 'Não poderei ir ❌' }]);
    const [surveyName, setSurveyName] = useState('');
    const [surveyOptions, setSurveyOptions] = useState(['Sim', 'Não']);
    const [mediaUrl, setMediaUrl] = useState('');
    const [pixKey, setPixKey] = useState('');
    const [pixName, setPixName] = useState('Igreja Batista da Manhã');
    const [pixCity, setPixCity] = useState('Sao Goncalo');
    const [pixAmount, setPixAmount] = useState('');

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
            setMsgButtons([...msgButtons, { id: `btn_${Date.now()}`, text: `Botão ${msgButtons.length + 1}` }]);
        }
    };

    const handleUpdateBtn = (idx: number, text: string) => {
        const newBtns = [...msgButtons];
        newBtns[idx].text = text;
        setMsgButtons(newBtns);
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
            payload.title = msgTitle;
            payload.footer = msgFooter;
            payload.buttons = msgButtons;
        } else if (msgType === 'survey') {
            payload.surveyName = surveyName;
            payload.options = surveyOptions;
        } else if (msgType === 'media') {
            payload.mediaUrl = mediaUrl;
        } else if (msgType === 'pix') {
            payload.pixKey = pixKey;
            payload.pixName = pixName;
            payload.pixCity = pixCity;
            payload.pixAmount = pixAmount;
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
        <div className="space-y-6">
            <form onSubmit={handleSend} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-slate-900">Formato da Mensagem</Label>
                        <Select value={msgType} onValueChange={(v:any) => setMsgType(v)}>
                            <SelectTrigger className="bg-background h-11 border-slate-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">Apenas Texto</SelectItem>
                                <SelectItem value="button">Mensagem com Botões</SelectItem>
                                <SelectItem value="survey">Enquete / Votação</SelectItem>
                                <SelectItem value="media">Imagem ou Documento</SelectItem>
                                <SelectItem value="pix">QR Code PIX</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-900">Público-alvo</Label>
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
                        <Label className="text-slate-900">Pessoas Selecionadas</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                            <Input placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-11 border-slate-200" />
                            {filteredUsers.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg overflow-hidden">
                                    {filteredUsers.map(u => (
                                        <button key={u.id} type="button" onClick={() => handleAddUser(u.id)} className="w-full px-4 py-3 text-left hover:bg-primary/10 flex justify-between border-b transition-colors">
                                            <span className="font-medium text-slate-900">{u.name}</span>
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
                        <Label className="text-slate-900">Escolha o Grupo</Label>
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

                {msgType === 'survey' && (
                    <div className="space-y-4 p-6 border-2 border-dashed rounded-xl bg-blue-50/50 animate-in zoom-in-95">
                        <div className="space-y-2">
                            <Label className="text-xs font-black text-blue-700 uppercase tracking-widest">Pergunta da Enquete</Label>
                            <Input value={surveyName} onChange={e => setSurveyName(e.target.value)} placeholder="Ex: Qual o melhor dia para o nosso GC?" className="bg-white h-11 font-bold border-blue-200" />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground text-slate-900">Opções de Voto (Mín 2, Máx 5)</Label>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-black text-indigo-700 uppercase tracking-widest">Título do Card</Label>
                                <Input value={msgTitle} onChange={e => setMsgTitle(e.target.value)} className="bg-white border-indigo-200" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black text-indigo-700 uppercase tracking-widest">Rodapé (Opcional)</Label>
                                <Input value={msgFooter} onChange={e => setMsgFooter(e.target.value)} className="bg-white border-indigo-200" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground text-slate-900">Botões Interativos</Label>
                            <div className="grid gap-2">
                                {msgButtons.map((btn, idx) => (
                                    <div key={btn.id} className="flex gap-2">
                                        <Input value={btn.text} onChange={e => handleUpdateBtn(idx, e.target.value)} className="bg-white h-10 border-indigo-100" />
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

                {msgType === 'pix' && (
                    <div className="space-y-4 p-6 border-2 border-dashed rounded-xl bg-emerald-50/50 animate-in zoom-in-95">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-black text-emerald-700">Chave PIX</Label>
                                <Input value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="Email, CPF ou Celular" className="bg-white border-emerald-200" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black text-emerald-700">Valor (R$)</Label>
                                <Input type="number" step="0.01" value={pixAmount} onChange={e => setPixAmount(e.target.value)} placeholder="0,00" className="bg-white border-emerald-200" />
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label className="text-slate-900">Corpo da Mensagem</Label>
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
                        required={msgType !== 'survey'} 
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 italic">Use <code className="font-bold text-primary">{"{{nome}}"}</code> para personalizar com o nome do membro.</p>
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
                        <p className="text-xs mb-3">Ocorreu uma falha na comunicação com a API api-wa.me:</p>
                        <pre className="text-[10px] font-mono whitespace-pre-wrap p-3 bg-black/10 rounded-lg overflow-x-auto border border-black/5">
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

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead>Membro</TableHead>
                        <TableHead>Escolha / Resposta</TableHead>
                        <TableHead className="text-right">Data/Hora</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {responses?.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic text-slate-900">Nenhuma resposta captada pelo Webhook ainda.</TableCell></TableRow>
                    ) : (
                        responses?.map((res: any) => (
                            <TableRow key={res.id} className="hover:bg-muted/30">
                                <TableCell>
                                    <div className="font-bold text-slate-900">{res.userName || res.from}</div>
                                    <div className="text-[10px] text-muted-foreground font-mono">+{res.from || '---'}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 font-black text-[10px] py-1">
                                        {res.buttonText || res.buttonId}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground font-medium text-slate-900">
                                    {res.receivedAt ? format(res.receivedAt.toDate(), 'dd/MM/yy HH:mm') : '-'}
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
    const [instanceStatus, setInstanceStatus] = useState<any>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (config) setWaKey(config.whatsappApiKey || '');
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
    }, [waKey]);

    const handleAction = async (endpoint: string, method: string = 'POST', title: string) => {
        setIsRefreshing(true);
        try {
            const res = await fetch(`/api/notifications/instance${endpoint}`, { method });
            if (res.ok) {
                toast({ title: "Sucesso!", description: `${title} concluído.` });
                setTimeout(checkStatus, 3000);
            } else {
                const data = await res.json();
                toast({ variant: 'destructive', title: "Erro na operação", description: data.error });
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
            await setDocumentNonBlocking(configRef, { whatsappApiKey: waKey, updatedAt: Timestamp.now() }, { merge: true });
            toast({ title: "Chave Salva!", description: "A integração será reiniciada com as novas credenciais." });
            checkStatus();
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao salvar" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingConfig) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    const isConnected = instanceStatus?.status === 'connected';

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 shadow-lg border-2 border-slate-200">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-sm font-black uppercase flex items-center gap-2 text-slate-900">
                            <Key className="size-4 text-primary" /> Credenciais do Gateway
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6 text-slate-900">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">API Key (api-wa.me)</Label>
                            <div className="flex gap-2">
                                <Input type="password" value={waKey} onChange={e => setWaKey(e.target.value)} placeholder="Cole sua chave aqui..." className="font-mono text-xs h-11 border-slate-200" />
                                <Button onClick={handleSaveKey} disabled={isSaving} className="h-11 px-6 font-bold shadow-lg">
                                    {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <ShieldAlert size={18} className="mr-2" />}
                                    Salvar Chave
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground italic mt-1">Essa chave é fornecida no painel do administrador do api-wa.me após contratar o Plano Pro.</p>
                        </div>

                        <div className="pt-6 border-t space-y-4">
                            <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <Settings className="size-3" /> Gestão da Instância
                            </Label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <Button variant="outline" className="h-16 flex flex-col gap-1 items-center justify-center border-amber-200 hover:bg-amber-50 text-slate-900" onClick={() => handleAction('/restart', 'POST', 'Reinício')} disabled={isRefreshing}>
                                    <RefreshCw size={18} className={cn("text-amber-600", isRefreshing && "animate-spin")} />
                                    <span className="text-[10px] font-black uppercase">Reiniciar</span>
                                </Button>
                                <Button variant="outline" className="h-16 flex flex-col gap-1 items-center justify-center border-blue-200 hover:bg-blue-50 text-slate-900" onClick={() => handleAction('', 'PATCH', 'Ativação de Recursos')} disabled={isRefreshing}>
                                    <Sparkles size={18} className="text-blue-600" />
                                    <span className="text-[10px] font-black uppercase">Ativar Pro</span>
                                </Button>
                                <Button variant="outline" className="h-16 flex flex-col gap-1 items-center justify-center border-indigo-200 hover:bg-indigo-50 text-slate-900" onClick={() => handleAction('', 'POST', 'Geração de QR')} disabled={isRefreshing}>
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
                        <CardTitle className="text-sm font-black uppercase flex items-center gap-2 text-slate-900">
                            <Smartphone className="size-4" /> Status do Dispositivo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-8 flex flex-col items-center justify-center text-center min-h-[250px] text-slate-900">
                        {isRefreshing ? (
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="animate-spin size-12 text-primary opacity-40" />
                                <p className="text-[10px] font-bold uppercase text-muted-foreground animate-pulse">Sincronizando com Gateway...</p>
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
                        ) : instanceStatus?.qr ? (
                            <div className="space-y-4 animate-in fade-in zoom-in-95">
                                <div className="p-4 bg-white border-2 border-dashed rounded-2xl shadow-xl">
                                    <img src={instanceStatus.qr} alt="WhatsApp QR Code" className="size-48" />
                                </div>
                                <div>
                                    <h4 className="font-black text-amber-900 uppercase">Aguardando Pareamento</h4>
                                    <p className="text-[10px] text-amber-700 font-bold uppercase mt-1">Escaneie pelo WhatsApp</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 opacity-50">
                                <Smartphone size={64} className="text-muted-foreground mx-auto" />
                                <p className="text-xs font-bold text-muted-foreground uppercase max-w-[200px] mx-auto">
                                    {instanceStatus?.message || 'Status não identificado. Verifique a API Key.'}
                                </p>
                                <Button size="sm" variant="ghost" onClick={checkStatus} className="text-[10px] font-black uppercase text-slate-900"><RefreshCw size={14} className="mr-2"/> Atualizar agora</Button>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="bg-white/50 border-t p-4 mt-auto">
                        <div className="w-full flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase text-slate-900">
                            <span>Última Checagem:</span>
                            <span>{new Date().toLocaleTimeString()}</span>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-2xl font-black flex items-center gap-3 text-primary">
                        <Send className="size-7" /> Central de Notificações
                    </CardTitle>
                    <CardDescription className="text-primary/70 font-medium">Motor de comunicação estratégica e cuidado IBM.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="bg-white font-black text-[10px] border-primary/20 text-primary">PLAN PRO ACTIVE</Badge>
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

function NotificationsHistory() {
    const { firestore } = useFirebase();
    const historyQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'notifications_history'), orderBy('sentAt', 'desc'), limit(50)) : null,
    [firestore]);
    
    const { data: history, isLoading } = useCollection<any>(historyQuery);

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
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
                        <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic text-slate-900">Nenhum histórico de disparos em massa encontrado.</TableCell></TableRow>
                    ) : (
                        history?.map((item: any) => (
                            <TableRow key={item.id} className="hover:bg-muted/30">
                                <TableCell className="text-xs font-bold text-slate-900">
                                    {item.sentAt ? format(item.sentAt.toDate(), 'dd/MM/yy HH:mm') : '-'}
                                </TableCell>
                                <TableCell className="max-w-md">
                                    <div className="flex flex-col text-slate-900">
                                        <span className="text-xs line-clamp-2">{item.message}</span>
                                        <Badge variant="ghost" className="w-fit text-[8px] h-4 mt-1 bg-slate-100 text-slate-600 uppercase">{item.type || 'text'}</Badge>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-slate-900">
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
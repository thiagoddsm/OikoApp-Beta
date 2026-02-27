
'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
    Loader2, Send, Settings, Key, Bot, History, MessageSquare, Mail, 
    Users, CheckCircle2, Search, UserPlus, X, Info, Layers, RefreshCw, 
    Zap, AlertCircle, Group, LayoutTemplate, Sparkles, MessageCircle, MousePointer2,
    UserCheck, Trash2, BarChart3, FileText, Image as ImageIcon, Link as LinkIcon,
    QrCode, Smartphone, LogOut, PlusCircle, CheckCircle, User as UserIcon,
    Banknote, Wallet, Bug, ShieldAlert, Award, Phone, ChevronRight, Edit, ListTodo
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useDoc, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc, where, limit, addDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const QUICK_TEMPLATES = [
    { id: 'welcome', label: 'Boas-vindas', icon: MessageSquare, text: 'Olá {{nome}}, que alegria ter você conosco na IBM! Desejamos que se sinta em casa. Como podemos orar por você hoje?' },
    { id: 'scale', label: 'Lembrete Escala', icon: Zap, text: 'Olá {{nome}}! Passando para lembrar do seu compromisso no Reino este final de semana. Sua dedicação faz a diferença!' },
];

function WhatsappChats() {
    const { firestore, user: currentUser } = useFirebase();
    const { toast } = useToast();
    const [selectedChat, setSelectedChat] = useState<any>(null);
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Consulta de Chats
    const chatsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'notifications_chats'), orderBy('lastMessageAt', 'desc')) : null,
    [firestore]);
    const { data: chats, isLoading: isLoadingChats, error: chatsError } = useCollection<any>(chatsQuery);

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

    if (chatsError) {
        return (
            <div className="p-8 text-center bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle className="mx-auto size-8 text-red-500 mb-2" />
                <h3 className="font-bold text-red-800">Erro ao carregar conversas</h3>
                <p className="text-xs text-red-600 mt-1">Verifique se os índices do Firestore foram criados.</p>
            </div>
        );
    }

    return (
        <div className="flex h-[650px] border rounded-xl overflow-hidden bg-background shadow-lg">
            <div className="w-1/3 border-r bg-muted/10 flex flex-col">
                <div className="p-4 border-b bg-muted/5 flex justify-between items-center">
                    <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Conversas</h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => setIsNewChatOpen(true)}>
                        <PlusCircle size={18} />
                    </Button>
                </div>
                <ScrollArea className="flex-1">
                    {chats?.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground italic">Nenhuma conversa iniciada.</div>
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
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-bold text-sm truncate text-slate-900">{chat.userName || chat.phoneNumber}</span>
                                        <span className="text-[9px] text-muted-foreground uppercase font-bold">
                                            {chat.lastMessageAt ? format(chat.lastMessageAt.toDate(), 'HH:mm') : ''}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">{chat.lastMessage}</p>
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
                        <div className="p-4 border-b bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border-2 border-primary/10">
                                    <AvatarFallback className="bg-primary text-white font-black"><UserIcon size={16} /></AvatarFallback>
                                </Avatar>
                                <div>
                                    <h4 className="font-bold text-sm leading-none text-slate-900">{selectedChat.userName || selectedChat.phoneNumber}</h4>
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
                        <p className="text-sm max-w-xs mt-2 text-slate-500">Selecione um membro na lateral ou inicie uma nova conversa.</p>
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
                                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">{u.phone || 'Sem telefone'}</p>
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

    // Configurações específicas
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
                        <Label>Formato</Label>
                        <Select value={msgType} onValueChange={(v:any) => setMsgType(v)}>
                            <SelectTrigger className="bg-background">
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
                        <Label>Público-alvo</Label>
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

                {targetAudience === 'specific_members' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                        <Label>Pessoas Selecionadas</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                            <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-11" />
                            {filteredUsers.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg overflow-hidden">
                                    {filteredUsers.map(u => (
                                        <button key={u.id} type="button" onClick={() => handleAddUser(u.id)} className="w-full px-4 py-3 text-left hover:bg-primary/10 flex justify-between border-b">
                                            <span>{u.name}</span>
                                            <UserPlus size={14} className="text-muted-foreground" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {selectedUsersList.map(u => (
                                <Badge key={u.id} variant="secondary" className="gap-1 bg-white border">
                                    {u.name}
                                    <button type="button" onClick={() => handleRemoveUser(u.id)}><X size={12} /></button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {msgType === 'survey' && (
                    <div className="space-y-4 p-4 border border-dashed rounded-lg bg-blue-50">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-blue-700">Pergunta da Enquete</Label>
                            <Input value={surveyName} onChange={e => setSurveyName(e.target.value)} placeholder="Ex: Qual o melhor dia para o nosso GC?" className="bg-white" />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground">Opções (Mín 2, Máx 5)</Label>
                            {surveyOptions.map((opt, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <Input value={opt} onChange={e => handleUpdateSurveyOption(idx, e.target.value)} className="bg-white" />
                                    {surveyOptions.length > 2 && <Button variant="ghost" size="icon" onClick={() => setSurveyOptions(surveyOptions.filter((_, i) => i !== idx))}><Trash2 size={14}/></Button>}
                                </div>
                            ))}
                            {surveyOptions.length < 5 && <Button variant="outline" size="sm" onClick={handleAddSurveyOption} className="bg-white"><PlusCircle size={12} className="mr-2" /> Adicionar Opção</Button>}
                        </div>
                    </div>
                )}

                {msgType === 'button' && (
                    <div className="space-y-4 p-4 border border-dashed rounded-lg bg-indigo-50">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-indigo-700">Título</Label>
                                <Input value={msgTitle} onChange={e => setMsgTitle(e.target.value)} className="bg-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-indigo-700">Rodapé</Label>
                                <Input value={msgFooter} onChange={e => setMsgFooter(e.target.value)} className="bg-white" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground">Botões Interativos</Label>
                            {msgButtons.map((btn, idx) => (
                                <div key={btn.id} className="flex gap-2">
                                    <Input value={btn.text} onChange={e => handleUpdateBtn(idx, e.target.value)} className="bg-white" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <Label>Texto da Mensagem</Label>
                    <Textarea 
                        placeholder="Olá {{nome}}..." 
                        className="min-h-[120px]" 
                        value={message} 
                        onChange={(e) => setMessage(e.target.value)} 
                        required={msgType !== 'survey'} 
                    />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full h-12 text-base font-bold">
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                    Enviar Notificação
                </Button>
            </form>

            {debugError && (
                <Alert variant="destructive" className="mt-6">
                    <AlertTitle>Erro do Gateway</AlertTitle>
                    <AlertDescription className="text-xs font-mono whitespace-pre-wrap mt-2 p-2 bg-black/5 rounded">
                        {JSON.stringify(debugError, null, 2)}
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
        <div className="rounded-lg border bg-card overflow-hidden">
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
                        <TableRow><TableCell colSpan={3} className="h-32 text-center text-muted-foreground">Nenhuma resposta recebida.</TableCell></TableRow>
                    ) : (
                        responses?.map((res: any) => (
                            <TableRow key={res.id}>
                                <TableCell className="font-bold">{res.userName || res.from}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                                        {res.buttonText || res.buttonId}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
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
    const [isGeneratingQR, setIsGeneratingQR] = useState(false);
    const [instanceStatus, setInstanceStatus] = useState<any>(null);

    useEffect(() => {
        if (config) setWaKey(config.whatsappApiKey || '');
    }, [config]);

    const checkStatus = async () => {
        try {
            const res = await fetch('/api/notifications/instance');
            const data = await res.json();
            setInstanceStatus(data);
        } catch (e) {}
    };

    useEffect(() => {
        if (waKey) checkStatus();
    }, [waKey]);

    const handleSaveKey = async () => {
        if (!firestore) return;
        setIsSaving(true);
        const configRef = doc(firestore, 'config', 'notifications');
        try {
            await setDocumentNonBlocking(configRef, { whatsappApiKey: waKey, updatedAt: Timestamp.now() }, { merge: true });
            toast({ title: "Chave Salva!" });
            checkStatus();
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao salvar" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingConfig) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>API Key</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <Input type="password" value={waKey} onChange={e => setWaKey(e.target.value)} placeholder="Chave do api-wa.me" />
                        <Button onClick={handleSaveKey} disabled={isSaving} className="w-full">Salvar Chave</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Status</CardTitle></CardHeader>
                    <CardContent className="text-center">
                        <div className={cn("size-4 rounded-full mx-auto mb-2", instanceStatus?.status === 'connected' ? "bg-emerald-500" : "bg-amber-500")} />
                        <span className="font-bold text-xs uppercase">{instanceStatus?.status || 'Aguardando'}</span>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
                <CardTitle className="text-2xl font-black flex items-center gap-3">
                    <Send className="text-primary" /> Central de Notificações
                </CardTitle>
                <CardDescription>Comunicação estratégica para a igreja.</CardDescription>
            </CardHeader>
        </Card>

        <Tabs defaultValue="sender" className="w-full">
            <TabsList className="grid w-full grid-cols-5 max-w-3xl bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="sender" className="font-bold">Disparador</TabsTrigger>
                <TabsTrigger value="chats" className="font-bold">Conversas</TabsTrigger>
                <TabsTrigger value="responses" className="font-bold">Respostas</TabsTrigger>
                <TabsTrigger value="history" className="font-bold">Histórico</TabsTrigger>
                <TabsTrigger value="config" className="font-bold">Configuração</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sender" className="mt-6"><WhatsappSender /></TabsContent>
            <TabsContent value="chats" className="mt-6"><WhatsappChats /></TabsContent>
            <TabsContent value="responses" className="mt-6"><WhatsappResponses /></TabsContent>
            <TabsContent value="history" className="mt-6"><NotificationsHistory /></TabsContent>
            <TabsContent value="config" className="mt-6"><NotificationsConfig /></TabsContent>
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
                    {history?.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Nenhum histórico.</TableCell></TableRow>
                    ) : (
                        history?.map((item: any) => (
                            <TableRow key={item.id}>
                                <TableCell className="text-xs">{item.sentAt ? format(item.sentAt.toDate(), 'dd/MM/yy HH:mm') : '-'}</TableCell>
                                <TableCell className="text-xs max-w-xs truncate">{item.message}</TableCell>
                                <TableCell>{item.recipientCount} pessoas</TableCell>
                                <TableCell><Badge variant="outline">{item.status === 'success' ? 'Sucesso' : 'Erro'}</Badge></TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

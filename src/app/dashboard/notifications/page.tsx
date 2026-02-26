
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
    Banknote, Wallet, Bug, ShieldAlert, Award, Phone, ChevronRight, Edit
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
                        <p className="text-sm max-w-xs mt-2 text-slate-500">Selecione um membro na lateral ou inicie uma nova conversa pelo botão <PlusCircle className="inline size-3 mr-0.5" /> no topo.</p>
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
                            {userSearch && filteredUsers.length === 0 && (
                                <p className="text-center py-8 text-xs text-muted-foreground italic">Nenhum membro encontrado.</p>
                            )}
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
    const [testPhoneNumber, setTestPhoneNumber] = useState('');
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
            const groupsList = Array.isArray(data.groups) ? data.groups : [];
            setGroups(groupsList);
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

    const handleAddBtn = () => {
        if (msgButtons.length < 3) {
            setMsgButtons([...msgButtons, { id: `btn_${Date.now()}`, text: `Botão ${msgButtons.length + 1}` }]);
        }
    };
    const handleRemoveBtn = (idx: number) => {
        setMsgButtons(msgButtons.filter((_, i) => i !== idx));
    };
    const handleUpdateBtn = (idx: number, text: string) => {
        const newBtns = [...msgButtons];
        newBtns[idx].text = text;
        setMsgButtons(newBtns);
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

    const handleSend = async (e?: React.FormEvent, forcePayload?: any) => {
        if (e) e.preventDefault();
        setDebugError(null);
        
        if (!forcePayload) {
            if (targetAudience === 'specific_members' && selectedUserIds.length === 0) {
                toast({ variant: 'destructive', title: "Selecione pelo menos uma pessoa." });
                return;
            }
            if (targetAudience === 'whatsapp_group' && !selectedGroupId) {
                toast({ variant: 'destructive', title: "Selecione um grupo de WhatsApp." });
                return;
            }
        }

        setIsLoading(true);

        const payload: any = forcePayload || {
            channel: 'whatsapp',
            audience: targetAudience,
            message,
            userIds: targetAudience === 'specific_members' ? selectedUserIds : undefined,
            targetNumber: targetAudience === 'whatsapp_group' ? selectedGroupId : undefined,
            type: msgType,
        };

        if (!forcePayload) {
            if (msgType === 'button') {
                payload.title = msgTitle || "Convite IBM";
                payload.footer = msgFooter || "Igreja Batista da Manhã";
                payload.buttons = msgButtons.map(b => ({ id: b.id, text: b.text }));
            }
            if (msgType === 'survey') {
                payload.surveyName = surveyName || "Enquete IBM";
                payload.options = surveyOptions;
            }
            if (msgType === 'media') {
                payload.mediaUrl = mediaUrl;
            }
            if (msgType === 'pix') {
                payload.pixKey = pixKey;
                payload.pixName = pixName;
                payload.pixCity = pixCity;
                payload.pixAmount = pixAmount;
            }
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
                if (!forcePayload) {
                    if (msgType !== 'pix') setMessage('');
                    setSelectedUserIds([]);
                    setSurveyName('');
                    setMediaUrl('');
                }
            } else {
                setDebugError(result);
                toast({ 
                    variant: 'destructive', 
                    title: "Falha no Envio", 
                    description: result.error || "Ocorreu um erro no gateway." 
                });
            }
        } catch(error) {
             toast({ variant: 'destructive', title: "Erro crítico", description: "Falha na conexão com o servidor." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
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
                                <SelectItem value="pix">QR Code PIX (Pagamento)</SelectItem>
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

                {targetAudience === 'specific_members' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/20 animate-in fade-in zoom-in-95 duration-200">
                        <Label className="flex items-center gap-2">
                            <Search size={14} /> Selecionar Pessoas
                        </Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                            <Input 
                                placeholder="Digite o nome para buscar..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-background h-11"
                            />
                            {filteredUsers.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg overflow-hidden">
                                    {filteredUsers.map(u => (
                                        <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => handleAddUser(u.id)}
                                            className="w-full px-4 py-3 text-left text-sm hover:bg-primary/10 flex items-center justify-between group border-b last:border-0"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-black">{u.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{u.name}</span>
                                                    <span className="text-[9px] text-muted-foreground uppercase">{u.phone}</span>
                                                </div>
                                            </div>
                                            <UserPlus size={14} className="text-muted-foreground group-hover:text-primary" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                            {selectedUsersList.map(u => (
                                <Badge key={u.id} variant="secondary" className="pl-3 pr-1 py-1 gap-1 bg-white border shadow-sm">
                                    {u.name}
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemoveUser(u.id)}
                                        className="hover:text-destructive p-0.5 rounded-full hover:bg-destructive/10 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {targetAudience === 'whatsapp_group' && (
                    <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="group-select">Escolha o Grupo</Label>
                            <button 
                                type="button" 
                                className="text-xs flex items-center gap-1 text-primary hover:underline font-bold"
                                onClick={fetchGroups} 
                                disabled={isLoadingGroups}
                            >
                                <RefreshCw className={cn("size-3", isLoadingGroups && "animate-spin")} /> Atualizar
                            </button>
                        </div>
                        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                            <SelectTrigger id="group-select" className="bg-background h-11">
                                <SelectValue placeholder={isLoadingGroups ? "Buscando grupos..." : "Selecione um grupo"} />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingGroups ? (
                                    <div className="flex items-center justify-center p-4">
                                        <Loader2 className="size-4 animate-spin mr-2" />
                                        <span className="text-xs font-medium">Sincronizando com WhatsApp...</span>
                                    </div>
                                ) : (
                                    <>
                                        {Array.isArray(groups) && groups.length > 0 ? (
                                            groups.map(g => (
                                                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="none" disabled>Nenhum grupo carregado</SelectItem>
                                        )}
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {msgType === 'button' && (
                    <div className="space-y-4 p-4 border border-dashed rounded-lg bg-indigo-50 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-indigo-700">Título da Mensagem</Label>
                                <Input value={msgTitle} onChange={e => setMsgTitle(e.target.value)} placeholder="Ex: Convite IBM" className="bg-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-indigo-700">Rodapé</Label>
                                <Input value={msgFooter} onChange={e => setMsgFooter(e.target.value)} placeholder="Ex: Igreja Batista da Manhã" className="bg-white" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                                <MousePointer2 size={12} /> Botões (Máx 3)
                            </Label>
                            {msgButtons.map((btn, idx) => (
                                <div key={btn.id} className="flex gap-2">
                                    <Input value={btn.text} onChange={e => handleUpdateBtn(idx, e.target.value)} placeholder={`Botão ${idx + 1}`} className="bg-white" />
                                    {msgButtons.length > 1 && (
                                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveBtn(idx)}>
                                            <Trash2 size={14} className="text-destructive" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            {msgButtons.length < 3 && (
                                <Button type="button" variant="outline" size="sm" onClick={handleAddBtn} className="bg-white">
                                    <PlusCircle size={12} className="mr-2" /> Adicionar Botão
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <Label htmlFor="message">Texto Principal</Label>
                        <div className="flex gap-2">
                            {QUICK_TEMPLATES.map(t => (
                                <Button key={t.id} type="button" variant="outline" size="sm" className="h-7 text-[10px] uppercase font-black" onClick={() => applyTemplate(t.text)}>
                                    <t.icon size={10} className="mr-1" /> {t.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <Textarea 
                        id="message" 
                        placeholder="Olá {{nome}}..."
                        className="min-h-[120px] bg-background"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required={msgType !== 'survey'}
                    />
                </div>

                <Button type="submit" disabled={isLoading || (msgType !== 'survey' && !message?.trim())} className="w-full h-12 text-base font-bold shadow-lg">
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                    Enviar Notificação
                </Button>
            </form>

            {debugError && (
                <Alert variant="destructive" className="animate-in shake-1 border-2 mt-6">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle className="font-black uppercase tracking-tighter">Erro do Gateway</AlertTitle>
                    <AlertDescription className="mt-2 space-y-2">
                        <p className="text-sm font-bold">{debugError.error}</p>
                        <div className="bg-black/10 p-3 rounded font-mono text-[10px] overflow-auto max-h-40">
                            <pre>{JSON.stringify(debugError.details || debugError, null, 2)}</pre>
                        </div>
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
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [isConfiguringInstance, setIsConfiguringInstance] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [instanceStatus, setInstanceStatus] = useState<{status: string, message?: string, qr?: string, details?: any} | null>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);

    useEffect(() => {
        if (config) {
            setWaKey(config.whatsappApiKey || '');
        }
    }, [config]);

    const checkStatus = useCallback(async () => {
        setIsLoadingStatus(true);
        try {
            const response = await fetch(`/api/notifications/instance?t=${Date.now()}`);
            const data = await response.json();
            
            if (data.qr) {
                const qr = data.qr.startsWith('data:') ? data.qr : `data:image/png;base64,${data.qr}`;
                setQrCode(qr);
            }

            setInstanceStatus(data);
            if (data.status === 'connected') setQrCode(null);
        } catch (e) {
            setInstanceStatus({ status: 'error', message: 'Falha ao consultar gateway.' });
        } finally {
            setIsLoadingStatus(false);
        }
    }, []);

    useEffect(() => {
        if (waKey) checkStatus();
    }, [waKey, checkStatus]);

    const handleConfigureInstance = async () => {
        setIsConfiguringInstance(true);
        try {
            const response = await fetch('/api/notifications/instance', { method: 'PATCH' });
            if (response.ok) {
                toast({ title: "Recursos Ativados!", description: "Botões e enquetes habilitados." });
                checkStatus();
            } else {
                const data = await response.json();
                toast({ variant: 'destructive', title: "Erro", description: data.error });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro na Requisição" });
        } finally {
            setIsConfiguringInstance(false);
        }
    };

    const handleSaveKey = async () => {
        if (!firestore) return;
        setIsSaving(true);
        setInstanceStatus(null);
        setQrCode(null);
        
        const configRef = doc(firestore, 'config', 'notifications');
        try {
            await setDocumentNonBlocking(configRef, { whatsappApiKey: waKey, updatedAt: Timestamp.now() }, { merge: true });
            toast({ title: "Chave Salva!" });
            setTimeout(checkStatus, 2000);
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao salvar" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateQR = async () => {
        setIsGeneratingQR(true);
        setQrCode(null);
        try {
            const response = await fetch('/api/notifications/instance', { method: 'POST' });
            const data = await response.json();
            if (data.qr) {
                const qr = data.qr.startsWith('data:') ? data.qr : `data:image/png;base64,${data.qr}`;
                setQrCode(qr);
                toast({ title: "QR Code Gerado" });
            } else if (data.status === 'connected') {
                checkStatus();
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Erro na Requisição" });
        } finally {
            setIsGeneratingQR(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm("Deseja desconectar?")) return;
        setIsDisconnecting(true);
        try {
            const response = await fetch('/api/notifications/instance', { method: 'DELETE' });
            if (response.ok) {
                toast({ title: "Desconectado!" });
                setQrCode(null);
                setInstanceStatus(null);
                setTimeout(checkStatus, 1000);
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro na Requisição" });
        } finally {
            setIsDisconnecting(false);
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
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 size-4" />}
                            Salvar Chave
                        </Button>
                    </CardFooter>
                </Card>

                <Card className={cn(
                    "border-2 transition-all shadow-md",
                    instanceStatus?.status === 'connected' ? "border-emerald-500 bg-emerald-50/30" : 
                    "border-amber-500 bg-amber-50/30"
                )}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center justify-between">
                            Status da Instância
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={checkStatus} disabled={isLoadingStatus}>
                                <RefreshCw className={cn("size-3", isLoadingStatus && "animate-spin")} />
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <div className={cn(
                                "size-4 rounded-full animate-pulse",
                                instanceStatus?.status === 'connected' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                            )} />
                            <span className="font-black uppercase text-xs tracking-widest">
                                {instanceStatus?.status === 'connected' ? 'CONECTADO' : instanceStatus?.status === 'pairing' ? 'AGUARDANDO QR' : (instanceStatus?.status || 'AGUARDANDO CONEXÃO')}
                            </span>
                        </div>
                        
                        {instanceStatus?.status === 'connected' ? (
                            <div className="py-2 space-y-3">
                                <Button 
                                    variant="default" 
                                    size="sm" 
                                    onClick={handleConfigureInstance}
                                    disabled={isConfiguringInstance}
                                    className="w-full h-9 font-bold bg-emerald-600 hover:bg-emerald-700"
                                >
                                    {isConfiguringInstance ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4 mr-2" />} 
                                    Ativar Recursos
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleDisconnect}
                                    disabled={isDisconnecting}
                                    className="w-full text-destructive hover:bg-red-50 border-red-100 h-8 text-[10px]"
                                >
                                    {isDisconnecting ? <Loader2 className="size-3 animate-spin mr-1" /> : <LogOut className="size-3 mr-1" />} 
                                    Desconectar
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <Button 
                                    onClick={handleGenerateQR} 
                                    disabled={isGeneratingQR || !waKey}
                                    className="w-full h-9 text-xs font-bold"
                                >
                                    {isGeneratingQR ? <Loader2 className="size-3 animate-spin mr-1" /> : <QrCode className="size-3 mr-1" />}
                                    Gerar Novo QR Code
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={handleDisconnect}
                                    className="text-[10px] text-muted-foreground hover:text-destructive"
                                >
                                    Limpar Instância Ocupada
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {qrCode && (
                <Card className="border-primary border-2 bg-primary/5 animate-in zoom-in-95 duration-300">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-primary flex items-center justify-center gap-2">
                            <Smartphone className="size-5" />
                            Escaneie para Conectar
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-6 gap-6">
                        <div className="p-4 bg-white rounded-2xl shadow-xl border-4 border-primary/20">
                            <Image src={qrCode} alt="WhatsApp QR Code" width={256} height={256} className="rounded-lg" />
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-muted/30">
                <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2"><Layers className="size-4 text-primary" /> Webhook</CardTitle>
                    <CardDescription>Para receber respostas, configure esta URL no painel do api-wa.me:</CardDescription>
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

    const handleUpdateMural = async (groupId: string, groupName: string) => {
        const description = prompt(`Nova descrição para "${groupName}":`);
        if (description === null) return;

        try {
            const response = await fetch('/api/notifications/groups', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId, description, name: groupName })
            });
            
            if (response.ok) {
                toast({ title: "Mural Atualizado!" });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro na conexão" });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Grupos no WhatsApp</h3>
                <Button variant="ghost" size="sm" onClick={fetchGroups} disabled={isLoading}>
                    <RefreshCw className={cn("size-4 mr-2", isLoading && "animate-spin")} /> Atualizar
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    [...Array(3)].map((_, i) => <Card key={i} className="animate-pulse h-24 bg-muted" />)
                ) : (
                    groups.map(group => (
                        <Card key={group.id} className="hover:border-primary/30 transition-all shadow-sm">
                            <CardHeader className="p-4">
                                <CardTitle className="text-sm font-bold flex items-center justify-between">
                                    <span className="truncate">{group.name}</span>
                                    <Badge variant="secondary" className="text-[10px]">{group.participantCount} p.</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardFooter className="p-4 pt-0">
                                <Button variant="outline" size="sm" className="w-full text-[10px] font-bold h-8" onClick={() => handleUpdateMural(group.id, group.name)}>
                                    <Edit className="size-3 mr-1" /> Mural / Descrição
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                )}
                {!isLoading && groups.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground italic border-2 border-dashed rounded-lg bg-muted/10">
                        Nenhum grupo identificado nesta instância.
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
            <TabsList className="grid w-full grid-cols-6 max-w-4xl bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="sender" className="font-bold rounded-lg"><Send className="mr-2 size-4" /> Disparador</TabsTrigger>
                <TabsTrigger value="chats" className="font-bold rounded-lg"><MessageSquare className="mr-2 size-4" /> Conversas</TabsTrigger>
                <TabsTrigger value="groups" className="font-bold rounded-lg"><Group className="mr-2 size-4" /> Grupos</TabsTrigger>
                <TabsTrigger value="responses" className="font-bold rounded-lg"><CheckCircle className="mr-2 size-4" /> Respostas</TabsTrigger>
                <TabsTrigger value="history" className="font-bold rounded-lg"><History className="mr-2 size-4" /> Histórico</TabsTrigger>
                <TabsTrigger value="config" className="font-bold rounded-lg"><Settings className="mr-2 size-4" /> Configs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sender" className="mt-6">
                <Card className="shadow-lg border-none">
                    <CardHeader><CardTitle className="text-lg">Novo Disparo em Massa</CardTitle></CardHeader>
                    <CardContent><WhatsappSender /></CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="chats" className="mt-6">
                <WhatsappChats />
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
        <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
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
                        <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Nenhum histórico de disparos.</TableCell></TableRow>
                    ) : (
                        history?.map((item: any) => (
                            <TableRow key={item.id}>
                                <TableCell className="text-xs font-medium">
                                    {item.sentAt ? format(item.sentAt.toDate(), 'dd/MM/yy HH:mm', { locale: ptBR }) : '-'}
                                </TableCell>
                                <TableCell className="text-xs max-w-xs truncate font-medium text-slate-700">{item.message}</TableCell>
                                <TableCell><Badge variant="secondary" className="bg-slate-100 text-slate-700">{item.recipientCount} pessoas</Badge></TableCell>
                                <TableCell>
                                    <div className={cn("flex items-center gap-1.5 font-black text-[10px]", item.status === 'success' ? "text-emerald-600" : "text-amber-600")}>
                                        <CheckCircle2 size={12} /> {item.status === 'success' ? 'SUCESSO TOTAL' : 'ENTREGA PARCIAL'}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

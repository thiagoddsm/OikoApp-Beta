
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
import { 
    Loader2, Send, Settings, Key, Bot, History, MessageSquare, Mail, 
    Users, CheckCircle2, Search, UserPlus, X, Info, Layers, RefreshCw, 
    Zap, AlertCircle, Group, LayoutTemplate, Sparkles, MessageCircle, MousePointer2,
    UserCheck, Trash2, BarChart3, FileText, Image as ImageIcon, Link as LinkIcon,
    QrCode, Smartphone, LogOut, PlusCircle, CheckCircle, User as UserIcon,
    Banknote, Wallet, Bug, ShieldAlert, Award
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
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [selectedChat, setSelectedChat] = useState<any>(null);
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);
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
    const { data: messages, isLoading: isLoadingMessages } = useCollection<any>(messagesQuery);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

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
                await addDoc(collection(firestore!, 'notifications_messages'), {
                    from: selectedChat.phoneNumber,
                    fromMe: true,
                    content: replyText,
                    type: 'text',
                    receivedAt: Timestamp.now()
                });

                await setDocumentNonBlocking(doc(firestore!, 'notifications_chats', selectedChat.phoneNumber), {
                    lastMessage: replyText,
                    lastMessageAt: Timestamp.now(),
                    unreadCount: 0
                }, { merge: true });

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

    if (isLoadingChats) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="flex h-[600px] border rounded-xl overflow-hidden bg-background shadow-sm">
            <div className="w-1/3 border-r bg-muted/10 flex flex-col">
                <div className="p-4 border-b bg-muted/5">
                    <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Conversas Recentes</h3>
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
                                    "w-full p-4 text-left border-b transition-colors hover:bg-muted/50 flex gap-3 items-center",
                                    selectedChat?.id === chat.id ? "bg-white border-l-4 border-l-primary" : ""
                                )}
                            >
                                <Avatar className="h-10 w-10 shrink-0">
                                    <AvatarFallback><UserIcon size={18} /></AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-bold text-sm truncate">{chat.userName || chat.phoneNumber}</span>
                                        <span className="text-[9px] text-muted-foreground uppercase">{chat.lastMessageAt ? format(chat.lastMessageAt.toDate(), 'HH:mm') : ''}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">{chat.lastMessage}</p>
                                </div>
                                {chat.unreadCount > 0 && <div className="size-2 bg-primary rounded-full animate-pulse" />}
                            </button>
                        ))
                    )}
                </ScrollArea>
            </div>

            <div className="flex-1 flex flex-col bg-slate-50/30">
                {selectedChat ? (
                    <>
                        <div className="p-4 border-b bg-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback><UserIcon size={14} /></AvatarFallback>
                                </Avatar>
                                <div>
                                    <h4 className="font-bold text-sm leading-none">{selectedChat.userName || selectedChat.phoneNumber}</h4>
                                    <p className="text-[10px] text-muted-foreground mt-1">+{selectedChat.phoneNumber}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Info size={16} /></Button>
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                {messages?.map((msg: any) => (
                                    <div key={msg.id} className={cn("flex", msg.fromMe ? "justify-end" : "justify-start")}>
                                        <div className={cn(
                                            "max-w-[80%] p-3 rounded-2xl shadow-sm text-sm",
                                            msg.fromMe 
                                                ? "bg-primary text-primary-foreground text-right rounded-tr-none" 
                                                : "bg-white border border-slate-100 rounded-tl-none"
                                        )}>
                                            <p className="leading-relaxed">{msg.content}</p>
                                            <p className={cn(
                                                "text-[9px] mt-1 text-right",
                                                msg.fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
                                            )}>
                                                {msg.receivedAt ? format(msg.receivedAt.toDate(), 'HH:mm') : ''}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>

                        <div className="p-4 bg-white border-t">
                            <form onSubmit={handleSendReply} className="flex gap-2">
                                <Input 
                                    placeholder="Digite sua resposta..." 
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    className="bg-muted/30 border-none focus-visible:ring-primary h-11"
                                />
                                <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={isSending || !replyText?.trim()}>
                                    {isSending ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-4">
                        <div className="p-6 bg-muted/20 rounded-full">
                            <MessageSquare size={48} className="opacity-20" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Selecione uma conversa</h3>
                            <p className="text-sm">Veja as mensagens recebidas e responda seus membros aqui.</p>
                        </div>
                    </div>
                )}
            </div>
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

    // Button states
    const [msgTitle, setMsgTitle] = useState('Informativo IBM');
    const [msgFooter, setMsgFooter] = useState('Igreja Batista da Manhã');
    const [msgButtons, setMsgButtons] = useState([{ id: 'btn_1', text: 'Confirmar Presença ✅' }, { id: 'btn_2', text: 'Não poderei ir ❌' }]);

    // Survey states
    const [surveyName, setSurveyName] = useState('');
    const [surveyOptions, setSurveyOptions] = useState(['Sim', 'Não']);
    
    // Media states
    const [mediaUrl, setMediaUrl] = useState('');

    // PIX states
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

    const handleDebugTest = (type: string) => {
        if (!testPhoneNumber) {
            toast({ variant: 'destructive', title: "Digite o número de teste acima." });
            return;
        }

        let payload: any = { channel: 'whatsapp', targetNumber: testPhoneNumber, type };

        switch(type) {
            case 'text': payload.message = "Teste de Texto IBM - Sistema OK"; break;
            case 'button':
                payload.message = "Teste de Botões Interativos v5.0.0 (PLANO PRO)";
                payload.buttons = [{ id: 'test_1', text: 'Sim, funciona! ✅' }, { id: 'test_2', text: 'Não funciona ❌' }];
                payload.title = "DEBUG MODE - IBM";
                payload.footer = "Ambiente de Desenvolvimento";
                break;
            case 'media':
                payload.mediaUrl = "https://picsum.photos/seed/1/600/400";
                payload.message = "Teste de Mídia (Imagem Dinâmica)";
                break;
            case 'pix':
                payload.pixKey = "test@ibm.com";
                payload.pixAmount = 1.00;
                payload.message = "Teste de Cobrança PIX Automática";
                payload.pixName = "Igreja Batista";
                payload.pixCity = "Sao Goncalo";
                break;
            case 'survey':
                payload.surveyName = "O Ambiente de Teste é útil?";
                payload.options = ["Sim, muito!", "Mais ou menos", "Não"];
                break;
        }

        handleSend(undefined, payload);
    }
    
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
                            <SelectTrigger id="group-select" className="bg-background">
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
                                <Label className="text-xs font-bold uppercase text-indigo-700">Título da Mensagem (Cabeçalho)</Label>
                                <Input 
                                    value={msgTitle} 
                                    onChange={e => setMsgTitle(e.target.value)} 
                                    placeholder="Ex: Convite IBM"
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-indigo-700">Rodapé (Texto secundário)</Label>
                                <Input 
                                    value={msgFooter} 
                                    onChange={e => setMsgFooter(e.target.value)} 
                                    placeholder="Ex: Igreja Batista da Manhã"
                                    className="bg-white"
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                                <MousePointer2 size={12} /> Configurar Botões (Máx 3)
                            </Label>
                            {msgButtons.map((btn, idx) => (
                                <div key={btn.id} className="flex gap-2">
                                    <Input 
                                        value={btn.text} 
                                        onChange={e => handleUpdateBtn(idx, e.target.value)}
                                        placeholder={`Botão ${idx + 1}`}
                                        className="bg-white"
                                    />
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

                {msgType === 'survey' && (
                    <div className="space-y-4 p-4 border border-dashed rounded-lg bg-primary/5 animate-in slide-in-from-top-2">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><BarChart3 size={14} /> Pergunta da Enquete</Label>
                            <Input 
                                placeholder="Ex: Qual o melhor horário?" 
                                value={surveyName}
                                onChange={e => setSurveyName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Opções</Label>
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

                {msgType === 'media' && (
                    <div className="space-y-4 p-4 border border-dashed rounded-lg bg-blue-50 animate-in slide-in-from-top-2">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><ImageIcon size={14} /> Link da Mídia</Label>
                            <div className="relative">
                                <LinkIcon className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                <Input 
                                    placeholder="https://..." 
                                    value={mediaUrl}
                                    onChange={e => setMediaUrl(e.target.value)}
                                    className="pl-10 bg-background"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {msgType === 'pix' && (
                    <div className="space-y-4 p-4 border border-dashed rounded-lg bg-emerald-50 animate-in slide-in-from-top-2 relative">
                        <Badge className="absolute -top-3 -right-3 bg-amber-500 hover:bg-amber-600 font-black flex items-center gap-1.5 shadow-lg border-2 border-white">
                            <Award size={12} /> ENTERPRISE
                        </Badge>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-emerald-700 font-bold"><Banknote size={14} /> Chave PIX</Label>
                                <Input 
                                    placeholder="E-mail ou CPF" 
                                    value={pixKey}
                                    onChange={e => setPixKey(e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-emerald-700 font-bold"><Wallet size={14} /> Valor</Label>
                                <Input 
                                    type="number"
                                    placeholder="0.00" 
                                    value={pixAmount}
                                    onChange={e => setPixAmount(e.target.value)}
                                    className="bg-white"
                                />
                            </div>
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
                                    size="sm" 
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
                <Alert variant="destructive" className="animate-in shake-1 border-2">
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

            <div className="pt-8 border-t">
                <div className="flex items-center gap-2 mb-4">
                    <Bug className="size-4 text-muted-foreground" />
                    <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest">Debug Mode</h3>
                </div>
                <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex-1 min-w-[200px] space-y-2">
                        <Label htmlFor="test-phone" className="text-[10px] font-black uppercase">Número de Teste</Label>
                        <Input 
                            id="test-phone"
                            placeholder="21999999999" 
                            value={testPhoneNumber}
                            onChange={e => setTestPhoneNumber(e.target.value)}
                            className="bg-background border-dashed border-primary/50"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 items-end">
                        <Button type="button" variant="outline" size="sm" onClick={() => handleDebugTest('text')} disabled={isLoading} className="h-10 text-[10px] font-bold">TEXTO</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleDebugTest('button')} disabled={isLoading} className="h-10 text-[10px] font-bold border-indigo-200 text-indigo-700">BOTÕES (PRO)</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleDebugTest('survey')} disabled={isLoading} className="h-10 text-[10px] font-bold border-amber-200 text-amber-700">ENQUETE (PRO)</Button>
                    </div>
                </div>
            </div>
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
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [isSyncingWebhook, setIsSyncingWebhook] = useState(false);
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

    const webhookUrl = `${window.location.origin}/api/notifications/webhook`;

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
                        <Card key={group.id}>
                            <CardHeader className="p-4">
                                <CardTitle className="text-sm font-bold flex items-center justify-between">
                                    <span className="truncate">{group.name}</span>
                                    <Badge variant="secondary" className="text-[10px]">{group.participantCount} p.</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardFooter className="p-4 pt-0">
                                <Button variant="outline" size="sm" className="w-full text-[10px]" onClick={() => handleUpdateMural(group.id, group.name)}>
                                    Mural / Descrição
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
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
            <TabsList className="grid w-full grid-cols-6 max-w-4xl bg-muted/50 p-1">
                <TabsTrigger value="sender" className="font-bold"><Send className="mr-2 size-4" /> Disparador</TabsTrigger>
                <TabsTrigger value="chats" className="font-bold"><MessageSquare className="mr-2 size-4" /> Conversas</TabsTrigger>
                <TabsTrigger value="groups" className="font-bold"><Group className="mr-2 size-4" /> Grupos</TabsTrigger>
                <TabsTrigger value="responses" className="font-bold"><CheckCircle className="mr-2 size-4" /> Respostas</TabsTrigger>
                <TabsTrigger value="history" className="font-bold"><History className="mr-2 size-4" /> Histórico</TabsTrigger>
                <TabsTrigger value="config" className="font-bold"><Settings className="mr-2 size-4" /> Configs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sender" className="mt-6">
                <Card>
                    <CardHeader><CardTitle>Novo Disparo</CardTitle></CardHeader>
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

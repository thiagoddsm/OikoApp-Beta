
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
    Loader2, Send, Settings, Key, Bot, History, MessageSquare, Mail, 
    Users, CheckCircle2, Search, UserPlus, X, Info, Layers, RefreshCw, 
    Zap, AlertCircle, Group, LayoutTemplate, Sparkles, MessageCircle, MousePointer2,
    UserCheck, Trash2, BarChart3, FileText, Image as ImageIcon, Link as LinkIcon,
    QrCode, Smartphone, LogOut, PlusCircle, CheckCircle, User as UserIcon
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

    // Fetch chat list
    const chatsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'notifications_chats'), orderBy('lastMessageAt', 'desc')) : null,
    [firestore]);
    const { data: chats, isLoading: isLoadingChats } = useCollection<any>(chatsQuery);

    // Fetch messages for selected chat
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
                // Registrar a mensagem enviada no Firestore também para o histórico aparecer no chat
                await addDoc(collection(firestore!, 'notifications_messages'), {
                    from: selectedChat.phoneNumber,
                    fromMe: true,
                    content: replyText,
                    type: 'text',
                    receivedAt: Timestamp.now()
                });

                // Atualizar o último registro do chat
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
            {/* Chat List */}
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

            {/* Chat Window */}
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
                                                ? "bg-primary text-primary-foreground rounded-tr-none" 
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
                                <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={isSending || !replyText.trim()}>
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

        if (targetAudience === 'whatsapp_group' && !selectedGroupId) {
            toast({ variant: 'destructive', title: "Selecione um grupo de WhatsApp." });
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
                    <div className="flex justify-between items-center">
                        <Label htmlFor="group-select">Escolha o Grupo</Label>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={fetchGroups} 
                            disabled={isLoadingGroups}
                        >
                            <RefreshCw className={cn("size-3", isLoadingGroups && "animate-spin")} />
                        </Button>
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
                    placeholder={msgType === 'button' ? "Ex: Olá {{nome}}, você confirma sua escala no domingo?" : "Olá {{nome}}..."}
                    className="min-h-[120px] bg-background"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required={msgType !== 'survey'}
                />
                <p className="text-[10px] text-muted-foreground italic">Use <strong>{"{{nome}}"}</strong> para personalizar com o nome de cada membro.</p>
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
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [isSyncingWebhook, setIsSyncingWebhook] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [instanceStatus, setInstanceStatus] = useState<{status: string, message?: string, qr?: string} | null>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);
    const [testNumber, setTestNumber] = useState('');
    const [isCheckingNumber, setIsCheckingNumber] = useState(false);

    useEffect(() => {
        if (config) setWaKey(config.whatsappApiKey || '');
    }, [config]);

    const checkStatus = async () => {
        setIsLoadingStatus(true);
        try {
            const response = await fetch('/api/notifications/instance');
            const data = await response.json();
            
            if (data.qr) {
                const qr = data.qr.startsWith('data:') ? data.qr : `data:image/png;base64,${data.qr}`;
                setQrCode(qr);
            }

            setInstanceStatus(data);

            if (data.status === 'connected') {
                setQrCode(null);
            }
        } catch (e) {
            setInstanceStatus({ status: 'error', message: 'Falha ao consultar gateway.' });
        } finally {
            setIsLoadingStatus(false);
        }
    };

    const checkNumberRegistration = async () => {
        if (!testNumber || !waKey) return;
        setIsCheckingNumber(true);
        const phone = testNumber.replace(/\D/g, '');
        const formatted = phone.length <= 11 ? `55${phone}` : phone;
        
        try {
            const response = await fetch(`https://us.api-wa.me/${waKey}/actions/registered?to=${formatted}`);
            const data = await response.json();
            if (data.status === true || data.registered === true) {
                toast({ title: "Número Válido ✅", description: "Este contato possui WhatsApp." });
            } else {
                toast({ variant: 'destructive', title: "Número Inválido ❌", description: "Este contato NÃO possui WhatsApp registrado." });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro na verificação" });
        } finally {
            setIsCheckingNumber(false);
        }
    };

    useEffect(() => {
        let interval: any;
        if (qrCode || (instanceStatus && instanceStatus.status !== 'connected' && instanceStatus.status !== 'unconfigured')) {
            interval = setInterval(checkStatus, 5000);
        }
        return () => clearInterval(interval);
    }, [qrCode, instanceStatus]);

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
                const qr = data.qr.startsWith('data:') ? data.qr : `data:image/png;base64,${data.qr}`;
                setQrCode(qr);
                toast({ title: "QR Code Gerado", description: "Escaneie com o celular da igreja." });
            } else if (data.status === 'connected') {
                toast({ title: "Já Conectado", description: "Sua instância já está ativa." });
                checkStatus();
            } else {
                toast({ 
                    variant: 'destructive', 
                    title: "Erro no Gateway", 
                    description: data.error || "Não foi possível gerar o código." 
                });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Erro na Requisição", description: "Falha na comunicação." });
        } finally {
            setIsGeneratingQR(false);
        }
    };

    const handleSyncWebhook = async () => {
        setIsSyncingWebhook(true);
        const webhookUrl = `${window.location.origin}/api/notifications/webhook`;
        try {
            const response = await fetch('/api/notifications/instance', { 
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ webhookUrl })
            });
            if (response.ok) {
                toast({ title: "Webhook Sincronizado!", description: "O gateway agora enviará eventos para este app." });
            } else {
                toast({ variant: 'destructive', title: "Falha na Sincronização" });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro na Requisição" });
        } finally {
            setIsSyncingWebhook(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm("Isso irá desconectar o WhatsApp da IBM do sistema. Deseja continuar?")) return;
        
        setIsDisconnecting(true);
        try {
            const response = await fetch('/api/notifications/instance', { method: 'DELETE' });
            const data = await response.json();
            if (response.ok) {
                toast({ title: "Desconectado!", description: "A sessão do WhatsApp foi encerrada." });
                setQrCode(null);
                checkStatus();
            } else {
                toast({ variant: 'destructive', title: "Erro", description: data.error || "Falha ao desconectar." });
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
                    <CardFooter className="flex justify-between border-t pt-4">
                        <div className="flex items-center gap-2">
                            <Input 
                                placeholder="Verificar número..." 
                                value={testNumber} 
                                onChange={e => setTestNumber(e.target.value)}
                                className="w-40 h-8 text-xs"
                            />
                            <Button onClick={checkNumberRegistration} disabled={isCheckingNumber || !waKey} variant="outline" size="sm">
                                {isCheckingNumber ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
                            </Button>
                        </div>
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
                                {instanceStatus?.status || 'Buscando...'}
                            </span>
                        </div>
                        
                        {instanceStatus?.status === 'connected' ? (
                            <div className="py-2">
                                <p className="text-[10px] text-muted-foreground mb-4 font-medium uppercase">WhatsApp Conectado</p>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleDisconnect}
                                    disabled={isDisconnecting}
                                    className="w-full text-destructive hover:bg-red-50 hover:text-destructive border-red-100"
                                >
                                    {isDisconnecting ? <Loader2 className="size-3 animate-spin mr-1" /> : <LogOut className="size-3 mr-1" />} 
                                    Desconectar
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-[10px] text-muted-foreground font-medium uppercase">Aguardando Conexão</p>
                                <div className="flex flex-col gap-2">
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
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-bold flex items-center gap-2"><Layers className="size-4 text-primary" /> Configuração de Webhook</CardTitle>
                        <Button variant="outline" size="sm" onClick={handleSyncWebhook} disabled={isSyncingWebhook || !waKey}>
                            {isSyncingWebhook ? <Loader2 className="size-3 animate-spin mr-1" /> : <RefreshCw className="size-3 mr-1" />}
                            Auto-Sincronizar
                        </Button>
                    </div>
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

    const handleUpdateMural = async (groupId: string, groupName: string) => {
        const description = prompt(`Digite a nova descrição (Mural) para o grupo "${groupName}":`);
        if (description === null) return;

        try {
            const response = await fetch('/api/notifications/groups', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId, description, name: groupName })
            });
            
            if (response.ok) {
                toast({ title: "Mural Atualizado!", description: "A descrição do grupo foi alterada com sucesso." });
            } else {
                const errData = await response.json();
                toast({ variant: 'destructive', title: "Erro", description: errData.error || "Não foi possível atualizar o Mural." });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro na conexão", description: "Falha ao contatar o servidor." });
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
                {isLoading ? (
                    [...Array(3)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="h-24 bg-muted rounded-lg" />
                        </Card>
                    ))
                ) : (
                    <>
                        {groups.map(group => (
                            <Card key={group.id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="p-4">
                                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                                        <span className="truncate">{group.name}</span>
                                        <Badge variant="secondary" className="text-[10px]">{group.participantCount} p.</Badge>
                                    </CardTitle>
                                    <CardDescription className="text-[10px] truncate">{group.id}</CardDescription>
                                </CardHeader>
                                <CardFooter className="p-4 pt-0 flex justify-end gap-2">
                                    <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-black" onClick={() => handleUpdateMural(group.id, group.name)}>
                                        <LayoutTemplate size={12} className="mr-1" /> Mural / Descrição
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                        {groups.length === 0 && !error && (
                            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg">
                                <Group className="size-12 text-muted-foreground mx-auto mb-2 opacity-20" />
                                <p className="text-muted-foreground text-sm">Nenhum grupo encontrado nesta instância.</p>
                            </div>
                        )}
                    </>
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
                    {history?.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">Nenhum histórico disponível.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

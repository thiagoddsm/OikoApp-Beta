'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { 
    Loader2, Send, Settings, Key, History, MessageSquare, 
    Users, CheckCircle2, Search, UserPlus, X, Info, RefreshCw, 
    Smartphone, MessageCircle, Trash2, CheckCircle, 
    Copy, Globe, HeartHandshake, CalendarDays, MousePointer2, QrCode,
    Lock, Megaphone, UserCheck, ShieldCheck, ChevronRight, FileSpreadsheet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useDoc, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc, where, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function useContactEnrichment(chats: any[]) {
    const { firestore } = useFirebase();
    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const { data: users } = useCollection<any>(usersQuery);

    const waContactsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'notifications_contacts')) : null, [firestore]);
    const { data: waContacts } = useCollection<any>(waContactsQuery);

    const { data: waConfig } = useDoc<any>('config/notifications');

    const [photoCache, setPhotoCache] = useState<Record<string, string>>({});

    const enrichedChats = useMemo(() => {
        if (!chats) return [];
        return chats.map((chat: any) => {
            // O ID pode vir do webhook como "5521999999999" ou "5521999999999-123456"
            const rawId = (chat.phoneNumber || chat.id || '').split('@')[0];
            
            // Tenta encontrar o usuário no sistema
            const matchedUser = users?.find((u: any) => {
                const uPhone = String(u.phone || '').replace(/\D/g, '');
                const uLid = String(u.lid || '').split('@')[0];
                const uJid = String(u.jid || '').split('@')[0];
                
                if (uPhone && uPhone.length >= 8) {
                    const uPhoneNoCountry = uPhone.startsWith('55') ? uPhone.substring(2) : uPhone;
                    const uPhoneNo9 = uPhoneNoCountry.length === 11 ? uPhoneNoCountry.slice(0, 2) + uPhoneNoCountry.slice(3) : null;
                    const uPhoneLast8 = uPhoneNoCountry.slice(-8);
                    const idDigits = rawId.replace(/\D/g, '');
                    if (idDigits.includes(uPhoneNoCountry) || (uPhoneNo9 && idDigits.includes(uPhoneNo9)) || (uPhoneLast8.length === 8 && idDigits.includes(uPhoneLast8))) return true;
                }

                return (uLid && rawId === uLid) || (uJid && rawId === uJid);
            });

            // Tenta encontrar nos contatos sincronizados do WhatsApp
            const matchedWA = waContacts?.find((c: any) => {
                const cPhone = String(c.phoneNumber || '').replace(/\D/g, '');
                const cLid = String(c.lid || '').split('@')[0];
                const cJid = String(c.jid || '').split('@')[0];
                
                return (cPhone && (rawId.includes(cPhone) || cPhone.includes(rawId))) || 
                       (cLid && rawId === cLid) || 
                       (cJid && rawId === cJid);
            });

            // Lógica de Nome: 1. Usuário do Sistema, 2. Contato Sincronizado do WA, 3. Nome vindo da mensagem, 4. Formatação do número
            let displayName = matchedUser?.name || matchedWA?.name || chat.userName;
            
            if (!displayName) {
                if (chat.isGroup) {
                    // Para grupos sem nome, mostra o número/ID do criador (antes do hífen)
                    displayName = `Grupo: ${rawId.split('-')[0]}`;
                } else {
                    // Formatação amigável para números individuais brasileiros
                    const digits = rawId.replace(/\D/g, '');
                    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
                        const ddd = digits.substring(2, 4);
                        const num = digits.substring(4);
                        displayName = `(${ddd}) ${num.length === 9 ? num.slice(0, 5) + '-' + num.slice(5) : num.slice(0, 4) + '-' + num.slice(4)}`;
                    } else if (digits.length >= 10 && digits.length <= 15) {
                        displayName = `+${digits}`;
                    } else {
                        displayName = rawId; // Fallback se for algo estranho
                    }
                }
            }

            return {
                ...chat,
                userName: displayName,
                profilePicture: photoCache[rawId] || chat.profilePicture || matchedUser?.profilePicture || matchedUser?.photoURL || undefined,
                _rawNumber: rawId,
                _matchedUserId: matchedUser?.id,
            };
        });
    }, [chats, users, photoCache]);

    useEffect(() => {
        const apiKey = waConfig?.instanceKey || waConfig?.whatsappApiKey;
        if (!apiKey || !enrichedChats.length) return;

        const needsPhoto = enrichedChats.filter(c => !photoCache[c._rawNumber] && !c.profilePicture && c._rawNumber);
        if (needsPhoto.length === 0) return;

        const fetchPhoto = async (number: string) => {
            try {
                // Verificar se existe foto usando o endpoint JSON
                const res = await fetch(`/api/contacts/profile-picture?phone=${number}`);
                const data = await res.json();
                if (data.imageUrl) {
                    // Usar URL proxiada — pps.whatsapp.net bloqueia hotlink direto do browser
                    const proxiedUrl = `/api/contacts/profile-picture?phone=${number}&proxy=true`;
                    setPhotoCache(prev => ({ ...prev, [number]: proxiedUrl }));
                }
            } catch {}
        };

        needsPhoto.slice(0, 5).forEach(c => fetchPhoto(c._rawNumber));
    }, [enrichedChats.length, waConfig]);

    return enrichedChats;
}

function WhatsappChats() {
    const { firestore } = useFirebase();
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const chatsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'notifications_chats'), orderBy('lastMessageAt', 'desc')) : null,
    [firestore]);
    const { data: rawChats, isLoading: isLoadingChats } = useCollection<any>(chatsQuery);

    const chats = useContactEnrichment(rawChats || []);

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

    const selectedChatData = chats.find(c => c.id === selectedChat);

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
                                    <Avatar className="h-10 w-10 border shrink-0">
                                        <AvatarImage src={chat.profilePicture} />
                                        <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">{chat.userName?.charAt(0) || '?'}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <p className="font-bold text-sm truncate">{chat.userName}</p>
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
                                <Avatar className="h-9 w-9 border">
                                    <AvatarImage src={selectedChatData?.profilePicture} />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-black">
                                        {selectedChatData?.userName?.charAt(0) || '?'}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-black text-sm uppercase tracking-tight">
                                        {selectedChatData?.userName || selectedChat}
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
                                            "flex gap-2 animate-in fade-in slide-in-from-bottom-1",
                                            msg.fromMe ? "flex-row-reverse" : "flex-row"
                                        )}
                                    >
                                        {!msg.fromMe && (
                                            <Avatar className="h-7 w-7 border shrink-0 self-end">
                                                <AvatarImage src={selectedChatData?.profilePicture} />
                                                <AvatarFallback className="text-[9px] font-bold bg-slate-200">{selectedChatData?.userName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                        )}
                                        <div className={cn(
                                            "flex flex-col max-w-[80%]",
                                            msg.fromMe ? "items-end" : "items-start"
                                        )}>
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
                                    </div>
                                ))}
                                {isLoadingMessages && <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-primary opacity-20" /></div>}
                            </div>
                        </ScrollArea>
                    </>
                )}
            </Card>
        </div>
    );
}

function WhatsappSender({ config }: { config: any }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [targetAudience, setTargetAudience] = useState('all_members');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [individualPhone, setIndividualPhone] = useState('');
    const [spreadsheetData, setSpreadsheetData] = useState('');
    const [importedContacts, setImportedContacts] = useState<{name: string, phone: string}[]>([]);

    const parseSpreadsheet = (text: string) => {
        const lines = text.split('\n').filter(line => line.trim());
        const contacts = lines.map(line => {
            const parts = line.split(/[,;\t]/);
            const name = parts[0]?.trim() || 'Importado';
            const phone = (parts[1] || parts[0])?.replace(/\D/g, '').trim();
            return { name, phone };
        }).filter(c => c.phone.length >= 8);
        setImportedContacts(contacts);
    };
    const [msgType, setMsgType] = useState<'text' | 'button' | 'survey' | 'media' | 'list'>('text');

    // WA Contacts & Groups from API
    const [waContacts, setWaContacts] = useState<any[]>([]);
    const [waGroups, setWaGroups] = useState<any[]>([]);
    const [isLoadingWaData, setIsLoadingWaData] = useState(false);

    // Group detail sheet
    const [groupDetail, setGroupDetail] = useState<any | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    const handleOpenGroupDetail = async (e: React.MouseEvent, g: any) => {
        e.stopPropagation();
        setGroupDetail({ ...g, _loading: true });
        setIsLoadingDetail(true);
        const apiKey = config?.instanceKey || config?.whatsappApiKey;
        const serverUrl = config?.serverUrl || '';
        const params = new URLSearchParams({ key: apiKey });
        if (serverUrl) params.set('server', serverUrl);
        try {
            params.set('id', g.id);
            const res = await fetch(`/api/notifications/groups?${params.toString()}`);
            const data = await res.json();
            setGroupDetail(data);
        } catch {
            setGroupDetail({ ...g, _error: true });
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const [headerTitle, setHeaderTitle] = useState('Igreja Batista da Manhã');
    const [msgFooter, setMsgFooter] = useState('Escolha uma opção abaixo');
    const [msgButtons, setMsgButtons] = useState([{ id: 'btn_1', text: 'Sim, vou participar!' }, { id: 'btn_2', text: 'Desta vez não posso' }]);
    const [surveyName, setSurveyName] = useState('');
    const [surveyOptions, setSurveyOptions] = useState(['Excelente', 'Bom', 'Pode melhorar']);
    const [mediaUrl, setMediaUrl] = useState('');
    const [listButtonText, setListButtonText] = useState('Ver Opções');
    const [listDescription, setListDescription] = useState('');
    const [listSections, setListSections] = useState([
        { title: 'Sessão 1', rows: [{ title: 'Opção 1', description: '', rowId: `row_${Date.now()}` }] }
    ]);

    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const { data: users } = useCollection<any>(usersQuery);

    // Fetch WA contacts and groups from the API — only once config is loaded
    useEffect(() => {
        const apiKey = config?.instanceKey || config?.whatsappApiKey;
        const serverUrl = config?.serverUrl || '';
        if (!apiKey) return; // aguarda o config carregar

        const fetchWaData = async () => {
            setIsLoadingWaData(true);
            const params = new URLSearchParams({ key: apiKey });
            if (serverUrl) params.set('server', serverUrl);
            const qs = params.toString();
            try {
                const [contactsRes, groupsRes] = await Promise.all([
                    fetch(`/api/notifications/contacts?${qs}`),
                    fetch(`/api/notifications/groups?${qs}`),
                ]);
                const contactsData = await contactsRes.json();
                const groupsData = await groupsRes.json();
                setWaContacts(contactsData.contacts || []);
                setWaGroups(groupsData.groups || []);
            } catch (e) {
                console.warn('Failed to load WA contacts/groups', e);
            } finally {
                setIsLoadingWaData(false);
            }
        };
        fetchWaData();
    }, [config]);

    const filteredUsers = useMemo(() => {
        if (!users || !searchTerm) return [];
        return users.filter(u => 
            u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
            !selectedUserIds.includes(u.id)
        ).slice(0, 5);
    }, [users, searchTerm, selectedUserIds]);

    const filteredGroups = useMemo(() => {
        if (!waGroups) return [];
        if (!searchTerm) return waGroups;
        return waGroups.filter(g =>
            g.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !selectedGroupIds.includes(g.id)
        );
    }, [waGroups, searchTerm, selectedGroupIds]);

    const selectedUsersList = useMemo(() => {
        if (!users) return [];
        return users.filter(u => selectedUserIds.includes(u.id));
    }, [users, selectedUserIds]);

    const selectedGroupsList = useMemo(() => {
        return waGroups.filter(g => selectedGroupIds.includes(g.id));
    }, [waGroups, selectedGroupIds]);

    const handleAddUser = (userId: string) => {
        setSelectedUserIds(prev => [...prev, userId]);
        setSearchTerm('');
    };

    const handleAddGroup = (groupId: string) => {
        setSelectedGroupIds(prev => [...prev, groupId]);
        setSearchTerm('');
    };

    const handleRemoveGroup = (groupId: string) => {
        setSelectedGroupIds(prev => prev.filter(id => id !== groupId));
    };

    const handleRemoveUser = (userId: string) => {
        setSelectedUserIds(prev => prev.filter(id => id !== userId));
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (targetAudience === 'individual' && !individualPhone) {
            toast({ variant: 'destructive', title: "Informe o número para teste." });
            return;
        }

        if (targetAudience === 'import_spreadsheet' && importedContacts.length === 0) {
            toast({ variant: 'destructive', title: "Importe pelo menos um contato da planilha." });
            return;
        }

        if (targetAudience === 'specific_members' && selectedUserIds.length === 0) {
            toast({ variant: 'destructive', title: "Selecione pelo menos uma pessoa." });
            return;
        }

        if (targetAudience === 'specific_groups' && selectedGroupIds.length === 0) {
            toast({ variant: 'destructive', title: "Selecione pelo menos um grupo." });
            return;
        }

        // Claude Item 3: Validação manual de mensagem/enquete
        if (msgType !== 'survey' && !message.trim()) {
            toast({ variant: 'destructive', title: "Digite a mensagem principal." });
            return;
        }
        if (msgType === 'survey' && !surveyName.trim()) {
            toast({ variant: 'destructive', title: "Digite a pergunta da enquete." });
            return;
        }

        // Claude Item 2: Guard para usuários carregando
        if (targetAudience === 'specific_members' && selectedUsersList.length === 0) {
            toast({ variant: 'destructive', title: "Usuários ainda carregando ou não selecionados." });
            return;
        }

        setIsLoading(true);

        const payload: any = {
            channel: 'whatsapp',
            audience: targetAudience,
            message,
            userIds: targetAudience === 'specific_members' ? selectedUserIds : undefined,
            // Melhoria: Se for 'all_members', também manda como targets para evitar erro de credenciais no server local
            targets: (targetAudience === 'specific_members' || targetAudience === 'all_members' || targetAudience === 'import_spreadsheet') 
                ? (
                    targetAudience === 'import_spreadsheet' 
                        ? importedContacts 
                        : (targetAudience === 'all_members' ? users : selectedUsersList)?.filter(u => u.phone).map(u => ({ id: u.id, name: u.name, phone: u.phone }))
                  )
                : undefined,
            groupIds: targetAudience === 'specific_groups' ? selectedGroupIds : undefined,
            individualPhone: targetAudience === 'individual' ? individualPhone : undefined,
            type: msgType,
            serverUrl: config?.serverUrl || config?.whatsappServerUrl,
            instanceKey: config?.instanceKey || config?.whatsappApiKey,
        };

        if (msgType === 'button') {
            payload.headerTitle = headerTitle;
            payload.footer = msgFooter;
            payload.buttons = msgButtons;
        } else if (msgType === 'survey') {
            payload.surveyName = surveyName || 'Enquete rápida';
            payload.options = surveyOptions;
        } else if (msgType === 'media') {
            payload.mediaUrl = mediaUrl;
        } else if (msgType === 'list') {
            payload.headerTitle = headerTitle;
            payload.footer = msgFooter;
            payload.buttonText = listButtonText;
            payload.description = listDescription;
            payload.sections = listSections;
        }

        try {
            const response = await fetch('/api/notifications/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            
            const result = await response.json();
            
            if (response.ok && result.sentCount > 0) {
                toast({ title: "Envio Concluído!", description: `${result.sentCount || 0} mensagens enviadas.` });
                setMessage('');
                setSelectedUserIds([]);
                setSelectedGroupIds([]); // Claude Item 7: Limpa grupos também
                setIndividualPhone('');
                setMediaUrl('');
            } else {
                // Claude Item 9: Melhor feedback se sentCount for 0
                const errorMsg = result.error || result.message || (result.sentCount === 0 ? "Nenhum destinatário com telefone válido encontrado." : "Erro ao enviar.");
                toast({ variant: 'destructive', title: "Falha no Envio", description: errorMsg });
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
                                <SelectItem value="button">Botões de Ação (Quick Reply)</SelectItem>
                                <SelectItem value="survey">Enquete Nativa</SelectItem>
                                <SelectItem value="list">Menu Interativo (Lista)</SelectItem>
                                <SelectItem value="media">Mídia (Documentos, Áudio, Imagem/Vídeo)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Público Alvo</Label>
                        <Select value={targetAudience} onValueChange={(v) => { setTargetAudience(v); setSearchTerm(''); }}>
                            <SelectTrigger className="h-11">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="individual">Individual (Teste)</SelectItem>
                                <SelectItem value="all_members">Todos os Membros</SelectItem>
                                <SelectItem value="specific_members">Membros Selecionados</SelectItem>
                                <SelectItem value="specific_groups">Grupos do WhatsApp</SelectItem>
                                <SelectItem value="import_spreadsheet">Importar Planilha (CSV/Texto)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {targetAudience === 'import_spreadsheet' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-emerald-50/30">
                        <div className="flex items-center justify-between">
                            <Label className="text-emerald-900 font-bold flex items-center gap-2">
                                <FileSpreadsheet size={16} />
                                Importar Contatos
                            </Label>
                            {importedContacts.length > 0 && (
                                <Badge variant="outline" className="bg-emerald-500 text-white border-none font-black text-[10px]">
                                    {importedContacts.length} CONTATOS VÁLIDOS
                                </Badge>
                            )}
                        </div>
                        <Textarea 
                            placeholder="Cole aqui no formato: Nome, Telefone (ou apenas telefones em linhas separadas)"
                            value={spreadsheetData}
                            onChange={(e) => {
                                setSpreadsheetData(e.target.value);
                                parseSpreadsheet(e.target.value);
                            }}
                            className="min-h-[120px] bg-white font-mono text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground italic">
                            Dica: Você pode copiar colunas de Nome e Telefone do Excel e colar aqui. O sistema limpará os números automaticamente.
                        </p>
                    </div>
                )}

                {targetAudience === 'individual' && (
                    <div className="space-y-2 p-4 border rounded-lg bg-indigo-50/30">
                        <Label className="text-indigo-900 font-bold">Número para Teste</Label>
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Ex: 21999999999" 
                                value={individualPhone} 
                                onChange={(e) => setIndividualPhone(e.target.value)} 
                                className="bg-white"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground italic">Envie uma notificação rápida para conferir o layout.</p>
                    </div>
                )}

                {targetAudience === 'specific_members' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                        <Label>Adicionar Pessoas</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                            <Input placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-11" />
                            {filteredUsers.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg overflow-hidden">
                                    {filteredUsers.map(u => {
                                        // Tenta encontrar o contato WA correspondente para mostrar o avatar
                                        const waContact = waContacts.find(c => c.phone && (u.phone || '').replace(/\D/g,'').endsWith(c.phone.replace(/\D/g,'')));
                                        return (
                                            <button key={u.id} type="button" onClick={() => handleAddUser(u.id)} className="w-full px-4 py-3 text-left hover:bg-primary/10 flex items-center gap-3 border-b last:border-0">
                                                <Avatar className="h-8 w-8 border shrink-0">
                                                    {waContact?.profilePicture && <AvatarImage src={waContact.profilePicture} />}
                                                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{u.name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium flex-1">{u.name}</span>
                                                <UserPlus size={14} className="text-primary shrink-0" />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {selectedUsersList.map(u => {
                                const waContact = waContacts.find(c => c.phone && (u.phone || '').replace(/\D/g,'').endsWith(c.phone.replace(/\D/g,'')));
                                return (
                                    <Badge key={u.id} variant="secondary" className="gap-1.5 h-8 font-bold pl-1 pr-2">
                                        <Avatar className="h-5 w-5">
                                            {waContact?.profilePicture && <AvatarImage src={waContact.profilePicture} />}
                                            <AvatarFallback className="text-[9px]">{u.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        {u.name}
                                        <button type="button" onClick={() => handleRemoveUser(u.id)}><X size={12} /></button>
                                    </Badge>
                                );
                            })}
                        </div>
                    </div>
                )}

                {targetAudience === 'specific_groups' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                        <div className="flex items-center justify-between">
                            <Label>Selecionar Grupos do WhatsApp</Label>
                            {isLoadingWaData && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                            <Input placeholder="Buscar grupo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-11" />
                        </div>
                        {waGroups.length === 0 && !isLoadingWaData && (
                            <p className="text-xs text-muted-foreground italic text-center py-4">Nenhum grupo carregado. Verifique se a API Key está configurada e o gateway está ativo.</p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                            {filteredGroups.map(g => {
                                const isSelected = selectedGroupIds.includes(g.id);
                                return (
                                    <div
                                        key={g.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => isSelected ? handleRemoveGroup(g.id) : handleAddGroup(g.id)}
                                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (isSelected ? handleRemoveGroup(g.id) : handleAddGroup(g.id))}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all cursor-pointer select-none",
                                            isSelected
                                                ? "border-primary bg-primary/5 shadow-sm"
                                                : "border-transparent bg-background hover:border-primary/30 hover:bg-primary/5"
                                        )}
                                    >
                                        <Avatar className="h-10 w-10 border-2 border-white shadow shrink-0">
                                            <AvatarFallback className="text-xs font-black bg-emerald-100 text-emerald-800">{g.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-sm truncate">{g.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{g.participantCount} participantes</p>
                                            {g.description && <p className="text-[10px] text-muted-foreground truncate italic mt-0.5">{g.description}</p>}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={(e) => handleOpenGroupDetail(e, g)}
                                                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                title="Ver detalhes do grupo"
                                            >
                                                <Info size={14} />
                                            </button>
                                            {isSelected && <CheckCircle2 className="size-5 text-primary" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {selectedGroupsList.length > 0 && (
                            <div className="pt-2 border-t flex flex-wrap gap-2">
                                {selectedGroupsList.map(g => (
                                    <Badge key={g.id} variant="secondary" className="gap-1.5 h-8 font-bold pl-1 pr-2 bg-emerald-50 text-emerald-900 border-emerald-200">
                                        <Avatar className="h-5 w-5">
                                            <AvatarFallback className="text-[9px] bg-emerald-200">{g.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        {g.name}
                                        <button type="button" onClick={() => handleRemoveGroup(g.id)}><X size={12} /></button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Group Detail Sheet */}
                <Sheet open={!!groupDetail} onOpenChange={(open) => !open && setGroupDetail(null)}>
                    <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                        {/* SheetTitle always rendered for accessibility */}
                        <SheetHeader className="mb-6">
                            {(isLoadingDetail || groupDetail?._loading) ? (
                                <SheetTitle className="text-muted-foreground">Carregando detalhes...</SheetTitle>
                            ) : (
                                <div className="flex items-center gap-3 mb-2">
                                    <Avatar className="h-14 w-14 border-2 shadow">
                                        <AvatarFallback className="text-lg font-black bg-emerald-100 text-emerald-800">{groupDetail?.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <SheetTitle className="text-left">{groupDetail?.name}</SheetTitle>
                                        <p className="text-xs text-muted-foreground">{groupDetail?.size || groupDetail?.participantCount} participantes</p>
                                    </div>
                                </div>
                            )}
                            {!isLoadingDetail && !groupDetail?._loading && groupDetail?.description && (
                                <SheetDescription className="text-left text-sm text-foreground/80 whitespace-pre-line">
                                    {groupDetail.description}
                                </SheetDescription>
                            )}
                        </SheetHeader>

                        {(isLoadingDetail || groupDetail?._loading) ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="animate-spin size-8 text-primary opacity-40" />
                            </div>
                        ) : groupDetail && (

                                <div className="space-y-4">
                                    {/* Configurações do grupo */}
                                    <div className="p-4 bg-muted/30 rounded-xl border space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Configurações</p>
                                        <div className="grid grid-cols-1 gap-2">
                                            <div className={cn("flex items-center gap-3 p-2.5 rounded-lg", groupDetail.announce ? "bg-amber-50 border border-amber-200" : "bg-muted/20")}>
                                                <Megaphone size={16} className={groupDetail.announce ? "text-amber-600" : "text-muted-foreground"} />
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold">Somente Admins Enviam</p>
                                                    <p className="text-[10px] text-muted-foreground">Apenas administradores podem enviar mensagens</p>
                                                </div>
                                                <Badge variant={groupDetail.announce ? "default" : "secondary"} className="text-[10px]">
                                                    {groupDetail.announce ? 'Ativo' : 'Inativo'}
                                                </Badge>
                                            </div>
                                            <div className={cn("flex items-center gap-3 p-2.5 rounded-lg", groupDetail.restrict ? "bg-red-50 border border-red-200" : "bg-muted/20")}>
                                                <Lock size={16} className={groupDetail.restrict ? "text-red-600" : "text-muted-foreground"} />
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold">Configurações Restritas</p>
                                                    <p className="text-[10px] text-muted-foreground">Apenas admins podem editar info do grupo</p>
                                                </div>
                                                <Badge variant={groupDetail.restrict ? "destructive" : "secondary"} className="text-[10px]">
                                                    {groupDetail.restrict ? 'Restrito' : 'Aberto'}
                                                </Badge>
                                            </div>
                                            {groupDetail.isCommunity !== undefined && (
                                                <div className={cn("flex items-center gap-3 p-2.5 rounded-lg", groupDetail.isCommunity || groupDetail.isCommunityAnnounce ? "bg-blue-50 border border-blue-200" : "bg-muted/20")}>
                                                    <Users size={16} className={groupDetail.isCommunity || groupDetail.isCommunityAnnounce ? "text-blue-600" : "text-muted-foreground"} />
                                                    <div className="flex-1">
                                                        <p className="text-xs font-bold">Comunidade</p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {groupDetail.isCommunity ? 'Grupo principal da comunidade' : groupDetail.isCommunityAnnounce ? 'Canal de anúncios da comunidade' : 'Grupo independente'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Admins */}
                                    {groupDetail.admins && groupDetail.admins.length > 0 && (
                                        <div className="p-4 bg-muted/30 rounded-xl border space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Administradores ({groupDetail.admins.length})</p>
                                            {groupDetail.admins.map((admin: any) => (
                                                <div key={admin.id} className="flex items-center gap-2 py-1">
                                                    <ShieldCheck size={14} className="text-primary shrink-0" />
                                                    <span className="text-xs font-bold text-foreground/80">{resolveUser(admin.id)}</span>
                                                    <Badge variant="outline" className="text-[9px] ml-auto capitalize">{admin.role}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Criado em */}
                                    {groupDetail.createdAt && (
                                        <p className="text-[10px] text-muted-foreground text-center">
                                            Criado em {format(new Date(groupDetail.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                        </p>
                                    )}
                                </div>
                        )}
                    </SheetContent>
                </Sheet>

                {msgType === 'button' && (
                    <div className="p-4 border-2 border-dashed rounded-xl bg-indigo-50/50 space-y-4 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-indigo-800">Título do Cabeçalho</Label>
                                <Input value={headerTitle} onChange={e => setHeaderTitle(e.target.value)} className="bg-white h-9" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-indigo-800">Rodapé</Label>
                                <Input value={msgFooter} onChange={e => setMsgFooter(e.target.value)} className="bg-white h-9" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-indigo-800">Botões de Resposta (Máx 3)</Label>
                            {msgButtons.map((btn, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <Input value={btn.text} onChange={e => {
                                        const n = [...msgButtons];
                                        n[idx].text = e.target.value;
                                        setMsgButtons(n);
                                    }} className="bg-white h-9" />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => setMsgButtons(msgButtons.filter((_, i) => i !== idx))}><Trash2 size={14}/></Button>
                                </div>
                            ))}
                            {msgButtons.length < 3 && <Button type="button" variant="outline" size="sm" onClick={() => setMsgButtons([...msgButtons, { id: `btn_${Date.now()}_${msgButtons.length + 1}`, text: `Opção ${msgButtons.length + 1}` }])} className="w-full">+ Botão</Button>}
                        </div>
                    </div>
                )}
                
                {msgType === 'survey' && (
                    <div className="p-4 border-2 border-dashed rounded-xl bg-blue-50/50 space-y-4 animate-in slide-in-from-top-2">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-blue-800">Pergunta da Enquete</Label>
                            <Input placeholder="Ex: Você virá ao culto hoje?" value={surveyName} onChange={e => setSurveyName(e.target.value)} className="bg-white h-11" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-blue-800">Opções de Resposta</Label>
                            {surveyOptions.map((opt, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <Input value={opt} onChange={e => {
                                        const n = [...surveyOptions];
                                        n[idx] = e.target.value;
                                        setSurveyOptions(n);
                                    }} className="bg-white h-9" />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => setSurveyOptions(surveyOptions.filter((_, i) => i !== idx))}><Trash2 size={14}/></Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => setSurveyOptions([...surveyOptions, ''])} className="w-full text-xs">+ Adicionar Opção</Button>
                        </div>
                        <p className="text-[10px] text-blue-600 italic">As respostas aparecerão na aba "Respostas" assim que os membros votarem.</p>
                    </div>
                )}

                {msgType === 'media' && (
                    <div className="p-4 border-2 border-dashed rounded-xl bg-orange-50/50 space-y-4 animate-in slide-in-from-top-2">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-orange-800">Upload de Arquivo (Imagem, Áudio, Vídeo ou Documento)</Label>
                            <Input 
                                type="file" 
                                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        if (file.size > 3 * 1024 * 1024 && !file.type.startsWith('image/')) {
                                            toast({ variant: 'destructive', title: "Arquivo muito grande", description: "O tamanho máximo para documentos, vídeos e áudios é 3MB." });
                                            e.target.value = '';
                                            return;
                                        }

                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                            if (file.type.startsWith('image/')) {
                                                const img = new Image();
                                                img.onload = () => {
                                                    const canvas = document.createElement('canvas');
                                                    const MAX_WIDTH = 800;
                                                    const MAX_HEIGHT = 800;
                                                    let width = img.width;
                                                    let height = img.height;
                                                    
                                                    if (width > height) {
                                                        if (width > MAX_WIDTH) {
                                                            height *= MAX_WIDTH / width;
                                                            width = MAX_WIDTH;
                                                        }
                                                    } else {
                                                        if (height > MAX_HEIGHT) {
                                                            width *= MAX_HEIGHT / height;
                                                            height = MAX_HEIGHT;
                                                        }
                                                    }
                                                    
                                                    canvas.width = width;
                                                    canvas.height = height;
                                                    const ctx = canvas.getContext('2d');
                                                    ctx?.drawImage(img, 0, 0, width, height);
                                                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                                                    setMediaUrl(dataUrl);
                                                };
                                                if (event.target?.result) {
                                                    img.src = event.target.result as string;
                                                }
                                            } else {
                                                // For non-images, just set the base64 string directly
                                                setMediaUrl(event.target?.result as string);
                                            }
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }} 
                                className="bg-white" 
                            />
                            {mediaUrl && (
                                <div className="mt-2 relative inline-block">
                                    {mediaUrl.startsWith('data:image') ? (
                                        <img src={mediaUrl} alt="Preview" className="h-20 rounded-md border shadow-sm" />
                                    ) : (
                                        <div className="h-20 w-32 bg-orange-100 flex items-center justify-center rounded-md border shadow-sm text-xs font-bold text-orange-800 text-center p-2">
                                            Arquivo Anexado<br/>(Pronto p/ envio)
                                        </div>
                                    )}
                                    <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 size-6 rounded-full" onClick={() => setMediaUrl('')}><X className="size-3" /></Button>
                                </div>
                            )}
                            <p className="text-[10px] text-orange-600 italic mt-1">Imagens são otimizadas automaticamente. Outros formatos limite de 3MB.</p>
                        </div>
                    </div>
                )}

                {msgType === 'list' && (
                    <div className="p-4 border-2 border-dashed rounded-xl bg-fuchsia-50/50 space-y-4 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-fuchsia-800">Título do Cabeçalho</Label>
                                <Input value={headerTitle} onChange={e => setHeaderTitle(e.target.value)} className="bg-white h-9" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-fuchsia-800">Rodapé do Menu</Label>
                                <Input value={msgFooter} onChange={e => setMsgFooter(e.target.value)} className="bg-white h-9" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-fuchsia-800">Texto do Botão Principal</Label>
                                <Input value={listButtonText} onChange={e => setListButtonText(e.target.value)} className="bg-white h-9" placeholder="Ex: Ver Menu" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-fuchsia-800">Descrição do Menu</Label>
                                <Input value={listDescription} onChange={e => setListDescription(e.target.value)} className="bg-white h-9" placeholder="Instruções para o usuário..." />
                            </div>
                        </div>

                        <div className="space-y-4 border-t pt-4">
                            {listSections.map((sec, secIdx) => (
                                <div key={secIdx} className="p-3 bg-white border rounded-lg space-y-3">
                                    <div className="flex gap-2">
                                        <Input placeholder="Título da Sessão (Ex: Ministérios)" value={sec.title} onChange={e => {
                                            const n = [...listSections]; n[secIdx].title = e.target.value; setListSections(n);
                                        }} className="font-bold border-fuchsia-200" />
                                        <Button type="button" variant="destructive" size="icon" onClick={() => setListSections(listSections.filter((_, i) => i !== secIdx))}><Trash2 size={16}/></Button>
                                    </div>
                                    <div className="space-y-2 pl-4 border-l-2 border-fuchsia-100">
                                        {sec.rows.map((row, rowIdx) => (
                                            <div key={rowIdx} className="flex gap-2 items-start">
                                                <div className="flex-1 space-y-2">
                                                    <Input placeholder="Título do Item" value={row.title} onChange={e => {
                                                        const n = [...listSections]; n[secIdx].rows[rowIdx].title = e.target.value; setListSections(n);
                                                    }} className="h-8 text-sm" />
                                                    <Input placeholder="Descrição (Opcional)" value={row.description} onChange={e => {
                                                        const n = [...listSections]; n[secIdx].rows[rowIdx].description = e.target.value; setListSections(n);
                                                    }} className="h-8 text-xs text-muted-foreground" />
                                                </div>
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                                    const n = [...listSections]; n[secIdx].rows = n[secIdx].rows.filter((_, i) => i !== rowIdx); setListSections(n);
                                                }}><X size={14}/></Button>
                                            </div>
                                        ))}
                                        <Button type="button" variant="ghost" size="sm" onClick={() => {
                                            const n = [...listSections]; n[secIdx].rows.push({ title: 'Novo Item', description: '', rowId: `row_${Date.now()}_${Math.random()}` }); setListSections(n);
                                        }} className="w-full text-xs h-8 bg-fuchsia-50/50">+ Adicionar Item nesta Sessão</Button>
                                    </div>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => {
                                setListSections([...listSections, { title: 'Nova Sessão', rows: [{ title: 'Item 1', description: '', rowId: `row_${Date.now()}` }] }]);
                            }} className="w-full font-bold">+ Criar Nova Sessão</Button>
                        </div>
                    </div>
                )}

                {msgType !== 'survey' && (
                    <div className="space-y-2">
                        <Label>Mensagem Principal</Label>
                        <Textarea 
                            placeholder="Olá {{nome}}, temos um convite..." 
                            className="min-h-[120px]" 
                            value={message} 
                            onChange={(e) => setMessage(e.target.value)} 
                            required 
                        />
                    </div>
                )}

                <Button type="submit" disabled={isLoading} className="w-full h-12 font-black shadow-xl">
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                    Disparar WhatsApp
                </Button>
            </form>
        </div>
    );
}

function WhatsappResponses() {
    const { firestore } = useFirebase();
    const [expandedPoll, setExpandedPoll] = useState<string | null>(null);

    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const { data: users } = useCollection<any>(usersQuery);

    const waContactsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'notifications_contacts')) : null, [firestore]);
    const { data: waContacts } = useCollection<any>(waContactsQuery);

    const responsesQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'notifications_responses'), orderBy('receivedAt', 'desc'), limit(200)) : null,
    [firestore]);
    
    const { data: responses, isLoading } = useCollection<any>(responsesQuery);
    
    // Estados para filtro por campanha
    const [broadcasts, setBroadcasts] = useState<any[]>([]);
    const [selectedBroadcastId, setSelectedBroadcastId] = useState<string>('all');
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoadingHistory(true);
            try {
                const res = await fetch('/api/notifications/history');
                const data = await res.json();
                if (data.broadcasts) setBroadcasts(data.broadcasts);
            } catch (e) {
                console.error("Erro ao buscar histórico:", e);
            } finally {
                setIsLoadingHistory(false);
            }
        };
        fetchHistory();
    }, []);

    // Filtrar respostas pela campanha selecionada
    const filteredResponses = useMemo(() => {
        if (!responses) return [];
        if (selectedBroadcastId === 'all') return responses;
        return responses.filter((r: any) => r.broadcastId === selectedBroadcastId);
    }, [responses, selectedBroadcastId]);

    const selectedBroadcastInfo = useMemo(() => {
        return broadcasts.find(b => b.id === selectedBroadcastId);
    }, [broadcasts, selectedBroadcastId]);

    const resolveUser = (phone: string) => {
        const rawId = String(phone || '').split('@')[0];
        
        // 1. Tenta match no sistema (por telefone ou IDs vinculados)
        const matchedUser = users?.find((u: any) => {
            const uPhone = String(u.phone || '').replace(/\D/g, '');
            const uLid = String(u.lid || '').split('@')[0];
            const uJid = String(u.jid || '').split('@')[0];

            if (uPhone && uPhone.length >= 8) {
                const uPhoneNoCountry = uPhone.startsWith('55') ? uPhone.substring(2) : uPhone;
                const uPhoneNo9 = uPhoneNoCountry.length === 11 ? uPhoneNoCountry.slice(0, 2) + uPhoneNoCountry.slice(3) : null;
                const uPhoneLast8 = uPhoneNoCountry.slice(-8);
                const idDigits = rawId.replace(/\D/g, '');
                if (idDigits.includes(uPhoneNoCountry) || (uPhoneNo9 && idDigits.includes(uPhoneNo9)) || (uPhoneLast8.length === 8 && idDigits.includes(uPhoneLast8))) return true;
            }

            return (uLid && rawId === uLid) || (uJid && rawId === uJid);
        });
        if (matchedUser) return matchedUser.name;

        // 2. Tenta match nos contatos sincronizados
        const matchedWA = waContacts?.find((c: any) => {
            const cPhone = String(c.phoneNumber || '').replace(/\D/g, '');
            const cLid = String(c.lid || '').split('@')[0];
            const cJid = String(c.jid || '').split('@')[0];

            return (cPhone && (rawId.includes(cPhone) || cPhone.includes(rawId))) || 
                   (cLid && rawId === cLid) || 
                   (cJid && rawId === cJid);
        });
        if (matchedWA) return matchedWA.name;

        // 3. Fallback para formatação do número
        const digits = rawId.replace(/\D/g, '');
        if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
            const ddd = digits.substring(2, 4);
            const num = digits.substring(4);
            return `(${ddd}) ${num.length === 9 ? num.slice(0, 5) + '-' + num.slice(5) : num.slice(0, 4) + '-' + num.slice(4)}`;
        }
        return `+${digits}`;
    };

    const { pollStats, buttonStats } = useMemo(() => {
        if (!filteredResponses) return { pollStats: {}, buttonStats: {} };

        // Grouping polls: (Poll Name + Broadcast ID) -> { Option -> [Phones] }
        const pollStats: Record<string, { name: string, broadcastId?: string, options: Record<string, string[]> }> = {};
        
        // Grouping buttons: (Button Text + Broadcast ID) -> { label: string, phones: [Phones] }
        const buttonStats: Record<string, { label: string, broadcastId?: string, phones: string[] }> = {};

        // Track last vote per person per specific campaign instance
        const lastVoteByPerson: Record<string, any> = {};
        filteredResponses.filter(r => r.type === 'poll').forEach(r => {
            const key = `${r.pollName || 'Enquete'}__${r.broadcastId || 'general'}__${r.from}`;
            if (!lastVoteByPerson[key]) lastVoteByPerson[key] = r;
        });

        Object.values(lastVoteByPerson).forEach((r: any) => {
            const pollName = r.pollName || 'Enquete';
            const bId = r.broadcastId || 'general';
            const groupKey = `${pollName}:::${bId}`;

            if (!pollStats[groupKey]) {
                pollStats[groupKey] = { name: pollName, broadcastId: r.broadcastId, options: {} };
            }
            
            const opts = Array.isArray(r.selectedOptions) ? r.selectedOptions : [r.selectedOptions].filter(Boolean);
            opts.forEach((opt: any) => {
                const label = typeof opt === 'string' ? opt : opt?.label || opt?.text || 'Opção';
                if (!pollStats[groupKey].options[label]) pollStats[groupKey].options[label] = [];
                pollStats[groupKey].options[label].push(r.from);
            });
        });

        // Track last button click per person per specific campaign instance
        const lastButtonByPerson: Record<string, any> = {};
        filteredResponses.filter(r => r.type === 'button').forEach(r => {
            const key = `${r.buttonText || r.buttonId}__${r.broadcastId || 'general'}__${r.from}`;
            if (!lastButtonByPerson[key]) lastButtonByPerson[key] = r;
        });

        Object.values(lastButtonByPerson).forEach((r: any) => {
            const label = r.buttonText || r.buttonId || 'Botão';
            const bId = r.broadcastId || 'general';
            const groupKey = `${label}:::${bId}`;

            if (!buttonStats[groupKey]) {
                buttonStats[groupKey] = { label, broadcastId: r.broadcastId, phones: [] };
            }
            buttonStats[groupKey].phones.push(r.from);
        });

        return { pollStats, buttonStats };
    }, [filteredResponses]);

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    const hasData = Object.keys(pollStats).length > 0 || Object.keys(buttonStats).length > 0;

    return (
        <div className="space-y-6 text-slate-900">
            {/* Seletor de Campanhas */}
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-slate-50 pb-6">
                    <div className="space-y-1.5 flex-1 w-full md:w-auto">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                            <History size={12} />
                            Filtro por Disparo
                        </Label>
                        <div className="flex gap-2">
                            <Select value={selectedBroadcastId} onValueChange={setSelectedBroadcastId}>
                                <SelectTrigger className="h-11 w-full md:w-[450px] font-bold border-2 focus:ring-primary/20">
                                    <SelectValue placeholder="Selecione um disparo..." />
                                </SelectTrigger>
                                <SelectContent className="max-w-[450px]">
                                    <SelectItem value="all">Todas as Campanhas (Geral)</SelectItem>
                                    {broadcasts.map(b => (
                                        <SelectItem key={b.id} value={b.id} className="text-xs">
                                            {format(new Date(b.sentAt), "dd/MM HH:mm", { locale: ptBR })} - {b.surveyName || b.message?.slice(0, 45)}...
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => {
                                    const fetchHistory = async () => {
                                        setIsLoadingHistory(true);
                                        try {
                                            const res = await fetch('/api/notifications/history');
                                            const data = await res.json();
                                            if (data.broadcasts) setBroadcasts(data.broadcasts);
                                        } catch {} finally { setIsLoadingHistory(false); }
                                    };
                                    fetchHistory();
                                }}
                                disabled={isLoadingHistory}
                            >
                                <RefreshCw className={cn("size-4", isLoadingHistory && "animate-spin")} />
                            </Button>
                        </div>
                    </div>

                    {selectedBroadcastInfo && (
                        <div className="flex flex-wrap gap-3 w-full md:w-auto">
                            <div className="flex-1 md:flex-none px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 min-w-[100px]">
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Enviados</p>
                                <p className="text-lg font-black text-slate-700">{selectedBroadcastInfo.recipientCount}</p>
                            </div>
                            <div className="flex-1 md:flex-none px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 min-w-[100px]">
                                <p className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Respostas</p>
                                <p className="text-lg font-black text-emerald-700">{filteredResponses.length}</p>
                            </div>
                            <div className="flex-1 md:flex-none px-4 py-2 bg-blue-50 rounded-xl border border-blue-100 min-w-[100px]">
                                <p className="text-[9px] font-black uppercase text-blue-400 tracking-wider">Engajamento</p>
                                <p className="text-lg font-black text-blue-700">
                                    {selectedBroadcastInfo.recipientCount > 0 
                                        ? Math.round((filteredResponses.length / selectedBroadcastInfo.recipientCount) * 100) 
                                        : 0}%
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {selectedBroadcastId !== 'all' && filteredResponses.length === 0 && (
                    <div className="py-12 text-center space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <Info className="size-8 mx-auto text-slate-300" />
                        <div className="space-y-1">
                            <h4 className="font-bold text-slate-500">Nenhuma resposta capturada para este disparo ainda</h4>
                            <p className="text-xs text-slate-400">As respostas aparecerão aqui automaticamente assim que os membros interagirem.</p>
                        </div>
                    </div>
                )}
            </div>

            {!hasData && selectedBroadcastId === 'all' && (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3 border-2 border-dashed rounded-xl">
                    <MousePointer2 className="size-8 opacity-20" />
                    <p className="text-xs italic text-center">Nenhuma resposta recebida ainda.<br />Configure o Webhook no portal api-wa.me para capturar interações.</p>
                </div>
            )}

            {Object.entries(pollStats).map(([groupKey, pollGroup]) => {
                const totalVoters = new Set(Object.values(pollGroup.options).flat()).size;
                const isExpanded = expandedPoll === groupKey;
                return (
                    <Card key={groupKey} className="border-2 border-blue-100 bg-blue-50/20 shadow-sm overflow-hidden">
                        <CardHeader className="py-3 px-5 bg-blue-50/50 border-b border-blue-100">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <CardTitle className="text-sm font-black text-blue-900 flex items-center gap-2">
                                        <CheckCircle2 className="size-4 text-blue-500" />
                                        {pollGroup.name}
                                    </CardTitle>
                                    {pollGroup.broadcastId && (
                                        <div className="flex items-center gap-1.5 opacity-60">
                                            <Send size={10} className="text-blue-700" />
                                            <span className="text-[9px] font-bold text-blue-800 uppercase tracking-tight">Disparo: {pollGroup.broadcastId}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-blue-600 text-white font-black text-xs">{totalVoters} voto{totalVoters !== 1 ? 's' : ''}</Badge>
                                    <Button size="sm" variant="ghost" className="h-7 text-[10px] font-black text-blue-700" onClick={() => setExpandedPoll(isExpanded ? null : groupKey)}>
                                        {isExpanded ? 'Recolher' : 'Ver quem votou'}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 pb-3 space-y-3">
                            {Object.entries(pollGroup.options).map(([opt, phones]) => {
                                const pct = totalVoters > 0 ? Math.round((phones.length / totalVoters) * 100) : 0;
                                return (
                                    <div key={opt} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-slate-700">{opt}</span>
                                            <span className="font-black text-blue-700">{phones.length} ({pct}%)</span>
                                        </div>
                                        <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                        {isExpanded && (
                                            <div className="flex flex-wrap gap-1 pt-1">
                                                {phones.map(phone => (
                                                    <Badge key={phone} variant="outline" className="text-[10px] font-medium border-blue-200 bg-white">
                                                        {resolveUser(phone)}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                );
            })}

            {Object.keys(buttonStats).length > 0 && (
                <Card className="border-2 border-emerald-100 bg-emerald-50/20 shadow-sm overflow-hidden">
                    <CardHeader className="py-3 px-5 bg-emerald-50/50 border-b border-emerald-100">
                        <CardTitle className="text-sm font-black text-emerald-900 flex items-center gap-2">
                            <MousePointer2 className="size-4 text-emerald-500" />
                            Respostas de Botão
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 pb-3 space-y-3">
                        {Object.entries(buttonStats).map(([groupKey, btnGroup]) => {
                            const total = Object.values(buttonStats).reduce((acc, curr) => acc + curr.phones.length, 0);
                            const pct = total > 0 ? Math.round((btnGroup.phones.length / total) * 100) : 0;
                            return (
                                <div key={groupKey} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700">{btnGroup.label}</span>
                                            {btnGroup.broadcastId && (
                                                <span className="text-[8px] font-medium text-emerald-600 uppercase tracking-tight">Disparo: {btnGroup.broadcastId}</span>
                                            )}
                                        </div>
                                        <span className="font-black text-emerald-700">{btnGroup.phones.length} ({pct}%)</span>
                                    </div>
                                    <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="flex flex-wrap gap-1 pt-1">
                                        {btnGroup.phones.map(phone => (
                                            <Badge key={phone} variant="outline" className="text-[10px] font-medium border-emerald-200 bg-white">
                                                {resolveUser(phone)}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}
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
                        <TableHead>Data</TableHead>
                        <TableHead>Conteúdo</TableHead>
                        <TableHead>Sucesso</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history?.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic text-xs">Nenhum disparo registrado.</TableCell></TableRow>
                    ) : (
                        history?.map((item: any) => (
                            <TableRow key={item.id}>
                                <TableCell className="text-[10px] font-bold">
                                    {item.sentAt ? format(item.sentAt.toDate(), 'dd/MM HH:mm') : '-'}
                                </TableCell>
                                <TableCell className="max-w-md truncate text-xs font-medium">
                                    <Badge variant="outline" className="text-[8px] uppercase p-0.5 mr-2 border-none bg-muted/50">{item.type || 'text'}</Badge>
                                    {item.message}
                                </TableCell>
                                <TableCell className="text-xs font-black">{item.successCount} / {item.recipientCount}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant="outline" className={cn("text-[10px] font-black uppercase border-none", item.status === 'success' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>{item.status}</Badge>
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
    const [webhookUrl, setWebhookUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [instanceStatus, setInstanceStatus] = useState<any>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSyncingContacts, setIsSyncingContacts] = useState(false);

    const checkStatus = async () => {
        if (!waKey) {
            setInstanceStatus(null);
            return;
        }
        setIsRefreshing(true);
        try {
            const serverUrl = config?.serverUrl || '';
            const params = new URLSearchParams({ key: waKey });
            if (serverUrl) params.set('server', serverUrl);
            
            const res = await fetch(`/api/notifications/instance?${params.toString()}`, { cache: 'no-store' });
            const data = await res.json();
            
            if (data.status === 'error' || data.error) {
                 setInstanceStatus({ status: 'offline', message: data.message || data.error || 'Erro na API' });
                 toast({ variant: 'destructive', title: 'Erro de Conexão', description: data.message || 'Verifique sua API Key.' });
            } else {
                 setInstanceStatus(data);
            }
            
        } catch (e) {
            setInstanceStatus({ status: 'offline', message: 'Erro de rede' });
        } finally { 
            setIsRefreshing(false); 
        }
    };

    useEffect(() => {
        if (config) {
            const key = config.whatsappApiKey || '';
            setWaKey(key);
            const currentWebhook = typeof window !== 'undefined' ? `${window.location.origin}/api/notifications/webhook` : '';
            setWebhookUrl(currentWebhook);
        }
    }, [config]);

    // Verifica o status ao carregar o config
    useEffect(() => {
        const savedKey = config?.whatsappApiKey || config?.instanceKey || '';
        if (savedKey) {
            checkStatus();
        }
    }, [config]); // Depende apenas do config para evitar loops enquanto o usuário digita na config manual

    const handleConnect = async () => {
        if (!waKey) return;
        setIsRefreshing(true);
        try {
            const res = await fetch('/api/notifications/instance', { 
                method: 'POST',
                cache: 'no-store' 
            });
            const data = await res.json();
            
            if (data.status === 'error' || data.error) {
                toast({ variant: 'destructive', title: "Erro na API", description: data.message || data.error });
            } else {
                setInstanceStatus(data);
                toast({ title: "Comando Enviado", description: "O servidor está gerando a sessão." });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao conectar" });
        } finally { setIsRefreshing(false); }
    };

    const handleSaveKey = async () => {
        if (!firestore) return;
        setIsSaving(true);
        const configRef = doc(firestore, 'config', 'notifications');
        try {
            await setDocumentNonBlocking(configRef, { whatsappApiKey: waKey, webhookUrl, updatedAt: Timestamp.now() }, { merge: true });
            toast({ title: "Configurações Salvas!" });
            checkStatus(); // Chama o checkStatus automaticamente após salvar
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao salvar" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyWebhook = () => {
        navigator.clipboard.writeText(webhookUrl);
        toast({ title: "Copiado!", description: "Cole esta URL no portal api-wa.me" });
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
                            <Input type="password" value={waKey} onChange={e => setWaKey(e.target.value)} placeholder="Sua chave secreta..." className="h-11" />
                        </div>
                        <div className="space-y-2 pt-4 border-t">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">URL do Webhook do Sistema</Label>
                            <div className="flex gap-2">
                                <Input value={webhookUrl} readOnly className="font-mono text-xs h-11 bg-muted/30" />
                                <Button onClick={handleCopyWebhook} variant="outline" size="icon" className="h-11 w-11"><Copy size={16}/></Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                                <Info size={10} /> Copie esta URL e cole nos campos de Webhook do portal api-wa.me para capturar respostas.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-4 border-t">
                            <Button onClick={handleSaveKey} disabled={isSaving} className="flex-1 font-bold h-11">Salvar Credenciais</Button>
                            <Button 
                                variant="outline" 
                                onClick={async () => {
                                    if (!waKey) return;
                                    setIsSyncingContacts(true);
                                    try {
                                        const serverUrl = config?.serverUrl || 'https://us.api-wa.me';
                                        const res = await fetch(`/api/notifications/contacts?key=${waKey}&server=${encodeURIComponent(serverUrl)}`);
                                        const data = await res.json();
                                        if (data.success) {
                                            toast({ title: "Sincronização Concluída", description: `${data.count} contatos importados.` });
                                        } else {
                                            toast({ variant: 'destructive', title: "Erro na Sincronização", description: data.error });
                                        }
                                    } catch (e) {
                                        toast({ variant: 'destructive', title: "Erro ao sincronizar" });
                                    } finally { setIsSyncingContacts(false); }
                                }} 
                                disabled={isSyncingContacts || !waKey} 
                                className="gap-2 h-11 font-bold"
                            >
                                <RefreshCw className={cn("size-4", isSyncingContacts && "animate-spin")} />
                                {isSyncingContacts ? 'Sincronizando...' : 'Sincronizar Contatos'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className={cn("shadow-lg border-2", instanceStatus?.parsedStatus === 'connected' ? "border-emerald-200" : "border-amber-200")}>
                    <CardHeader className="border-b bg-white/50">
                        <CardTitle className="text-sm font-black uppercase flex items-center gap-2">Status do Gateway</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-8 flex flex-col items-center justify-center text-center min-h-[250px]">
                        {isRefreshing ? <Loader2 className="animate-spin size-8 text-primary opacity-40" /> : 
                         instanceStatus?.parsedStatus === 'connected' ? (
                            <div className="space-y-4">
                                <div className="size-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><CheckCircle size={32} /></div>
                                <h4 className="font-black text-emerald-900 uppercase">Gateway Ativo</h4>
                                <Button size="sm" variant="ghost" onClick={checkStatus} className="mt-4 text-[10px] font-black uppercase tracking-widest"><RefreshCw className="size-3 mr-2" /> Atualizar</Button>
                            </div>
                        ) : instanceStatus?.parsedStatus === 'pairing' && instanceStatus?.qr ? (
                            <div className="space-y-4">
                                <div className="bg-white p-2 border rounded-xl shadow-sm inline-block">
                                    {/* Exibe a imagem base64 diretamente */}
                                    <img src={instanceStatus.qr.startsWith('data:image') ? instanceStatus.qr : `data:image/png;base64,${instanceStatus.qr}`} alt="QR Code" className="w-48 h-48" />
                                </div>
                                <p className="text-xs font-bold text-amber-600 uppercase">Leia o QR Code no WhatsApp</p>
                                <Button size="sm" variant="outline" onClick={checkStatus} className="text-[10px] font-black uppercase tracking-widest w-full"><RefreshCw className="size-3 mr-2" /> Atualizar Status</Button>
                            </div>
                        ) : (
                            <div className="space-y-4 opacity-70 text-center">
                                <Smartphone size={48} className="mx-auto" />
                                <p className="text-xs font-bold uppercase tracking-widest">Desconectado</p>
                                {instanceStatus?.message && (
                                    <p className="text-[10px] text-destructive font-medium bg-red-50 p-2 rounded-md border border-red-100 mx-4">
                                        {instanceStatus.message}
                                    </p>
                                )}
                                <div className="flex gap-2 justify-center">
                                    <Button size="sm" variant="outline" onClick={handleConnect} className="text-[10px] font-black uppercase tracking-widest">
                                        <QrCode className="size-3 mr-2" /> Gerar QR Code
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={checkStatus} className="text-[10px] font-black uppercase tracking-widest"><RefreshCw className="size-3" /></Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function WhatsappGroupsManager({ config }: { config: any }) {
    const [groups, setGroups] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    const fetchGroups = async () => {
        const apiKey = config?.instanceKey || config?.whatsappApiKey;
        if (!apiKey) return;
        setIsLoading(true);
        const params = new URLSearchParams({ key: apiKey });
        if (config?.serverUrl) params.set('server', config.serverUrl);
        try {
            const res = await fetch(`/api/notifications/groups?${params.toString()}`);
            const data = await res.json();
            setGroups(data.groups || []);
        } catch { /* silently fail */ }
        finally { setIsLoading(false); }
    };

    const openGroupDetail = async (g: any) => {
        const apiKey = config?.instanceKey || config?.whatsappApiKey;
        if (!apiKey) return;
        setSelectedGroup({ ...g, _loading: true });
        setIsLoadingDetail(true);
        const params = new URLSearchParams({ key: apiKey });
        if (config?.serverUrl) params.set('server', config.serverUrl);
        try {
            params.set('id', g.id);
            const res = await fetch(`/api/notifications/groups?${params.toString()}`);
            const data = await res.json();
            setSelectedGroup(data);
        } catch { setSelectedGroup({ ...g, _error: true }); }
        finally { setIsLoadingDetail(false); }
    };

    useEffect(() => { if (config) fetchGroups(); }, [config]);

    const filteredGroups = useMemo(() =>
        groups.filter(g => !search || g.name?.toLowerCase().includes(search.toLowerCase())),
        [groups, search]
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black">Gerenciar Grupos</h2>
                    <p className="text-sm text-muted-foreground">Visualize e gerencie seus grupos do WhatsApp</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchGroups} disabled={isLoading} className="gap-2 font-bold">
                    <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
                    Atualizar
                </Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Buscar grupo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-11" />
            </div>

            {/* Stats row */}
            {groups.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                        <p className="text-2xl font-black text-emerald-700">{groups.length}</p>
                        <p className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">Total de Grupos</p>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center">
                        <p className="text-2xl font-black text-blue-700">{groups.reduce((s, g) => s + (g.participantCount || 0), 0).toLocaleString('pt-BR')}</p>
                        <p className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">Total de Membros</p>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                        <p className="text-2xl font-black text-amber-700">{groups[0]?.participantCount?.toLocaleString('pt-BR') || '—'}</p>
                        <p className="text-[10px] font-bold uppercase text-amber-600 tracking-wider">Maior Grupo</p>
                    </div>
                </div>
            )}

            {/* Groups Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="animate-spin size-8 text-primary opacity-40" />
                </div>
            ) : filteredGroups.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <Users className="mx-auto size-10 opacity-30 mb-3" />
                    <p className="text-sm font-bold">Nenhum grupo encontrado</p>
                    <p className="text-xs">Verifique se a API Key está configurada e o gateway está ativo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredGroups.map(g => (
                        <div
                            key={g.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => openGroupDetail(g)}
                            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && openGroupDetail(g)}
                            className="p-4 rounded-xl border-2 border-transparent bg-card hover:border-primary/30 hover:shadow-md transition-all cursor-pointer select-none group"
                        >
                            <div className="flex items-start gap-3">
                                <Avatar className="h-12 w-12 shrink-0 border-2 shadow-sm">
                                    <AvatarFallback className="text-base font-black bg-emerald-100 text-emerald-800">{g.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">{g.name}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                        <Users size={10} className="text-muted-foreground" />
                                        <span className="text-[10px] text-muted-foreground">{(g.participantCount || 0).toLocaleString('pt-BR')} membros</span>
                                    </div>
                                    {g.description && (
                                        <p className="text-[10px] text-muted-foreground truncate italic mt-1">{g.description}</p>
                                    )}
                                </div>
                                <ChevronRight size={14} className="text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detail Sheet */}
            <Sheet open={!!selectedGroup} onOpenChange={open => !open && setSelectedGroup(null)}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader className="mb-6">
                        {isLoadingDetail || selectedGroup?._loading ? (
                            <SheetTitle className="text-muted-foreground">Carregando...</SheetTitle>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 mb-2">
                                    <Avatar className="h-14 w-14 border-2 shadow">
                                        <AvatarFallback className="text-lg font-black bg-emerald-100 text-emerald-800">{selectedGroup?.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <SheetTitle className="text-left">{selectedGroup?.name}</SheetTitle>
                                        <p className="text-xs text-muted-foreground">{selectedGroup?.size || selectedGroup?.participantCount} participantes</p>
                                    </div>
                                </div>
                                {selectedGroup?.description && (
                                    <SheetDescription className="text-left text-sm text-foreground/80 whitespace-pre-line">
                                        {selectedGroup.description}
                                    </SheetDescription>
                                )}
                            </>
                        )}
                    </SheetHeader>

                    {isLoadingDetail || selectedGroup?._loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="animate-spin size-8 text-primary opacity-40" />
                        </div>
                    ) : selectedGroup && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted/30 rounded-xl border space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Configurações</p>
                                <div className="grid grid-cols-1 gap-2">
                                    <div className={cn("flex items-center gap-3 p-2.5 rounded-lg", selectedGroup.announce ? "bg-amber-50 border border-amber-200" : "bg-muted/20")}>
                                        <Megaphone size={16} className={selectedGroup.announce ? "text-amber-600" : "text-muted-foreground"} />
                                        <div className="flex-1">
                                            <p className="text-xs font-bold">Somente Admins Enviam</p>
                                            <p className="text-[10px] text-muted-foreground">Apenas administradores podem enviar mensagens</p>
                                        </div>
                                        <Badge variant={selectedGroup.announce ? "default" : "secondary"} className="text-[10px]">
                                            {selectedGroup.announce ? 'Ativo' : 'Inativo'}
                                        </Badge>
                                    </div>
                                    <div className={cn("flex items-center gap-3 p-2.5 rounded-lg", selectedGroup.restrict ? "bg-red-50 border border-red-200" : "bg-muted/20")}>
                                        <Lock size={16} className={selectedGroup.restrict ? "text-red-600" : "text-muted-foreground"} />
                                        <div className="flex-1">
                                            <p className="text-xs font-bold">Configurações Restritas</p>
                                            <p className="text-[10px] text-muted-foreground">Apenas admins podem editar info do grupo</p>
                                        </div>
                                        <Badge variant={selectedGroup.restrict ? "destructive" : "secondary"} className="text-[10px]">
                                            {selectedGroup.restrict ? 'Restrito' : 'Aberto'}
                                        </Badge>
                                    </div>
                                    {selectedGroup.isCommunity !== undefined && (
                                        <div className={cn("flex items-center gap-3 p-2.5 rounded-lg", selectedGroup.isCommunity || selectedGroup.isCommunityAnnounce ? "bg-blue-50 border border-blue-200" : "bg-muted/20")}>
                                            <Users size={16} className={selectedGroup.isCommunity || selectedGroup.isCommunityAnnounce ? "text-blue-600" : "text-muted-foreground"} />
                                            <div className="flex-1">
                                                <p className="text-xs font-bold">Tipo</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {selectedGroup.isCommunity ? 'Grupo principal da comunidade' : selectedGroup.isCommunityAnnounce ? 'Canal de anúncios da comunidade' : 'Grupo independente'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedGroup.admins && selectedGroup.admins.length > 0 && (
                                <div className="p-4 bg-muted/30 rounded-xl border space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Administradores ({selectedGroup.admins.length})</p>
                                    {selectedGroup.admins.map((admin: any) => (
                                        <div key={admin.id} className="flex items-center gap-2 py-1">
                                            <ShieldCheck size={14} className="text-primary shrink-0" />
                                            <span className="text-xs font-mono text-foreground/70 truncate">{admin.id}</span>
                                            <Badge variant="outline" className="text-[9px] ml-auto capitalize shrink-0">{admin.role}</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedGroup.createdAt && (
                                <p className="text-[10px] text-muted-foreground text-center">
                                    Criado em {format(new Date(selectedGroup.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                </p>
                            )}
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

export default function NotificationsPage() {
  const { data: config } = useDoc<any>('config/notifications');

  return (
    <div className="space-y-6">
        <Tabs defaultValue="sender" className="w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 mb-6">
                <div className="overflow-x-auto">
                    <TabsList className="flex h-auto justify-start bg-muted/50 p-1 rounded-xl w-fit min-w-max border-2">
                        <TabsTrigger value="sender" className="rounded-lg font-bold py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Disparador</TabsTrigger>
                        <TabsTrigger value="groups" className="rounded-lg font-bold py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Grupos</TabsTrigger>
                        <TabsTrigger value="chats" className="rounded-lg font-bold py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Conversas</TabsTrigger>
                        <TabsTrigger value="responses" className="rounded-lg font-bold py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Respostas</TabsTrigger>
                        <TabsTrigger value="history" className="rounded-lg font-bold py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Histórico</TabsTrigger>
                    </TabsList>
                </div>
                <Link href="/dashboard/settings/notifications">
                    <Button variant="outline" size="sm" className="font-bold gap-2">
                        <Settings className="size-4" />
                        Configurar Gateway
                    </Button>
                </Link>
            </div>
            
            <TabsContent value="sender" className="mt-0 animate-in fade-in-50 duration-300">
                <WhatsappSender config={config} />
            </TabsContent>
            <TabsContent value="groups" className="mt-0 animate-in fade-in-50 duration-300">
                <WhatsappGroupsManager config={config} />
            </TabsContent>
            <TabsContent value="chats" className="mt-0 animate-in fade-in-50 duration-300"><WhatsappChats /></TabsContent>
            <TabsContent value="responses" className="mt-0 animate-in fade-in-50 duration-300"><WhatsappResponses /></TabsContent>
            <TabsContent value="history" className="mt-0 animate-in fade-in-50 duration-300"><NotificationsHistory /></TabsContent>
        </Tabs>
    </div>
  );
}

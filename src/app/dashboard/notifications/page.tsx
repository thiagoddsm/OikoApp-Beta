'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { 
    Loader2, Send, Settings, Key, History, MessageSquare, 
    Users, CheckCircle2, Search, UserPlus, X, Info, RefreshCw, 
    Smartphone, MessageCircle, Trash2, CheckCircle, XCircle,
    Copy, Globe, HeartHandshake, CalendarDays, MousePointer2, QrCode,
    Lock, Megaphone, UserCheck, ShieldCheck, ChevronRight, FileSpreadsheet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useDoc, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc, where, limit, updateDoc } from 'firebase/firestore';
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
                const uLid = (u.lid && u.lid !== 'lid') ? String(u.lid).split('@')[0] : '';
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
    const { firestore, user } = useFirebase();
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
    
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const insertTag = (tag: string) => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = message;
            const before = text.substring(0, start);
            const after = text.substring(end, text.length);
            setMessage(before + tag + after);
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + tag.length, start + tag.length);
            }, 0);
        } else {
            setMessage(prev => prev + tag);
        }
    };

    // Blacklist configuration for estimation
    const blacklistQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'notifications_blacklist')) : null, [firestore]);
    const { data: blacklist } = useCollection<any>(blacklistQuery);

    const blacklistedSet = useMemo(() => {
        const set = new Set<string>();
        blacklist?.forEach((b: any) => {
            const num = String(b.phoneNumber || b.id || '').replace(/\D/g, '');
            if (num) set.add(num);
        });
        return set;
    }, [blacklist]);

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
    const [msgType, setMsgType] = useState<'text' | 'button' | 'survey' | 'media' | 'list' | 'contact'>('text');

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
        const apiKey = config?.evolutionKey || config?.instanceKey || config?.whatsappApiKey;
        const serverUrl = config?.evolutionUrl || config?.serverUrl || '';
        const instanceName = config?.evolutionInstance || config?.instanceName || '';
        const params = new URLSearchParams({ key: apiKey || '' });
        if (serverUrl) params.set('server', serverUrl);
        if (instanceName) params.set('instance', instanceName);
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
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');

    const [selectedServiceAreaId, setSelectedServiceAreaId] = useState<string>('');

    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const { data: users } = useCollection<any>(usersQuery);

    const cellsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'cells')) : null, [firestore]);
    const { data: cells } = useCollection<any>(cellsQuery);

    const areasQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'areas')) : null, [firestore]);
    const { data: areas } = useCollection<any>(areasQuery);

    const redesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'redes')) : null, [firestore]);
    const { data: redes } = useCollection<any>(redesQuery);

    const serviceAreasQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'areas_of_service')) : null, [firestore]);
    const { data: serviceAreas } = useCollection<any>(serviceAreasQuery);

    const teamsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'teams')) : null, [firestore]);
    const { data: teams } = useCollection<any>(teamsQuery);

    const targetAudienceUsers = useMemo(() => {
        if (!users) return [];

        switch (targetAudience) {
            case 'all_members':
                return users;

            case 'specific_members':
                return users.filter(u => selectedUserIds.includes(u.id));

            case 'gc_leaders':
                return users.filter(u => {
                    const isRoleLider = u.hierarchy?.role === 'lider' || u.isLiderGc === true || u.role === 'lider_gc' || u.isLider === true;
                    const isCellLider = cells?.some((c: any) => c.liderId === u.id || c.liderCasalId === u.id);
                    return isRoleLider || isCellLider;
                });

            case 'gc_coliders':
                return users.filter(u => {
                    const isRoleCoLider = u.hierarchy?.role === 'colider' || u.isCoLider === true || u.role === 'colider';
                    const isCellCoLider = cells?.some((c: any) => 
                        c.coLiderIds?.includes(u.id) || 
                        c.coLideres?.some((cl: any) => cl.id === u.id || cl.casalId === u.id)
                    );
                    return isRoleCoLider || isCellCoLider;
                });

            case 'gc_supervisors':
                return users.filter(u => {
                    const isRoleSupervisor = u.hierarchy?.role === 'supervisor' || u.role === 'supervisor' || u.isSupervisor === true;
                    const isCellSupervisor = cells?.some((c: any) => c.supervisorId === u.id);
                    return isRoleSupervisor || isCellSupervisor;
                });

            case 'gc_area_leaders':
                return users.filter(u => {
                    const isRoleArea = u.hierarchy?.role === 'lider_area' || u.hierarchy?.role === 'lider_rede';
                    const isAreaLider = areas?.some((a: any) => a.liderId === u.id) || redes?.some((r: any) => r.liderId === u.id);
                    return isRoleArea || isAreaLider;
                });

            case 'all_volunteers':
                return users.filter(u => 
                    u.isVolunteer === true || 
                    u.serviceStatus === 'serving' ||
                    (Array.isArray(u.serviceAreaIds) && u.serviceAreaIds.length > 0) || 
                    (Array.isArray(u.volunteeringAreas) && u.volunteeringAreas.length > 0) ||
                    (Array.isArray(u.serviceAreaNames) && u.serviceAreaNames.length > 0) ||
                    (Array.isArray(u.areas) && u.areas.length > 0) ||
                    !!u.serviceAreaId ||
                    !!u.areaOfServiceId ||
                    !!u.areaId ||
                    !!u.serviceTeamId ||
                    !!u.teamId
                );

            case 'volunteers_by_area': {
                if (!selectedServiceAreaId) return [];
                
                const targetArea = serviceAreas?.find((sa: any) => sa.id === selectedServiceAreaId || sa.name === selectedServiceAreaId);
                const areaId = targetArea?.id || selectedServiceAreaId;
                const areaName = targetArea?.name || selectedServiceAreaId;

                const cleanId = areaId.toLowerCase().trim();
                const cleanName = areaName.toLowerCase().trim();

                return users.filter(u => {
                    const matches = (val?: string) => {
                        if (!val || typeof val !== 'string') return false;
                        const v = val.toLowerCase().trim();
                        return v === cleanId || v === cleanName;
                    };

                    if (Array.isArray(u.serviceAreaIds) && u.serviceAreaIds.some((id: string) => matches(id))) return true;
                    if (Array.isArray(u.volunteeringAreas) && u.volunteeringAreas.some((id: string) => matches(id))) return true;
                    if (Array.isArray(u.serviceAreaNames) && u.serviceAreaNames.some((id: string) => matches(id))) return true;
                    if (Array.isArray(u.areas) && u.areas.some((id: string) => matches(id))) return true;

                    if (matches(u.serviceAreaId)) return true;
                    if (matches(u.areaOfServiceId)) return true;
                    if (matches(u.areaId)) return true;
                    if (matches(u.servicoAreaId)) return true;
                    if (matches(u.serviceArea)) return true;

                    if (u.serviceTeamId || u.teamId) {
                        const userTeam = teams?.find((t: any) => t.id === u.serviceTeamId || t.id === u.teamId);
                        if (userTeam && (matches(userTeam.areaId) || matches(userTeam.serviceAreaId))) return true;
                    }

                    return false;
                });
            }

            case 'role_pastor':
                return users.filter(u => u.role === 'pastor' || u.hierarchy?.role === 'pastor');

            case 'role_admin':
                return users.filter(u => u.role === 'admin' || u.isAdmin === true);

            case 'role_membro':
                return users.filter(u => u.integrationStatus === 'membro');

            case 'role_novo_convertido':
                return users.filter(u => u.integrationStatus === 'novo_convertido' || u.integrationStatus === 'visitante' || u.role === 'visitante');

            default:
                return [];
        }
    }, [users, cells, areas, redes, serviceAreas, teams, targetAudience, selectedUserIds, selectedServiceAreaId]);

    const resolveUser = useCallback((phone: string) => {
        const rawId = String(phone || '').split('@')[0];
        
        const matchedUser = users?.find((u: any) => {
            const uPhone = String(u.phone || '').replace(/\D/g, '');
            const uLid = (u.lid && u.lid !== 'lid') ? String(u.lid).split('@')[0] : '';
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

        const matchedWA = waContacts?.find((c: any) => {
            const cPhone = String(c.phoneNumber || '').replace(/\D/g, '');
            const cLid = String(c.lid || '').split('@')[0];
            const cJid = String(c.jid || '').split('@')[0];

            if (cPhone && cPhone.length >= 8) {
                const idDigits = rawId.replace(/\D/g, '');
                if (idDigits.includes(cPhone.slice(-8))) return true;
            }
            return (cLid && rawId === cLid) || (cJid && rawId === cJid);
        });
        if (matchedWA) return matchedWA.name || matchedWA.pushName || matchedWA.notify || phone;

        return phone;
    }, [users, waContacts]);

    // Fetch WA contacts and groups from the API — only once config is loaded
    useEffect(() => {
        const apiKey = config?.evolutionKey || config?.instanceKey || config?.whatsappApiKey;
        const serverUrl = config?.evolutionUrl || config?.serverUrl || '';
        const instanceName = config?.evolutionInstance || config?.instanceName || '';
        if (!apiKey) return; // aguarda o config carregar

        const fetchWaData = async () => {
            setIsLoadingWaData(true);
            const params = new URLSearchParams({ key: apiKey });
            if (serverUrl) params.set('server', serverUrl);
            if (instanceName) params.set('instance', instanceName);
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

    // Anti-ban estimation logic
    const estimation = useMemo(() => {
        const delayMin = config?.delayMin !== undefined ? Number(config.delayMin) : 20;
        const delayMax = config?.delayMax !== undefined ? Number(config.delayMax) : 45;
        const microPauseFrequency = config?.microPauseFrequency !== undefined ? Number(config.microPauseFrequency) : 5;
        const microPauseMin = config?.microPauseMin !== undefined ? Number(config.microPauseMin) : 30;
        const microPauseMax = config?.microPauseMax !== undefined ? Number(config.microPauseMax) : 50;
        const deepSleepFrequency = config?.deepSleepFrequency !== undefined ? Number(config.deepSleepFrequency) : 20;
        const deepSleepMin = config?.deepSleepMin !== undefined ? Number(config.deepSleepMin) : 180;
        const deepSleepMax = config?.deepSleepMax !== undefined ? Number(config.deepSleepMax) : 300;

        let targetCount = 0;
        let blacklistedCount = 0;

        if (targetAudience === 'individual') {
            const cleaned = String(individualPhone || '').replace(/\D/g, '');
            if (cleaned) {
                if (blacklistedSet.has(cleaned)) {
                    blacklistedCount = 1;
                } else {
                    targetCount = 1;
                }
            }
        } else if (targetAudience === 'import_spreadsheet') {
            importedContacts?.forEach((c: any) => {
                if (c.phone) {
                    const cleaned = String(c.phone).replace(/\D/g, '');
                    if (blacklistedSet.has(cleaned)) {
                        blacklistedCount++;
                    } else {
                        targetCount++;
                    }
                }
            });
        } else if (targetAudience === 'specific_groups') {
            targetCount = selectedGroupIds.length;
        } else {
            targetAudienceUsers?.forEach((u: any) => {
                if (u.phone) {
                    const cleaned = String(u.phone).replace(/\D/g, '');
                    if (blacklistedSet.has(cleaned)) {
                        blacklistedCount++;
                    } else {
                        targetCount++;
                    }
                }
            });
        }

        let totalSeconds = 0;
        const avgTypingDelay = 3.5;
        const avgBaseDelay = (delayMin + delayMax) / 2;
        const avgMicroPause = (microPauseMin + microPauseMax) / 2;
        const avgDeepSleep = (deepSleepMin + deepSleepMax) / 2;

        for (let i = 1; i <= targetCount; i++) {
            totalSeconds += avgTypingDelay;
            if (deepSleepFrequency > 0 && i % deepSleepFrequency === 0) {
                totalSeconds += avgDeepSleep;
            } else if (microPauseFrequency > 0 && i % microPauseFrequency === 0) {
                totalSeconds += avgMicroPause;
            } else {
                totalSeconds += avgBaseDelay;
            }
        }

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.round(totalSeconds % 60);

        return {
            totalSeconds,
            hours,
            minutes,
            seconds,
            targetCount,
            blacklistedCount
        };
    }, [targetAudience, individualPhone, users, selectedUsersList, importedContacts, selectedGroupIds, blacklistedSet, config, targetAudienceUsers]);

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

        if (targetAudience === 'volunteers_by_area' && !selectedServiceAreaId) {
            toast({ variant: 'destructive', title: "Selecione uma área de serviço." });
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

        const isUserBasedAudience = targetAudience !== 'individual' && targetAudience !== 'import_spreadsheet' && targetAudience !== 'specific_groups';

        const payload: any = {
            channel: 'whatsapp',
            audience: targetAudience,
            message,
            userIds: targetAudience === 'specific_members' ? selectedUserIds : undefined,
            targets: isUserBasedAudience 
                ? targetAudienceUsers.filter(u => u.phone).map(u => ({ id: u.id, name: u.name, phone: u.phone }))
                : (targetAudience === 'import_spreadsheet' ? importedContacts : undefined),
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
        } else if (msgType === 'contact') {
            payload.contactName = contactName;
            payload.contactPhone = contactPhone;
        }

        try {
            let idToken = '';
            try {
                if (user) idToken = await user.getIdToken();
            } catch (authErr) {
                console.warn("Aviso: Falha ao obter idToken atualizado do Firebase Auth (offline/rede):", authErr);
            }

            const response = await fetch('/api/notifications/send', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
              },
              body: JSON.stringify(payload),
            });
            
            const result = await response.json();
            
            if (response.ok && (result.sentCount > 0 || result.background)) {
                const desc = result.background 
                    ? result.message || `Disparo iniciado para ${result.totalRecipients} destinatário(s). Acompanhe na aba Histórico.`
                    : `${result.sentCount || 0} mensagens enviadas.`;
                toast({ title: "✅ Disparo Iniciado!", description: desc });
                setMessage('');
                setSelectedUserIds([]);
                setSelectedGroupIds([]);
                setIndividualPhone('');
                setMediaUrl('');
            } else {
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
                                <SelectItem value="contact">Cartão de Contato</SelectItem>
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
                                
                                <SelectItem value="gc_leaders">👑 Líderes de GC</SelectItem>
                                <SelectItem value="gc_coliders">🌱 Líderes em Treinamento (Co-líderes de GC)</SelectItem>
                                <SelectItem value="gc_supervisors">🛡️ Supervisores de GC</SelectItem>
                                <SelectItem value="gc_area_leaders">🗺️ Líderes de Área / Rede (GC)</SelectItem>

                                <SelectItem value="all_volunteers">🙌 Todos os Voluntários</SelectItem>
                                <SelectItem value="volunteers_by_area">🎪 Voluntários por Área de Serviço</SelectItem>

                                <SelectItem value="role_pastor">📖 Pastores e Liderança Pastoral</SelectItem>
                                <SelectItem value="role_admin">⚙️ Administradores do Sistema</SelectItem>
                                <SelectItem value="role_membro">👥 Somente Membros Oficializados</SelectItem>
                                <SelectItem value="role_novo_convertido">🌱 Novos Convertidos e Visitantes</SelectItem>

                                <SelectItem value="specific_groups">Grupos do WhatsApp</SelectItem>
                                <SelectItem value="import_spreadsheet">Importar Planilha (CSV/Texto)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {targetAudience === 'volunteers_by_area' && (
                    <div className="space-y-2 p-4 border rounded-lg bg-emerald-50/40 border-emerald-200">
                        <Label className="text-emerald-900 font-bold flex items-center gap-2">
                            <Users size={16} /> Selecione a Área de Serviço
                        </Label>
                        <Select value={selectedServiceAreaId} onValueChange={setSelectedServiceAreaId}>
                            <SelectTrigger className="bg-white h-11">
                                <SelectValue placeholder="Escolha a área de serviço (ex: Louvor, Infantil, Recepção)..." />
                            </SelectTrigger>
                            <SelectContent>
                                {serviceAreas?.map(sa => (
                                    <SelectItem key={sa.id} value={sa.id}>{sa.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[11px] text-emerald-700 italic">
                            Dispara a mensagem especificamente para os voluntários vinculados a esta área de serviço.
                        </p>
                    </div>
                )}

                {targetAudience !== 'individual' && targetAudience !== 'import_spreadsheet' && targetAudience !== 'specific_groups' && targetAudience !== 'specific_members' && targetAudience !== 'all_members' && (
                    <div className="p-4 border rounded-xl bg-purple-50/40 border-purple-200 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-purple-900 flex items-center gap-2">
                                <Users size={15} className="text-purple-600" />
                                Membros Filtrados por Perfil ({targetAudienceUsers.length} encontrados)
                            </span>
                            <Badge className="bg-purple-600 text-white font-bold text-[10px]">
                                {targetAudienceUsers.filter(u => u.phone).length} com WhatsApp válido
                            </Badge>
                        </div>
                        {targetAudienceUsers.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {targetAudienceUsers.slice(0, 12).map(u => (
                                    <Badge key={u.id} variant="outline" className="bg-white text-xs text-slate-700 border-purple-200 font-medium">
                                        {u.name}
                                    </Badge>
                                ))}
                                {targetAudienceUsers.length > 12 && (
                                    <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 text-xs font-bold">
                                        +{targetAudienceUsers.length - 12} outros
                                    </Badge>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-amber-700 italic">
                                {targetAudience === 'volunteers_by_area' && !selectedServiceAreaId
                                    ? "Selecione uma área de serviço no menu acima."
                                    : "Nenhum membro cadastrado com este perfil no momento."}
                            </p>
                        )}
                    </div>
                )}

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
                                        const waContact = waContacts.find(c => c.phone && String(u.phone || '').replace(/\D/g,'').endsWith(String(c.phone || '').replace(/\D/g,'')));
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
                                const waContact = waContacts.find(c => c.phone && String(u.phone || '').replace(/\D/g,'').endsWith(String(c.phone || '').replace(/\D/g,'')));
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

                {msgType === 'contact' && (
                    <div className="p-4 border-2 border-dashed rounded-xl bg-cyan-50/50 space-y-4 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-cyan-800">Nome do Contato</Label>
                                <Input value={contactName} onChange={e => setContactName(e.target.value)} className="bg-white h-9" placeholder="Ex: Suporte Oiko" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-cyan-800">Telefone do Contato</Label>
                                <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="bg-white h-9" placeholder="Ex: 5521999999999" />
                            </div>
                        </div>
                    </div>
                )}

                {msgType !== 'survey' && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Mensagem Principal</Label>
                            <div className="flex gap-1.5">
                                <Button 
                                    type="button" 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-[10px] h-6 px-2 font-black uppercase tracking-wider text-primary border-primary/20 hover:bg-primary/5" 
                                    onClick={() => insertTag('{{nome}}')}
                                >
                                    + Aluno ({"{{nome}}"})
                                </Button>
                                <Button 
                                    type="button" 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-[10px] h-6 px-2 font-black uppercase tracking-wider text-primary border-primary/20 hover:bg-primary/5" 
                                    onClick={() => insertTag('{{turma}}')}
                                >
                                    + Turma ({"{{turma}}"})
                                </Button>
                                <Button 
                                    type="button" 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-[10px] h-6 px-2 font-black uppercase tracking-wider text-primary border-primary/20 hover:bg-primary/5" 
                                    onClick={() => insertTag('{{faltas}}')}
                                >
                                    + Faltas ({"{{faltas}}"})
                                </Button>
                            </div>
                        </div>
                        <Textarea 
                            ref={textareaRef}
                            placeholder="Olá {{nome}}, temos um convite..." 
                            className="min-h-[120px]" 
                            value={message} 
                            onChange={(e) => setMessage(e.target.value)} 
                            required 
                        />
                    </div>
                )}

                {estimation.targetCount > 0 && (
                    <div className="p-4 rounded-xl border-2 border-primary/10 bg-primary/5 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-2 text-primary">
                            <ShieldCheck className="size-5 shrink-0" />
                            <h4 className="font-black text-xs uppercase tracking-wider">Estimativa de Envio Seguro (Anti-Ban)</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Este disparo para <span className="font-bold text-foreground">{estimation.targetCount} destinatário(s)</span> levará aproximadamente{" "}
                            <span className="font-bold text-primary">
                                {estimation.hours > 0 ? `${estimation.hours}h ` : ""}
                                {estimation.minutes > 0 ? `${estimation.minutes}min ` : ""}
                                {estimation.hours === 0 && estimation.minutes === 0 ? `${estimation.seconds}s` : ""}
                            </span>{" "}
                            para ser concluído com segurança.
                        </p>
                        {estimation.blacklistedCount > 0 && (
                            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-bold bg-amber-50 border border-amber-200/50 px-2 py-1 rounded-md mt-1 w-fit">
                                <Info size={12} className="shrink-0" />
                                <span>{estimation.blacklistedCount} contato(s) da blacklist/opt-out serão ignorados.</span>
                            </div>
                        )}
                    </div>
                )}

                {estimation.targetCount === 0 && estimation.blacklistedCount > 0 && (
                    <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50 space-y-2 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 text-red-700">
                            <XCircle className="size-5 shrink-0" />
                            <h4 className="font-black text-xs uppercase tracking-wider">Todos os Destinatários Blacklisted</h4>
                        </div>
                        <p className="text-xs text-red-600 font-medium">
                            Todos os {estimation.blacklistedCount} contato(s) selecionados solicitaram a remoção (Opt-Out) e não receberão a mensagem.
                        </p>
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
    const [campaignRecipients, setCampaignRecipients] = useState<string[]>([]);

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

    // Quando uma campanha é selecionada, buscar os destinatários enviados (pelo telefone)
    useEffect(() => {
        if (selectedBroadcastId === 'all') {
            setCampaignRecipients([]);
            return;
        }
        const fetchRecipients = async () => {
            try {
                const res = await fetch(`/api/notifications/history?broadcastId=${selectedBroadcastId}`);
                const data = await res.json();
                if (data.recipients) setCampaignRecipients(data.recipients);
            } catch {}
        };
        fetchRecipients();
    }, [selectedBroadcastId]);

    // Helper: resolver LID de uma resposta para telefone usando users/contacts do sistema
    const resolveResponsePhone = (response: any): string => {
        const rawFrom = String(response.from || '').replace(/\D/g, '');
        // Se já é um telefone brasileiro (55+DDD+número), retornar direto
        if (rawFrom.startsWith('55') && rawFrom.length >= 12) return rawFrom;
        
        // É um LID — tentar resolver
        const matchedUser = users?.find((u: any) => {
            const uLid = (u.lid && u.lid !== 'lid') ? String(u.lid).split('@')[0] : '';
            const uJid = String(u.jid || '').split('@')[0];
            return (uLid && rawFrom === uLid) || (uJid && rawFrom === uJid);
        });
        if (matchedUser) {
            const phone = String(matchedUser.phone || '').replace(/\D/g, '');
            return phone.startsWith('55') ? phone : `55${phone}`;
        }

        const matchedWA = waContacts?.find((c: any) => {
            const cLid = String(c.lid || '').split('@')[0];
            const cJid = String(c.jid || '').split('@')[0];
            return (cLid && rawFrom === cLid) || (cJid && rawFrom === cJid);
        });
        if (matchedWA) {
            const phone = String(matchedWA.phoneNumber || '').replace(/\D/g, '');
            return phone.startsWith('55') ? phone : `55${phone}`;
        }
        
        return rawFrom; // Fallback
    };

    // Filtrar respostas pela campanha selecionada
    const filteredResponses = useMemo(() => {
        if (!responses) return [];
        if (selectedBroadcastId === 'all') return responses;

        // Passo 1: Respostas vinculadas diretamente a ESTA campanha pelo broadcastId
        const byBroadcast = responses.filter((r: any) => r.broadcastId === selectedBroadcastId);

        // Passo 2: Respostas com broadcastId NULO cujo telefone bate com um destinatário da campanha
        // IMPORTANTE: Só incluir se broadcastId é null/undefined (não se pertence a OUTRA campanha)
        let byPhone: any[] = [];
        if (campaignRecipients.length > 0) {
            byPhone = responses.filter((r: any) => {
                // Se já tem broadcastId, não usar fallback por telefone
                if (r.broadcastId) return false;
                
                const resolvedPhone = resolveResponsePhone(r);
                return campaignRecipients.some(recipientPhone => {
                    const cleaned = String(recipientPhone || '').replace(/\D/g, '');
                    return cleaned === resolvedPhone || 
                           resolvedPhone.endsWith(cleaned.slice(-8)) || 
                           cleaned.endsWith(resolvedPhone.slice(-8));
                });
            });
        }

        // Combinar sem duplicatas
        const combined = [...byBroadcast];
        const existingIds = new Set(byBroadcast.map((r: any) => r.id));
        byPhone.forEach(r => {
            if (!existingIds.has(r.id)) combined.push(r);
        });

        return combined;
    }, [responses, selectedBroadcastId, campaignRecipients, users, waContacts]);

    const selectedBroadcastInfo = useMemo(() => {
        return broadcasts.find(b => b.id === selectedBroadcastId);
    }, [broadcasts, selectedBroadcastId]);

    const resolveUser = (phone: string) => {
        const rawId = String(phone || '').split('@')[0];
        
        // 1. Tenta match no sistema (por telefone ou IDs vinculados)
        const matchedUser = users?.find((u: any) => {
            const uPhone = String(u.phone || '').replace(/\D/g, '');
            const uLid = (u.lid && u.lid !== 'lid') ? String(u.lid).split('@')[0] : '';
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

    // Helper: detectar se um pollName parece ser um message ID hex (ex: 3EB08140259CF4F5B410B1)
    const isHexId = (name: string) => /^[0-9A-F]{16,}$/i.test(name);

    // Helper: normalizar pollName — se for um ID hex, trocar por nome legível
    const normalizePollName = (pollName: string, broadcastId?: string) => {
        if (!pollName || isHexId(pollName)) {
            // Tentar pegar o nome da campanha
            if (broadcastId) {
                const bc = broadcasts.find(b => b.id === broadcastId);
                if (bc?.surveyName) return bc.surveyName;
                if (bc?.message) return bc.message.slice(0, 50);
            }
            return 'Enquete';
        }
        return pollName;
    };

    const { pollStats, buttonStats } = useMemo(() => {
        if (!filteredResponses) return { pollStats: {}, buttonStats: {} };

        const isFiltered = selectedBroadcastId !== 'all';

        // Grouping polls: (Normalized Poll Name) -> { Option -> [Phones] }
        const pollStats: Record<string, { name: string, broadcastId?: string, options: Record<string, string[]> }> = {};
        
        // Grouping buttons: normalized label -> { label, phones[] }
        const buttonStats: Record<string, { label: string, broadcastId?: string, phones: string[] }> = {};

        // === POLLS: Manter apenas o ÚLTIMO voto de cada pessoa ===
        const lastVoteByPerson: Record<string, any> = {};
        // Ordenar por receivedAt para garantir que o forEach substitua pelo mais recente
        const sortedPolls = filteredResponses
            .filter((r: any) => r.type === 'poll')
            .sort((a: any, b: any) => {
                const aTime = a.receivedAt?.toMillis?.() || a.receivedAt?.seconds * 1000 || 0;
                const bTime = b.receivedAt?.toMillis?.() || b.receivedAt?.seconds * 1000 || 0;
                return aTime - bTime; // Ascendente — o último forEach sobrescreve
            });

        sortedPolls.forEach((r: any) => {
            // Quando uma campanha está selecionada, ignorar broadcastId na chave de dedup
            // (todos os resultados JÁ estão filtrados para essa campanha)
            const dedupBroadcast = isFiltered ? 'filtered' : (r.broadcastId || 'general');
            const key = `${r.from}__${dedupBroadcast}`;
            lastVoteByPerson[key] = r; // Sobrescreve = mantém o último
        });

        Object.values(lastVoteByPerson).forEach((r: any) => {
            const pollName = normalizePollName(r.pollName, r.broadcastId);
            const groupBroadcast = isFiltered ? selectedBroadcastId : (r.broadcastId || 'general');
            const groupKey = `${pollName}:::${groupBroadcast}`;

            if (!pollStats[groupKey]) {
                pollStats[groupKey] = { name: pollName, broadcastId: r.broadcastId, options: {} };
            }
            
            const opts = Array.isArray(r.selectedOptions) ? r.selectedOptions : [r.selectedOptions].filter(Boolean);
            opts.forEach((opt: any) => {
                const label = typeof opt === 'string' ? opt : opt?.label || opt?.text || 'Opção';
                if (!pollStats[groupKey].options[label]) pollStats[groupKey].options[label] = [];
                // Evitar duplicar a mesma pessoa na mesma opção
                if (!pollStats[groupKey].options[label].includes(r.from)) {
                    pollStats[groupKey].options[label].push(r.from);
                }
            });
        });

        // === BUTTONS: Manter apenas o ÚLTIMO clique de cada pessoa ===
        const lastButtonByPerson: Record<string, any> = {};
        const sortedButtons = filteredResponses
            .filter((r: any) => r.type === 'button')
            .sort((a: any, b: any) => {
                const aTime = a.receivedAt?.toMillis?.() || a.receivedAt?.seconds * 1000 || 0;
                const bTime = b.receivedAt?.toMillis?.() || b.receivedAt?.seconds * 1000 || 0;
                return aTime - bTime;
            });

        sortedButtons.forEach((r: any) => {
            // Dedup por pessoa — quando campanha está selecionada, conta apenas o último clique
            const dedupBroadcast = isFiltered ? 'filtered' : (r.broadcastId || 'general');
            const key = `${r.from}__${dedupBroadcast}`;
            lastButtonByPerson[key] = r; // Sobrescreve = mantém o último
        });

        Object.values(lastButtonByPerson).forEach((r: any) => {
            const label = r.buttonText || r.buttonId || 'Botão';
            const groupBroadcast = isFiltered ? selectedBroadcastId : (r.broadcastId || 'general');
            const groupKey = `${label}:::${groupBroadcast}`;

            if (!buttonStats[groupKey]) {
                buttonStats[groupKey] = { label, broadcastId: r.broadcastId, phones: [] };
            }
            if (!buttonStats[groupKey].phones.includes(r.from)) {
                buttonStats[groupKey].phones.push(r.from);
            }
        });

        return { pollStats, buttonStats };
    }, [filteredResponses, selectedBroadcastId, broadcasts]);

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

                    {selectedBroadcastInfo && (() => {
                        const uniqueRespondents = new Set(filteredResponses.map((r: any) => r.from)).size;
                        return (
                        <div className="flex flex-wrap gap-3 w-full md:w-auto">
                            <div className="flex-1 md:flex-none px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 min-w-[100px]">
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Enviados</p>
                                <p className="text-lg font-black text-slate-700">{selectedBroadcastInfo.recipientCount}</p>
                            </div>
                            <div className="flex-1 md:flex-none px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 min-w-[100px]">
                                <p className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Respostas</p>
                                <p className="text-lg font-black text-emerald-700">{uniqueRespondents}</p>
                            </div>
                            <div className="flex-1 md:flex-none px-4 py-2 bg-blue-50 rounded-xl border border-blue-100 min-w-[100px]">
                                <p className="text-[9px] font-black uppercase text-blue-400 tracking-wider">Engajamento</p>
                                <p className="text-lg font-black text-blue-700">
                                    {selectedBroadcastInfo.recipientCount > 0 
                                        ? Math.round((uniqueRespondents / selectedBroadcastInfo.recipientCount) * 100) 
                                        : 0}%
                                </p>
                            </div>
                        </div>
                        );
                    })()}

                    {/* Botões de limpeza de dados */}
                    {selectedBroadcastId !== 'all' && (
                        <div className="flex gap-2 items-center">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                                onClick={async () => {
                                    if (!confirm(`Limpar todas as respostas deste disparo?\nIsso removerá ${filteredResponses.length} resposta(s) do servidor.`)) return;
                                    try {
                                        const res = await fetch(`/api/notifications/cleanup?broadcastId=${selectedBroadcastId}`, { method: 'DELETE' });
                                        const data = await res.json();
                                        if (data.success) {
                                            alert(`${data.deletedCount} resposta(s) removida(s).\nRecarregue a página para ver as mudanças.`);
                                            window.location.reload();
                                        } else {
                                            alert('Erro: ' + (data.error || 'Falha desconhecida'));
                                        }
                                    } catch (e: any) { alert('Erro: ' + e.message); }
                                }}
                            >
                                <Trash2 className="size-3 mr-1" /> Limpar Respostas deste Disparo
                            </Button>
                        </div>
                    )}
                    {selectedBroadcastId === 'all' && filteredResponses.length > 0 && (
                        <div className="flex gap-2 items-center">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] font-bold text-orange-600 border-orange-200 hover:bg-orange-50"
                                onClick={async () => {
                                    if (!confirm('Limpar respostas órfãs (sem campanha vinculada)?')) return;
                                    try {
                                        const res = await fetch('/api/notifications/cleanup?type=orphan_responses', { method: 'DELETE' });
                                        const data = await res.json();
                                        if (data.success) {
                                            alert(`${data.deletedCount} resposta(s) órfã(s) removida(s).`);
                                            window.location.reload();
                                        }
                                    } catch (e: any) { alert('Erro: ' + e.message); }
                                }}
                            >
                                <Trash2 className="size-3 mr-1" /> Limpar Órfãs
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                                onClick={async () => {
                                    if (!confirm('⚠️ ATENÇÃO: Isso removerá TODAS as respostas de TODOS os disparos.\nTem certeza?')) return;
                                    if (!confirm('Confirmação final: esta ação é IRREVERSÍVEL. Continuar?')) return;
                                    try {
                                        const res = await fetch('/api/notifications/cleanup?type=all_responses', { method: 'DELETE' });
                                        const data = await res.json();
                                        if (data.success) {
                                            alert(`${data.deletedCount} resposta(s) removida(s).`);
                                            window.location.reload();
                                        }
                                    } catch (e: any) { alert('Erro: ' + e.message); }
                                }}
                            >
                                <Trash2 className="size-3 mr-1" /> Limpar Tudo
                            </Button>
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
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const historyQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'notifications_history'), orderBy('sentAt', 'desc'), limit(50)) : null,
    [firestore]);
    
    const { data: history, isLoading } = useCollection<any>(historyQuery);

    const [selectedErrorItem, setSelectedErrorItem] = useState<any>(null);
    const [isRetrying, setIsRetrying] = useState(false);

    const handleRetry = async () => {
        if (!selectedErrorItem || !selectedErrorItem.retryPayload) return;
        setIsRetrying(true);
        try {
            const isResume = selectedErrorItem.status === 'sending';
            const payload = {
                ...selectedErrorItem.retryPayload,
                ...(isResume ? { resumeBroadcastId: selectedErrorItem.id } : {
                    audience: 'specific_members',
                    targets: selectedErrorItem.failedTargets || []
                })
            };

            let idToken = '';
            try {
                if (user) idToken = await user.getIdToken();
            } catch (e) {}

            const response = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
                },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            
            if (response.ok && (result.sentCount > 0 || result.background)) {
                toast({ title: isResume ? "Retomada Iniciada!" : "Reenvio Iniciado!", description: result.message || "Acompanhe o progresso no histórico." });
                setSelectedErrorItem(null);
            } else {
                toast({ variant: 'destructive', title: "Falha na Operação", description: result.error || "Erro ao conectar com servidor." });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro de conexão", description: "Não foi possível comunicar com o servidor." });
        } finally {
            setIsRetrying(false);
        }
    };

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
                        history?.map((item: any) => {
                            const isActionable = item.status === 'partial' || item.status === 'failed' || item.status === 'sending';
                            return (
                            <TableRow 
                                key={item.id} 
                                className={cn(isActionable && "cursor-pointer hover:bg-slate-100/80 transition-colors")}
                                onClick={() => isActionable && setSelectedErrorItem(item)}
                            >
                                <TableCell className="text-[10px] font-bold">
                                    {item.sentAt ? format(item.sentAt.toDate(), 'dd/MM HH:mm') : '-'}
                                </TableCell>
                                <TableCell className="max-w-md truncate text-xs font-medium">
                                    <Badge variant="outline" className="text-[8px] uppercase p-0.5 mr-2 border-none bg-muted/50">{item.type || 'text'}</Badge>
                                    {item.message}
                                </TableCell>
                                <TableCell className="text-xs font-black">{item.successCount} / {item.recipientCount}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant="outline" className={cn("text-[10px] font-black uppercase border-none", item.status === 'success' ? "bg-emerald-100 text-emerald-800" : (item.status === 'sending' ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"))}>
                                        {item.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>

            <Sheet open={!!selectedErrorItem} onOpenChange={(open) => !open && setSelectedErrorItem(null)}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle className="text-amber-600 flex items-center gap-2">
                            <Info className="size-5" /> 
                            Detalhes das Falhas
                        </SheetTitle>
                        <SheetDescription>
                            Resumo do disparo efetuado em {selectedErrorItem?.sentAt ? format(selectedErrorItem.sentAt.toDate(), 'dd/MM HH:mm') : ''}.
                        </SheetDescription>
                    </SheetHeader>
                    
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                                <p className="text-[10px] uppercase font-black text-emerald-600">Sucesso</p>
                                <p className="text-2xl font-black text-emerald-800">{selectedErrorItem?.successCount}</p>
                            </div>
                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                                <p className="text-[10px] uppercase font-black text-amber-600">Falhas</p>
                                <p className="text-2xl font-black text-amber-800">{selectedErrorItem?.errorCount}</p>
                            </div>
                        </div>

                        {selectedErrorItem?.errors && selectedErrorItem.errors.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="font-bold text-sm">Registro de Erros</h4>
                                <ScrollArea className="h-48 border rounded-md bg-muted/30 p-2 text-xs">
                                    <ul className="space-y-2">
                                        {selectedErrorItem.errors.map((err: string, i: number) => (
                                            <li key={i} className="text-red-600 font-mono text-[10px] border-b pb-1 last:border-0">{err}</li>
                                        ))}
                                    </ul>
                                </ScrollArea>
                            </div>
                        )}

                        {selectedErrorItem?.status === 'sending' && (
                            <div className="space-y-3 pt-2">
                                <Button 
                                    onClick={handleRetry} 
                                    disabled={isRetrying} 
                                    className="w-full font-bold h-12 bg-primary hover:bg-primary/90 text-white shadow-md"
                                >
                                    {isRetrying ? <Loader2 className="animate-spin mr-2 size-4" /> : <Send className="mr-2 size-4" />}
                                    Retomar Envio Pendente ({selectedErrorItem.successCount} / {selectedErrorItem.recipientCount} enviados)
                                </Button>
                                <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                                    O envio foi pausado devido ao desligamento ou reinício do servidor. Ao clicar em retomar, o servidor continuará a fila de onde parou.
                                </p>
                            </div>
                        )}

                        {selectedErrorItem?.failedTargets && selectedErrorItem.failedTargets.length > 0 && (
                            <Button 
                                onClick={handleRetry} 
                                disabled={isRetrying} 
                                className="w-full font-bold h-12 bg-amber-500 hover:bg-amber-600 text-white"
                            >
                                {isRetrying ? <Loader2 className="animate-spin mr-2 size-4" /> : <RefreshCw className="mr-2 size-4" />}
                                Tentar Novamente para Falhas ({selectedErrorItem.failedTargets.length})
                            </Button>
                        )}
                        {selectedErrorItem?.errorCount > 0 && (!selectedErrorItem?.failedTargets || selectedErrorItem.failedTargets.length === 0) && (
                            <p className="text-xs text-muted-foreground italic text-center">
                                Os destinatários falhos deste envio não foram salvos no servidor para permitir o reenvio automático.
                            </p>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
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
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [groups, setGroups] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    // Group editing states
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editPhoto, setEditPhoto] = useState('');
    const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);

    // Participant search
    const [participantSearch, setParticipantSearch] = useState('');

    // Create Group states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [userSearch, setUserSearch] = useState('');

    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const { data: users } = useCollection<any>(usersQuery);

    const waContactsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'notifications_contacts')) : null, [firestore]);
    const { data: waContacts } = useCollection<any>(waContactsQuery);

    // States for adding participant in detail sheet
    const [addSearchInput, setAddSearchInput] = useState('');
    const [updatingParticipantsMap, setUpdatingParticipantsMap] = useState<Record<string, boolean>>({});

    const filteredUsers = useMemo(() => {
        return (users || []).filter((u: any) => {
            const name = u.name?.toLowerCase() || '';
            const phone = String(u.phone || u.phoneNumber || '');
            return phone && (name.includes(userSearch.toLowerCase()) || phone.includes(userSearch));
        });
    }, [users, userSearch]);

    const filteredUsersForAdding = useMemo(() => {
        return (users || []).filter((u: any) => {
            const name = u.name?.toLowerCase() || '';
            const phone = String(u.phone || u.phoneNumber || '');
            return phone && (name.includes(addSearchInput.toLowerCase()) || phone.includes(addSearchInput));
        });
    }, [users, addSearchInput]);

    const fetchGroups = async () => {
        const apiKey = config?.evolutionKey || config?.instanceKey || config?.whatsappApiKey;
        if (!apiKey) return;
        setIsLoading(true);
        const params = new URLSearchParams({ key: apiKey, getParticipants: 'true' });
        if (config?.evolutionUrl || config?.serverUrl) params.set('server', config.evolutionUrl || config.serverUrl);
        if (config?.evolutionInstance || config?.instanceName) params.set('instance', config.evolutionInstance || config.instanceName);
        try {
            const res = await fetch(`/api/notifications/groups?${params.toString()}`);
            const data = await res.json();
            setGroups(data.groups || []);
        } catch { /* silently fail */ }
        finally { setIsLoading(false); }
    };

    const openGroupDetail = async (g: any) => {
        const apiKey = config?.evolutionKey || config?.instanceKey || config?.whatsappApiKey;
        if (!apiKey) return;
        setSelectedGroup({ ...g, _loading: true });
        setIsLoadingDetail(true);
        const params = new URLSearchParams({ key: apiKey, id: g.id });
        if (config?.evolutionUrl || config?.serverUrl) params.set('server', config.evolutionUrl || config.serverUrl);
        if (config?.evolutionInstance || config?.instanceName) params.set('instance', config.evolutionInstance || config.instanceName);
        try {
            const res = await fetch(`/api/notifications/groups?${params.toString()}`);
            const data = await res.json();
            setSelectedGroup(data);
            setEditName(data.name || '');
            setEditDesc(data.description || '');
            setEditPhoto('');
            setParticipantSearch('');
        } catch { setSelectedGroup({ ...g, _error: true }); }
        finally { setIsLoadingDetail(false); }
    };

    const handleUpdateGroup = async (field: 'name' | 'description' | 'photo') => {
        if (!selectedGroup) return;
        setIsUpdatingGroup(true);
        const payload: any = { groupId: selectedGroup.id };
        if (field === 'name') payload.name = editName;
        if (field === 'description') payload.description = editDesc;
        if (field === 'photo') payload.picture = editPhoto;

        try {
            const res = await fetch('/api/notifications/groups', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast({ title: 'Grupo atualizado com sucesso!' });
                setSelectedGroup((prev: any) => ({
                    ...prev,
                    name: field === 'name' ? editName : prev.name,
                    description: field === 'description' ? editDesc : prev.description
                }));
                if (field === 'photo') setEditPhoto('');
                fetchGroups();
            } else {
                toast({ variant: 'destructive', title: 'Erro ao atualizar', description: data.error || 'Erro desconhecido' });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Erro de conexão', description: e.message });
        } finally {
            setIsUpdatingGroup(false);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) {
            toast({ variant: 'destructive', title: 'Nome do grupo requerido' });
            return;
        }
        if (selectedParticipants.length === 0) {
            toast({ variant: 'destructive', title: 'Selecione ao menos um participante' });
            return;
        }

        setIsCreating(true);
        try {
            const res = await fetch('/api/notifications/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupName: newGroupName,
                    participants: selectedParticipants
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast({ title: 'Grupo criado com sucesso!' });
                setIsCreateOpen(false);
                setNewGroupName('');
                setSelectedParticipants([]);
                fetchGroups();
            } else {
                toast({ variant: 'destructive', title: 'Erro ao criar grupo', description: data.error || 'Erro desconhecido' });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Erro de conexão', description: e.message });
        } finally {
            setIsCreating(false);
        }
    };

    const toggleParticipantSelection = (phone: string) => {
        setSelectedParticipants(prev =>
            prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
        );
    };

    const enrichParticipant = (pId: string, pName?: string, pPhoneJid?: string) => {
        const rawId = (pId || '').split('@')[0];
        const rawPhoneId = (pPhoneJid || '').split('@')[0];
        
        if (rawId === '60765784527084') {
            return {
                name: 'Igreja Batista da Manhã',
                phone: 'Instância Conectada',
                lid: pId.endsWith('@lid') ? pId : null,
                isMatched: true
            };
        }

        // Find matched user
        const matchedUser = users?.find((u: any) => {
            const uPhone = String(u.phone || u.phoneNumber || '').replace(/\D/g, '');
            const uLid = (u.lid && u.lid !== 'lid') ? String(u.lid).split('@')[0] : '';
            const uJid = String(u.jid || '').split('@')[0];
            
            // Match using phone JID from Evolution API if available
            if (rawPhoneId && uPhone) {
                const rawPhoneIdNoCountry = rawPhoneId.startsWith('55') ? rawPhoneId.substring(2) : rawPhoneId;
                const uPhoneNoCountry = uPhone.startsWith('55') ? uPhone.substring(2) : uPhone;
                if (uPhoneNoCountry === rawPhoneIdNoCountry || uJid === rawPhoneId) return true;
            }

            if (uPhone && uPhone.length >= 8) {
                const uPhoneNoCountry = uPhone.startsWith('55') ? uPhone.substring(2) : uPhone;
                const uPhoneNo9 = uPhoneNoCountry.length === 11 ? uPhoneNoCountry.slice(0, 2) + uPhoneNoCountry.slice(3) : null;
                const uPhoneLast8 = uPhoneNoCountry.slice(-8);
                const idDigits = rawId.replace(/\D/g, '');
                if (idDigits.includes(uPhoneNoCountry) || (uPhoneNo9 && idDigits.includes(uPhoneNo9)) || (uPhoneLast8.length === 8 && idDigits.includes(uPhoneLast8))) return true;
            }

            return (uLid && rawId === uLid) || (uJid && rawId === uJid);
        });

        // Auto-heal missing LID in Firestore if matched via phone JID
        if (matchedUser && pId && pId.endsWith('@lid') && matchedUser.lid !== pId) {
            updateDoc(doc(firestore, 'users', matchedUser.id), { lid: pId })
                .then(() => console.log(`[Auto-Heal] Successfully synced real LID for ${matchedUser.name} to Firestore.`))
                .catch(err => console.error('[Auto-Heal] Failed to sync LID:', err));
        }

        // Find matched contact
        const matchedWA = waContacts?.find((c: any) => {
            const cPhone = String(c.phoneNumber || '').replace(/\D/g, '');
            const cLid = String(c.lid || '').split('@')[0];
            const cJid = String(c.jid || '').split('@')[0];
            
            if (rawPhoneId && cPhone) {
                const rawPhoneIdNoCountry = rawPhoneId.startsWith('55') ? rawPhoneId.substring(2) : rawPhoneId;
                const cPhoneNoCountry = cPhone.startsWith('55') ? cPhone.substring(2) : cPhone;
                if (cPhoneNoCountry === rawPhoneIdNoCountry || cJid === rawPhoneId) return true;
            }

            return (cPhone && (rawId.includes(cPhone) || cPhone.includes(rawId))) || 
                   (cLid && rawId === cLid) || 
                   (cJid && rawId === cJid);
        });

        const displayName = matchedUser?.name || matchedWA?.name || pName || rawId;
        const displayPhone = matchedUser?.phone || matchedUser?.phoneNumber || matchedWA?.phoneNumber || rawId;
        const displayLid = matchedUser?.lid || matchedWA?.lid || (pId.endsWith('@lid') ? pId : null);
        
        return {
            name: displayName,
            phone: displayPhone,
            lid: displayLid,
            isMatched: !!(matchedUser || matchedWA)
        };
    };

    const handleUpdateParticipant = async (action: 'add' | 'remove' | 'promote' | 'demote', participantId: string) => {
        if (!selectedGroup) return;
        setUpdatingParticipantsMap(prev => ({ ...prev, [participantId]: true }));
        try {
            const res = await fetch('/api/notifications/groups', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: selectedGroup.id,
                    action,
                    participants: [participantId]
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast({ title: 'Sucesso', description: `Participante alterado com sucesso (${action})` });
                // Re-fetch group info to update layout/state
                await openGroupDetail(selectedGroup);
            } else {
                toast({ variant: 'destructive', title: 'Erro ao alterar participante', description: data.error || 'Erro desconhecido' });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Erro de conexão', description: e.message });
        } finally {
            setUpdatingParticipantsMap(prev => ({ ...prev, [participantId]: false }));
        }
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
                <div className="flex gap-2">
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                                <UserPlus size={16} />
                                Criar Grupo
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Criar Novo Grupo</DialogTitle>
                                <DialogDescription>Crie um novo grupo de WhatsApp adicionando membros cadastrados.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 flex-1 overflow-y-auto py-2">
                                <div className="space-y-2">
                                    <Label className="font-bold text-xs">Nome do Grupo</Label>
                                    <Input 
                                        placeholder="Ex: Ministério de Louvor" 
                                        value={newGroupName} 
                                        onChange={e => setNewGroupName(e.target.value)} 
                                    />
                                </div>
                                <div className="space-y-2 flex flex-col h-64">
                                    <Label className="font-bold text-xs">Selecionar Participantes ({selectedParticipants.length})</Label>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                                        <Input 
                                            placeholder="Buscar membros..." 
                                            value={userSearch} 
                                            onChange={e => setUserSearch(e.target.value)}
                                            className="pl-8 h-8 text-xs"
                                        />
                                    </div>
                                    <ScrollArea className="flex-1 border rounded-lg p-2 bg-muted/20">
                                        {filteredUsers.length === 0 ? (
                                            <p className="text-xs text-center text-muted-foreground py-4">Nenhum membro encontrado</p>
                                        ) : filteredUsers.map((u: any) => {
                                            const isSelected = selectedParticipants.includes(u.phone);
                                            return (
                                                <div 
                                                    key={u.id} 
                                                    onClick={() => toggleParticipantSelection(u.phone)}
                                                    className={cn(
                                                        "flex items-center gap-2 p-2 rounded-md cursor-pointer text-xs select-none transition-colors",
                                                        isSelected ? "bg-emerald-50 text-emerald-800 font-bold" : "hover:bg-muted/50"
                                                    )}
                                                >
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isSelected} 
                                                        readOnly 
                                                        className="accent-emerald-600 rounded"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate">{u.name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{u.phone}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </ScrollArea>
                                </div>
                            </div>
                            <DialogFooter className="mt-4">
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating} className="font-bold">
                                    Cancelar
                                </Button>
                                <Button onClick={handleCreateGroup} disabled={isCreating} className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                                    {isCreating && <Loader2 className="animate-spin size-4 mr-2" />}
                                    Criar Grupo
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button variant="outline" size="sm" onClick={fetchGroups} disabled={isLoading} className="gap-2 font-bold">
                        <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
                        Atualizar
                    </Button>
                </div>
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
                        <div className="space-y-6">
                            {/* Edit Group Info Form */}
                            <div className="p-4 bg-muted/30 rounded-xl border space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Editar Dados do Grupo</p>
                                
                                {/* Edit Name */}
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">Assunto/Nome</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            value={editName} 
                                            onChange={e => setEditName(e.target.value)} 
                                            className="h-9 text-xs"
                                        />
                                        <Button onClick={() => handleUpdateGroup('name')} disabled={isUpdatingGroup} size="sm" className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9">
                                            Salvar
                                        </Button>
                                    </div>
                                </div>

                                {/* Edit Description */}
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">Descrição</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            value={editDesc} 
                                            onChange={e => setEditDesc(e.target.value)} 
                                            className="h-9 text-xs"
                                        />
                                        <Button onClick={() => handleUpdateGroup('description')} disabled={isUpdatingGroup} size="sm" className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9">
                                            Salvar
                                        </Button>
                                    </div>
                                </div>

                                {/* Edit Photo */}
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">Alterar Foto (URL)</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            placeholder="URL da nova imagem..." 
                                            value={editPhoto} 
                                            onChange={e => setEditPhoto(e.target.value)} 
                                            className="h-9 text-xs"
                                        />
                                        <Button onClick={() => handleUpdateGroup('photo')} disabled={isUpdatingGroup || !editPhoto} size="sm" className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9">
                                            Alterar
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Configs */}
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
                                </div>
                            </div>

                            {/* Adicionar Participante */}
                            {selectedGroup.id && (
                                <div className="p-4 bg-muted/30 rounded-xl border space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Adicionar Participante</p>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                                        <Input 
                                            placeholder="Buscar usuário do sistema por nome ou telefone..." 
                                            value={addSearchInput} 
                                            onChange={e => setAddSearchInput(e.target.value)}
                                            className="h-8 text-xs pl-8"
                                        />
                                    </div>
                                    {addSearchInput && (
                                        <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg bg-card p-1 text-xs">
                                            {filteredUsersForAdding.length > 0 ? (
                                                filteredUsersForAdding.map((u: any) => {
                                                    const uPhone = u.phone || u.phoneNumber || '';
                                                    const uLid = (u.lid && u.lid !== 'lid') ? u.lid : null;
                                                    const targetId = uPhone || uLid;
                                                    const isAlreadyIn = selectedGroup.participants?.some((p: any) => p.id?.includes(uPhone) || (uLid && p.id?.includes(uLid)));
                                                    return (
                                                        <div key={u.uid || u.id} className="flex items-center justify-between p-1.5 hover:bg-muted/50 rounded transition-colors">
                                                            <div className="min-w-0 flex-1 pr-2">
                                                                <p className="font-bold truncate">{u.name}</p>
                                                                <p className="text-[9px] text-muted-foreground font-mono truncate">{uPhone}{u.lid && ` | LID: ${u.lid}`}</p>
                                                            </div>
                                                            {isAlreadyIn ? (
                                                                <Badge variant="outline" className="text-[8px] text-muted-foreground">Já está</Badge>
                                                            ) : (
                                                                <Button 
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        handleUpdateParticipant('add', targetId);
                                                                        setAddSearchInput('');
                                                                    }}
                                                                    className="h-6 px-2 text-[9px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                >
                                                                    Adicionar
                                                                </Button>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="p-2 text-center text-muted-foreground text-[10px] space-y-2">
                                                    <p>Nenhum usuário correspondente encontrado.</p>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            handleUpdateParticipant('add', addSearchInput);
                                                            setAddSearchInput('');
                                                        }}
                                                        className="w-full text-[9px] h-7 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                                    >
                                                        Adicionar &quot;{addSearchInput}&quot; diretamente
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Searchable Participants List */}
                            {selectedGroup.participants && selectedGroup.participants.length > 0 ? (
                                <div className="p-4 bg-muted/30 rounded-xl border space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Membros / Participantes ({selectedGroup.participants.length})</p>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                                        <Input 
                                            placeholder="Buscar participante..." 
                                            value={participantSearch} 
                                            onChange={e => setParticipantSearch(e.target.value)}
                                            className="h-8 text-xs pl-8"
                                        />
                                    </div>
                                    <div className="max-h-80 overflow-y-auto space-y-1 pr-1 border rounded-lg bg-card p-1">
                                        {selectedGroup.participants
                                            .map((p: any) => ({
                                                ...p,
                                                enriched: enrichParticipant(p.id, p.name, p.phoneNumber)
                                            }))
                                            .filter((p: any) => {
                                                const term = participantSearch.toLowerCase();
                                                return String(p.id || '').toLowerCase().includes(term) || 
                                                       String(p.name || '').toLowerCase().includes(term) ||
                                                       String(p.enriched?.name || '').toLowerCase().includes(term) ||
                                                       String(p.enriched?.phone || '').toLowerCase().includes(term) ||
                                                       String(p.enriched?.lid || '').toLowerCase().includes(term);
                                            })
                                            .map((p: any) => {
                                                const isUpdating = !!updatingParticipantsMap[p.id];
                                                const isAdmin = p.admin === 'admin' || p.admin === 'superadmin';
                                                return (
                                                    <div key={p.id} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded-md transition-colors text-xs">
                                                        <Avatar className="h-7 w-7">
                                                            <AvatarFallback className="text-[10px] font-bold bg-emerald-50 text-emerald-800">
                                                                {p.enriched.name?.charAt(0)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="font-bold truncate">{p.enriched.name}</p>
                                                                {isAdmin && (
                                                                    <Badge variant="outline" className="text-[8px] px-1.5 py-0 capitalize border-emerald-500 text-emerald-600 bg-emerald-50 shrink-0">
                                                                        Admin
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 text-[9px] text-muted-foreground font-mono">
                                                                {p.enriched.phone && p.enriched.phone !== p.enriched.name && (
                                                                    <span>Tel: {p.enriched.phone}</span>
                                                                )}
                                                                {p.enriched.lid && p.enriched.lid !== p.id && (
                                                                    <span>LID: {p.enriched.lid}</span>
                                                                )}
                                                                <span className="text-[8px] text-muted-foreground/60">{p.id}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-6 w-6"
                                                                disabled={isUpdating}
                                                                title={isAdmin ? "Remover admin" : "Tornar admin"}
                                                                onClick={() => handleUpdateParticipant(isAdmin ? 'demote' : 'promote', p.id)}
                                                            >
                                                                {isUpdating ? (
                                                                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                                                ) : isAdmin ? (
                                                                    <UserCheck className="h-3 w-3 text-emerald-600" />
                                                                ) : (
                                                                    <ShieldCheck className="h-3 w-3 text-muted-foreground hover:text-emerald-600" />
                                                                )}
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-6 w-6 hover:bg-red-50"
                                                                disabled={isUpdating}
                                                                title="Remover do grupo"
                                                                onClick={() => handleUpdateParticipant('remove', p.id)}
                                                            >
                                                                {isUpdating ? (
                                                                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                                                ) : (
                                                                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            ) : selectedGroup.admins && selectedGroup.admins.length > 0 && (
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

function WhatsappProfileManager({ config }: { config: any }) {
    const [profileName, setProfileName] = useState('');
    const [profileStatus, setProfileStatus] = useState('');
    const [profilePictureUrl, setProfilePictureUrl] = useState('');
    const [newPictureUrl, setNewPictureUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const fetchProfile = async () => {
        const apiKey = config?.evolutionKey || config?.instanceKey || config?.whatsappApiKey;
        if (!apiKey) return;
        setIsLoading(true);
        const params = new URLSearchParams({ key: apiKey });
        if (config?.evolutionUrl || config?.serverUrl) params.set('server', config.evolutionUrl || config.serverUrl);
        if (config?.evolutionInstance || config?.instanceName) params.set('instance', config.evolutionInstance || config.instanceName);
        try {
            const res = await fetch(`/api/notifications/profile?${params.toString()}`);
            const data = await res.json();
            const instance = data?.instance || data;
            setProfileName(instance?.profileName || instance?.name || '');
            setProfileStatus(instance?.profileStatus || instance?.status || '');
            setProfilePictureUrl(instance?.profilePictureUrl || instance?.picture || '');
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Erro ao carregar perfil', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { if (config) fetchProfile(); }, [config]);

    const handleSave = async (field: 'name' | 'status' | 'picture') => {
        const apiKey = config?.evolutionKey || config?.instanceKey || config?.whatsappApiKey;
        if (!apiKey) return;
        setIsSaving(true);
        
        const payload: any = {
            key: apiKey,
            server: config.evolutionUrl || config.serverUrl,
            instance: config.evolutionInstance || config.instanceName
        };

        if (field === 'name') payload.name = profileName;
        if (field === 'status') payload.status = profileStatus;
        if (field === 'picture') {
            payload.picture = newPictureUrl;
            if (!newPictureUrl) {
                toast({ variant: 'destructive', title: 'URL da Imagem requerida' });
                setIsSaving(false);
                return;
            }
        }

        try {
            const res = await fetch('/api/notifications/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast({ title: 'Perfil atualizado com sucesso!' });
                if (field === 'picture') {
                    setProfilePictureUrl(newPictureUrl);
                    setNewPictureUrl('');
                }
                fetchProfile();
            } else {
                toast({ variant: 'destructive', title: 'Erro ao atualizar', description: data.error || 'Erro desconhecido' });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Erro de conexão', description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="max-w-2xl mx-auto border-2 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 p-6">
                <CardTitle className="text-xl font-black text-emerald-950 flex items-center gap-2">
                    <Smartphone className="size-5 text-emerald-600" />
                    Perfil do WhatsApp
                </CardTitle>
                <CardDescription className="text-emerald-800/80 font-medium">
                    Gerencie o nome, foto e status do WhatsApp conectado a esta instância
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="animate-spin size-8 text-emerald-600 opacity-60" />
                        <p className="text-xs text-muted-foreground font-bold">Carregando informações do perfil...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-muted/30 rounded-2xl border">
                            <Avatar className="h-20 w-20 border-4 border-white shadow-md">
                                <AvatarImage src={profilePictureUrl} />
                                <AvatarFallback className="text-2xl font-black bg-emerald-100 text-emerald-800">
                                    {profileName?.charAt(0) || 'WA'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
                                <h3 className="font-bold text-base truncate">{profileName || 'Sem nome configurado'}</h3>
                                <p className="text-xs text-muted-foreground truncate">{profileStatus || 'Sem status/recado'}</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={fetchProfile} className="gap-2 font-bold shrink-0">
                                <RefreshCw className="size-4" />
                                Recarregar
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-xs">Nome do Perfil</Label>
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="Ex: Igreja Batista da Manhã" 
                                    value={profileName} 
                                    onChange={e => setProfileName(e.target.value)} 
                                    className="flex-1"
                                />
                                <Button onClick={() => handleSave('name')} disabled={isSaving} className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                                    Atualizar
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-xs">Recado (Status)</Label>
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="Ex: Deus é fiel! 🙏" 
                                    value={profileStatus} 
                                    onChange={e => setProfileStatus(e.target.value)} 
                                    className="flex-1"
                                />
                                <Button onClick={() => handleSave('status')} disabled={isSaving} className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                                    Atualizar
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-xs">Alterar Foto de Perfil (URL da Imagem)</Label>
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="https://exemplo.com/sua-foto.jpg" 
                                    value={newPictureUrl} 
                                    onChange={e => setNewPictureUrl(e.target.value)} 
                                    className="flex-1"
                                />
                                <Button onClick={() => handleSave('picture')} disabled={isSaving || !newPictureUrl} className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                                    Alterar Foto
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
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
                        <TabsTrigger value="profile" className="rounded-lg font-bold py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Perfil</TabsTrigger>
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
            <TabsContent value="profile" className="mt-0 animate-in fade-in-50 duration-300">
                <WhatsappProfileManager config={config} />
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

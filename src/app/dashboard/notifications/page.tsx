
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Settings, Key, Bot, History, MessageSquare, Mail, Users, CheckCircle2, Search, UserPlus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useDoc, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function WhatsappSender() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [targetAudience, setTargetAudience] = useState('all_members');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    // Fetch users for individual selection
    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const { data: users } = useCollection<any>(usersQuery);

    const filteredUsers = useMemo(() => {
        if (!users || !searchTerm) return [];
        return users.filter(u => 
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
            !selectedUserIds.includes(u.id)
        ).slice(0, 5);
    }, [users, searchTerm, selectedUserIds]);

    const handleAddUser = (userId: string) => {
        setSelectedUserIds(prev => [...prev, userId]);
        setSearchTerm('');
    };

    const handleRemoveUser = (userId: string) => {
        setSelectedUserIds(prev => prev.filter(id => id !== userId));
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (targetAudience === 'specific_members' && selectedUserIds.length === 0) {
            toast({ variant: 'destructive', title: "Selecione destinatários", description: "Adicione pelo menos uma pessoa para o envio individual." });
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/notifications/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  channel: 'whatsapp', 
                  audience: targetAudience, 
                  message,
                  userIds: targetAudience === 'specific_members' ? selectedUserIds : undefined
              }),
            });
            
            const result = await response.json();
            
            if (!response.ok) {
              throw new Error(result.error || 'Falha no envio');
            }

            toast({
                title: "Envio Concluído!",
                description: result.message || `Sua mensagem para "${targetAudience}" foi processada.`
            });
            setMessage('');
            setSelectedUserIds([]);
            
        } catch(error) {
             toast({
                variant: 'destructive',
                title: "Erro no Envio",
                description: (error as Error).message || "Não foi possível processar o envio. Tente novamente."
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSend} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="targetAudience">Público-alvo</Label>
                    <Select value={targetAudience} onValueChange={setTargetAudience}>
                        <SelectTrigger id="targetAudience" className="bg-background">
                            <SelectValue placeholder="Selecione o público" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all_members">Todos os Membros</SelectItem>
                            <SelectItem value="all_leaders">Todos os Líderes</SelectItem>
                            <SelectItem value="network_leaders">Líderes de Rede</SelectItem>
                            <SelectItem value="area_leaders">Líderes de Área</SelectItem>
                            <SelectItem value="cell_leaders">Líderes de Célula</SelectItem>
                            <SelectItem value="specific_members">Membros Específicos (Individual)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {targetAudience === 'specific_members' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label>Pesquisar Membros</Label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Digite o nome..." 
                                className="pl-8" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {filteredUsers.length > 0 && (
                            <div className="border rounded-md mt-1 bg-background shadow-lg overflow-hidden">
                                {filteredUsers.map(u => (
                                    <button
                                        key={u.id}
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between"
                                        onClick={() => handleAddUser(u.id)}
                                    >
                                        <span>{u.name}</span>
                                        <UserPlus className="size-3 text-primary" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {targetAudience === 'specific_members' && selectedUserIds.length > 0 && (
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground">Destinatários Selecionados ({selectedUserIds.length})</Label>
                    <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
                        {selectedUserIds.map(id => {
                            const u = users?.find((user: any) => user.id === id);
                            return (
                                <Badge key={id} variant="secondary" className="pl-2 pr-1 py-1 gap-1">
                                    {u?.name || id}
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemoveUser(id)}
                                        className="hover:bg-destructive hover:text-white rounded-full p-0.5"
                                    >
                                        <X size={12} />
                                    </button>
                                </Badge>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="message">Mensagem Personalizada</Label>
                <Textarea 
                    id="message" 
                    placeholder="Olá {{nome}}, temos um aviso importante..."
                    className="min-h-[150px] bg-background"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                />
                <p className="text-[10px] text-muted-foreground italic">Use <strong>{"{{nome}}"}</strong> para inserir o nome do destinatário.</p>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20">
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                {targetAudience === 'specific_members' ? `Enviar para ${selectedUserIds.length} pessoas` : 'Disparar em Massa'}
            </Button>
        </form>
    );
}

function NotificationsConfig() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { data: config, isLoading } = useDoc<any>('config/notifications');
    
    const [waKey, setWaKey] = useState('');
    const [aiKey, setAiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (config) {
            setWaKey(config.whatsappApiKey || '');
            setAiKey(config.aiApiKey || '');
        }
    }, [config]);

    const handleSave = () => {
        if (!firestore) return;
        setIsSaving(true);
        
        const configRef = doc(firestore, 'config', 'notifications');
        
        setDocumentNonBlocking(configRef, {
            whatsappApiKey: waKey,
            aiApiKey: aiKey,
            updatedAt: Timestamp.now()
        }, { merge: true })
        .then(() => {
            toast({ 
                title: "Configurações Salvas!", 
                description: "Suas credenciais foram atualizadas com sucesso no banco de dados." 
            });
        })
        .finally(() => {
            setIsSaving(false);
        });
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Key className="size-5 text-primary" />API WhatsApp (api-wa.me)</CardTitle>
                    <CardDescription>Insira a chave da sua instância para habilitar disparos reais.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="wa-key">Chave da Instância (API Key)</Label>
                        <Input 
                            id="wa-key" 
                            type="password" 
                            value={waKey} 
                            onChange={e => setWaKey(e.target.value)} 
                            placeholder="Sua chave secreta do gateway" 
                        />
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bot className="size-5 text-primary" />Inteligência Artificial (Opcional)</CardTitle>
                    <CardDescription>Para geração de mensagens e análises de impacto.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="ai-key">Chave da API (Gemini/OpenAI)</Label>
                        <Input 
                            id="ai-key" 
                            type="password" 
                            value={aiKey} 
                            onChange={e => setAiKey(e.target.value)} 
                            placeholder="Sua chave de IA" 
                        />
                    </div>
                </CardContent>
            </Card>
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} className="font-bold">
                    {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Settings className="mr-2 size-4" />}
                    Salvar Todas as Configurações
                </Button>
            </div>
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
                        <TableHead>Canal</TableHead>
                        <TableHead>Público</TableHead>
                        <TableHead>Impacto</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history?.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">Nenhuma notificação enviada ainda.</TableCell></TableRow>
                    ) : (
                        history?.map((item: any) => (
                            <TableRow key={item.id}>
                                <TableCell className="text-xs font-medium">
                                    {item.sentAt ? format(item.sentAt.toDate(), 'dd/MM/yy HH:mm', { locale: ptBR }) : '-'}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {item.channel === 'whatsapp' ? <MessageSquare className="size-3 text-emerald-500" /> : <Mail className="size-3 text-blue-500" />}
                                        <span className="capitalize text-xs font-semibold">{item.channel}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs font-bold text-slate-600">
                                    {item.audience.replace('_', ' ').toUpperCase()}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="text-[10px] font-black">{item.recipientCount} PESSOAS</Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase">
                                        <CheckCircle2 size={12} /> SUCESSO
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

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
            <CardHeader>
                <CardTitle className="text-2xl font-black flex items-center gap-3">
                    <Send className="text-primary" />
                    Central de Notificações
                </CardTitle>
                <CardDescription className="text-slate-600">Comunique-se com o organismo da igreja de forma ágil, direta e centralizada.</CardDescription>
            </CardHeader>
        </Card>

        <Tabs defaultValue="sender" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-xl bg-muted/50 p-1">
                <TabsTrigger value="sender" className="font-bold data-[state=active]:bg-white shadow-sm"><Send className="mr-2 size-4" /> Disparador</TabsTrigger>
                <TabsTrigger value="history" className="font-bold data-[state=active]:bg-white shadow-sm"><History className="mr-2 size-4" /> Histórico</TabsTrigger>
                <TabsTrigger value="config" className="font-bold data-[state=active]:bg-white shadow-sm"><Settings className="mr-2 size-4" /> Configurações</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sender" className="mt-6 animate-in fade-in-50">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Novo Disparo em Massa</CardTitle>
                        <CardDescription>Escolha o canal e o público para enviar sua mensagem personalizada.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="whatsapp" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 max-w-xs mb-6 bg-muted/30">
                                <TabsTrigger value="whatsapp" className="text-xs uppercase font-black">WhatsApp</TabsTrigger>
                                <TabsTrigger value="email" disabled className="text-xs uppercase font-black">E-mail</TabsTrigger>
                            </TabsList>
                            <TabsContent value="whatsapp">
                                <WhatsappSender />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-6 animate-in slide-in-from-left-4">
                <NotificationsHistory />
            </TabsContent>

            <TabsContent value="config" className="mt-6 animate-in slide-in-from-left-4">
                <NotificationsConfig />
            </TabsContent>
        </Tabs>
    </div>
  );
}

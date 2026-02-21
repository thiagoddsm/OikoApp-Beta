
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
import { Loader2, Send, Settings, Key, Bot, History, MessageSquare, Mail, Users, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useDoc, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function WhatsappSender() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [targetAudience, setTargetAudience] = useState('all_members');

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch('/api/notifications/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ channel: 'whatsapp', audience: targetAudience, message }),
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
                        </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">O sistema buscará os contatos automaticamente no banco de dados.</p>
                </div>
            </div>
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
                Disparar via WhatsApp
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

    const handleSave = async () => {
        if (!firestore) return;
        setIsSaving(true);
        
        try {
            await setDocumentNonBlocking(doc(firestore, 'config', 'notifications'), {
                whatsappApiKey: waKey,
                aiApiKey: aiKey,
                updatedAt: Timestamp.now()
            }, { merge: true });
            
            toast({ title: "Configurações Salvas!", description: "Suas credenciais foram atualizadas com segurança." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao salvar" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Key className="size-5" />Chaves de API do WhatsApp</CardTitle>
                    <CardDescription>Insira as credenciais do seu gateway de WhatsApp (ex: api-wa.me ou Evolution API).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="wa-key">Chave da Instância (API Key)</Label>
                        <Input id="wa-key" type="password" value={waKey} onChange={e => setWaKey(e.target.value)} placeholder="Sua chave secreta" />
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bot className="size-5" />Configuração da IA (Opcional)</CardTitle>
                    <CardDescription>Para geração de mensagens personalizadas baseadas no perfil do membro.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="ai-key">Chave da API (Gemini/OpenAI)</Label>
                        <Input id="ai-key" type="password" value={aiKey} onChange={e => setAiKey(e.target.value)} placeholder="Sua chave secreta de IA" />
                    </div>
                </CardContent>
            </Card>
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
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

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="rounded-lg border bg-card">
            <Table>
                <TableHeader>
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
                        <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhuma notificação enviada ainda.</TableCell></TableRow>
                    ) : (
                        history?.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="text-xs font-medium">
                                    {item.sentAt ? format(item.sentAt.toDate(), 'dd/MM/yy HH:mm', { locale: ptBR }) : '-'}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {item.channel === 'whatsapp' ? <MessageSquare className="size-3 text-emerald-500" /> : <Mail className="size-3 text-blue-500" />}
                                        <span className="capitalize text-xs">{item.channel}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs font-semibold">{item.audience.replace('_', ' ').toUpperCase()}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="text-[10px]">{item.recipientCount} pessoas</Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px]">
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
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
                <CardTitle className="text-2xl font-black">Central de Notificações</CardTitle>
                <CardDescription className="text-slate-600">Comunique-se com o organismo da igreja de forma ágil e centralizada.</CardDescription>
            </CardHeader>
        </Card>

        <Tabs defaultValue="sender" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-xl">
                <TabsTrigger value="sender" className="font-bold"><Send className="mr-2 size-4" /> Disparador</TabsTrigger>
                <TabsTrigger value="history" className="font-bold"><History className="mr-2 size-4" /> Histórico</TabsTrigger>
                <TabsTrigger value="config" className="font-bold"><Settings className="mr-2 size-4" /> Configurações</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sender" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Novo Disparo em Massa</CardTitle>
                        <CardDescription>Escolha o canal e o público para enviar sua mensagem.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="whatsapp" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 max-w-xs mb-6">
                                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                                <TabsTrigger value="email" disabled>E-mail</TabsTrigger>
                            </TabsList>
                            <TabsContent value="whatsapp">
                                <WhatsappSender />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
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

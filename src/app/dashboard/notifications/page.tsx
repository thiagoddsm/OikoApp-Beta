'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, Settings, Key, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function WhatsappSender() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [targetAudience, setTargetAudience] = useState('all');

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulação de chamada de API
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            // Aqui iria a chamada para a API route:
            // const response = await fetch('/api/notifications/send', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify({ channel: 'whatsapp', audience: targetAudience, message }),
            // });
            // if (!response.ok) throw new Error('Falha no envio');
            // const result = await response.json();

            toast({
                title: "Envio Agendado!",
                description: `Sua mensagem para "${targetAudience}" foi enviada para a fila de processamento.`
            });
            setMessage('');
            
        } catch(error) {
             toast({
                variant: 'destructive',
                title: "Erro no Envio",
                description: "Não foi possível processar o envio. Tente novamente."
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSend} className="space-y-6">
            <div>
                <Label htmlFor="targetAudience">Destinatários</Label>
                <Select value={targetAudience} onValueChange={setTargetAudience}>
                    <SelectTrigger id="targetAudience">
                        <SelectValue placeholder="Selecione o público" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Membros</SelectItem>
                        <SelectItem value="all_leaders">Todos os Líderes</SelectItem>
                        <SelectItem value="network_leaders">Líderes de Rede</SelectItem>
                        <SelectItem value="area_leaders">Líderes de Área</SelectItem>
                        <SelectItem value="cell_leaders">Líderes de Célula</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="message">Mensagem</Label>
                <Textarea 
                    id="message" 
                    placeholder="Digite sua mensagem aqui. Você pode usar variáveis como {{nome}}."
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Enviar Notificação por WhatsApp
            </Button>
        </form>
    );
}

function EmailSender() {
    return (
        <div className="flex items-center justify-center h-60 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Módulo de envio de E-mail em construção.</p>
        </div>
    );
}


function NotificationsConfig() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Key className="size-5" />Chaves de API do WhatsApp</CardTitle>
                    <CardDescription>Insira as credenciais do seu gateway de WhatsApp (ex: api-wa.me).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="wa-key">Chave da Instância (API Key)</Label>
                        <Input id="wa-key" type="password" placeholder="Sua chave secreta do api-wa.me" />
                    </div>
                     <Button>Salvar Configuração</Button>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bot className="size-5" />Configuração da IA (Opcional)</CardTitle>
                    <CardDescription>Para respostas automáticas ou personalização avançada.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="ai-key">Chave da API (OpenAI/Gemini)</Label>
                        <Input id="ai-key" type="password" placeholder="Sua chave secreta de IA" />
                    </div>
                     <Button>Salvar Configuração</Button>
                </CardContent>
            </Card>
        </div>
    );
}

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Central de Notificações</CardTitle>
                <CardDescription>Envie comunicados para seus membros via WhatsApp ou E-mail e gerencie suas configurações.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="sender" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="sender">Disparador</TabsTrigger>
                        <TabsTrigger value="config">Configurações</TabsTrigger>
                        <TabsTrigger value="history">Histórico</TabsTrigger>
                    </TabsList>
                    <TabsContent value="sender">
                        <Tabs defaultValue="whatsapp" className="w-full mt-4">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                                <TabsTrigger value="email">E-mail</TabsTrigger>
                            </TabsList>
                            <TabsContent value="whatsapp" className="mt-6">
                                <WhatsappSender />
                            </TabsContent>
                            <TabsContent value="email" className="mt-6">
                                <EmailSender />
                            </TabsContent>
                        </Tabs>
                    </TabsContent>
                    <TabsContent value="config" className="mt-6">
                        <NotificationsConfig />
                    </TabsContent>
                    <TabsContent value="history" className="mt-6">
                         <div className="flex items-center justify-center h-60 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">Histórico de envios em construção.</p>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Wallet, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { useChurch } from '@/hooks/useChurch';
import { useUser } from '@/firebase';

export function AsaasConfig() {
  const { tenant, isLoading, tenantId } = useChurch();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [apiKey, setApiKey] = useState('');
  const [webhookToken, setWebhookToken] = useState('');
  const [env, setEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setApiKey(tenant.asaasApiKey ? '$aact_************************' : '');
      setWebhookToken(tenant.asaasWebhookToken ? '************************' : '');
      setEnv(tenant.asaasEnv || 'sandbox');
    }
  }, [tenant]);

  const handleSave = async () => {
    if (!tenantId || !user?.uid) return;
    
    setIsSaving(true);
    try {
      const res = await fetch('/api/asaas/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          userId: user.uid,
          apiKey,
          webhookToken,
          asaasEnv: env
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar configurações no servidor');
      }
      
      toast({
        title: "Configurações salvas",
        description: "A integração com Asaas foi atualizada para sua igreja.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message || "Tente novamente mais tarde.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center p-6">
          <Loader2 className="animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const isConfigured = !!tenant?.asaasApiKey;

  return (
    <Card className="bg-white border-slate-100 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Wallet className="size-5" />
            </div>
            <div>
              <CardTitle className="text-slate-800 font-bold">Gateway Asaas</CardTitle>
              <CardDescription>Recebimento de dízimos e inscrições em eventos.</CardDescription>
            </div>
          </div>
          <div>
            {isConfigured ? (
               <div className="flex items-center text-emerald-600 text-sm font-medium">
                 <CheckCircle2 className="size-4 mr-1" /> Configurado
               </div>
            ) : (
               <div className="flex items-center text-amber-600 text-sm font-medium">
                 <AlertTriangle className="size-4 mr-1" /> Pendente
               </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="asaasEnv">Ambiente</Label>
          <select 
            id="asaasEnv"
            value={env}
            onChange={(e) => setEnv(e.target.value as 'sandbox' | 'production')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="sandbox">Sandbox (Teste)</option>
            <option value="production">Produção (Real)</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key ($ACCESS_TOKEN)</Label>
          <Input 
            id="apiKey" 
            type="password"
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Ex: $aact_YTU5YTE0M2M..." 
          />
          <p className="text-xs text-muted-foreground">Chave de acesso gerada no painel da Asaas da sua igreja.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhookToken">Webhook Token de Validação</Label>
          <Input 
            id="webhookToken" 
            type="password"
            value={webhookToken} 
            onChange={(e) => setWebhookToken(e.target.value)}
            placeholder="Ex: d41d8cd98f00b204e9800998ecf8427e" 
          />
          <p className="text-xs text-muted-foreground">
            Configure o webhook na Asaas para apontar para:<br/>
            <code className="text-primary font-mono bg-primary/10 px-1 rounded">
              {(typeof window !== 'undefined' ? window.location.origin : '')}/api/asaas/webhook?tenantId={tenantId}
            </code>
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving || !tenantId} className="w-full">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Salvar Configurações
        </Button>
      </CardFooter>
    </Card>
  );
}

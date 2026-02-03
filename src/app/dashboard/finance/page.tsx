
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Key, Link, BarChart, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UnderConstruction } from '@/components/common/under-construction';
import { useFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ContaAzulConfig = {
    id: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
}

function ContaAzulConnect() {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const configDocRef = useMemo(() => firestore ? doc(firestore, 'config', 'conta_azul') : null, [firestore]);
  
  const { data: config, isLoading: isLoadingConfig } = useDoc<ContaAzulConfig>(configDocRef?.path);

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const isConnected = !!config?.accessToken || !!config?.refreshToken;
  const hasCredentials = !!config?.clientId && !!config?.clientSecret;

  useEffect(() => {
    if (config) {
        setClientId(config.clientId || '');
        setClientSecret(config.clientSecret || '');
    }
  }, [config]);


  const handleConnect = () => {
    if (!clientId || !clientSecret || !configDocRef) {
      toast({
        variant: 'destructive',
        title: 'Credenciais ausentes',
        description: 'Por favor, insira o Client ID e o Client Secret.',
      });
      return;
    }
    setIsSaving(true);
    
    // This only saves the credentials. The actual OAuth flow would happen in a Cloud Function or dedicated redirect page.
    setDocumentNonBlocking(configDocRef, { 
        clientId, 
        clientSecret 
    }, { merge: true });

    setTimeout(() => { // Simulate feedback time
        setIsSaving(false);
        toast({
            title: 'Credenciais Salvas!',
            description: 'Suas credenciais da Conta Azul foram salvas com segurança no Firestore.',
        });
    }, 1000);
  };
  
   const handleDisconnect = () => {
    if (!configDocRef) return;
    if (confirm("Tem certeza que deseja remover a conexão com o Conta Azul? Isso interromperá a sincronização financeira.")) {
        setDocumentNonBlocking(configDocRef, {
            clientId: '',
            clientSecret: '',
            accessToken: '',
            refreshToken: '',
        }, { merge: true });
        toast({
            title: 'Desconectado',
            description: 'A conexão com a Conta Azul foi removida.',
        });
    }
  };

  if (isLoadingConfig) {
    return (
         <Card>
            <CardContent className="flex items-center justify-center p-6 h-48">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                <span className="text-muted-foreground">Carregando configuração...</span>
            </CardContent>
        </Card>
    )
  }

  if (isConnected) {
    return (
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <ShieldCheck className="size-6" />
            Conexão Ativa com Conta Azul
          </CardTitle>
          <CardDescription>O OikoApp está sincronizado com sua conta. Os dados de dízimos, ofertas e despesas estão sendo importados.</CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-between">
           <span className="text-sm text-green-600 font-semibold flex items-center gap-2">
            <Link className="size-4" /> Sincronização Automática Habilitada
          </span>
          <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleDisconnect}>Desconectar Conta</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Key className="size-5" />Integração Conta Azul (OAuth 2.0)</CardTitle>
        <CardDescription>
          Conecte sua gestão financeira para automatizar relatórios e conciliação bancária.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="default" className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Passo 1: Configuração no Portal</AlertTitle>
            <AlertDescription className="text-blue-700 text-sm">
                Acesse o <a href="https://developers.contaazul.com/" target="_blank" rel="noopener noreferrer" className="underline font-bold">Portal de Desenvolvedores</a>, crie um aplicativo e configure a Redirect URL como: <code className="bg-blue-100 p-0.5 rounded font-mono">https://seu-app.web.app/api/auth/conta-azul/callback</code>
            </AlertDescription>
        </Alert>

        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="client-id">Client ID</Label>
                <Input 
                    id="client-id" 
                    placeholder="Ex: ca_abc123..." 
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="client-secret">Client Secret</Label>
                <Input 
                    id="client-secret" 
                    type="password" 
                    placeholder="Sua chave secreta"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                />
            </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-4">
        <Button onClick={handleConnect} disabled={isSaving} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Link className="mr-2 h-4 w-4" />
              {hasCredentials ? 'Atualizar Credenciais' : 'Salvar e Iniciar Conexão'}
            </>
          )}
        </Button>
        {hasCredentials && !isConnected && (
            <Button variant="outline" className="w-full border-primary text-primary" asChild>
                <a href={`https://api.contaazul.com/auth/authorize?client_id=${clientId}&scope=sales%20shipping%20inventory%20products%20customers%20finance&redirect_uri=CALLBACK_URL&state=STATE`} target="_blank">
                    <ExternalLink className="mr-2 h-4 w-4"/>
                    Autorizar Acesso no Conta Azul
                </a>
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default function FinancePage() {
    const { data: config, isLoading: isLoadingConfig } = useDoc<ContaAzulConfig>('config/conta_azul');
    const isConnected = !!config?.accessToken || !!config?.refreshToken;

  return (
    <div className="space-y-6">
      <ContaAzulConnect />
      
      {isLoadingConfig ? (
         <Card className="text-center bg-muted/30 border-dashed">
             <CardHeader className="flex items-center justify-center p-6 h-48">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
             </CardHeader>
         </Card>
      ) : isConnected ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UnderConstruction 
                pageTitle="Fluxo de Caixa Consolidado"
                pageDescription="Gráficos de entradas e saídas sincronizados em tempo real com o Conta Azul."
            />
            <UnderConstruction 
                pageTitle="Dízimos e Ofertas"
                pageDescription="Relatórios por período e categoria, integrados à conciliação bancária."
            />
          </div>
           <UnderConstruction 
            pageTitle="Contas a Pagar e Receber"
            pageDescription="Gerencie os compromissos financeiros e as entradas futuras projetadas no sistema."
          />
        </>
      ) : (
        <Card className="text-center bg-muted/10 border-dashed border-2 py-12">
            <CardContent className="flex flex-col items-center gap-4">
                 <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <BarChart className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                    <CardTitle>Painel Financeiro Inteligente</CardTitle>
                    <CardDescription className="max-w-sm mx-auto">
                        Conecte sua conta do Conta Azul acima para visualizar indicadores de saúde financeira, fluxo de caixa e relatórios ministeriais.
                    </CardDescription>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}


'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Key, Link, BarChart, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UnderConstruction } from '@/components/common/under-construction';

function ContaAzulConnect() {
  const { toast } = useToast();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // No futuro, este estado virá do banco de dados
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = () => {
    if (!clientId || !clientSecret) {
      toast({
        variant: 'destructive',
        title: 'Credenciais ausentes',
        description: 'Por favor, insira o Client ID e o Client Secret.',
      });
      return;
    }
    setIsLoading(true);
    // Lógica de conexão OAuth 2.0 com a Conta Azul virá aqui
    console.log('Iniciando conexão com Client ID:', clientId);
    setTimeout(() => {
      // Simulando a conclusão da conexão
      setIsConnected(true);
      setIsLoading(false);
      toast({
        title: 'Conectado com Sucesso!',
        description: 'Sua conta da Conta Azul foi conectada. (Simulação)',
      });
    }, 2000);
  };
  
   const handleDisconnect = () => {
    setIsConnected(false);
    setClientId('');
    setClientSecret('');
     toast({
        title: 'Desconectado',
        description: 'A conexão com a Conta Azul foi removida.',
      });
  };

  if (isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conexão Ativa</CardTitle>
          <CardDescription>O OikoApp está conectado à sua conta da Conta Azul. Os dados financeiros serão sincronizados periodicamente.</CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-between">
           <span className="text-sm text-green-600 font-semibold flex items-center gap-2">
            <Link className="size-4" /> Conectado
          </span>
          <Button variant="destructive" onClick={handleDisconnect}>Desconectar</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Key className="size-5" />Conectar com Conta Azul</CardTitle>
        <CardDescription>
          Para habilitar a sincronização financeira, insira suas credenciais de API da Conta Azul. Você pode criá-las no <a href="https://developers.contaazul.com/" target="_blank" rel="noopener noreferrer" className="underline">portal de desenvolvedores</a>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="client-id">Client ID</Label>
          <Input 
            id="client-id" 
            placeholder="Seu Client ID" 
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-secret">Client Secret</Label>
          <Input 
            id="client-secret" 
            type="password" 
            placeholder="Seu Client Secret"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleConnect} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Conectando...
            </>
          ) : (
            <>
              <Link className="mr-2 h-4 w-4" />
              Conectar com Conta Azul
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function FinancePage() {
  // No futuro, este estado virá do banco de dados
  const isConnected = false;

  return (
    <div className="space-y-6">
      <ContaAzulConnect />
      
      {isConnected ? (
        <>
          <UnderConstruction 
            pageTitle="Relatórios Financeiros"
            pageDescription="Visualize o fluxo de caixa, dízimos, ofertas e despesas da igreja de forma consolidada."
          />
           <UnderConstruction 
            pageTitle="Contas a Pagar e Receber"
            pageDescription="Gerencie os compromissos financeiros e as entradas futuras."
          />
        </>
      ) : (
        <Card className="text-center bg-muted/30 border-dashed">
            <CardHeader>
                 <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <BarChart className="h-6 w-6 text-muted-foreground" />
                </div>
                <CardTitle>Painel Financeiro</CardTitle>
                <CardDescription>Conecte sua conta da Conta Azul para visualizar os dados financeiros aqui.</CardDescription>
            </CardHeader>
        </Card>
      )}
    </div>
  );
}

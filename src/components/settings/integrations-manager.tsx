'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, Link2, Link2Off, Wallet } from "lucide-react";

export function IntegrationsManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  
  const [status, setStatus] = useState<{
    connected: boolean;
    connectedAt: string | null;
    lastSyncAt: string | null;
    status: string | null;
  } | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/finance/conta-azul/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Erro ao buscar status da integração:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = () => {
    // Redireciona o usuário para o endpoint que inicia o OAuth do Conta Azul
    window.location.href = '/api/finance/conta-azul/connect';
  };

  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar a integração com o Conta Azul? Os dados sincronizados continuarão salvos, mas não haverá novas atualizações.')) {
      return;
    }
    
    setDisconnecting(true);
    try {
      const res = await fetch('/api/finance/conta-azul/disconnect', { method: 'POST' });
      if (res.ok) {
        toast({
          title: "Integração Removida",
          description: "A conexão com o Conta Azul foi desativada.",
        });
        fetchStatus();
      } else {
        throw new Error('Falha na requisição');
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao desconectar",
        description: err.message || "Tente novamente mais tarde.",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/finance/conta-azul/sync', { method: 'POST' });
      const data = await res.json();
      
      if (res.ok) {
        toast({
          title: "Sincronização Concluída",
          description: `Foram sincronizados ${data.synced} lançamentos com sucesso!`,
        });
        fetchStatus();
      } else {
        throw new Error(data.error || 'Erro na sincronização');
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao sincronizar",
        description: err.message || "Tente novamente mais tarde.",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Conta Azul Card */}
      <Card className="bg-white border-slate-100 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <RefreshCw className="size-5" />
              </div>
              <div>
                <CardTitle className="text-slate-800 font-bold">Conta Azul ERP</CardTitle>
                <CardDescription>Sincronize lançamentos financeiros da igreja.</CardDescription>
              </div>
            </div>
            <div>
              {status?.connected ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-none hover:bg-emerald-100">
                  <CheckCircle2 className="size-3 mr-1" /> Conectado
                </Badge>
              ) : (
                <Badge className="bg-slate-100 text-slate-600 border-none hover:bg-slate-100">
                  <AlertTriangle className="size-3 mr-1" /> Desconectado
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.connected ? (
            <>
              <div className="text-xs space-y-1.5 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p><strong>Status da Conta:</strong> Ativa (PJ)</p>
                <p>
                  <strong>Conectado em:</strong>{' '}
                  {status.connectedAt ? new Date(status.connectedAt).toLocaleString('pt-BR') : '-'}
                </p>
                <p>
                  <strong>Última Sincronização:</strong>{' '}
                  {status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString('pt-BR') : 'Nunca sincronizado'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button 
                  size="sm" 
                  onClick={handleSync} 
                  disabled={syncing}
                  className="bg-primary text-white font-bold"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="size-4 mr-2" />
                      Sincronizar Lançamentos
                    </>
                  )}
                </Button>

                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleDisconnect} 
                  disabled={disconnecting}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {disconnecting ? (
                    <Loader2 className="size-4 animate-spin mr-2" />
                  ) : (
                    <Link2Off className="size-4 mr-2" />
                  )}
                  Desconectar ERP
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500 leading-relaxed">
                Conecte a conta ERP do Conta Azul da igreja para sincronizar automaticamente os dados de fluxo de caixa, contas a pagar e contas a receber no Oiko Studio.
              </p>
              <div className="pt-2">
                <Button 
                  size="sm" 
                  onClick={handleConnect}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  <Link2 className="size-4 mr-2" />
                  Conectar Conta Azul v2
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Asaas Card */}
      <Card className="bg-white border-slate-100 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Wallet className="size-5" />
              </div>
              <div>
                <CardTitle className="text-slate-800 font-bold">Asaas Pagamentos</CardTitle>
                <CardDescription>Recebimento de inscrições e eventos.</CardDescription>
              </div>
            </div>
            <div>
              <Badge className="bg-emerald-100 text-emerald-800 border-none hover:bg-emerald-100">
                <CheckCircle2 className="size-3 mr-1" /> Disponível
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            O Oiko Studio está configurado para emitir cobranças via Pix, Boleto e Cartão de Crédito integrados com a conta Asaas da igreja. Os pagamentos são compensados diretamente na conta PJ.
          </p>
          <div className="text-xs space-y-1 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <p><strong>Configuração:</strong> API Key de Produção Ativa</p>
            <p><strong>Webhooks:</strong> Habilitados em real-time</p>
            <p><strong>Fluxo:</strong> Inscrições pagos aprovam instantaneamente</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, Link2, Link2Off, ArrowDownRight, ArrowUpRight, Calendar } from "lucide-react";

export function ContaAzulManager() {
  const { firestore } = useFirebase();
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
    window.location.href = '/api/finance/conta-azul/connect';
  };

  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar a integração com o Conta Azul?')) {
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

  // Queries local firestore for synced entries
  const entriesQuery = useMemoFirebase(() => {
    if (!firestore || !status?.connected) return null;
    return query(
      collection(firestore, 'contaAzulEntries'),
      orderBy('dueDate', 'desc'),
      limit(50)
    );
  }, [firestore, status?.connected]);

  const { data: rawEntries, isLoading: loadingEntries } = useCollection<any>(entriesQuery);

  const entries = useMemo(() => {
    return rawEntries || [];
  }, [rawEntries]);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="bg-white border-slate-100 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-slate-800 font-bold flex items-center gap-2">
                <RefreshCw className="size-5 text-blue-600" />
                Integração Conta Azul ERP
              </CardTitle>
              <CardDescription>
                Acompanhe os lançamentos de fluxo de caixa, contas a pagar e receber integrados ao Conta Azul.
              </CardDescription>
            </div>
            <div>
              {status?.connected ? (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none px-3 py-1 text-xs">
                  <CheckCircle2 className="size-3.5 mr-1" /> Conectado
                </Badge>
              ) : (
                <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none px-3 py-1 text-xs">
                  <AlertTriangle className="size-3.5 mr-1" /> Desconectado
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {status?.connected ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="text-slate-500 font-medium">Status da Conexão</p>
                <p className="text-slate-800 font-semibold mt-1">Conexão Ativa (v2)</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Conectado em</p>
                <p className="text-slate-800 font-semibold mt-1">
                  {status.connectedAt ? new Date(status.connectedAt).toLocaleString('pt-BR') : '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Última Sincronização</p>
                <p className="text-slate-800 font-semibold mt-1">
                  {status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString('pt-BR') : 'Nunca sincronizado'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Link2Off className="size-12 text-slate-300 mb-3" />
              <p className="text-slate-600 text-sm font-medium">Sem conexão com o Conta Azul ERP</p>
              <p className="text-slate-400 text-xs mt-1 max-w-sm">
                Conecte a conta ERP do Conta Azul da igreja para importar os lançamentos financeiros automaticamente.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="justify-between border-t bg-slate-50/50 px-6 py-4 rounded-b-xl">
          {status?.connected ? (
            <>
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 bg-white"
              >
                {disconnecting ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <Link2Off className="size-4 mr-2" />
                )}
                Desconectar ERP
              </Button>

              <Button
                onClick={handleSync}
                disabled={syncing}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
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
            </>
          ) : (
            <Button
              onClick={handleConnect}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full sm:w-auto"
            >
              <Link2 className="size-4 mr-2" />
              Conectar Conta Azul v2
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Synchronized Entries List */}
      {status?.connected && (
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 font-bold flex items-center gap-2">
              <Calendar className="size-5 text-primary" />
              Lançamentos Sincronizados (Últimos 50)
            </CardTitle>
            <CardDescription>
              Valide e visualize os registros importados da sua conta do Conta Azul.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingEntries ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm italic">
                Nenhum lançamento sincronizado até o momento. Clique em "Sincronizar Lançamentos" acima.
              </div>
            ) : (
              <div className="rounded-md border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-slate-700 font-bold">Tipo</TableHead>
                        <TableHead className="text-slate-700 font-bold">Categoria</TableHead>
                        <TableHead className="text-slate-700 font-bold">Descrição</TableHead>
                        <TableHead className="text-slate-700 font-bold">Cliente/Contato</TableHead>
                        <TableHead className="text-slate-700 font-bold">Vencimento</TableHead>
                        <TableHead className="text-slate-700 font-bold">Valor</TableHead>
                        <TableHead className="text-slate-700 font-bold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry: any) => {
                        const isReceivable = entry.type === 'RECEIVABLE';
                        return (
                          <TableRow key={entry.externalId} className="hover:bg-slate-50/50">
                            <TableCell>
                              {isReceivable ? (
                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none flex items-center gap-0.5 w-fit font-bold">
                                  <ArrowUpRight className="size-3" /> Entrada
                                </Badge>
                              ) : (
                                <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border-none flex items-center gap-0.5 w-fit font-bold">
                                  <ArrowDownRight className="size-3" /> Saída
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold text-slate-700 max-w-[120px] truncate">
                              {entry.category || 'N/A'}
                            </TableCell>
                            <TableCell className="text-slate-600 max-w-[180px] truncate" title={entry.description}>
                              {entry.description || '-'}
                            </TableCell>
                            <TableCell className="text-slate-600 font-medium max-w-[150px] truncate">
                              {entry.contactName || '-'}
                            </TableCell>
                            <TableCell className="text-slate-500 font-medium">
                              {entry.dueDate ? new Date(entry.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                            </TableCell>
                            <TableCell className="font-bold text-slate-800">
                              R$ {entry.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              {entry.status === 'PAID' ? (
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none font-bold">
                                  Pago
                                </Badge>
                              ) : entry.status === 'OVERDUE' ? (
                                <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-none font-bold">
                                  Vencido
                                </Badge>
                              ) : entry.status === 'CANCELLED' ? (
                                <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none font-bold">
                                  Cancelado
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none font-bold">
                                  Pendente
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

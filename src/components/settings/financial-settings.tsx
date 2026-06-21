'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useChurch } from '@/hooks/useChurch';
import { Loader2, Calendar, RefreshCw, Terminal, Play, Sparkles, ExternalLink, Check, Copy, Key, Shield } from "lucide-react";
import { PersonSearchInput } from '@/components/common/person-search-input';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';

export function FinancialSettings() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { tenantId } = useChurch();
  
  // Estados de loading
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Configs Globais Financeiras
  const [dueDays, setDueDays] = useState(3);
  const [asaasApiKey, setAsaasApiKey] = useState('');
  const [asaasWebhookToken, setAsaasWebhookToken] = useState('ibm_webhook_secret_2025');
  const [asaasBaseUrl, setAsaasBaseUrl] = useState('https://api.asaas.com/v3');
  const [isKeyConfigured, setIsKeyConfigured] = useState(false);
  
  // Lista de membros (para o PersonSearchInput)
  const [members, setMembers] = useState<any[]>([]);
  
  // Campos do Formulário de Cobrança Real
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [chargeType, setChargeType] = useState<'UNIQUE' | 'INSTALLMENT' | 'SUBSCRIPTION'>('UNIQUE');
  const [billingType, setBillingType] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED'>('PIX');
  const [amount, setAmount] = useState<number>(10.0);
  const [installments, setInstallments] = useState<number>(3);
  const [cpfCnpj, setCpfCnpj] = useState<string>('');
  
  // Resposta da Cobrança Real Gerada
  const [createdCharge, setCreatedCharge] = useState<any>(null);
  const [apiLogs, setApiLogs] = useState<any>(null);

  // Buscar logs recentes do webhook gravados no Firestore
  const logsQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return query(
      collection(firestore, 'asaasPayments'),
      orderBy('updatedAt', 'desc'),
      limit(5)
    );
  }, [firestore, tenantId]);

  const { data: recentPayments, isLoading: loadingLogs } = useCollection<any>(logsQuery);

  // Carregar dados (membros e configs)
  useEffect(() => {
    const init = async () => {
      if (!firestore) return;
      try {
        const configRes = await fetch('/api/finance/status').then(r => r.json()).catch(() => null);
        if (configRes) {
          setDueDays(configRes.dueDays || 3);
          setAsaasBaseUrl(configRes.asaasBaseUrl || 'https://api.asaas.com/v3');
          setAsaasWebhookToken(configRes.asaasWebhookToken || 'ibm_webhook_secret_2025');
          setIsKeyConfigured(configRes.asaasApiKeyConfigured);
          if (configRes.asaasApiKeyConfigured) {
            setAsaasApiKey('••••••••••••••••••••••••••••••••');
          }
        }

        const usersSnap = await getDocs(collection(firestore, 'users'));
        const usersList = usersSnap.docs.map(d => ({
          id: d.id,
          name: d.data().name || 'Sem Nome',
          email: d.data().email || '',
          phone: d.data().phone || '',
          ...d.data(),
        }));
        setMembers(usersList);
      } catch (err) {
        console.error('Erro ao inicializar configurações financeiras:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [firestore]);

  // Preencher CPF se o membro selecionado já possuir no cadastro
  useEffect(() => {
    if (selectedMemberId) {
      const member = members.find(m => m.id === selectedMemberId);
      if (member?.cpfCnpj) {
        setCpfCnpj(member.cpfCnpj);
      } else {
        setCpfCnpj('');
      }
      setCreatedCharge(null);
      setApiLogs(null);
    }
  }, [selectedMemberId, members]);

  // Salvar configs financeiras
  const handleSaveConfigs = async () => {
    if (!firestore) return;
    setSaving(true);
    try {
      const configRef = doc(firestore, 'system_settings', 'finance');
      const payload: any = {
        dueDays,
        asaasWebhookToken,
        asaasBaseUrl
      };
      
      // Salva a chave se o usuário digitou algo e não é a máscara de bolinhas
      if (asaasApiKey && !asaasApiKey.includes('•') && !asaasApiKey.includes('...')) {
        payload.asaasApiKey = asaasApiKey;
      }

      await setDoc(configRef, payload, { merge: true });
      
      toast({
        title: "Configurações Salvas",
        description: "Credenciais e parâmetros atualizados com sucesso.",
      });

      // Recarrega status atualizado
      const configRes = await fetch('/api/finance/status').then(r => r.json()).catch(() => null);
      if (configRes) {
        setIsKeyConfigured(configRes.asaasApiKeyConfigured);
        if (configRes.asaasApiKeyConfigured) {
          // Se configurada, não exibe mais a chave real no input por segurança
          setAsaasApiKey('••••••••••••••••••••••••••••••••');
        }
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: err.message || "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Gerar cobrança real no Asaas
  const handleCreateRealCharge = async () => {
    if (!selectedMemberId) {
      toast({ variant: "destructive", title: "Membro Obrigatório", description: "Selecione um membro." });
      return;
    }
    if (!cpfCnpj) {
      toast({ variant: "destructive", title: "CPF/CNPJ Obrigatório", description: "Informe o CPF/CNPJ para registrar no Asaas." });
      return;
    }

    setTesting(true);
    setCreatedCharge(null);
    setApiLogs(null);

    const member = members.find(m => m.id === selectedMemberId);

    try {
      const customerRes = await fetch('/api/asaas/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: member.name,
          email: member.email || 'financeiro@ibmanha.com.br',
          phone: member.phone || '',
          cpfCnpj: cpfCnpj.replace(/\D/g, ''),
          userId: selectedMemberId,
          tenantId
        })
      });

      const customerData = await customerRes.json();
      if (!customerRes.ok) throw new Error(customerData.error || 'Erro ao criar cliente');

      const customerId = customerData.customerId;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueDays);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      // Se for formato assinatura, chama o endpoint de subscriptions
      const isSubscription = chargeType === 'SUBSCRIPTION';
      const endpoint = isSubscription ? '/api/asaas/subscriptions' : '/api/asaas/payments';

      const paymentRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          billingType,
          value: amount,
          dueDate: dueDateStr,
          description: `${isSubscription ? 'Assinatura' : 'Cobrança'} de Teste Oiko — ${member.name}`,
          externalReference: selectedMemberId,
          tenantId,
          ...(!isSubscription && chargeType === 'INSTALLMENT' && { installmentCount: installments })
        })
      });

      const paymentData = await paymentRes.json();
      setApiLogs({
        request: { customerId, billingType, value: amount, dueDate: dueDateStr, chargeType },
        response: paymentData
      });

      if (!paymentRes.ok) throw new Error(paymentData.error || 'Erro ao criar cobrança/assinatura');

      setCreatedCharge(paymentData);
      toast({
        title: isSubscription ? "Assinatura Criada no Asaas!" : "Cobrança Criada no Asaas!",
        description: "A API retornou os dados de faturamento com sucesso.",
      });

    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar cobrança",
        description: err.message,
      });
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copiado!", description: "Código copiado." });
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configurações de Integração do Asaas (Salvo no Firestore) */}
      <Card className="bg-white border-slate-100 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Key className="size-5 text-primary" />
            <div>
              <CardTitle className="text-slate-800 font-bold">Credenciais do Asaas</CardTitle>
              <CardDescription>Gerencie a chave de API de produção e tokens diretamente no banco de dados.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Chave de API */}
            <div className="space-y-1.5">
              <Label htmlFor="apiKey" className="text-xs font-bold text-slate-600">
                Chave de API do Asaas (Produção ou Sandbox)
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={isKeyConfigured ? "Chave de API já configurada (digite para alterar)" : "Insira a chave de API do Asaas ($aact_...)"}
                value={asaasApiKey}
                onChange={(e) => setAsaasApiKey(e.target.value)}
                className="bg-slate-50 border-slate-200"
              />
            </div>

            {/* Token do Webhook */}
            <div className="space-y-1.5">
              <Label htmlFor="webhookToken" className="text-xs font-bold text-slate-600">
                Token do Webhook (Para validação do retorno)
              </Label>
              <Input
                id="webhookToken"
                placeholder="ibm_webhook_secret_2025"
                value={asaasWebhookToken}
                onChange={(e) => setAsaasWebhookToken(e.target.value)}
                className="bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* URL Base do Asaas */}
            <div className="space-y-1.5">
              <Label htmlFor="baseUrl" className="text-xs font-bold text-slate-600">
                Ambiente / URL Base da API
              </Label>
              <Select value={asaasBaseUrl} onValueChange={setAsaasBaseUrl}>
                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="https://api.asaas.com/v3">Produção (api.asaas.com)</SelectItem>
                  <SelectItem value="https://api-sandbox.asaas.com/v3">Sandbox (api-sandbox.asaas.com)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dias de vencimento */}
            <div className="space-y-1.5">
              <Label htmlFor="dueDays" className="text-xs font-bold text-slate-600">
                Dias úteis padrão para vencimento das cobranças
              </Label>
              <Input
                id="dueDays"
                type="number"
                min={1}
                max={30}
                value={dueDays}
                onChange={(e) => setDueDays(parseInt(e.target.value) || 3)}
                className="bg-slate-50 border-slate-200 text-sm font-bold"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button 
              onClick={handleSaveConfigs} 
              disabled={saving}
              className="bg-primary text-white font-bold"
            >
              {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Simulador e Visualizador de Webhook */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Formulário de Criação Real */}
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="size-5 text-indigo-500" />
              <div>
                <CardTitle className="text-slate-800 font-bold">Gerador de Cobrança Real (Teste)</CardTitle>
                <CardDescription>Cria e registra transações reais diretamente na API do Asaas.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600">Selecionar Membro</Label>
              <PersonSearchInput
                value={selectedMemberId}
                onChange={setSelectedMemberId}
                users={members}
                placeholder="Buscar membro..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600">CPF ou CNPJ do Pagador (Obrigatório para API)</Label>
              <Input
                placeholder="000.000.000-00"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                className="bg-slate-50 border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Formato</Label>
                <Select value={chargeType} onValueChange={(val: any) => setChargeType(val)}>
                  <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNIQUE">Cobrança Única</SelectItem>
                    <SelectItem value="INSTALLMENT">Parcelado</SelectItem>
                    <SelectItem value="SUBSCRIPTION">Assinatura Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Método Asaas</Label>
                <Select value={billingType} onValueChange={(val: any) => setBillingType(val)}>
                  <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">Pix</SelectItem>
                    <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                    <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                    <SelectItem value="UNDEFINED">Indefinido (Escolha do pagador)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="bg-slate-50 border-slate-200"
                />
              </div>

              {chargeType === 'INSTALLMENT' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Qtd. Parcelas</Label>
                  <Input
                    type="number"
                    min={2}
                    max={12}
                    value={installments}
                    onChange={(e) => setInstallments(parseInt(e.target.value) || 3)}
                    className="bg-slate-50 border-slate-200"
                  />
                </div>
              )}
            </div>

            <Button
              onClick={handleCreateRealCharge}
              disabled={testing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {testing ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Play className="size-4 mr-2" />
              )}
              Gerar Cobrança Real no Asaas
            </Button>
          </CardContent>
        </Card>

        {/* Visualizador de Retornos e Logs do Asaas */}
        <Card className="bg-white border-slate-100 shadow-sm flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Terminal className="size-5 text-slate-700" />
              <div>
                <CardTitle className="text-slate-800 font-bold">Retorno da API Asaas</CardTitle>
                <CardDescription>Links, QR Code PIX e logs técnicos da transação gerada.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            
            {createdCharge ? (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Resultado do Faturamento:</span>
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                    Status: {createdCharge.status}
                  </span>
                </div>

                {createdCharge.pixQrCode && (
                  <div className="flex flex-col items-center gap-3 bg-white p-4 rounded border border-slate-200/60">
                    <img 
                      src={`data:image/png;base64,${createdCharge.pixQrCode.encodedImage}`} 
                      alt="QR Code Pix"
                      className="size-36 border border-slate-100 shadow-sm rounded"
                    />
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => copyToClipboard(createdCharge.pixQrCode.payload)}
                      className="w-full text-xs font-bold border-slate-200 hover:bg-slate-50"
                    >
                      {copied ? <Check className="size-3.5 mr-1.5 text-emerald-600" /> : <Copy className="size-3.5 mr-1.5" />}
                      Copiar Código Copia e Cola Pix
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {createdCharge.invoiceUrl && (
                    <a href={createdCharge.invoiceUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                        Fatura Asaas <ExternalLink className="size-3.5 ml-1.5" />
                      </Button>
                    </a>
                  )}
                  {createdCharge.bankSlipUrl && (
                    <a href={createdCharge.bankSlipUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="border-slate-200 text-slate-700 font-bold hover:bg-slate-100">
                        Boleto PDF <ExternalLink className="size-3.5 ml-1.5" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-slate-950 text-slate-200 p-4 rounded-lg font-mono text-xs overflow-auto max-h-[300px] min-h-[180px]">
                {apiLogs ? (
                  <div className="space-y-2">
                    <p className="text-blue-400 font-bold">// Logs do Payload enviado:</p>
                    <pre className="text-slate-300 whitespace-pre-wrap">{JSON.stringify(apiLogs.request, null, 2)}</pre>
                    <p className="text-pink-400 font-bold mt-3">// Resposta completa do Asaas:</p>
                    <pre className="text-slate-300 whitespace-pre-wrap">{JSON.stringify(apiLogs.response, null, 2)}</pre>
                  </div>
                ) : (
                  <div className="text-slate-500 h-full flex flex-col justify-center items-center text-center p-4">
                    <Terminal className="size-8 opacity-20 mb-2" />
                    <p>Nenhuma transação ativa gerada.</p>
                    <p className="text-[10px] opacity-70 mt-1">Preencha os dados e clique em "Gerar Cobrança Real".</p>
                  </div>
                )}
              </div>
            )}

            {/* Recentes do Firestore */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-600 block">Cobranças Registradas recentemente no Firestore</span>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] space-y-1.5">
                {loadingLogs ? (
                  <p className="text-slate-400">Carregando histórico...</p>
                ) : recentPayments && recentPayments.length > 0 ? (
                  recentPayments.map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center text-slate-600 border-b border-slate-200/60 pb-1.5 last:border-0 last:pb-0">
                      <span>{p.description ? p.description.substring(0, 30) : p.id.substring(0, 15)}...</span>
                      <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        R$ {p.value ?? p.amount} ({p.status})
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">Nenhum evento registrado ainda.</p>
                )}
              </div>
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Zap, 
  Radio, 
  Sliders, 
  Lightbulb, 
  Volume2, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Save, 
  ExternalLink,
  Layers,
  Sparkles,
  Code
} from 'lucide-react';
import { 
  DEFAULT_AV_WEBHOOK_URL, 
  getAvWebhookConfig, 
  saveAvWebhookConfig, 
  testAvWebhookConnection 
} from '@/app/dashboard/volunteering/worship/actions';

export function AvIntegrationSettings() {
  const { toast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState<string>(DEFAULT_AV_WEBHOOK_URL);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    timestamp?: string;
  } | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const conf = await getAvWebhookConfig();
        if (conf.webhookUrl) {
          setWebhookUrl(conf.webhookUrl);
        }
      } catch (err) {
        console.error('Erro ao carregar config AV:', err);
      } finally {
        setIsLoadingConfig(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await saveAvWebhookConfig(webhookUrl);
      if (res.success) {
        toast({
          title: 'Configuração salva!',
          description: 'A URL do Webhook da Central AV foi atualizada com sucesso.',
        });
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Não foi possível salvar a URL do Webhook.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = () => {
    setWebhookUrl(DEFAULT_AV_WEBHOOK_URL);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testAvWebhookConnection(webhookUrl);
      if (res.success) {
        setTestResult({
          success: true,
          message: res.message || 'Webhook respondeu com sucesso!',
          timestamp: new Date().toLocaleTimeString('pt-BR')
        });
        toast({
          title: '✅ Conexão Bem-Sucedida!',
          description: 'A Central AV recebeu e processou o teste com sucesso.',
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Falha ao comunicar com o Webhook.',
          timestamp: new Date().toLocaleTimeString('pt-BR')
        });
        toast({
          title: '❌ Falha no Teste',
          description: res.error || 'O Webhook não respondeu adequadamente.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Erro inesperado ao testar conexão.',
        timestamp: new Date().toLocaleTimeString('pt-BR')
      });
      toast({
        title: '❌ Erro de Conexão',
        description: err?.message || 'Falha ao disparar requisição HTTP.',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status da Integração */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
            <Zap className="size-6 fill-amber-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-slate-800">Central de Integração AV (Áudio &amp; Iluminação)</h3>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold gap-1 py-0.5">
                <CheckCircle2 className="size-3" /> Ativa
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Conecta a liturgia do Oiko ao <strong>Lumikit SHOW</strong> (Luz DMX) e à mesa <strong>Behringer X32</strong> (Som).
            </p>
          </div>
        </div>

        <Button
          onClick={handleTestConnection}
          disabled={isTesting || isLoadingConfig}
          variant="outline"
          size="sm"
          className="font-bold text-xs gap-1.5 border-amber-300 bg-white text-amber-900 hover:bg-amber-50 shrink-0"
        >
          {isTesting ? <Loader2 className="size-3.5 animate-spin text-amber-600" /> : <RefreshCw className="size-3.5 text-amber-600" />}
          {isTesting ? 'Testando...' : 'Testar Conexão'}
        </Button>
      </div>

      {/* Resultado do Teste se houver */}
      {testResult && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
          testResult.success 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {testResult.success ? (
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="size-4 text-rose-600 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
          {testResult.timestamp && (
            <span className="text-[10px] opacity-75 font-mono">Testado às {testResult.timestamp}</span>
          )}
        </div>
      )}

      {/* Configuração do Endpoint */}
      <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="space-y-1">
          <Label className="text-xs font-bold text-slate-700">URL do Webhook HTTP POST (Central AV)</Label>
          <p className="text-[11px] text-muted-foreground">
            Endpoint onde a liturgia do culto, BPMs das músicas e cenas DMX são transmitidos em tempo real.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://..."
            disabled={isLoadingConfig}
            className="font-mono text-xs h-9 bg-slate-50/50"
          />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={handleSave}
              disabled={isSaving || isLoadingConfig}
              size="sm"
              className="h-9 font-bold text-xs gap-1.5 bg-slate-900 hover:bg-slate-800 text-white shrink-0 w-full sm:w-auto"
            >
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Salvar URL
            </Button>
            {webhookUrl !== DEFAULT_AV_WEBHOOK_URL && (
              <Button
                onClick={handleResetDefault}
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-muted-foreground hover:text-slate-900 shrink-0"
                title="Restaurar URL padrão"
              >
                Padrão
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Os 3 Pilares da Integração */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/30 space-y-1.5">
          <div className="flex items-center gap-2 text-purple-700 font-bold text-xs">
            <Lightbulb className="size-4" />
            <span>Sincronização de BPM</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            O Integrador lê o BPM e Tom de cada música da liturgia e sincroniza o tempo dos Moving Heads e efeitos do <strong>Lumikit SHOW</strong>.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/30 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
            <Zap className="size-4" />
            <span>Troca de Cenas (DMX)</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Aciona automaticamente as cenas de luz (ex: <code>S1</code>, <code>G1</code>, <code>A1</code>, <code>F12</code>) configuradas em cada momento do culto.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/30 space-y-1.5">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xs">
            <Volume2 className="size-4" />
            <span>Mute / Unmute na Mesa</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Comunica à mesa <strong>Behringer X32</strong> as transições entre Palavra, Louvor e Avisos para controle de canais e microfones.
          </p>
        </div>
      </div>

      {/* Prévia do Contrato de Payload */}
      <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <Code className="size-3.5 text-amber-400" /> Formato do Payload JSON (Oiko ➔ Central AV)
          </span>
          <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400 bg-slate-800 font-mono">
            POST application/json
          </Badge>
        </div>
        <pre className="text-[10px] font-mono leading-tight bg-slate-950 p-3 rounded-lg overflow-x-auto text-slate-300 border border-slate-800">
{`{
  "id": "culto_2026_08_16_noite",
  "planoTitulo": "Culto de Celebração — Domingo Noite",
  "data": "16/08/2026",
  "startTime": "19:00",
  "items": [
    {
      "id": "item_1",
      "title": "Boas-Vindas & Oração Inicial",
      "type": "item",
      "durationSeconds": 300,
      "notes": "Abertura do culto / Recepção",
      "scene": "S1"
    },
    {
      "id": "item_2",
      "title": "Grande é o Senhor",
      "type": "song",
      "bpm": 120,
      "key": "G",
      "durationSeconds": 360,
      "artist": "Adhemar de Campos",
      "scene": "G1"
    }
  ]
}`}
        </pre>
      </div>
    </div>
  );
}

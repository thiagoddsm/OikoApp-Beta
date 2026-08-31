'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { doc, setDoc, collection, query, orderBy, Timestamp, addDoc, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  BookOpen,
  Code,
  Eye,
  Copy,
  ExternalLink,
  Share2,
  Save,
  RotateCcw,
  Smartphone,
  Tablet,
  Monitor,
  CheckCircle2,
  Loader2,
  History,
  Sparkles,
  CalendarDays,
  Pencil,
  Upload,
  Mic,
  MicOff,
  Music,
  Bell,
  Users,
  FileAudio,
  Trash2,
  Wand2
} from 'lucide-react';
import { DEFAULT_GC_ROTEIRO_HTML, DEFAULT_GC_ROTEIRO_TITLE } from '@/lib/constants/default-gc-roteiro';
import { generateGcRoteiroAction } from './actions';

export default function GcRoteiroAdminPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Documento ativo singleton
  const { data: activeRoteiro, isLoading: isLoadingActive } = useDoc<any>('gc_roteiros/active');

  // Histórico de roteiros
  const historyQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'gc_roteiros_historico'), orderBy('createdAt', 'desc'), limit(20)) : null),
    [firestore]
  );
  const { data: historyList, isLoading: isLoadingHistory } = useCollection<any>(historyQuery);

  // Estados do formulário principal
  const [title, setTitle] = useState('');
  const [referenceDate, setReferenceDate] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [activeTab, setActiveTab] = useState<'preview' | 'editor' | 'history'>('preview');
  const [isVisualEditing, setIsVisualEditing] = useState(true);
  const [hasUnsavedVisualEdits, setHasUnsavedVisualEdits] = useState(false);

  // Estados do Modal da IA (Gemini)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiSourceMode, setAiSourceMode] = useState<'audio' | 'text'>('audio');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBase64, setAudioBase64] = useState<string>('');
  const [audioMimeType, setAudioMimeType] = useState<string>('');
  const [textOutline, setTextOutline] = useState('');
  const [pastoralMessage, setPastoralMessage] = useState('');
  const [louvores, setLouvores] = useState('Em Teus Braços - Laura Souguellis / Cristo, Nossa Certeza - Soberana Graça');
  const [avisos, setAvisos] = useState('Início do IBM College nesta quinta-feira / Conferência Missão de Casa com Pr. Alvin e Pr. Rafael Abdalla');
  const [perfilGc, setPerfilGc] = useState('Geral');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiStepStatus, setAiStepStatus] = useState('');

  // Gravação de microfone
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Armazena temporariamente a última versão digitada no iframe
  const latestVisualHtmlRef = useRef<string>('');

  // Inicializa com dados do Firestore ou template padrão
  useEffect(() => {
    if (activeRoteiro) {
      setTitle(activeRoteiro.title || DEFAULT_GC_ROTEIRO_TITLE);
      setReferenceDate(activeRoteiro.date || new Date().toISOString().split('T')[0]);
      setHtmlContent(activeRoteiro.htmlContent || DEFAULT_GC_ROTEIRO_HTML);
      latestVisualHtmlRef.current = activeRoteiro.htmlContent || DEFAULT_GC_ROTEIRO_HTML;
    } else if (!isLoadingActive) {
      setTitle(DEFAULT_GC_ROTEIRO_TITLE);
      setReferenceDate(new Date().toISOString().split('T')[0]);
      setHtmlContent(DEFAULT_GC_ROTEIRO_HTML);
      latestVisualHtmlRef.current = DEFAULT_GC_ROTEIRO_HTML;
    }
  }, [activeRoteiro, isLoadingActive]);

  // Listener para capturar o conteúdo digitado no iframe sem re-renderizar o srcDoc
  useEffect(() => {
    const handleVisualEditMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OIKO_ROTEIRO_VISUAL_EDIT' && typeof event.data.html === 'string') {
        latestVisualHtmlRef.current = event.data.html;
        setHasUnsavedVisualEdits(true);
      }
    };

    window.addEventListener('message', handleVisualEditMessage);
    return () => window.removeEventListener('message', handleVisualEditMessage);
  }, []);

  // Extrai o HTML limpo do iframe
  const extractCleanHtmlFromIframe = useCallback((): string => {
    if (iframeRef.current?.contentDocument) {
      try {
        const doc = iframeRef.current.contentDocument;
        const clone = doc.documentElement.cloneNode(true) as HTMLElement;

        const styleEl = clone.querySelector('#oiko-visual-editor-style');
        if (styleEl) styleEl.remove();

        const scriptEl = clone.querySelector('#oiko-visual-editor-script');
        if (scriptEl) scriptEl.remove();

        const bodyEl = clone.querySelector('body');
        if (bodyEl) {
          bodyEl.removeAttribute('contenteditable');
          bodyEl.removeAttribute('spellcheck');
        }

        return '<!DOCTYPE html>\n' + clone.outerHTML;
      } catch (e) {
        console.error('Erro ao ler DOM do iframe:', e);
      }
    }
    return latestVisualHtmlRef.current || htmlContent;
  }, [htmlContent]);

  const handleApplyVisualEdits = useCallback(() => {
    const currentHtml = extractCleanHtmlFromIframe();
    setHtmlContent(currentHtml);
    latestVisualHtmlRef.current = currentHtml;
    setHasUnsavedVisualEdits(false);
    toast({
      title: '✅ Alterações Visuais Salvas!',
      description: 'O código HTML foi sincronizado com o que você digitou na tela.',
    });
  }, [extractCleanHtmlFromIframe, toast]);

  const handleTabChange = (val: 'preview' | 'editor' | 'history') => {
    if (activeTab === 'preview' && hasUnsavedVisualEdits) {
      const currentHtml = extractCleanHtmlFromIframe();
      setHtmlContent(currentHtml);
      latestVisualHtmlRef.current = currentHtml;
      setHasUnsavedVisualEdits(false);
    }
    setActiveTab(val);
  };

  // Upload de arquivo de áudio
  const handleAudioFileUpload = (file: File) => {
    setAudioFile(file);
    setAudioMimeType(file.type || 'audio/mpeg');

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      setAudioBase64(base64Data);
    };
    reader.readAsDataURL(file);
  };

  // Gravação de microfone
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `gravacao-mensagem-${Date.now()}.webm`, { type: 'audio/webm' });
        handleAudioFileUpload(file);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      toast({
        variant: 'destructive',
        title: 'Microfone não autorizado',
        description: 'Permita o acesso ao microfone no navegador para gravar o áudio.',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Gerar Roteiro com IA Gemini
  const handleGenerateWithAi = async () => {
    if (aiSourceMode === 'audio' && !audioBase64) {
      toast({
        variant: 'destructive',
        title: 'Áudio não encontrado',
        description: 'Faça upload de um arquivo de áudio ou grave uma mensagem pelo microfone.',
      });
      return;
    }

    if (aiSourceMode === 'text' && !textOutline.trim()) {
      toast({
        variant: 'destructive',
        title: 'Esboço vazio',
        description: 'Cole o resumo, esboço ou notas da pregação para a IA analisar.',
      });
      return;
    }

    setIsGeneratingAi(true);
    setAiStepStatus(aiSourceMode === 'audio' ? '1. Enviando e transcrevendo áudio com Gemini 2.5 Flash...' : '1. Analisando estrutura bíblica e esboço...');

    try {
      const stepTimer1 = setTimeout(() => {
        setAiStepStatus('2. Identificando passagens bíblicas, verdades centrais e ilustrações...');
      }, 3500);

      const stepTimer2 = setTimeout(() => {
        setAiStepStatus('3. Elaborando blocos de conversa, perguntas reflexivas e dinâmicas...');
      }, 8500);

      const stepTimer3 = setTimeout(() => {
        setAiStepStatus('4. Formatando HTML com Material de Apoio ao Líder e design responsivo...');
      }, 14000);

      const result = await generateGcRoteiroAction({
        audioBase64: aiSourceMode === 'audio' ? audioBase64 : undefined,
        audioMimeType: aiSourceMode === 'audio' ? audioMimeType : undefined,
        textOutline: aiSourceMode === 'text' ? textOutline : undefined,
        pastoralMessage: pastoralMessage.trim() || undefined,
        louvores: louvores.trim() || undefined,
        avisos: avisos.trim() || undefined,
        perfilGc: perfilGc || 'Geral',
        date: referenceDate || new Date().toISOString().split('T')[0],
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      if (result.success && result.htmlContent) {
        setTitle(result.title);
        setReferenceDate(result.date || referenceDate);
        setHtmlContent(result.htmlContent);
        latestVisualHtmlRef.current = result.htmlContent;
        setHasUnsavedVisualEdits(false);
        setActiveTab('preview');
        setIsAiModalOpen(false);

        toast({
          title: '✨ Roteiro Gerado com Sucesso!',
          description: `"${result.title}" foi criado pelo Gemini e está pronto na sua prévia!`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro na geração',
          description: result.error || 'Não foi possível gerar o roteiro. Tente novamente.',
        });
      }
    } catch (err: any) {
      console.error('Erro ao gerar com IA:', err);
      toast({
        variant: 'destructive',
        title: 'Falha na comunicação com a IA',
        description: err.message || 'Ocorreu um erro ao processar o áudio.',
      });
    } finally {
      setIsGeneratingAi(false);
      setAiStepStatus('');
    }
  };

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/public/roteiro-de-gc`
    : 'https://oiko.app/public/roteiro-de-gc';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast({
        title: 'Link Copiado! 📋',
        description: 'O link público do roteiro foi copiado para a área de transferência.',
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro ao copiar',
        description: 'Copie manualmente o link da barra de navegação.',
      });
    }
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(
      `📖 *Roteiro de GC Semanal — ${title}*\n\nOlá líder! Segue o roteiro e material de apoio para a reunião do seu GC desta semana:\n👉 ${publicUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  const handleResetToDefault = () => {
    if (window.confirm('Deseja restaurar o modelo padrão do Roteiro de GC? O conteúdo atual no editor será substituído.')) {
      setTitle(DEFAULT_GC_ROTEIRO_TITLE);
      setHtmlContent(DEFAULT_GC_ROTEIRO_HTML);
      latestVisualHtmlRef.current = DEFAULT_GC_ROTEIRO_HTML;
      setHasUnsavedVisualEdits(false);
      toast({
        title: 'Modelo Padrão Carregado',
        description: 'O template base com visual moderno e acordeão foi carregado no editor.',
      });
    }
  };

  const handleSaveAndPublish = async () => {
    if (!firestore) return;

    const finalHtml = hasUnsavedVisualEdits ? extractCleanHtmlFromIframe() : htmlContent;

    if (!finalHtml.trim()) {
      toast({
        variant: 'destructive',
        title: 'Conteúdo vazio',
        description: 'Insira o código HTML do roteiro antes de publicar.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const now = Timestamp.now();
      const payload = {
        title: title.trim() || 'Roteiro de GC Semanal',
        date: referenceDate || new Date().toISOString().split('T')[0],
        htmlContent: finalHtml.trim(),
        isActive: true,
        updatedAt: now,
        updatedBy: user?.displayName || user?.email || 'Administrador',
      };

      await setDoc(doc(firestore, 'gc_roteiros', 'active'), payload);

      await addDoc(collection(firestore, 'gc_roteiros_historico'), {
        ...payload,
        createdAt: now,
      });

      setHtmlContent(finalHtml.trim());
      latestVisualHtmlRef.current = finalHtml.trim();
      setHasUnsavedVisualEdits(false);

      toast({
        title: '🎉 Roteiro Publicado com Sucesso!',
        description: 'A página pública já está atualizada com a nova versão.',
      });
    } catch (err: any) {
      console.error('Erro ao salvar roteiro:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao publicar',
        description: err.message || 'Ocorreu um erro ao salvar no banco de dados.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreFromHistory = (item: any) => {
    if (window.confirm(`Deseja carregar a versão "${item.title}" de ${new Date(item.createdAt?.toDate?.() || item.date).toLocaleDateString('pt-BR')} no editor?`)) {
      setTitle(item.title || '');
      setReferenceDate(item.date || '');
      setHtmlContent(item.htmlContent || '');
      latestVisualHtmlRef.current = item.htmlContent || '';
      setHasUnsavedVisualEdits(false);
      setActiveTab('preview');
      toast({
        title: 'Versão Carregada no Editor',
        description: 'Clique em "Salvar e Publicar" para torná-la a versão pública atual.',
      });
    }
  };

  const previewHtml = useMemo(() => {
    if (!htmlContent) return '<p class="p-8 text-center text-gray-500">Nenhum conteúdo inserido.</p>';
    if (!isVisualEditing) return htmlContent;

    const editorInjection = `
      <style id="oiko-visual-editor-style">
        body[contenteditable="true"] {
          outline: none !important;
        }
        body[contenteditable="true"] *:hover {
          outline: 1.5px dashed rgba(217, 119, 6, 0.4) !important;
          outline-offset: 2px;
          cursor: text;
        }
        body[contenteditable="true"] *:focus {
          outline: 2px solid #d97706 !important;
          outline-offset: 2px;
          background-color: rgba(254, 243, 199, 0.2) !important;
        }
      </style>
      <script id="oiko-visual-editor-script">
        (function() {
          function enableEditing() {
            if (document.body) {
              document.body.setAttribute('contenteditable', 'true');
              document.body.setAttribute('spellcheck', 'false');
            }
          }
          
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', enableEditing);
          } else {
            enableEditing();
          }

          var debounceTimer = null;
          document.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
              try {
                var clone = document.documentElement.cloneNode(true);
                
                var styleEl = clone.querySelector('#oiko-visual-editor-style');
                if (styleEl) styleEl.remove();
                
                var scriptEl = clone.querySelector('#oiko-visual-editor-script');
                if (scriptEl) scriptEl.remove();

                var bodyEl = clone.querySelector('body');
                if (bodyEl) {
                  bodyEl.removeAttribute('contenteditable');
                  bodyEl.removeAttribute('spellcheck');
                }

                var cleanHtml = '<!DOCTYPE html>\\n' + clone.outerHTML;
                window.parent.postMessage({ type: 'OIKO_ROTEIRO_VISUAL_EDIT', html: cleanHtml }, '*');
              } catch(e) {
                console.error('[Visual Edit] Erro ao sincronizar:', e);
              }
            }, 100);
          });
        })();
      </script>
    `;

    if (htmlContent.includes('</body>')) {
      return htmlContent.replace('</body>', `${editorInjection}</body>`);
    }
    return htmlContent + editorInjection;
  }, [htmlContent, isVisualEditing]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
              <BookOpen className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Roteiro Semanal de GC</h1>
            <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Página Pública Ativa
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gere com IA Gemini a partir do áudio da pregação ou edite visualmente na tela para compartilhar com os líderes.
          </p>
        </div>

        {/* AÇÕES DE DESTAQUE */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* BOTÃO GERAR COM IA GEMINI */}
          <Button
            onClick={() => setIsAiModalOpen(true)}
            className="gap-2 font-bold bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-md text-xs sm:text-sm"
          >
            <Sparkles className="h-4 w-4 animate-pulse" />
            Gerar com IA (Gemini)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="gap-1.5 text-xs font-bold bg-background shadow-sm"
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copiado!' : 'Copiar Link'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleShareWhatsApp}
            className="gap-1.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 shadow-sm"
          >
            <Share2 className="h-3.5 w-3.5" />
            WhatsApp
          </Button>

          <Button
            size="sm"
            asChild
            className="gap-1.5 text-xs font-bold shadow-sm"
          >
            <a href="/public/roteiro-de-gc" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir Pública
            </a>
          </Button>
        </div>
      </div>

      {/* METADADOS RÁPIDOS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="roteiroTitle" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Título do Estudo / Série
          </Label>
          <Input
            id="roteiroTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Além do Raso: Raízes e Maturidade na Fé"
            className="font-bold text-foreground"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="roteiroDate" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Data / Semana de Referência
          </Label>
          <Input
            id="roteiroDate"
            type="date"
            value={referenceDate}
            onChange={(e) => setReferenceDate(e.target.value)}
            className="font-semibold"
          />
        </div>
      </div>

      {/* TABS: PREVIEW / EDITOR HTML / HISTÓRICO */}
      <Tabs value={activeTab} onValueChange={(val: any) => handleTabChange(val)} className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b pb-3">
          <TabsList className="grid grid-cols-3 w-full sm:w-auto min-w-[340px]">
            <TabsTrigger value="preview" className="gap-1.5 text-xs font-bold">
              <Eye className="h-3.5 w-3.5" /> Prévia Visual & Edição
            </TabsTrigger>
            <TabsTrigger value="editor" className="gap-1.5 text-xs font-bold">
              <Code className="h-3.5 w-3.5" /> Código HTML
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs font-bold">
              <History className="h-3.5 w-3.5" /> Histórico ({historyList?.length || 0})
            </TabsTrigger>
          </TabsList>

          {activeTab === 'preview' && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* TOGGLE DE EDIÇÃO VISUAL */}
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-3 py-1.5 rounded-xl shadow-sm">
                <Switch
                  id="visual-edit-mode"
                  checked={isVisualEditing}
                  onCheckedChange={setIsVisualEditing}
                  className="data-[state=checked]:bg-amber-600"
                />
                <Label htmlFor="visual-edit-mode" className="text-xs font-bold text-amber-900 dark:text-amber-300 cursor-pointer flex items-center gap-1">
                  <Pencil className="h-3 w-3" />
                  Edição Visual
                </Label>
              </div>

              {/* BOTÃO SALVAR EDIÇÃO VISUAL */}
              {hasUnsavedVisualEdits && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleApplyVisualEdits}
                  className="gap-1.5 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-400 animate-pulse shadow-sm"
                  title="Salva as alterações de texto digitadas na tela"
                >
                  <Save className="h-3.5 w-3.5 text-amber-700" />
                  Salvar Edição na Tela
                </Button>
              )}

              {/* DISPOSITIVO */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border">
                <Button
                  size="sm"
                  variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
                  onClick={() => setPreviewDevice('mobile')}
                  className="h-7 text-xs font-bold gap-1 px-2.5"
                >
                  <Smartphone className="h-3.5 w-3.5" /> Mobile
                </Button>
                <Button
                  size="sm"
                  variant={previewDevice === 'tablet' ? 'default' : 'ghost'}
                  onClick={() => setPreviewDevice('tablet')}
                  className="h-7 text-xs font-bold gap-1 px-2.5"
                >
                  <Tablet className="h-3.5 w-3.5" /> Tablet
                </Button>
                <Button
                  size="sm"
                  variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
                  onClick={() => setPreviewDevice('desktop')}
                  className="h-7 text-xs font-bold gap-1 px-2.5"
                >
                  <Monitor className="h-3.5 w-3.5" /> Desktop
                </Button>
              </div>

              <Button
                size="sm"
                onClick={handleSaveAndPublish}
                disabled={isSaving}
                className="gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar e Publicar
              </Button>
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToDefault}
                className="gap-1.5 text-xs font-semibold text-muted-foreground"
                title="Restaura o modelo inicial com design moderno"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Modelo Padrão
              </Button>

              <Button
                size="sm"
                onClick={handleSaveAndPublish}
                disabled={isSaving}
                className="gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar e Publicar
              </Button>
            </div>
          )}
        </div>

        {/* ── ABA 1: PRÉ-VISUALIZAÇÃO AO VIVO COM EDIÇÃO DIRETA ────────── */}
        <TabsContent value="preview" className="space-y-3 focus-visible:outline-none">
          {isVisualEditing && (
            <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/60 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Edição na Tela:</strong> Clique em qualquer texto para digitar livremente sem interrupções. Quando terminar de editar, clique no botão <strong>"Salvar e Publicar"</strong> ou <strong>"Salvar Edição na Tela"</strong>.
                </span>
              </span>
              {hasUnsavedVisualEdits ? (
                <Badge className="bg-amber-600 text-white font-bold shrink-0 self-start sm:self-auto">
                  ● Alterações não salvas
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-white/80 dark:bg-stone-900/80 text-emerald-700 border-emerald-300 font-bold shrink-0 self-start sm:self-auto">
                  ✓ Tudo sincronizado
                </Badge>
              )}
            </div>
          )}

          <div className="flex justify-center bg-stone-100 dark:bg-stone-950/60 p-4 sm:p-8 rounded-2xl border min-h-[650px]">
            <div
              className={`transition-all duration-300 bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-300 flex flex-col ${
                previewDevice === 'mobile'
                  ? 'w-[390px] h-[780px]'
                  : previewDevice === 'tablet'
                  ? 'w-[768px] h-[850px]'
                  : 'w-full h-[850px]'
              }`}
            >
              {/* Barra do mock de navegador */}
              <div className="bg-stone-200 dark:bg-stone-800 px-4 py-2 flex items-center gap-2 border-b text-xs text-stone-600 dark:text-stone-300 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-400 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-stone-400 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-stone-400 inline-block" />
                <span className="ml-2 bg-white/80 dark:bg-stone-900/80 px-3 py-0.5 rounded-md flex-1 truncate text-center">
                  {publicUrl}
                </span>
              </div>

              {/* Iframe com preview */}
              <iframe
                ref={iframeRef}
                srcDoc={previewHtml}
                title="Prévia do Roteiro de GC"
                className="w-full flex-1 border-0"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>
          </div>
        </TabsContent>

        {/* ── ABA 2: EDITOR HTML ────────────────────────────────────────── */}
        <TabsContent value="editor" className="space-y-3 focus-visible:outline-none">
          <div className="relative border rounded-2xl overflow-hidden bg-slate-950 text-slate-100 shadow-inner">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span className="ml-2 font-bold text-slate-300">index.html</span>
              </span>
              <span>{htmlContent.length} caracteres</span>
            </div>

            <textarea
              value={htmlContent}
              onChange={(e) => {
                setHtmlContent(e.target.value);
                latestVisualHtmlRef.current = e.target.value;
              }}
              rows={24}
              placeholder="Cole o código HTML completo aqui..."
              className="w-full bg-transparent p-4 font-mono text-xs text-slate-200 resize-y focus:outline-none leading-relaxed selection:bg-amber-600 selection:text-white"
              spellCheck={false}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <p>💡 Dica: Você pode editar tanto visualmente na aba "Prévia Visual" quanto diretamente no código HTML aqui.</p>
            <Button
              size="sm"
              onClick={handleSaveAndPublish}
              disabled={isSaving}
              className="gap-1.5 font-bold bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar e Publicar
            </Button>
          </div>
        </TabsContent>

        {/* ── ABA 3: HISTÓRICO DE ROTEIROS ─────────────────────────────── */}
        <TabsContent value="history" className="space-y-4 focus-visible:outline-none">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : !historyList?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <History className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="font-semibold text-foreground">Nenhum histórico anterior registrado.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cada vez que você salvar e publicar uma nova versão, um registro será salvo aqui automaticamente.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {historyList.map((item: any) => {
                const createdDate = item.createdAt?.toDate
                  ? item.createdAt.toDate().toLocaleString('pt-BR')
                  : item.date || 'Data não disponível';

                return (
                  <Card key={item.id} className="border hover:border-amber-400 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base font-bold text-foreground truncate max-w-[280px]">
                            {item.title || 'Roteiro de GC'}
                          </CardTitle>
                          <CardDescription className="text-xs flex items-center gap-1.5 mt-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Ref: {item.date || '—'} &middot; Salvo em {createdDate}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                          Por: {item.updatedBy?.split(' ')[0] || 'Admin'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex justify-end gap-2 pt-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestoreFromHistory(item)}
                        className="h-8 text-xs font-bold gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restaurar no Editor
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── MODAL: GERADOR INTELIGENTE COM GEMINI IA ───────────────────────── */}
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-black text-foreground">
                  Mestre dos Roteiros de GC (Gemini IA)
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Envie o áudio da mensagem ou esboço para gerar o estudo bíblico completo e o Material de Apoio ao Líder.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {isGeneratingAi ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin flex items-center justify-center" />
                <Sparkles className="h-6 w-6 text-amber-600 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-foreground text-sm">Gerando Roteiro com Gemini 2.5 Flash</h4>
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium animate-pulse">
                  {aiStepStatus || 'Processando mensagem pastoral...'}
                </p>
                <p className="text-[11px] text-muted-foreground pt-2 max-w-sm">
                  Isso pode levar de 15 a 45 segundos dependendo do tamanho do áudio.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* SELEÇÃO DO TIPO DE ENTRADA: ÁUDIO OU ESBOÇO */}
              <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAiSourceMode('audio')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    aiSourceMode === 'audio'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileAudio className="h-4 w-4" /> Áudio da Mensagem
                </button>

                <button
                  type="button"
                  onClick={() => setAiSourceMode('text')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    aiSourceMode === 'text'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Code className="h-4 w-4" /> Esboço / Anotações
                </button>
              </div>

              {/* OPÇÃO 1: ÁUDIO */}
              {aiSourceMode === 'audio' && (
                <div className="space-y-3">
                  {!audioFile && !isRecording ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* UPLOAD ARQUIVO */}
                      <label className="border-2 border-dashed border-amber-300 dark:border-amber-800/80 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                        <Upload className="h-7 w-7 text-amber-600 mb-2" />
                        <span className="text-xs font-bold text-foreground">Selecionar Áudio</span>
                        <span className="text-[11px] text-muted-foreground mt-0.5">MP3, M4A, WAV, AAC, OGG</span>
                        <input
                          type="file"
                          accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.mp4,.webm"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAudioFileUpload(file);
                          }}
                        />
                      </label>

                      {/* GRAVAR MICROFONE */}
                      <button
                        type="button"
                        onClick={startRecording}
                        className="border-2 border-dashed border-stone-300 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-900 rounded-xl p-5 flex flex-col items-center justify-center transition-colors text-center"
                      >
                        <Mic className="h-7 w-7 text-stone-600 dark:text-stone-400 mb-2" />
                        <span className="text-xs font-bold text-foreground">Gravar pelo Microfone</span>
                        <span className="text-[11px] text-muted-foreground mt-0.5">Gravar resumo ao vivo</span>
                      </button>
                    </div>
                  ) : isRecording ? (
                    <div className="p-5 border-2 border-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-3.5 h-3.5 rounded-full bg-rose-600 animate-ping" />
                        <div>
                          <p className="text-xs font-bold text-rose-900 dark:text-rose-200">Gravando mensagem...</p>
                          <p className="text-sm font-mono font-bold text-rose-700">{formatTimer(recordingSeconds)}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={stopRecording}
                        className="gap-1 text-xs font-bold"
                      >
                        <MicOff className="h-3.5 w-3.5" /> Parar Gravação
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 border rounded-xl bg-muted/40 flex items-center justify-between">
                      <div className="flex items-center gap-3 truncate">
                        <FileAudio className="h-6 w-6 text-amber-600 shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-bold text-foreground truncate">{audioFile?.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {(audioFile!.size / (1024 * 1024)).toFixed(2)} MB &middot; Pronto para análise
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAudioFile(null);
                          setAudioBase64('');
                          setAudioMimeType('');
                        }}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* OPÇÃO 2: TEXTO */}
              {aiSourceMode === 'text' && (
                <div className="space-y-1.5">
                  <Label htmlFor="textOutline" className="text-xs font-bold text-foreground">
                    Esboço / Anotações da Pregação
                  </Label>
                  <Textarea
                    id="textOutline"
                    value={textOutline}
                    onChange={(e) => setTextOutline(e.target.value)}
                    placeholder="Cole aqui os tópicos da mensagem, versículos citados, ilustrações ou anotações pastorais..."
                    rows={6}
                    className="text-xs leading-relaxed"
                  />
                </div>
              )}

              {/* CAMPOS ADICIONAIS / CONTEXTO DA SEMANA */}
              <div className="space-y-3 pt-2 border-t">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold flex items-center gap-1">
                      <Music className="h-3 w-3 text-amber-600" /> Louvores Sugeridos
                    </Label>
                    <Input
                      value={louvores}
                      onChange={(e) => setLouvores(e.target.value)}
                      placeholder="Ex: Em Teus Braços / Cristo, Nossa Certeza"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold flex items-center gap-1">
                      <Users className="h-3 w-3 text-amber-600" /> Perfil do GC
                    </Label>
                    <select
                      value={perfilGc}
                      onChange={(e) => setPerfilGc(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="Geral">Geral (Toda a Igreja)</option>
                      <option value="Jovens">Jovens / Universitários</option>
                      <option value="Casais">Casais e Famílias</option>
                      <option value="Visitantes Não Cristãos">Foco em Visitantes & Acolhimento</option>
                      <option value="Evangelístico">Evangelístico</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    <Bell className="h-3 w-3 text-amber-600" /> Avisos da Igreja
                  </Label>
                  <Input
                    value={avisos}
                    onChange={(e) => setAvisos(e.target.value)}
                    placeholder="Ex: Início do IBM College quinta / Conferência Missão de Casa"
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAiModalOpen(false)}
              disabled={isGeneratingAi}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleGenerateWithAi}
              disabled={isGeneratingAi || (aiSourceMode === 'audio' && !audioBase64) || (aiSourceMode === 'text' && !textOutline.trim())}
              className="gap-1.5 text-xs font-bold bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-sm"
            >
              {isGeneratingAi ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Gerando Roteiro...
                </>
              ) : (
                <>
                  <Wand2 className="h-3.5 w-3.5" />
                  Gerar Roteiro Completo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

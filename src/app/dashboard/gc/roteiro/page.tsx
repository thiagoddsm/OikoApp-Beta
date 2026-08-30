'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { doc, setDoc, collection, query, orderBy, Timestamp, addDoc, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  PenTool,
  Pencil,
  Check
} from 'lucide-react';
import { DEFAULT_GC_ROTEIRO_HTML, DEFAULT_GC_ROTEIRO_TITLE } from '@/lib/constants/default-gc-roteiro';

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

  // Estados do formulário
  const [title, setTitle] = useState('');
  const [referenceDate, setReferenceDate] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [activeTab, setActiveTab] = useState<'preview' | 'editor' | 'history'>('preview');
  const [isVisualEditing, setIsVisualEditing] = useState(true);

  // Inicializa com dados do Firestore ou template padrão
  useEffect(() => {
    if (activeRoteiro) {
      setTitle(activeRoteiro.title || DEFAULT_GC_ROTEIRO_TITLE);
      setReferenceDate(activeRoteiro.date || new Date().toISOString().split('T')[0]);
      setHtmlContent(activeRoteiro.htmlContent || DEFAULT_GC_ROTEIRO_HTML);
    } else if (!isLoadingActive) {
      setTitle(DEFAULT_GC_ROTEIRO_TITLE);
      setReferenceDate(new Date().toISOString().split('T')[0]);
      setHtmlContent(DEFAULT_GC_ROTEIRO_HTML);
    }
  }, [activeRoteiro, isLoadingActive]);

  // Listener para capturar edições visuais originadas do iframe
  useEffect(() => {
    const handleVisualEditMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OIKO_ROTEIRO_VISUAL_EDIT' && typeof event.data.html === 'string') {
        setHtmlContent(event.data.html);
      }
    };

    window.addEventListener('message', handleVisualEditMessage);
    return () => window.removeEventListener('message', handleVisualEditMessage);
  }, []);

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
      toast({
        title: 'Modelo Padrão Carregado',
        description: 'O template base com visual moderno e acordeão foi carregado no editor.',
      });
    }
  };

  const handleSaveAndPublish = async () => {
    if (!firestore) return;
    if (!htmlContent.trim()) {
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
        htmlContent: htmlContent.trim(),
        isActive: true,
        updatedAt: now,
        updatedBy: user?.displayName || user?.email || 'Administrador',
      };

      // 1. Salva documento ativo singleton
      await setDoc(doc(firestore, 'gc_roteiros', 'active'), payload);

      // 2. Registra no histórico para auditoria e recuperação
      await addDoc(collection(firestore, 'gc_roteiros_historico'), {
        ...payload,
        createdAt: now,
      });

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
      setActiveTab('preview');
      toast({
        title: 'Versão Carregada no Editor',
        description: 'Clique em "Salvar e Publicar" para torná-la a versão pública atual.',
      });
    }
  };

  // Prepara o HTML da prévia com injeção de script de edição visual caso ativado
  const previewHtml = useMemo(() => {
    if (!htmlContent) return '<p class="p-8 text-center text-gray-500">Nenhum conteúdo inserido.</p>';
    if (!isVisualEditing) return htmlContent;

    const editorInjection = `
      <style id="oiko-visual-editor-style">
        body[contenteditable="true"] {
          outline: none !important;
        }
        body[contenteditable="true"] *:hover {
          outline: 1.5px dashed rgba(217, 119, 6, 0.45) !important;
          outline-offset: 2px;
          cursor: text;
        }
        body[contenteditable="true"] *:focus {
          outline: 2px solid #d97706 !important;
          outline-offset: 2px;
          background-color: rgba(254, 243, 199, 0.25) !important;
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
            }, 250);
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
            Edite visualmente ou via HTML o estudo da semana para compartilhar com os líderes de pequenos grupos.
          </p>
        </div>

        {/* AÇÕES DE COMPARTILHAMENTO */}
        <div className="flex items-center gap-2 flex-wrap">
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

      {/* TABS: PREVIEW (PADRÃO COM EDIÇÃO DIRETA) / EDITOR HTML / HISTÓRICO */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
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
            <div className="flex items-center gap-3 flex-wrap">
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
                  Edição Visual Direta
                </Label>
              </div>

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
            <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/60 p-3 rounded-xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Modo de Edição Visual Ativo:</strong> Clique diretamente em qualquer texto, título, perguntas ou avisos na tela abaixo para alterar o conteúdo. O HTML é sincronizado em tempo real!
                </span>
              </span>
              <Badge variant="outline" className="bg-white/80 dark:bg-stone-900/80 text-amber-700 border-amber-300 font-bold shrink-0 ml-2">
                ✏️ Clique & Digite
              </Badge>
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

              {/* Iframe com preview e suporte à edição in-place */}
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
              onChange={(e) => setHtmlContent(e.target.value)}
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
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { getActiveGcRoteiro, type PublicGcRoteiroData } from './actions';
import { DEFAULT_GC_ROTEIRO_HTML, DEFAULT_GC_ROTEIRO_TITLE } from '@/lib/constants/default-gc-roteiro';
import { Share2, Copy, Printer, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PublicGcRoteiroPage() {
  const { toast } = useToast();
  const [roteiro, setRoteiro] = useState<PublicGcRoteiroData>({
    title: DEFAULT_GC_ROTEIRO_TITLE,
    date: '',
    htmlContent: DEFAULT_GC_ROTEIRO_HTML,
  });
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadActiveRoteiro() {
      try {
        const data = await getActiveGcRoteiro();
        if (data && data.htmlContent) {
          setRoteiro(data);
        }
      } catch (err) {
        console.error('Falha ao carregar roteiro:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadActiveRoteiro();
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast({
        title: 'Link Copiado! 📋',
        description: 'Compartilhe o roteiro com seus líderes e grupo.',
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleShareWhatsApp = () => {
    const title = roteiro.title || DEFAULT_GC_ROTEIRO_TITLE;
    const message = encodeURIComponent(
      `📖 *Roteiro de GC Semanal — ${title}*\n\nOlá líder! Acesse o roteiro e material de apoio para a reunião do seu GC:\n👉 ${window.location.href}`
    );
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  const handlePrint = () => {
    const iframe = document.getElementById('roteiro-frame') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    } else {
      window.print();
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#F9F8F5]">
      {/* BARRA FLUTUANTE DE AÇÕES RÁPIDAS */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-2 rounded-full shadow-lg border border-stone-200 text-xs font-semibold text-stone-700">
        <button
          onClick={handleShareWhatsApp}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm font-bold"
          title="Compartilhar no WhatsApp"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">WhatsApp</span>
        </button>

        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-stone-100 transition-all text-stone-700"
          title="Copiar Link"
        >
          {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{copied ? 'Copiado' : 'Link'}</span>
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-stone-100 transition-all text-stone-700"
          title="Imprimir / Salvar PDF"
        >
          <Printer className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Imprimir</span>
        </button>
      </div>

      {/* RENDERIZADOR DO ROTEIRO COMPLETO */}
      <iframe
        id="roteiro-frame"
        srcDoc={roteiro.htmlContent}
        title={roteiro.title || 'Roteiro de GC'}
        className="w-full h-full border-0 bg-transparent"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
}

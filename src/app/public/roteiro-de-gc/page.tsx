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
          const fixedHtml = data.htmlContent
            .replace(/max-height:\s*1200px/gi, 'max-height: 15000px')
            .replace(/max-height:\s*1000px/gi, 'max-height: 15000px');
          setRoteiro({ ...data, htmlContent: fixedHtml });
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
    try {
      // Cria uma janela dedicada para impressão perfeita e multi-página (PDF)
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        // Injeta CSS para expandir o conteúdo de apoio e otimizar margens na impressão
        const printOptimizedHtml = roteiro.htmlContent.replace(
          '</head>',
          `  <style>
            @media print {
              header { display: none !important; }
              .accordion-content { max-height: none !important; display: block !important; }
              #toggle-apoio-btn { display: none !important; }
              body { background-color: #ffffff !important; padding: 0 !important; }
              main { max-width: 100% !important; padding: 0 !important; }
            }
          </style>
        </head>`
        );

        printWindow.document.open();
        printWindow.document.write(printOptimizedHtml);
        printWindow.document.close();

        // Aguarda carregar as fontes e estilos do Tailwind antes de abrir o diálogo de impressão
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
          }, 350);
        };

        // Fallback de timeout caso o onload não dispare
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch {}
        }, 800);
      } else {
        // Fallback no iframe
        const iframe = document.getElementById('roteiro-frame') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } else {
          window.print();
        }
      }
    } catch (e) {
      console.error('Erro ao imprimir:', e);
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
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-stone-900 text-white hover:bg-stone-800 transition-all shadow-sm font-medium"
          title="Imprimir / Salvar PDF"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>Imprimir</span>
        </button>
      </div>

      {/* RENDERIZADOR DO ROTEIRO COMPLETO */}
      <iframe
        id="roteiro-frame"
        srcDoc={roteiro.htmlContent}
        title={roteiro.title || 'Roteiro de GC'}
        className="w-full h-full border-0 bg-transparent"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
      />
    </div>
  );
}

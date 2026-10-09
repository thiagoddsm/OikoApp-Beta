'use client';

import React from 'react';
import { BookOpen, Clock, FileText, ExternalLink, Sparkles, Quote, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LessonArticleViewerProps {
  title: string;
  textContent?: string;
  readingTimeMinutes?: number;
  attachments?: {
    title: string;
    url: string;
    type?: 'pdf' | 'link' | 'slides';
  }[];
  className?: string;
}

export function LessonArticleViewer({
  title,
  textContent = '',
  readingTimeMinutes,
  attachments = [],
  className
}: LessonArticleViewerProps) {
  // Calculate reading time if not explicitly provided (approx. 200 words per min)
  const calculatedReadingTime = React.useMemo(() => {
    if (readingTimeMinutes && readingTimeMinutes > 0) return readingTimeMinutes;
    const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 180));
  }, [textContent, readingTimeMinutes]);

  // Helper to render markdown-like text lines safely
  const renderFormattedContent = (content: string) => {
    if (!content.trim()) {
      return (
        <p className="text-slate-400 italic text-sm">
          Nenhum texto complementar cadastrado para esta aula.
        </p>
      );
    }

    const blocks = content.split(/\n\s*\n/);

    return blocks.map((block, bIdx) => {
      const trimmed = block.trim();

      // Heading 1
      if (trimmed.startsWith('# ')) {
        return (
          <h2 key={bIdx} className="text-xl sm:text-3xl font-black text-white tracking-tight pt-4 pb-2 border-b border-white/10 flex items-center gap-2">
            <Sparkles className="size-5 text-amber-400 shrink-0" />
            {trimmed.slice(2)}
          </h2>
        );
      }

      // Heading 2
      if (trimmed.startsWith('## ')) {
        return (
          <h3 key={bIdx} className="text-lg sm:text-2xl font-bold text-amber-300 tracking-tight pt-3 pb-1">
            {trimmed.slice(3)}
          </h3>
        );
      }

      // Heading 3
      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={bIdx} className="text-base sm:text-xl font-bold text-slate-100 pt-2">
            {trimmed.slice(4)}
          </h4>
        );
      }

      // Blockquote / Bible Verse
      if (trimmed.startsWith('>')) {
        const quoteText = trimmed.replace(/^>\s?/gm, '').trim();
        return (
          <div key={bIdx} className="my-4 p-4 sm:p-6 rounded-2xl bg-amber-500/10 border-l-4 border-amber-400 text-amber-100 space-y-2 relative overflow-hidden shadow-md">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider">
              <Quote className="size-4 shrink-0" />
              <span>Passagem Bíblica / Reflexão</span>
            </div>
            <p className="text-sm sm:text-base italic leading-relaxed text-amber-50 font-serif">
              "{quoteText}"
            </p>
          </div>
        );
      }

      // Callout box: Note or Tip
      if (trimmed.startsWith('[!NOTE]') || trimmed.startsWith('[!TIP]') || trimmed.startsWith('💡') || trimmed.startsWith('📌')) {
        const cleanContent = trimmed.replace(/^(\[!NOTE\]|\[!TIP\]|💡|📌)\s*/, '');
        return (
          <div key={bIdx} className="my-4 p-4 rounded-2xl bg-primary/10 border border-primary/20 text-slate-200 space-y-1">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <Sparkles className="size-3.5" /> Destaque da Lição
            </div>
            <p className="text-xs sm:text-sm leading-relaxed">{cleanContent}</p>
          </div>
        );
      }

      // Bullet List
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const items = trimmed.split(/\n/).map(l => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
        return (
          <ul key={bIdx} className="space-y-2 pl-2 sm:pl-4 my-2">
            {items.map((it, itIdx) => (
              <li key={itIdx} className="flex items-start gap-2.5 text-sm sm:text-base text-slate-200 leading-relaxed">
                <span className="size-1.5 rounded-full bg-amber-400 mt-2.5 shrink-0" />
                <span>{renderInlineFormatting(it)}</span>
              </li>
            ))}
          </ul>
        );
      }

      // Numbered List
      if (/^\d+\.\s/.test(trimmed)) {
        const items = trimmed.split(/\n/).map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
        return (
          <ol key={bIdx} className="space-y-2 pl-2 sm:pl-4 my-2">
            {items.map((it, itIdx) => (
              <li key={itIdx} className="flex items-start gap-3 text-sm sm:text-base text-slate-200 leading-relaxed">
                <span className="size-5 rounded-full bg-primary/20 text-primary text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  {itIdx + 1}
                </span>
                <span>{renderInlineFormatting(it)}</span>
              </li>
            ))}
          </ol>
        );
      }

      // Markdown Image: ![Alt](url)
      if (/^!\[(.*?)\]\((.*?)\)$/.test(trimmed)) {
        const match = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (match) {
          const caption = match[1];
          const src = match[2];
          return (
            <figure key={bIdx} className="my-6 rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl space-y-2 p-2">
              <div className="relative w-full max-h-[500px] overflow-hidden rounded-xl flex items-center justify-center bg-black/40">
                <img 
                  src={src} 
                  alt={caption || 'Ilustração do estudo'} 
                  className="max-h-[480px] w-auto max-w-full object-contain mx-auto rounded-lg hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              {caption && (
                <figcaption className="text-center text-xs font-medium text-slate-400 italic py-1 px-3">
                  📷 {caption}
                </figcaption>
              )}
            </figure>
          );
        }
      }

      // Markdown Table: | Col 1 | Col 2 |
      if (trimmed.includes('|') && trimmed.split('\n').length >= 2 && trimmed.split('\n')[0].includes('|')) {
        const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
        const headers = lines[0].split('|').map(c => c.trim()).filter(Boolean);
        const rows = lines.slice(2).map(l => l.split('|').map(c => c.trim()).filter(Boolean));

        if (headers.length > 0) {
          return (
            <div key={bIdx} className="my-6 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/90 shadow-xl">
              <table className="w-full text-left text-xs sm:text-sm text-slate-200">
                <thead className="bg-white/5 border-b border-white/10 text-amber-300 font-bold uppercase tracking-wider text-[10px] sm:text-xs">
                  <tr>
                    {headers.map((h, hIdx) => (
                      <th key={hIdx} className="p-3 sm:p-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-3 sm:p-4 leading-relaxed font-medium">
                          {renderInlineFormatting(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
      }

      // Comparison Card Box: [!COMPARE] or [!CONTRASTE]
      if (trimmed.startsWith('[!COMPARE]') || trimmed.startsWith('[!VS]') || trimmed.startsWith('⚖️')) {
        const cleanContent = trimmed.replace(/^(\[!COMPARE\]|\[!VS\]|⚖️)\s*/, '');
        const items = cleanContent.split(/---|\nvs\n|\nVS\n/i);
        return (
          <div key={bIdx} className="my-6 p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-rose-950/40 border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-widest">
              <Sparkles className="size-4" /> Quadro Comparativo / Diferenciação
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.map((it, itIdx) => (
                <div key={itIdx} className={cn("p-4 rounded-xl border text-sm leading-relaxed", itIdx === 0 ? "bg-blue-500/10 border-blue-500/30 text-blue-100" : "bg-rose-500/10 border-rose-500/30 text-rose-100")}>
                  {renderFormattedContent(it.trim())}
                </div>
              ))}
            </div>
          </div>
        );
      }

      // Standard Paragraph
      return (
        <p key={bIdx} className="text-sm sm:text-base md:text-lg text-slate-200 leading-relaxed font-normal">
          {renderInlineFormatting(trimmed)}
        </p>
      );
    });
  };

  // Helper for bold and italic inline
  const renderInlineFormatting = (text: string) => {
    // Simple inline formatting for **bold** and *italic*
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={pIdx} className="italic text-amber-200 font-serif">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <div className={cn("space-y-6 max-w-4xl", className)}>
      {/* Header with reading time */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold px-2.5 py-1 text-xs gap-1.5">
            <BookOpen className="size-3.5" /> Leitura da Aula
          </Badge>
          <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700 font-medium text-xs gap-1">
            <Clock className="size-3" /> ~{calculatedReadingTime} min de leitura
          </Badge>
        </div>
      </div>

      {/* Structured Article Body */}
      <div className="space-y-4 leading-relaxed font-sans">
        {renderFormattedContent(textContent)}
      </div>

      {/* Attachments Section */}
      {attachments.length > 0 && (
        <div className="pt-6 mt-6 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
            <FileText className="size-4 text-primary" />
            <span>Materiais Complementares para Download</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {attachments.map((att, aIdx) => (
              <a
                key={aIdx}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-primary/50 hover:bg-slate-850 transition-all text-slate-200 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="size-4" />
                  </div>
                  <span className="text-xs font-bold truncate group-hover:text-primary transition-colors">
                    {att.title || `Anexo ${aIdx + 1}`}
                  </span>
                </div>
                <ExternalLink className="size-4 text-slate-500 group-hover:text-primary shrink-0 ml-2" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

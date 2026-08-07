'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, Heart, GraduationCap, DollarSign, Calendar, Flame, Home, 
  Sparkles, ShieldCheck, Award, Target, MessageSquare, Download, RefreshCw, Pencil, Trash2 
} from 'lucide-react';
import { MembershipBoardConfig } from '@/types/membership-board-types';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/provider';

interface DynamicBoardCardProps {
  board: MembershipBoardConfig;
  onClickCard: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRecalculate?: () => void;
  onOpenWhatsapp?: () => void;
}

const ICON_MAP: Record<string, any> = {
  Users,
  Heart,
  GraduationCap,
  DollarSign,
  Calendar,
  Flame,
  Home,
  Sparkles,
  ShieldCheck,
  Award,
  Target,
};

export function DynamicBoardCard({
  board,
  onClickCard,
  onEdit,
  onDelete,
  onRecalculate,
  onOpenWhatsapp,
}: DynamicBoardCardProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const IconComponent = ICON_MAP[board.icon] || Users;

  const handleExportCsv = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExporting(true);
    try {
      const token = await user?.getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/membership/boards/${board.id}/export`, { headers });
      if (!res.ok) throw new Error('Erro ao gerar planilha');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quadro-${board.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast({ title: 'Planilha Exportada! 📥', description: 'O arquivo CSV foi baixado com sucesso.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao exportar', description: err.message });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRecalculateClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRecalculating(true);
    try {
      if (onRecalculate) {
        await onRecalculate();
      } else {
        const token = await user?.getIdToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/membership/boards/execute', {
          method: 'POST',
          headers,
          body: JSON.stringify({ boardId: board.id }),
        });
        if (!res.ok) throw new Error('Erro ao recalcular contagem');
      }
      toast({ title: 'Cache Atualizado! 🔄', description: 'A contagem estatística foi recalculada.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao recalcular', description: err.message });
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <Card
      onClick={onClickCard}
      className="group relative overflow-hidden rounded-[1.75rem] border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
      style={{ backgroundColor: board.backgroundColor || '#1e293b' }}
    >
      {/* Bloco Principal do Cartão */}
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="size-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white shadow-inner group-hover:scale-110 transition-transform">
            <IconComponent size={24} />
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="size-8 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
                title="Editar Quadro"
              >
                <Pencil size={14} />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="size-8 text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 rounded-full"
                title="Excluir Quadro"
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-black uppercase italic tracking-tight leading-snug" style={{ color: board.textColor || '#ffffff' }}>
            {board.title}
          </h3>
          {board.description && (
            <p className="text-xs font-medium opacity-80 mt-1 line-clamp-2" style={{ color: board.textColor || '#ffffff' }}>
              {board.description}
            </p>
          )}
        </div>

        <div className="pt-2 flex items-baseline gap-2">
          <span className="text-4xl sm:text-5xl font-black italic tracking-tighter" style={{ color: board.textColor || '#ffffff' }}>
            {board.cachedTotalCount ?? 0}
          </span>
          <span className="text-xs uppercase font-bold tracking-wider opacity-70" style={{ color: board.textColor || '#ffffff' }}>
            membros
          </span>
        </div>
      </div>

      {/* Rodapé Estético Independente com Ações Rápidas (Estilo Eklesia) */}
      <div
        className="px-6 py-3 border-t border-white/10 flex items-center justify-between"
        style={{ backgroundColor: board.footerColor || '#0f172a' }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80" style={{ color: board.footerTextColor || '#94a3b8' }}>
          {board.rules?.length || 0} filtro(s) ativo(s)
        </span>

        {/* Atalhos Rápidos no Rodapé */}
        <div className="flex items-center gap-1">
          {/* Botão Disparo WhatsApp */}
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenWhatsapp) onOpenWhatsapp();
              else toast({ title: 'Disparo de WhatsApp 📲', description: 'Abrindo comunicação com o grupo filtrado...' });
            }}
            className="size-7 rounded-lg text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
            title="Enviar WhatsApp em Massa para este grupo"
          >
            <MessageSquare size={14} />
          </Button>

          {/* Botão Exportar CSV */}
          <Button
            size="icon"
            variant="ghost"
            disabled={isExporting}
            onClick={handleExportCsv}
            className="size-7 rounded-lg text-sky-400 hover:bg-sky-500/20 hover:text-sky-300"
            title="Exportar Planilha Excel/CSV direta"
          >
            <Download size={14} className={isExporting ? 'animate-bounce' : ''} />
          </Button>

          {/* Botão Recalcular */}
          <Button
            size="icon"
            variant="ghost"
            disabled={isRecalculating}
            onClick={handleRecalculateClick}
            className="size-7 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
            title="Recalcular contagem (Invalidação de Cache)"
          >
            <RefreshCw size={14} className={isRecalculating ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>
    </Card>
  );
}

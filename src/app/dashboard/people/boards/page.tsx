'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, LayoutGrid, Loader2, Sparkles, RefreshCw, Filter, Layers } from 'lucide-react';
import { MembershipBoardConfig, FilterRuleBlock } from '@/types/membership-board-types';
import { DynamicBoardCard } from '@/components/membership/dynamic-board-card';
import { BoardVisualPicker } from '@/components/membership/board-visual-picker';
import { QueryBuilderBlocks } from '@/components/membership/query-builder-blocks';
import { BoardPeopleDrawer } from '@/components/membership/board-people-drawer';
import { useToast } from '@/hooks/use-toast';

export default function MembershipBoardsPage() {
  const { toast } = useToast();
  const [boards, setBoards] = useState<MembershipBoardConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBoard, setEditingBoard] = useState<MembershipBoardConfig | null>(null);
  const [selectedDrawerBoard, setSelectedDrawerBoard] = useState<MembershipBoardConfig | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form states
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [backgroundColor, setBackgroundColor] = useState<string>('#1e293b');
  const [footerColor, setFooterColor] = useState<string>('#0f172a');
  const [textColor, setTextColor] = useState<string>('#ffffff');
  const [footerTextColor, setFooterTextColor] = useState<string>('#94a3b8');
  const [icon, setIcon] = useState<string>('Users');
  const [rules, setRules] = useState<FilterRuleBlock[]>([]);

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/membership/boards');
      if (!res.ok) throw new Error('Erro ao carregar quadros');
      const data = await res.json();
      setBoards(data.boards || []);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao carregar quadros', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (board?: MembershipBoardConfig) => {
    if (board) {
      setEditingBoard(board);
      setTitle(board.title);
      setDescription(board.description || '');
      setBackgroundColor(board.backgroundColor || '#1e293b');
      setFooterColor(board.footerColor || '#0f172a');
      setTextColor(board.textColor || '#ffffff');
      setFooterTextColor(board.footerTextColor || '#94a3b8');
      setIcon(board.icon || 'Users');
      setRules(board.rules || []);
    } else {
      setEditingBoard(null);
      setTitle('');
      setDescription('');
      setBackgroundColor('#1e293b');
      setFooterColor('#0f172a');
      setTextColor('#ffffff');
      setFooterTextColor('#94a3b8');
      setIcon('Users');
      setRules([]);
    }
    setIsModalOpen(true);
  };

  const handleSaveBoard = async () => {
    if (!title.trim()) {
      toast({ variant: 'destructive', title: 'Campo Obrigatório', description: 'Informe o título do quadro.' });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title,
        description,
        backgroundColor,
        footerColor,
        textColor,
        footerTextColor,
        icon,
        rules,
      };

      let url = '/api/membership/boards';
      let method = 'POST';

      if (editingBoard) {
        url = `/api/membership/boards/${editingBoard.id}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Erro ao salvar quadro.');
      }

      toast({ title: 'Sucesso! 🎉', description: editingBoard ? 'Quadro atualizado com sucesso.' : 'Novo quadro dinâmico criado.' });
      setIsModalOpen(false);
      fetchBoards();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Tem certeza que deseja excluir este quadro dinâmico?')) return;
    try {
      const res = await fetch(`/api/membership/boards/${boardId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir quadro');
      toast({ title: 'Excluído!', description: 'O quadro foi removido.' });
      fetchBoards();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message });
    }
  };

  const handleRecalculateAll = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/membership/boards/execute', { method: 'POST' });
      if (!res.ok) throw new Error('Erro ao recalcular contagens');
      toast({ title: 'Painel Atualizado! 🔄', description: 'Todos os quadros foram recalculados com sucesso.' });
      fetchBoards();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar', description: err.message });
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <LayoutGrid size={24} />
            </div>
            <h1 className="text-2xl font-black uppercase italic tracking-tight">Quadros Dinâmicos de Membresia</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Crie cartões estatísticos personalizados com cruzamento dinâmico entre Membresia, Eventos, Ensino, GCs, Ministérios, Financeiro e Discipulado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculateAll}
            className="h-10 text-xs font-bold gap-1 border-slate-300 dark:border-slate-700"
          >
            <RefreshCw size={14} /> Recalcular Tudo
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenModal()}
            className="h-10 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-primary/25"
          >
            <Plus size={16} /> Criar Quadro Dinâmico
          </Button>
        </div>
      </div>

      {/* Grade de Cartões Estatísticos */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : boards.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
          <Sparkles size={40} className="mx-auto text-amber-500" />
          <h3 className="text-lg font-black uppercase italic">Nenhum Quadro Dinâmico Configurado</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Crie seu primeiro cartão estatístico para acompanhar em tempo real cruzamentos inteligentes de membros da sua igreja.
          </p>
          <Button onClick={() => handleOpenModal()} className="font-bold text-xs bg-primary text-white">
            <Plus size={16} className="mr-1" /> Criar Primeiro Quadro
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {boards.map(board => (
            <DynamicBoardCard
              key={board.id}
              board={board}
              onClickCard={() => setSelectedDrawerBoard(board)}
              onEdit={() => handleOpenModal(board)}
              onDelete={() => handleDeleteBoard(board.id)}
              onRecalculate={fetchBoards}
            />
          ))}
        </div>
      )}

      {/* Dialog de Criação/Edição de Quadro */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase italic">
              {editingBoard ? 'Editar Quadro Dinâmico' : 'Novo Quadro Dinâmico de Membresia'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure os títulos, estética dos cartões (corpo e rodapé independentes) e as regras de filtragem cruzada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Informações Básicas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Título do Quadro *</Label>
                <Input
                  placeholder="Ex: Jovens Dizimistas e Alunos do Somos Um"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="h-10 text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Descrição (Opcional)</Label>
                <Input
                  placeholder="Ex: Membros ativos com idade até 30 anos..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>
            </div>

            {/* Componente Seletor de Estética Dupla */}
            <BoardVisualPicker
              backgroundColor={backgroundColor}
              footerColor={footerColor}
              textColor={textColor}
              footerTextColor={footerTextColor}
              icon={icon}
              onChange={data => {
                if (data.backgroundColor) setBackgroundColor(data.backgroundColor);
                if (data.footerColor) setFooterColor(data.footerColor);
                if (data.textColor) setTextColor(data.textColor);
                if (data.footerTextColor) setFooterTextColor(data.footerTextColor);
                if (data.icon) setIcon(data.icon);
              }}
            />

            {/* Componente Construtor de Consultas em Blocos Expansíveis */}
            <div className="space-y-2 border-t pt-6 border-slate-200 dark:border-slate-800">
              <h4 className="text-sm font-black uppercase italic tracking-wider text-slate-700 dark:text-slate-300">
                Construtor de Regras de Consulta (7 Módulos)
              </h4>
              <QueryBuilderBlocks rules={rules} onChange={setRules} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving} className="text-xs font-bold">
              Cancelar
            </Button>
            <Button onClick={handleSaveBoard} disabled={isSaving} className="text-xs font-bold bg-primary text-white">
              {isSaving ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              {editingBoard ? 'Salvar Alterações' : 'Criar Quadro Dinâmico'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gaveta de Visualização de Membros */}
      <BoardPeopleDrawer
        board={selectedDrawerBoard}
        isOpen={Boolean(selectedDrawerBoard)}
        onClose={() => setSelectedDrawerBoard(null)}
      />
    </div>
  );
}

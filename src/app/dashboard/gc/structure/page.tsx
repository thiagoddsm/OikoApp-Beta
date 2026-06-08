
'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, deleteDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import { Loader2, Users, ChevronDown, Pencil, Trash2, Network, AreaChart, Building2, PlusCircle, Crown, GitBranch, Layers } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreateRedeDialog } from '@/components/structure/create-rede-dialog';
import { CreateAreaDialog } from '@/components/structure/create-area-dialog';
import { EditPastorDialog } from '@/components/structure/edit-pastor-dialog';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type User = { id: string; name: string; hierarchy?: { role?: string } };
type Cell = { id: string; nome: string; liderId: string; areaId: string; redeId: string; membros: string[] };
type Area = { id: string; nome: string; liderId: string; redeId: string };
type Rede = { id: string; nome: string; liderId: string; pastorId: string; cor?: string };

interface HierarchyNode {
  id: string;
  nome: string;
  liderName: string;
  type: 'pastor' | 'rede' | 'area' | 'cell';
  stats: { directChildren: number; participantes: number; totalAreas?: number };
  children: HierarchyNode[];
  liderId?: string;
  pastorId?: string;
  redeId?: string;
  cor?: string;
}

// ─── Paleta de cores por rede ──────────────────────────────────────────────────
const REDE_PALETTES: Record<string, { bg: string; border: string; text: string; badge: string; dot: string }> = {
  vermelho:  { bg: 'from-red-50 to-rose-50',      border: 'border-red-200',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700 border-red-200',    dot: 'bg-red-400' },
  verde:     { bg: 'from-emerald-50 to-green-50',  border: 'border-emerald-200',text: 'text-emerald-700',badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
  azul:      { bg: 'from-blue-50 to-sky-50',       border: 'border-blue-200',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700 border-blue-200',   dot: 'bg-blue-400' },
  laranja:   { bg: 'from-orange-50 to-amber-50',   border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-400' },
  roxo:      { bg: 'from-purple-50 to-violet-50',  border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-400' },
  amarelo:   { bg: 'from-yellow-50 to-amber-50',   border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400' },
  rosa:      { bg: 'from-pink-50 to-rose-50',      border: 'border-pink-200',   text: 'text-pink-700',   badge: 'bg-pink-100 text-pink-700 border-pink-200',   dot: 'bg-pink-400' },
};

function getPalette(cor?: string) {
  if (!cor) return REDE_PALETTES['azul'];
  const key = cor.toLowerCase();
  return REDE_PALETTES[key] || REDE_PALETTES['azul'];
}

// ─── Hierarquia ────────────────────────────────────────────────────────────────

const buildHierarchy = (users: User[], redes: Rede[], areas: Area[], cells: Cell[]): HierarchyNode | null => {
  const userMap = new Map(users.map(u => [u.id, u]));
  const seniorPastor = users.find(u => u.hierarchy?.role === 'pastor_senior') || users.find(u => u.hierarchy?.role === 'admin');
  if (!seniorPastor) return null;

  const cellNodes = cells.map(cell => ({
    id: cell.id, nome: cell.nome, type: 'cell' as const, areaId: cell.areaId,
    liderName: userMap.get(cell.liderId)?.name || 'N/A',
    stats: { directChildren: 0, participantes: cell.membros?.length || 0 },
    children: []
  }));

  const areaNodes = areas.map(area => {
    const areaCells = cellNodes.filter(c => c.areaId === area.id);
    return {
      id: area.id, nome: area.nome, type: 'area' as const, redeId: area.redeId, liderId: area.liderId,
      liderName: userMap.get(area.liderId)?.name || 'N/A',
      stats: { directChildren: areaCells.length, participantes: areaCells.reduce((s, c) => s + c.stats.participantes, 0) },
      children: areaCells
    };
  });

  const redeNodes = redes.map(rede => {
    const redeAreas = areaNodes.filter(a => a.redeId === rede.id);
    return {
      id: rede.id, nome: rede.nome, type: 'rede' as const, pastorId: rede.pastorId, liderId: rede.liderId, cor: rede.cor,
      liderName: userMap.get(rede.liderId)?.name || 'N/A',
      stats: { directChildren: redeAreas.length, participantes: redeAreas.reduce((s, a) => s + a.stats.participantes, 0) },
      children: redeAreas
    };
  });

  return {
    id: seniorPastor.id, nome: 'Igreja Batista da Manhã', type: 'pastor' as const,
    liderName: `Pastor Sênior: ${seniorPastor.name}`,
    stats: { 
      directChildren: redeNodes.length, 
      participantes: redeNodes.reduce((s, r) => s + r.stats.participantes, 0),
      totalAreas: areas.length
    },
    children: redeNodes
  };
};

// ─── Card de nó (Pastor / Rede) ────────────────────────────────────────────────

function RootCard({ node, onEdit, onToggle, isExpanded }: {
  node: HierarchyNode; onEdit: () => void; onToggle: () => void; isExpanded: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-2xl shadow-indigo-200 p-5 w-72 text-white">
        {/* glow */}
        <div className="absolute inset-0 rounded-2xl bg-white/5" />

        <div className="relative flex items-center gap-3 mb-4">
          <div className="bg-white/20 rounded-xl p-2.5">
            <Crown className="size-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-base leading-tight truncate">{node.nome}</p>
            <p className="text-indigo-200 text-[11px] truncate">{node.liderName}</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10 h-7 w-7 shrink-0" onClick={onEdit}>
            <Pencil className="size-3.5" />
          </Button>
        </div>

        <div className="relative grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-black">{node.stats.directChildren}</p>
            <p className="text-[10px] text-indigo-200 uppercase tracking-wider">Redes</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-black">{node.stats.totalAreas || 0}</p>
            <p className="text-[10px] text-indigo-200 uppercase tracking-wider">Áreas</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-black">{node.stats.participantes}</p>
            <p className="text-[10px] text-indigo-200 uppercase tracking-wider">Pessoas</p>
          </div>
        </div>

        {node.children.length > 0 && (
          <button
            onClick={onToggle}
            className="relative mt-3 w-full flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-200 hover:text-white transition-colors py-1"
          >
            {isExpanded ? 'Recolher' : 'Ver redes'}
            <ChevronDown className={cn("size-3 transition-transform duration-300", isExpanded && "rotate-180")} />
          </button>
        )}
      </div>

      {/* conector vertical */}
      {isExpanded && node.children.length > 0 && (
        <div className="w-0.5 h-8 bg-gradient-to-b from-indigo-300 to-slate-200" />
      )}
    </div>
  );
}

// ─── Card de Rede ──────────────────────────────────────────────────────────────

function RedeCard({ node, onEdit, onDelete, onToggle, isExpanded }: {
  node: HierarchyNode; onEdit: () => void; onDelete: () => void; onToggle: () => void; isExpanded: boolean;
}) {
  const palette = getPalette(node.cor);
  return (
    <div className="flex flex-col items-center">
      {/* conector de cima */}
      <div className="w-0.5 h-6 bg-slate-200" />

      <div className={cn("relative bg-gradient-to-br rounded-2xl border-2 shadow-lg p-5 w-60 transition-all hover:shadow-xl group", palette.bg, palette.border)}>
        <div className="flex items-center gap-3 mb-3">
          <div className={cn("rounded-xl p-2 shrink-0", palette.badge)}>
            <AreaChart className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("font-black text-sm leading-tight truncate", palette.text)}>{node.nome}</p>
            <p className="text-muted-foreground text-[10px] truncate">{node.liderName}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mb-3">
          <div className="bg-white/80 rounded-lg p-2 text-center">
            <p className={cn("text-lg font-black leading-none", palette.text)}>{node.stats.directChildren}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Áreas</p>
          </div>
          <div className="bg-white/80 rounded-lg p-2 text-center">
            <p className={cn("text-lg font-black leading-none", palette.text)}>{node.stats.participantes}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Pessoas</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/60">
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/60 transition-colors text-muted-foreground hover:text-foreground">
              <Pencil className="size-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500">
              <Trash2 className="size-3.5" />
            </button>
          </div>
          {node.children.length > 0 && (
            <button onClick={onToggle} className={cn("flex items-center gap-1 text-[9px] font-black uppercase tracking-wider transition-colors", palette.text)}>
              {isExpanded ? 'Recolher' : 'Áreas'}
              <ChevronDown className={cn("size-3 transition-transform duration-300", isExpanded && "rotate-180")} />
            </button>
          )}
        </div>
      </div>

      {isExpanded && node.children.length > 0 && (
        <div className="w-0.5 h-6 bg-slate-200" />
      )}
    </div>
  );
}

// ─── Card de Área ──────────────────────────────────────────────────────────────

function AreaCard({ node, redeCor, onEdit, onDelete, onToggle, isExpanded }: {
  node: HierarchyNode; redeCor?: string; onEdit: () => void; onDelete: () => void; onToggle: () => void; isExpanded: boolean;
}) {
  const palette = getPalette(redeCor);
  return (
    <div className="flex flex-col items-center">
      <div className="w-0.5 h-5 bg-slate-200" />

      <div className="bg-white rounded-xl border shadow-sm p-4 w-52 hover:shadow-md transition-shadow group">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className={cn("size-2 rounded-full shrink-0", palette.dot)} />
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm leading-tight truncate">{node.nome}</p>
            <p className="text-muted-foreground text-[10px] truncate">{node.liderName}</p>
          </div>
        </div>

        <div className="flex gap-1.5 mb-2.5">
          <Badge variant="outline" className="text-[9px] font-bold flex-1 justify-center py-0.5">
            <Layers className="size-2.5 mr-1" />{node.stats.directChildren} GCs
          </Badge>
          <Badge variant="outline" className="text-[9px] font-bold flex-1 justify-center py-0.5">
            <Users className="size-2.5 mr-1" />{node.stats.participantes}
          </Badge>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex gap-0.5">
            <button onClick={onEdit} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Pencil className="size-3" />
            </button>
            <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500">
              <Trash2 className="size-3" />
            </button>
          </div>
          {node.children.length > 0 && (
            <button onClick={onToggle} className="flex items-center gap-1 text-[9px] font-black uppercase text-muted-foreground hover:text-foreground transition-colors">
              {isExpanded ? 'Ocultar' : 'GCs'}
              <ChevronDown className={cn("size-2.5 transition-transform duration-300", isExpanded && "rotate-180")} />
            </button>
          )}
        </div>
      </div>

      {isExpanded && node.children.length > 0 && (
        <div className="w-0.5 h-5 bg-slate-200" />
      )}
    </div>
  );
}

// ─── Card de Célula ────────────────────────────────────────────────────────────

function CellCard({ node, redeCor }: { node: HierarchyNode; redeCor?: string }) {
  const palette = getPalette(redeCor);
  return (
    <div className="flex flex-col items-center">
      <div className="w-0.5 h-4 bg-slate-200" />
      <div className="bg-white rounded-lg border p-3 w-44 hover:border-slate-300 hover:shadow-sm transition-all">
        <div className="flex items-center gap-2 mb-1.5">
          <div className={cn("size-1.5 rounded-full shrink-0", palette.dot)} />
          <p className="font-bold text-xs truncate flex-1">{node.nome}</p>
        </div>
        <p className="text-[10px] text-muted-foreground truncate mb-2">{node.liderName}</p>
        <div className="flex items-center gap-1">
          <Users className="size-3 text-muted-foreground" />
          <span className="text-[10px] font-bold text-muted-foreground">{node.stats.participantes} pessoas</span>
        </div>
      </div>
    </div>
  );
}

// ─── Render recursivo ──────────────────────────────────────────────────────────

function RenderRede({ node, onEdit, onDelete }: {
  node: HierarchyNode; onEdit: (n: HierarchyNode) => void; onDelete: (n: HierarchyNode) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="flex flex-col items-center">
      <RedeCard
        node={node}
        onEdit={() => onEdit(node)}
        onDelete={() => onDelete(node)}
        onToggle={() => setExpanded(v => !v)}
        isExpanded={expanded}
      />
      {expanded && node.children.length > 0 && (
        <div className="relative flex gap-6 mt-0">
          {/* linha horizontal */}
          {node.children.length > 1 && (
            <div className="absolute top-0 left-[calc(50%_-_calc((var(--n)_-_1)_*_3.5rem))] right-[calc(50%_-_calc((var(--n)_-_1)_*_3.5rem))] h-0.5 bg-slate-200"
              style={{ '--n': node.children.length } as React.CSSProperties} />
          )}
          {node.children.map(area => (
            <RenderArea key={area.id} node={area} redeCor={node.cor} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function RenderArea({ node, redeCor, onEdit, onDelete }: {
  node: HierarchyNode; redeCor?: string; onEdit: (n: HierarchyNode) => void; onDelete: (n: HierarchyNode) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex flex-col items-center">
      <AreaCard
        node={node}
        redeCor={redeCor}
        onEdit={() => onEdit(node)}
        onDelete={() => onDelete(node)}
        onToggle={() => setExpanded(v => !v)}
        isExpanded={expanded}
      />
      {expanded && node.children.length > 0 && (
        <div className="relative flex flex-wrap justify-center gap-3 mt-0">
          {node.children.map(cell => (
            <CellCard key={cell.id} node={cell} redeCor={redeCor} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function StructurePage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isRedeDialogOpen, setRedeDialogOpen] = useState(false);
  const [isAreaDialogOpen, setAreaDialogOpen] = useState(false);
  const [isPastorDialogOpen, setPastorDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<HierarchyNode | null>(null);
  const [nodeToDelete, setNodeToDelete] = useState<HierarchyNode | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rootExpanded, setRootExpanded] = useState(true);

  const usersQ  = useMemoFirebase(() => firestore ? query(collection(firestore, 'users'))  : null, [firestore]);
  const cellsQ  = useMemoFirebase(() => firestore ? query(collection(firestore, 'cells'))  : null, [firestore]);
  const areasQ  = useMemoFirebase(() => firestore ? query(collection(firestore, 'areas'))  : null, [firestore]);
  const redesQ  = useMemoFirebase(() => firestore ? query(collection(firestore, 'redes'))  : null, [firestore]);

  const { data: users,  isLoading: lu } = useCollection<User>(usersQ);
  const { data: cells,  isLoading: lc } = useCollection<Cell>(cellsQ);
  const { data: areas,  isLoading: la } = useCollection<Area>(areasQ);
  const { data: redes,  isLoading: lr } = useCollection<Rede>(redesQ);
  const isLoading = lu || lc || la || lr;

  const hierarchyData = useMemo(() => {
    if (!users || !redes || !areas || !cells) return null;
    return buildHierarchy(users, redes, areas, cells);
  }, [users, redes, areas, cells]);

  const handleEdit = (node: HierarchyNode) => {
    setEditingNode(node);
    if (node.type === 'rede') setRedeDialogOpen(true);
    else if (node.type === 'area') setAreaDialogOpen(true);
    else if (node.type === 'pastor') setPastorDialogOpen(true);
  };

  const handleDelete = (node: HierarchyNode) => {
    setNodeToDelete(node);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!nodeToDelete || !firestore) return;
    if (nodeToDelete.type === 'rede') {
      try {
        const snap = await getDocs(query(collection(firestore, 'areas'), where('redeId', '==', nodeToDelete.id)));
        await Promise.all(snap.docs.map(d => deleteDocumentNonBlocking(doc(firestore, 'areas', d.id))));
        deleteDocumentNonBlocking(doc(firestore, 'redes', nodeToDelete.id));
        toast({ title: 'Rede excluída', description: `"${nodeToDelete.nome}" e suas áreas foram removidas.` });
      } catch {
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível excluir.' });
      }
    } else if (nodeToDelete.type === 'area') {
      deleteDocumentNonBlocking(doc(firestore, 'areas', nodeToDelete.id));
      toast({ title: 'Área excluída', description: `"${nodeToDelete.nome}" foi removida.` });
    }
    setDeleteDialogOpen(false);
    setNodeToDelete(null);
  };

  const closeDialogs = () => {
    setEditingNode(null);
    setRedeDialogOpen(false);
    setAreaDialogOpen(false);
    setPastorDialogOpen(false);
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            <div className="bg-indigo-100 p-2 rounded-xl">
              <GitBranch className="size-5 text-indigo-600" />
            </div>
            Estrutura Hierárquica
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Visualize e gerencie as redes, áreas e GCs da igreja.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => { setEditingNode(null); setAreaDialogOpen(true); }} className="font-bold">
            <PlusCircle className="mr-2 size-4" /> Criar Área
          </Button>
          <Button onClick={() => { setEditingNode(null); setRedeDialogOpen(true); }} className="font-bold shadow-lg">
            <PlusCircle className="mr-2 size-4" /> Criar Rede
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-200 min-h-[70vh] overflow-auto p-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="size-8 animate-spin text-indigo-500" />
            <p className="text-muted-foreground text-sm font-medium">Carregando estrutura...</p>
          </div>
        ) : !hierarchyData ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
            <div className="bg-slate-100 rounded-2xl p-5">
              <Network className="size-10 text-slate-400" />
            </div>
            <p className="font-bold text-slate-700">Nenhuma hierarquia encontrada</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Para começar, vá para <strong>Configurações</strong> e defina um usuário como <strong>Admin</strong> ou <strong>Pastor Sênior</strong>.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-0 min-w-max mx-auto">
            {/* Nó raiz (Igreja) */}
            <RootCard
              node={hierarchyData}
              onEdit={() => handleEdit(hierarchyData)}
              onToggle={() => setRootExpanded(v => !v)}
              isExpanded={rootExpanded}
            />

            {/* Redes */}
            {rootExpanded && hierarchyData.children.length > 0 && (
              <div className="relative flex flex-wrap justify-center gap-8 items-start mt-0">
                {/* linha horizontal conectando as redes */}
                {hierarchyData.children.length > 1 && (
                  <div className="absolute top-0 left-[12%] right-[12%] h-0.5 bg-slate-200" />
                )}
                {hierarchyData.children.map(rede => (
                  <RenderRede
                    key={rede.id}
                    node={rede}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legenda */}
      {hierarchyData && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground mt-4 px-1">
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-full bg-indigo-500" />
            <span className="font-medium">Igreja</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-full bg-sky-400" />
            <span className="font-medium">Rede</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-full bg-slate-400" />
            <span className="font-medium">Área</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-full bg-emerald-400" />
            <span className="font-medium">Grupo de Célula</span>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {users && (
        <CreateRedeDialog open={isRedeDialogOpen} onOpenChange={closeDialogs} users={users}
          existingRede={editingNode?.type === 'rede' ? editingNode : null} />
      )}
      {users && redes && (
        <CreateAreaDialog open={isAreaDialogOpen} onOpenChange={closeDialogs} users={users} redes={redes}
          existingArea={editingNode?.type === 'area' ? editingNode : null} />
      )}
      {users && (
        <EditPastorDialog open={isPastorDialogOpen} onOpenChange={closeDialogs} users={users}
          currentPastorId={editingNode?.type === 'pastor' ? editingNode.id : ''} />
      )}
      {nodeToDelete && (
        <DeleteConfirmationDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDelete} itemName={nodeToDelete.nome}
          itemType={nodeToDelete.type === 'rede' ? 'Rede' : 'Área'} />
      )}
    </>
  );
}

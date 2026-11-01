
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, query, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building, User, Pencil, Trash2, Network, MapPin, AreaChart, Calendar, Clock, PlusCircle, Droplets, ChevronRight, Users, UserCheck, BookOpen, UploadCloud } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';
import { GooglePlacesAutocomplete } from '@/components/common/google-places-autocomplete';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { PersonSearchInput } from '@/components/common/person-search-input';
import { GcStatusBadges, evaluateGcSymbology } from '@/components/gc/gc-symbology';


type UserType = {
  id: string;
  name: string;
  avatar?: string;
  photoURL?: string;
  hierarchy?: { role?: string; };
  churchData?: { baptismDate?: any; };
  batizado?: string;
  dataBatismo?: string;
};

type CoLider = { id: string; casalId?: string };

type Cell = {
  id: string;
  nome: string; imageUrl?: string; coverImage?: string; bio?: string; description?: string;
  liderId: string;
  liderCasalId?: string;
  coLiderIds?: string[];
  coLideres?: CoLider[];
  anfitriaoId?: string;
  anfitriãoCasalId?: string;
  secretariaId?: string;
  supervisorId: string;
  areaId: string;
  redeId: string;
  membros: string[];
  meetingDay?: string;
  meetingTime?: string;
  status?: 'active' | 'inactive' | 'growing';
  address?: { street: string; lat?: number; lng?: number; };
  anfitriaoElegiveiIds?: string[];
  multiplicationDate?: string;
  liderEAnfitriao?: boolean;
  targetAudience?: string;
  tags?: string[];
};

type Area = { id: string; nome: string; imageUrl?: string; coverImage?: string; bio?: string; description?: string; liderId: string; redeId: string; };
type Rede = { id: string; nome: string; imageUrl?: string; coverImage?: string; bio?: string; description?: string; liderId: string; pastorId: string; };

const cellStatusConfig = {
  active:   { label: 'Ativa',          className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  growing:  { label: 'Em Crescimento', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  inactive: { label: 'Inativa',        className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

import { CreateOrEditCellDialog } from './create-or-edit-cell-dialog';


import { TriggerGcBotDialog } from '@/components/gc/trigger-gc-bot-dialog';

export default function CellsPage() {
  const { firestore, user } = useFirebase();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<Cell | null>(null);
  const [deletingCell, setDeletingCell] = useState<Cell | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: userData } = useDoc<{ hierarchy?: { role?: string; celulaId?: string; }; }>(
    user ? `users/${user.uid}` : null
  );
  const userRole = userData?.hierarchy?.role;
  const isSupervisor = ['lider_area', 'lider_rede', 'pastor', 'pastor_senior', 'admin'].includes(userRole || '');

  // ── Filtros ──────────────────────────────────────────────────────────────
  const [filterName, setFilterName] = useState('');
  const [filterRedeId, setFilterRedeId] = useState('');
  const [filterAreaId, setFilterAreaId] = useState('');
  const [filterLiderId, setFilterLiderId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const cellsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'cells')) : null, [firestore]);
  const areasQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'areas')) : null, [firestore]);
  const redesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'redes')) : null, [firestore]);
  
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserType>(usersQuery);
  const { data: cells, isLoading: isLoadingCells } = useCollection<Cell>(cellsQuery);
  const { data: areas, isLoading: isLoadingAreas } = useCollection<Area>(areasQuery);
  const { data: redes, isLoading: isLoadingRedes } = useCollection<Rede>(redesQuery);

  const userMap = useMemo(() => new Map(users?.map(u => [u.id, u]) || []), [users]);
  const areaMap = useMemo(() => new Map(areas?.map(a => [a.id, a]) || []), [areas]);
  const redeMap = useMemo(() => new Map(redes?.map(r => [r.id, r]) || []), [redes]);

  const supervisors = useMemo(() => {
    if (!users) return [];
    return users.filter(u => u.hierarchy?.role && ['lider_area','lider_rede','pastor_senior','admin'].includes(u.hierarchy.role));
  }, [users]);

  // Áreas filtradas pela rede selecionada
  const filteredAreas = useMemo(() =>
    filterRedeId ? (areas || []).filter(a => a.redeId === filterRedeId) : (areas || []),
    [filterRedeId, areas]
  );

  // Líderes únicos presentes nas células
  const lideresNasCelulas = useMemo(() => {
    const ids = new Set((cells || []).map(c => c.liderId).filter(Boolean));
    return (users || []).filter(u => ids.has(u.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [cells, users]);

  // Células filtradas
  const filteredCells = useMemo(() => {
    if (!cells) return [];
    
    let baseCells = cells;
    if (user && !isSupervisor) {
      baseCells = cells.filter(cell => 
        cell.liderId === user.uid || 
        cell.coLiderIds?.includes(user.uid) || 
        cell.secretariaId === user.uid ||
        userData?.hierarchy?.celulaId === cell.id
      );
    }

    return baseCells.filter(cell => {
      if (filterName && !cell.nome?.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterRedeId && cell.redeId !== filterRedeId) return false;
      if (filterAreaId && cell.areaId !== filterAreaId) return false;
      if (filterLiderId && cell.liderId !== filterLiderId) return false;
      if (filterStatus && (cell.status || 'active') !== filterStatus) return false;
      return true;
    });
  }, [cells, filterName, filterRedeId, filterAreaId, filterLiderId, filterStatus, isSupervisor, user, userData]);

  const hasActiveFilters = filterName || filterRedeId || filterAreaId || filterLiderId || filterStatus;
  const clearFilters = () => { setFilterName(''); setFilterRedeId(''); setFilterAreaId(''); setFilterLiderId(''); setFilterStatus(''); };

  const isLoading = isLoadingUsers || isLoadingCells || isLoadingAreas || isLoadingRedes;

  const handleDeleteCell = async () => {
    if (!deletingCell || !firestore) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'cells', deletingCell.id));
    } finally {
      setIsDeleting(false);
      setDeletingCell(null);
    }
  };

  return (
    <>
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
        <div>
          <CardTitle className="text-lg font-black">Gestão de Células</CardTitle>
          <CardDescription>Visualize, crie e edite as células e sua estrutura hierárquica.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/gc/guia">
            <Button variant="outline" className="text-xs font-bold gap-1.5 border-slate-300">
              <BookOpen className="size-4 text-primary" />
              Guia do Líder (PDF)
            </Button>
          </Link>
          <TriggerGcBotDialog buttonVariant="outline" buttonText="Disparar Bot WhatsApp" />
          {isSupervisor && (
            <Button onClick={() => { setEditingCell(null); setDialogOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4"/>
              Criar Célula
            </Button>
          )}
        </div>
      </CardHeader>

      {/* ── BARRA DE FILTROS ─────────────────────────────────────────────── */}
      <div className="px-6 py-3 border-b bg-muted/20 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar GC..."
            value={filterName}
            onChange={e => setFilterName(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <Select value={filterRedeId || '__all'} onValueChange={v => { setFilterRedeId(v === '__all' ? '' : v); setFilterAreaId(''); }}>
          <SelectTrigger className="h-8 text-sm w-[150px]"><SelectValue placeholder="Rede" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todas as Redes</SelectItem>
            {(redes || []).map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterAreaId || '__all'} onValueChange={v => setFilterAreaId(v === '__all' ? '' : v)} disabled={filteredAreas.length === 0}>
          <SelectTrigger className="h-8 text-sm w-[150px]"><SelectValue placeholder="Área" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todas as Áreas</SelectItem>
            {filteredAreas.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterLiderId || '__all'} onValueChange={v => setFilterLiderId(v === '__all' ? '' : v)}>
          <SelectTrigger className="h-8 text-sm w-[160px]"><SelectValue placeholder="Líder" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todos os Líderes</SelectItem>
            {lideresNasCelulas.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterStatus || '__all'} onValueChange={v => setFilterStatus(v === '__all' ? '' : v)}>
          <SelectTrigger className="h-8 text-sm w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todos os Status</SelectItem>
            <SelectItem value="active">Ativa</SelectItem>
            <SelectItem value="growing">Em Crescimento</SelectItem>
            <SelectItem value="inactive">Inativa</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-destructive font-semibold underline-offset-2 hover:underline transition-colors">
              Limpar filtros
            </button>
          )}
          <span className="text-xs text-muted-foreground font-medium">
            {filteredCells.length} de {cells?.length || 0} GC{cells?.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-b-lg overflow-hidden">
            <div className="overflow-x-auto w-full">
<Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="pl-6">Célula</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Líder</TableHead>
                  <TableHead>Área / Rede</TableHead>
                  <TableHead className="text-center">Membros</TableHead>
                  <TableHead className="text-center">Não Batizados</TableHead>
                  <TableHead className="text-center">Líderes em Treinamento</TableHead>
                  <TableHead className="text-center">Secretário(a)</TableHead>
                  <TableHead className="text-center">Multiplicação</TableHead>
                  <TableHead className="text-center">Anfitrião Elegível?</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCells.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="h-32 text-center text-muted-foreground italic text-sm">
                    {hasActiveFilters ? 'Nenhum GC encontrado com esses filtros.' : 'Nenhuma célula cadastrada.'}
                  </TableCell></TableRow>
                )}
                {filteredCells.map((cell) => {
                  const leader = userMap.get(cell.liderId);
                  const spouse = cell.liderCasalId ? userMap.get(cell.liderCasalId) : null;
                  const area = areaMap.get(cell.areaId);
                  const rede = redeMap.get(cell.redeId);
                  const statusCfg = cellStatusConfig[cell.status || 'active'];
                  
                  // Enriquecer membros
                  const memberUsers = (users || []).filter(u => (u.hierarchy as any)?.celulaId === cell.id) as UserType[];
                  const naoBatizadosCount = memberUsers.filter(u => !(u.batizado === 'sim' || u.dataBatismo || u.churchData?.baptismDate)).length;
                  const previewMembers = memberUsers.slice(0, 4);
                  const extraCount = memberUsers.length - previewMembers.length;

                  // Co-líderes
                  const coLideresCount = cell.coLideres?.length || 0;
                  const coLideresCasaisCount = cell.coLideres?.filter(c => c.casalId)?.length || 0;

                  // Anfitrião Elegível
                  const hasEligibleHost = cell.anfitriaoElegiveiIds && cell.anfitriaoElegiveiIds.length > 0;
                  const elegiveisCount = cell.anfitriaoElegiveiIds?.length || 0;

                  // Formatar data de multiplicação futura
                  const formatMultiplicationDate = (dateStr?: string) => {
                      if (!dateStr) return '—';
                      try {
                          const [year, month, day] = dateStr.split('-');
                          if (year && month && day) {
                              return `${day}/${month}/${year}`;
                          }
                          return dateStr;
                      } catch {
                          return dateStr;
                      }
                  };

                  return (
                    <TableRow key={cell.id} className="hover:bg-muted/30 transition-colors">
                      {/* Célula */}
                      <TableCell className="pl-6">
                        <Link href={`/dashboard/gc/cells/${cell.id}`} className="font-bold text-foreground hover:text-primary hover:underline flex items-center gap-1 group">
                           {cell.nome}
                          <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        {cell.address?.street && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{cell.address.street}</p>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] font-bold border", statusCfg.className)}>
                          {statusCfg.label}
                        </Badge>
                      </TableCell>

                      {/* Líder */}
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 border">
                              {leader?.photoURL && <img src={leader.photoURL} alt={leader.name} className="h-full w-full object-cover rounded-full" />}
                              <AvatarFallback className="text-[10px] font-bold">{leader?.name?.charAt(0) || 'L'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-semibold">{leader?.name || 'Não definido'}</span>
                          </div>
                          {spouse && (
                            <div className="flex items-center gap-2 mt-1 pl-1">
                              <div className="w-5 flex justify-center"><span className="text-xs text-muted-foreground">&amp;</span></div>
                              <Avatar className="h-6 w-6 border">
                                {spouse?.photoURL && <img src={spouse.photoURL} alt={spouse.name} className="h-full w-full object-cover rounded-full" />}
                                <AvatarFallback className="text-[9px] font-bold">{spouse?.name?.charAt(0) || 'C'}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium text-muted-foreground">{spouse?.name}</span>
                              <Badge className="text-[8px] bg-primary/10 text-primary border-primary/20 px-1 py-0 h-4 font-black">CASAL</Badge>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Área / Rede */}
                      <TableCell>
                        <p className="text-sm font-medium">{area?.nome || '—'}</p>
                        <p className="text-[10px] text-muted-foreground">{rede?.nome || '—'}</p>
                      </TableCell>

                      {/* Quantos membros no GC */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-sm font-bold text-slate-800">{memberUsers.length}</span>
                          <span className="text-[10px] text-muted-foreground">membros</span>
                        </div>
                      </TableCell>

                      {/* Não Batizados */}
                      <TableCell className="text-center">
                        {memberUsers.length > 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <Badge variant="outline" className={cn("font-black text-sm px-2 py-0.5", naoBatizadosCount > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
                              {naoBatizadosCount}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Número de co-líderes */}
                      <TableCell className="text-center">
                        <span className="text-sm font-bold text-slate-700">{coLideresCount}</span>
                        {coLideresCasaisCount > 0 && (
                          <span className="text-[10px] text-primary block font-semibold">({coLideresCasaisCount} casal/casais)</span>
                        )}
                      </TableCell>

                      {/* Secretário(a) */}
                      <TableCell className="text-center">
                        {(() => {
                          const secretaryId = cell.secretariaId || (cell as any).secretarioId;
                          const secretary = secretaryId ? userMap.get(secretaryId) : null;
                          return secretary ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
                              <UserCheck className="h-3 w-3 text-purple-600 shrink-0" />
                              <span className="truncate max-w-[120px]">{secretary.name}</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-200 font-normal text-xs">
                              Não possui
                            </Badge>
                          );
                        })()}
                      </TableCell>

                      {/* Data de Multiplicação */}
                      <TableCell className="text-center">
                        {cell.multiplicationDate ? (
                          <Badge variant="outline" className="bg-indigo-50/50 text-indigo-700 border-indigo-200 font-bold text-xs">
                            {formatMultiplicationDate(cell.multiplicationDate)}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Tem anfitrião elegível? */}
                      <TableCell className="text-center font-bold">
                        {hasEligibleHost ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold text-xs gap-1">
                            Sim ({elegiveisCount})
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 border-slate-200 font-normal text-xs">
                            Não
                          </Badge>
                        )}
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCell(cell); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isSupervisor && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingCell(cell)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
</div>
          </div>
        )}
      </CardContent>
    </Card>

    {users && supervisors && areas && redes && (
      <CreateOrEditCellDialog 
        open={isDialogOpen}
        onOpenChange={setDialogOpen}
        users={users}
        supervisors={supervisors}
        areas={areas}
        redes={redes}
        existingCell={editingCell}
        isSupervisor={isSupervisor}
      />
    )}

    <AlertDialog open={!!deletingCell} onOpenChange={open => { if (!open) setDeletingCell(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir célula?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a célula <strong>&ldquo;{deletingCell?.nome}&rdquo;</strong>?
            Esta ação não pode ser desfeita. Os membros não serão excluídos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteCell}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

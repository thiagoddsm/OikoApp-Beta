'use client';

import React, { useState, useMemo } from 'react';
import {
  useMembersData,
  useVolunteeringServiceData,
  useGCData
} from '@/hooks/useDomainData';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Users,
  Search,
  HandHelping,
  Shield,
  Download,
  FileSpreadsheet,
  FileJson,
  Phone,
  MessageSquare,
  Sparkles,
  Filter,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Music,
  UserCheck,
  Building,
  Radio,
  MapPin,
  Tag,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { ImportVolunteersJsonDialog } from './import-volunteers-json-dialog';

export function ServosManagementView() {
  const { users, isLoading: loadingUsers } = useMembersData();
  const { serviceAreas: areas, teams, isLoading: loadingVolunteering } = useVolunteeringServiceData();
  const { cells, areas: gcAreas, redes, isLoading: loadingGC } = useGCData();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  // Estados dos Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'serving' | 'unassigned'>('serving');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [redeFilter, setRedeFilter] = useState<string>('all');
  const [gcAreaFilter, setGcAreaFilter] = useState<string>('all');
  const [cellFilter, setCellFilter] = useState<string>('all');

  // Mapeamentos rápidos para performance
  const areaMap = useMemo(() => new Map(areas.map(a => [a.id, a])), [areas]);
  const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);
  const cellMap = useMemo(() => new Map(cells.map(c => [c.id, c])), [cells]);
  const gcAreaMap = useMemo(() => new Map(gcAreas.map(a => [a.id, a])), [gcAreas]);
  const redeMap = useMemo(() => new Map(redes.map(r => [r.id, r])), [redes]);

  // Índice Reverso: mapeia qualquer usuário que esteja cadastrado na célula (como membro ou líder)
  const userToCellMap = useMemo(() => {
    const map = new Map<string, any>();
    cells.forEach(cell => {
      if (cell.liderId) map.set(cell.liderId, cell);
      if ((cell as any).liderTreinamentoId) map.set((cell as any).liderTreinamentoId, cell);
      if ((cell as any).secretarioId) map.set((cell as any).secretarioId, cell);
      if ((cell as any).anfitriaoId) map.set((cell as any).anfitriaoId, cell);
      if (cell.membros && Array.isArray(cell.membros)) {
        cell.membros.forEach((mId: string) => {
          if (mId) map.set(mId, cell);
        });
      }
    });
    return map;
  }, [cells]);

  // Helper para resolver GC, Área e Rede de um usuário
  const resolveUserGC = (user: any) => {
    const userCell =
      (user.cellId ? cellMap.get(user.cellId) : null) ||
      (user.hierarchy?.celulaId ? cellMap.get(user.hierarchy.celulaId) : null) ||
      userToCellMap.get(user.id) ||
      null;

    const userRedeId = user.redeId || userCell?.redeId || null;
    const userGcAreaId = user.areaId || userCell?.areaId || null;

    const redeObj = userRedeId ? redeMap.get(userRedeId) : null;
    const gcAreaObj = userGcAreaId ? gcAreaMap.get(userGcAreaId) : null;

    return {
      cell: userCell,
      redeId: userRedeId,
      rede: redeObj,
      gcAreaId: userGcAreaId,
      gcArea: gcAreaObj
    };
  };

  // Equipes disponíveis (As equipes são globais 1, 2, 3, 4 ou vinculadas a área)
  const availableTeams = useMemo(() => {
    if (areaFilter === 'all') return teams;
    const filtered = teams.filter(t => !t.areaId || t.areaId === areaFilter);
    return filtered.length > 0 ? filtered : teams;
  }, [teams, areaFilter]);

  // Áreas de GC disponíveis conforme a Rede selecionada
  const availableGcAreas = useMemo(() => {
    if (redeFilter === 'all') return gcAreas;
    return gcAreas.filter(a => a.redeId === redeFilter);
  }, [gcAreas, redeFilter]);

  // Células disponíveis conforme a Rede ou Área de GC selecionada
  const availableCells = useMemo(() => {
    let list = cells;
    if (redeFilter !== 'all') {
      list = list.filter(c => c.redeId === redeFilter);
    }
    if (gcAreaFilter !== 'all') {
      list = list.filter(c => c.areaId === gcAreaFilter);
    }
    return list;
  }, [cells, redeFilter, gcAreaFilter]);

  // Estatísticas Rápidas
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const servingUsers = users.filter(u => u.serviceAreaId || (u.worshipRoles && u.worshipRoles.length > 0));
    const worshipUsers = users.filter(u => u.worshipRoles && u.worshipRoles.length > 0);
    const unassignedUsers = users.filter(u => !u.serviceAreaId && (!u.worshipRoles || u.worshipRoles.length === 0));

    return {
      total: totalUsers,
      serving: servingUsers.length,
      worship: worshipUsers.length,
      unassigned: unassignedUsers.length
    };
  }, [users]);

  // Filtragem inteligente dos Servos
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const isServing = Boolean(user.serviceAreaId || (user.worshipRoles && user.worshipRoles.length > 0));

      // 1. Filtro de Status
      if (statusFilter === 'serving' && !isServing) return false;
      if (statusFilter === 'unassigned' && isServing) return false;

      // 2. Filtro de Área de Serviço
      if (areaFilter !== 'all') {
        const matchesRegular = user.serviceAreaId === areaFilter;
        const matchesWorship =
          user.worshipAreaId === areaFilter ||
          (areaMap.get(areaFilter)?.areaType === 'worship' && user.worshipRoles?.length);
        if (!matchesRegular && !matchesWorship) return false;
      }

      // 3. Filtro de Equipe
      if (teamFilter !== 'all' && user.serviceTeamId !== teamFilter) {
        return false;
      }

      // 4. Resolver Estrutura de GC do Usuário
      const gcInfo = resolveUserGC(user);

      // 5. Filtro de Rede
      if (redeFilter !== 'all' && gcInfo.redeId !== redeFilter) {
        return false;
      }

      // 6. Filtro de Área de GC
      if (gcAreaFilter !== 'all' && gcInfo.gcAreaId !== gcAreaFilter) {
        return false;
      }

      // 7. Filtro de Célula
      if (cellFilter !== 'all' && gcInfo.cell?.id !== cellFilter) {
        return false;
      }

      // 8. Busca Textual (Nome, E-mail, Telefone)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = user.name?.toLowerCase().includes(term);
        const matchEmail = user.email?.toLowerCase().includes(term);
        const matchPhone = user.phone?.replace(/\D/g, '').includes(term.replace(/\D/g, ''));
        if (!matchName && !matchEmail && !matchPhone) return false;
      }

      return true;
    });
  }, [users, statusFilter, areaFilter, teamFilter, redeFilter, gcAreaFilter, cellFilter, searchTerm, areaMap, cellMap, redeMap, gcAreaMap, userToCellMap]);

  // Atualização rápida de Área / Equipe
  const handleUpdateUserArea = async (userId: string, newAreaId: string) => {
    if (!firestore) return;
    const userRef = doc(firestore, 'users', userId);
    try {
      await updateDocumentNonBlocking(userRef, {
        serviceAreaId: newAreaId === 'none' ? '' : newAreaId,
        ...(newAreaId === 'none' ? { serviceTeamId: '' } : {})
      });
      toast({
        title: 'Área Atualizada! ✅',
        description: 'A área de serviço do membro foi atualizada com sucesso.'
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: err.message || 'Falha ao atualizar área.'
      });
    }
  };

  const handleUpdateUserTeam = async (userId: string, newTeamId: string) => {
    if (!firestore) return;
    const userRef = doc(firestore, 'users', userId);
    try {
      await updateDocumentNonBlocking(userRef, {
        serviceTeamId: newTeamId === 'none' ? '' : newTeamId
      });
      toast({
        title: 'Equipe Atualizada! ✅',
        description: 'A equipe do membro foi atualizada com sucesso.'
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: err.message || 'Falha ao atualizar equipe.'
      });
    }
  };

  // Limpar todos os filtros
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('serving');
    setAreaFilter('all');
    setTeamFilter('all');
    setRedeFilter('all');
    setGcAreaFilter('all');
    setCellFilter('all');
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (statusFilter !== 'serving') count++;
    if (areaFilter !== 'all') count++;
    if (teamFilter !== 'all') count++;
    if (redeFilter !== 'all') count++;
    if (gcAreaFilter !== 'all') count++;
    if (cellFilter !== 'all') count++;
    return count;
  }, [searchTerm, statusFilter, areaFilter, teamFilter, redeFilter, gcAreaFilter, cellFilter]);

  // Exportar para CSV
  const handleExportCsv = () => {
    const headers = ['Nome', 'Email', 'Telefone', 'Área de Serviço', 'Equipe', 'Rede', 'Área GC', 'Célula'];
    const rows = filteredUsers.map(u => {
      const areaObj = areaMap.get(u.serviceAreaId);
      const teamObj = teamMap.get(u.serviceTeamId);
      const gcInfo = resolveUserGC(u);

      return [
        `"${u.name || ''}"`,
        `"${u.email || ''}"`,
        `"${u.phone || ''}"`,
        `"${areaObj?.name || (u.worshipRoles?.length ? 'Louvor' : 'Sem Área')}"`,
        `"${teamObj ? (teamObj.name.startsWith('Equipe') ? teamObj.name : `Equipe ${teamObj.name}`) : ''}"`,
        `"${(gcInfo.rede as any)?.nome || (gcInfo.rede as any)?.name || ''}"`,
        `"${(gcInfo.gcArea as any)?.nome || (gcInfo.gcArea as any)?.name || ''}"`,
        `"${(gcInfo.cell as any)?.nome || (gcInfo.cell as any)?.name || ''}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_servos_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Exportar para JSON (com bloco de referência para IA)
  const handleExportJson = () => {
    const payload = {
      servos: filteredUsers.map(u => {
        const areaObj = areaMap.get(u.serviceAreaId);
        const teamObj = teamMap.get(u.serviceTeamId);
        const gcInfo = resolveUserGC(u);

        return {
          nome: u.name,
          email: u.email || '',
          telefone: u.phone || '',
          area: areaObj?.name || (u.worshipRoles?.length ? 'Louvor' : ''),
          equipe: teamObj ? (teamObj.name.startsWith('Equipe') ? teamObj.name : `Equipe ${teamObj.name}`) : '',
          rede: (gcInfo.rede as any)?.nome || (gcInfo.rede as any)?.name || '',
          areaGc: (gcInfo.gcArea as any)?.nome || (gcInfo.gcArea as any)?.name || '',
          celula: (gcInfo.cell as any)?.nome || (gcInfo.cell as any)?.name || ''
        };
      }),
      _referencia_areas_e_equipes: {
        _aviso: 'Lista de áreas e equipes cadastradas para referência da IA.',
        areasDisponiveis: areas.map(a => ({
          nome: a.name,
          tipo: a.areaType || 'regular',
          equipes: teams.map(t => (t.name.startsWith('Equipe') ? t.name : `Equipe ${t.name}`))
        }))
      }
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `servos_voluntarios_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isLoading = loadingUsers || loadingVolunteering || loadingGC;

  return (
    <div className="space-y-6">
      {/* CABEÇALHO & AÇÕES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl border border-slate-700/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <HandHelping className="size-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Servos & Voluntários
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Painel unificado para consulta, filtragem e gestão de todos os servos da igreja.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 text-xs font-bold gap-1.5 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md shadow-sm"
          >
            <FileSpreadsheet className="size-4 text-emerald-400" />
            Planilha CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            className="h-9 text-xs font-bold gap-1.5 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md shadow-sm"
          >
            <FileJson className="size-4 text-amber-400" />
            JSON para IA
          </Button>

          <ImportVolunteersJsonDialog />
        </div>
      </div>

      {/* CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">Servos Ativos</span>
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <UserCheck className="size-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">{stats.serving}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Voluntários com área de serviço</p>
        </div>

        <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">Louvor & Worship</span>
            <span className="p-2 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400">
              <Music className="size-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-purple-600 mt-2">{stats.worship}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Músicos e vocalistas</p>
        </div>

        <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">Sem Área (Potenciais)</span>
            <span className="p-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              <AlertCircle className="size-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-2">{stats.unassigned}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Membros sem escala ativa</p>
        </div>

        <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">Total Cadastrado</span>
            <span className="p-2 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
              <Users className="size-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">{stats.total}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Base geral de membros</p>
        </div>
      </div>

      {/* PAINEL DE FILTROS AVANÇADOS */}
      <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <SlidersHorizontal className="size-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-foreground">
              Filtros Avançados
            </span>
            {activeFiltersCount > 0 && (
              <Badge className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {activeFiltersCount} ativo(s)
              </Badge>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1 px-2 font-semibold"
            >
              <RotateCcw className="size-3" />
              Limpar Filtros
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Busca Textual */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou tel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 text-xs pl-9 pr-8 rounded-xl bg-background"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-3 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Status */}
          <div>
            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="h-10 text-xs font-semibold rounded-xl bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="serving">👥 Servos Ativos (Com Área)</SelectItem>
                <SelectItem value="unassigned">⚠️ Sem Área (Não Servos)</SelectItem>
                <SelectItem value="all">📋 Todos os Membros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Área de Serviço */}
          <div>
            <Select value={areaFilter} onValueChange={(val) => { setAreaFilter(val); setTeamFilter('all'); }}>
              <SelectTrigger className="h-10 text-xs font-semibold rounded-xl bg-background">
                <SelectValue placeholder="Área de Serviço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Áreas de Serviço</SelectItem>
                {areas.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.areaType === 'worship' ? '🎸 ' : '👋 '}{a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Equipe */}
          <div>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="h-10 text-xs font-semibold rounded-xl bg-background">
                <SelectValue placeholder="Equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Equipes</SelectItem>
                {availableTeams.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    🛡️ {t.name.startsWith('Equipe') ? t.name : `Equipe ${t.name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rede de GC */}
          <div>
            <Select value={redeFilter} onValueChange={(val) => { setRedeFilter(val); setGcAreaFilter('all'); setCellFilter('all'); }}>
              <SelectTrigger className="h-10 text-xs font-semibold rounded-xl bg-background">
                <SelectValue placeholder="Rede de GC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Redes</SelectItem>
                {redes.map(r => {
                  const rNome = (r as any).nome || (r as any).name || r.id;
                  const rCor = (r as any).cor || '#EF4444';
                  return (
                    <SelectItem key={r.id} value={r.id}>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ backgroundColor: rCor }} />
                        Rede {rNome}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Área de GC */}
          <div>
            <Select value={gcAreaFilter} onValueChange={(val) => { setGcAreaFilter(val); setCellFilter('all'); }}>
              <SelectTrigger className="h-10 text-xs font-semibold rounded-xl bg-background">
                <SelectValue placeholder="Área de GC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Áreas de GC</SelectItem>
                {availableGcAreas.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    📍 {(a as any).nome || (a as any).name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Célula / GC */}
          <div className="sm:col-span-2 lg:col-span-2">
            <Select value={cellFilter} onValueChange={setCellFilter}>
              <SelectTrigger className="h-10 text-xs font-semibold rounded-xl bg-background">
                <SelectValue placeholder="Célula / Pequeno Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os GCs / Células ({cells.length})</SelectItem>
                {availableCells.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    🏠 {(c as any).nome || (c as any).name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* TABELA DE SERVOS */}
      <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-foreground">
              Relação de Voluntários
            </span>
            <Badge variant="secondary" className="font-bold text-xs px-2.5 py-0.5 rounded-full">
              {filteredUsers.length} resultado(s)
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            Altere a área ou equipe do voluntário diretamente nos campos da tabela.
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 h-64 gap-2">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground font-medium">Carregando dados dos voluntários...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Users className="size-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">Nenhum voluntário encontrado para estes filtros.</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Tente redefinir os filtros ou alterar os termos de busca para encontrar outros membros.
            </p>
            <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs font-bold mt-2">
              Limpar Filtros
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[300px] text-xs font-bold">Servo / Voluntário</TableHead>
                  <TableHead className="w-[200px] text-xs font-bold">Área de Serviço</TableHead>
                  <TableHead className="w-[180px] text-xs font-bold">Equipe</TableHead>
                  <TableHead className="w-[240px] text-xs font-bold">Estrutura de GC (Célula / Rede)</TableHead>
                  <TableHead className="text-right w-[90px] text-xs font-bold">Contato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => {
                  const areaObj = areaMap.get(user.serviceAreaId);
                  const teamObj = teamMap.get(user.serviceTeamId);
                  const gcInfo = resolveUserGC(user);
                  const hasWorship = user.worshipRoles && user.worshipRoles.length > 0;
                  const cleanPhone = user.phone ? user.phone.replace(/\D/g, '') : '';
                  const redeNome = (gcInfo.rede as any)?.nome || (gcInfo.rede as any)?.name || '';
                  const redeCor = (gcInfo.rede as any)?.cor || '#EF4444';
                  const areaGcNome = (gcInfo.gcArea as any)?.nome || (gcInfo.gcArea as any)?.name || '';
                  const cellNome = (gcInfo.cell as any)?.nome || (gcInfo.cell as any)?.name || '';

                  return (
                    <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                      {/* MEMBRO / CONTATO */}
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 border shadow-sm shrink-0">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-black">
                              {user.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-xs text-foreground truncate block">
                              {user.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate block">
                              {user.email || 'Sem e-mail'}
                            </span>
                            {user.phone && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Phone className="size-2.5 text-slate-400" />
                                {user.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* ÁREA DE SERVIÇO */}
                      <TableCell className="py-3.5">
                        <div className="space-y-1">
                          <Select
                            value={user.serviceAreaId || (hasWorship ? 'worship_tag' : 'none')}
                            onValueChange={(val) => handleUpdateUserArea(user.id, val)}
                          >
                            <SelectTrigger className="h-8 text-[11px] font-bold rounded-xl max-w-[190px] bg-background">
                              <SelectValue placeholder="Selecionar Área" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-rose-600 font-bold">❌ Sem Área</SelectItem>
                              {areas.map(a => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.areaType === 'worship' ? '🎸 ' : '👋 '}{a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {hasWorship && (
                            <div className="flex items-center gap-1">
                              <Badge className="bg-purple-100 text-purple-750 border-purple-200 text-[9px] font-bold px-1.5 py-0">
                                🎸 Louvor: {user.worshipRoles.join(', ')}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* EQUIPE */}
                      <TableCell className="py-3.5">
                        <Select
                          value={user.serviceTeamId || 'none'}
                          onValueChange={(val) => handleUpdateUserTeam(user.id, val)}
                          disabled={!user.serviceAreaId}
                        >
                          <SelectTrigger className="h-8 text-[11px] font-bold rounded-xl max-w-[160px] bg-background">
                            <SelectValue placeholder="Selecionar Equipe" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-slate-400 font-medium">Nenhuma equipe</SelectItem>
                            {teams.map(t => (
                              <SelectItem key={t.id} value={t.id}>
                                🛡️ {t.name.startsWith('Equipe') ? t.name : `Equipe ${t.name}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* GC & ESTRUTURA */}
                      <TableCell className="py-3.5">
                        <div className="flex flex-col gap-1">
                          {cellNome ? (
                            <span className="text-xs font-bold text-foreground flex items-center gap-1">
                              🏠 {cellNome}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Sem Célula / GC
                            </span>
                          )}

                          <div className="flex flex-wrap items-center gap-1 text-[10px]">
                            {redeNome && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 font-bold border-red-200 text-red-700 bg-red-50/70 dark:bg-red-950/30 dark:text-red-300"
                              >
                                <span className="size-1.5 rounded-full mr-1" style={{ backgroundColor: redeCor }} />
                                Rede {redeNome}
                              </Badge>
                            )}
                            {areaGcNome && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-semibold bg-slate-50 dark:bg-slate-900">
                                📍 {areaGcNome}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* AÇÕES */}
                      <TableCell className="py-3.5 text-right">
                        {cleanPhone ? (
                          <a
                            href={`https://wa.me/55${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center size-8 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition-all shadow-sm"
                            title="Conversar no WhatsApp"
                          >
                            <MessageSquare className="size-4" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

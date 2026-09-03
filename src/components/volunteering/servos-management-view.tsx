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
  UserCheck
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

  // Equipes disponíveis conforme a área selecionada
  const availableTeams = useMemo(() => {
    if (areaFilter === 'all') return teams;
    return teams.filter(t => t.areaId === areaFilter);
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

  // Filtragem dos Servos
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const isServing = Boolean(user.serviceAreaId || (user.worshipRoles && user.worshipRoles.length > 0));

      // Filtro de Status
      if (statusFilter === 'serving' && !isServing) return false;
      if (statusFilter === 'unassigned' && isServing) return false;

      // Filtro de Área de Serviço
      if (areaFilter !== 'all') {
        const matchesRegular = user.serviceAreaId === areaFilter;
        const matchesWorship = user.worshipAreaId === areaFilter || (areaMap.get(areaFilter)?.areaType === 'worship' && user.worshipRoles?.length);
        if (!matchesRegular && !matchesWorship) return false;
      }

      // Filtro de Equipe
      if (teamFilter !== 'all' && user.serviceTeamId !== teamFilter) {
        return false;
      }

      // Dados de Célula do Usuário
      const userCell = user.cellId ? cellMap.get(user.cellId) : null;
      const userRedeId = user.redeId || userCell?.redeId;
      const userGcAreaId = user.areaId || userCell?.areaId;

      // Filtro de Rede
      if (redeFilter !== 'all' && userRedeId !== redeFilter) {
        return false;
      }

      // Filtro de Área de GC
      if (gcAreaFilter !== 'all' && userGcAreaId !== gcAreaFilter) {
        return false;
      }

      // Filtro de Célula
      if (cellFilter !== 'all' && user.cellId !== cellFilter) {
        return false;
      }

      // Filtro de Busca Textual (Nome, E-mail, Telefone)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = user.name?.toLowerCase().includes(term);
        const matchEmail = user.email?.toLowerCase().includes(term);
        const matchPhone = user.phone?.replace(/\D/g, '').includes(term.replace(/\D/g, ''));
        if (!matchName && !matchEmail && !matchPhone) return false;
      }

      return true;
    });
  }, [users, statusFilter, areaFilter, teamFilter, redeFilter, gcAreaFilter, cellFilter, searchTerm, cellMap, areaMap]);

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

  // Exportar para CSV
  const handleExportCsv = () => {
    const headers = ['Nome', 'Email', 'Telefone', 'Área de Serviço', 'Equipe', 'Rede', 'Área GC', 'Célula'];
    const rows = filteredUsers.map(u => {
      const areaObj = areaMap.get(u.serviceAreaId);
      const teamObj = teamMap.get(u.serviceTeamId);
      const cellObj = u.cellId ? cellMap.get(u.cellId) : null;
      const redeObj = (u.redeId || cellObj?.redeId) ? redeMap.get(u.redeId || cellObj?.redeId) : null;
      const gcAreaObj = (u.areaId || cellObj?.areaId) ? gcAreaMap.get(u.areaId || cellObj?.areaId) : null;

      return [
        `"${u.name || ''}"`,
        `"${u.email || ''}"`,
        `"${u.phone || ''}"`,
        `"${areaObj?.name || (u.worshipRoles?.length ? 'Louvor' : 'Sem Área')}"`,
        `"${teamObj?.name || ''}"`,
        `"${(redeObj as any)?.nome || (redeObj as any)?.name || ''}"`,
        `"${(gcAreaObj as any)?.nome || (gcAreaObj as any)?.name || ''}"`,
        `"${(cellObj as any)?.nome || (cellObj as any)?.name || ''}"`
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
        const cellObj = u.cellId ? cellMap.get(u.cellId) : null;
        const redeObj = (u.redeId || cellObj?.redeId) ? redeMap.get(u.redeId || cellObj?.redeId) : null;
        const gcAreaObj = (u.areaId || cellObj?.areaId) ? gcAreaMap.get(u.areaId || cellObj?.areaId) : null;

        return {
          nome: u.name,
          email: u.email || '',
          telefone: u.phone || '',
          area: areaObj?.name || (u.worshipRoles?.length ? 'Louvor' : ''),
          equipe: teamObj?.name || '',
          rede: (redeObj as any)?.nome || (redeObj as any)?.name || '',
          areaGc: (gcAreaObj as any)?.nome || (gcAreaObj as any)?.name || '',
          celula: (cellObj as any)?.nome || (cellObj as any)?.name || ''
        };
      }),
      _referencia_areas_e_equipes: {
        _aviso: 'Lista de áreas e equipes cadastradas para referência da IA.',
        areasDisponiveis: areas.map(a => ({
          nome: a.name,
          tipo: a.areaType || 'regular',
          equipes: teams.filter(t => t.areaId === a.id).map(t => t.name)
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
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <HandHelping className="size-6 text-primary" />
            Servos & Voluntários
          </h2>
          <p className="text-xs text-muted-foreground">
            Gerencie e filtre todos os voluntários da igreja por área de serviço, equipe e estrutura de GC.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 text-xs font-bold gap-1.5 bg-background shadow-sm"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600" />
            Exportar CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            className="h-8 text-xs font-bold gap-1.5 bg-background shadow-sm"
          >
            <FileJson className="size-3.5 text-blue-600" />
            Exportar JSON
          </Button>

          <ImportVolunteersJsonDialog />
        </div>
      </div>

      {/* CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Servos Ativos</p>
            <p className="text-2xl font-black text-foreground mt-0.5">{stats.serving}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Em alguma área ou louvor</p>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <UserCheck className="size-5" />
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Louvor & Worship</p>
            <p className="text-2xl font-black text-purple-600 mt-0.5">{stats.worship}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Vozes e Instrumentistas</p>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400">
            <Music className="size-5" />
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Sem Área (Potenciais)</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{stats.unassigned}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Disponíveis para servir</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            <AlertCircle className="size-5" />
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total de Membros</p>
            <p className="text-2xl font-black text-foreground mt-0.5">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Cadastros no sistema</p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
            <Users className="size-5" />
          </div>
        </div>
      </div>

      {/* PAINEL DE FILTROS AVANÇADOS */}
      <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Filtros de Busca</span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <RotateCcw className="size-3" />
            Limpar Filtros
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* Busca Textual */}
          <div className="relative sm:col-span-2 md:col-span-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou tel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 text-xs pl-8 rounded-xl"
            />
          </div>

          {/* Status */}
          <div>
            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="h-9 text-xs rounded-xl">
                <SelectValue placeholder="Status de Serviço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="serving">👥 Servos Ativos</SelectItem>
                <SelectItem value="unassigned">⚠️ Sem Área (Não Servos)</SelectItem>
                <SelectItem value="all">📋 Todos os Membros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Área de Serviço */}
          <div>
            <Select value={areaFilter} onValueChange={(val) => { setAreaFilter(val); setTeamFilter('all'); }}>
              <SelectTrigger className="h-9 text-xs rounded-xl">
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
              <SelectTrigger className="h-9 text-xs rounded-xl">
                <SelectValue placeholder="Equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Equipes</SelectItem>
                {availableTeams.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    🛡️ {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rede de GC */}
          <div>
            <Select value={redeFilter} onValueChange={(val) => { setRedeFilter(val); setGcAreaFilter('all'); setCellFilter('all'); }}>
              <SelectTrigger className="h-9 text-xs rounded-xl">
                <SelectValue placeholder="Rede de GC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Redes</SelectItem>
                {redes.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    🔴 {(r as any).nome || (r as any).name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Área de GC */}
          <div>
            <Select value={gcAreaFilter} onValueChange={(val) => { setGcAreaFilter(val); setCellFilter('all'); }}>
              <SelectTrigger className="h-9 text-xs rounded-xl">
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
          <div className="sm:col-span-2 md:col-span-2">
            <Select value={cellFilter} onValueChange={setCellFilter}>
              <SelectTrigger className="h-9 text-xs rounded-xl">
                <SelectValue placeholder="Célula / Pequeno Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os GCs / Células</SelectItem>
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
      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              Voluntários Filtrados
            </span>
            <Badge variant="secondary" className="font-bold text-xs">
              {filteredUsers.length} resultado(s)
            </Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12 h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <p className="text-sm font-medium">Nenhum servo encontrado com os filtros selecionados.</p>
            <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs">
              Limpar Filtros
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[280px]">Servo / Voluntário</TableHead>
                  <TableHead className="w-[200px]">Área de Serviço</TableHead>
                  <TableHead className="w-[180px]">Equipe</TableHead>
                  <TableHead className="w-[220px]">GC & Estrutura</TableHead>
                  <TableHead className="text-right w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => {
                  const areaObj = areaMap.get(user.serviceAreaId);
                  const teamObj = teamMap.get(user.serviceTeamId);
                  const cellObj = user.cellId ? cellMap.get(user.cellId) : null;
                  const redeObj = (user.redeId || cellObj?.redeId) ? redeMap.get(user.redeId || cellObj?.redeId) : null;
                  const gcAreaObj = (user.areaId || cellObj?.areaId) ? gcAreaMap.get(user.areaId || cellObj?.areaId) : null;
                  const hasWorship = user.worshipRoles && user.worshipRoles.length > 0;
                  const cleanPhone = user.phone ? user.phone.replace(/\D/g, '') : '';

                  return (
                    <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                      {/* MEMBRO / CONTATO */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
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
                      <TableCell>
                        <div className="space-y-1">
                          <Select
                            value={user.serviceAreaId || (hasWorship ? 'worship_tag' : 'none')}
                            onValueChange={(val) => handleUpdateUserArea(user.id, val)}
                          >
                            <SelectTrigger className="h-7 text-[11px] font-bold rounded-lg max-w-[180px]">
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
                              <Badge className="bg-purple-100 text-purple-750 border-purple-200 text-[9px] font-bold">
                                🎸 Louvor: {user.worshipRoles.join(', ')}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* EQUIPE */}
                      <TableCell>
                        <Select
                          value={user.serviceTeamId || 'none'}
                          onValueChange={(val) => handleUpdateUserTeam(user.id, val)}
                          disabled={!user.serviceAreaId}
                        >
                          <SelectTrigger className="h-7 text-[11px] font-bold rounded-lg max-w-[160px]">
                            <SelectValue placeholder="Selecionar Equipe" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-slate-400 font-medium">Nenhuma equipe</SelectItem>
                            {teams
                              .filter(t => !user.serviceAreaId || t.areaId === user.serviceAreaId || !t.areaId)
                              .map(t => (
                                <SelectItem key={t.id} value={t.id}>
                                  🛡️ {t.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* GC & ESTRUTURA */}
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {cellObj ? (
                            <span className="text-xs font-bold text-foreground flex items-center gap-1">
                              🏠 {(cellObj as any).nome || (cellObj as any).name}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Sem Célula / GC
                            </span>
                          )}

                          <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                            {redeObj && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 font-bold border-red-200 text-red-700 bg-red-50/50">
                                {(redeObj as any).nome || (redeObj as any).name}
                              </Badge>
                            )}
                            {gcAreaObj && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 font-semibold">
                                {(gcAreaObj as any).nome || (gcAreaObj as any).name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* AÇÕES */}
                      <TableCell className="text-right">
                        {cleanPhone ? (
                          <a
                            href={`https://wa.me/55${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center size-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-200"
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

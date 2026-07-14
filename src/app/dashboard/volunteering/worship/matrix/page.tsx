'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorshipProvider, useWorship, WorshipPlan, NeededPosition } from '@/contexts/worship-context';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useVolunteeringServiceData } from '@/hooks/useDomainData';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useMembersData, useEventsData } from '@/hooks/useDomainData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ChevronLeft,
  Calendar,
  Save,
  Loader2,
  Users,
  Grid3X3,
  CalendarDays,
  UserPlus2,
  Trash2,
  Plus,
  Sparkles
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSunday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const months = [
  { value: '0', label: 'Janeiro' },
  { value: '1', label: 'Fevereiro' },
  { value: '2', label: 'Março' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Maio' },
  { value: '5', label: 'Junho' },
  { value: '6', label: 'Julho' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Setembro' },
  { value: '9', label: 'Outubro' },
  { value: '10', label: 'Novembro' },
  { value: '11', label: 'Dezembro' }
];

const currentYear = new Date().getFullYear();
const years = [currentYear - 1, currentYear, currentYear + 1];

function MatrixViewInner() {
  const router = useRouter();
  const { plans, isLoading: isWorshipLoading, updatePlan, createPlan } = useWorship();
  const { users, isLoading: isMembersLoading } = useMembersData();
  const { events, isLoading: isEventsLoading } = useEventsData();
  const { updateArea } = useVolunteering();
  const { serviceAreas, isLoading: isAreasLoading } = useVolunteeringServiceData();
  const { toast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Keep track of pending edits in-memory before saving to Firestore
  // Key format: `${planId_or_date}::${role}` -> NeededPosition
  const [editedPositions, setEditedPositions] = useState<Record<string, NeededPosition>>({});

  // Dialog State for assigning volunteer
  const [assignmentCell, setAssignmentCell] = useState<{
    dateStr: string;
    planId?: string; // empty if virtual/to-be-created
    role: string;
    currentPosition?: NeededPosition;
  } | null>(null);

  // Search filter for volunteers in dialog
  const [userSearch, setUserSearch] = useState('');

  // 1. Resolve selected Area
  const selectedArea = useMemo(() => {
    if (!serviceAreas || serviceAreas.length === 0) return null;
    if (selectedAreaId) {
      return serviceAreas.find(a => a.id === selectedAreaId) || null;
    }
    // Autoselect Area containing "louvor" or "worship" or fallback to first
    const worshipArea = serviceAreas.find(a => {
      const lower = a.name.toLowerCase();
      return lower.includes('louvor') || lower.includes('worship');
    });
    return worshipArea || serviceAreas[0];
  }, [serviceAreas, selectedAreaId]);

  // Sync selectedAreaId when component loads or serviceAreas resolves
  useEffect(() => {
    if (selectedArea && !selectedAreaId) {
      setSelectedAreaId(selectedArea.id);
    }
  }, [selectedArea, selectedAreaId]);

  // Fallback Roles logic
  const getAreaFallbackRoles = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('louvor') || lower.includes('worship')) {
      return ['Dirigente', 'Líder de Louvor', 'Teclado', 'Guitarra', 'Violão', 'Baixo', 'Bateria', 'Backing Vocal'];
    }
    if (lower.includes('técnica') || lower.includes('som') || lower.includes('mídia') || lower.includes('tecnica') || lower.includes('midia')) {
      return ['Sonoplasta', 'Projeção', 'Câmera 1', 'Câmera 2', 'Diretor de TV', 'Iluminação'];
    }
    return ['Coordenador', 'Voluntário 1', 'Voluntário 2', 'Apoio'];
  };

  const areaRoles = useMemo(() => {
    if (!selectedArea) return [];
    return selectedArea.roles || getAreaFallbackRoles(selectedArea.name);
  }, [selectedArea]);

  // 2. Calculate Sunday dates for the selected month/year
  const sundays = useMemo(() => {
    const start = startOfMonth(new Date(selectedYear, selectedMonth, 1));
    const end = endOfMonth(new Date(selectedYear, selectedMonth, 1));
    const days = eachDayOfInterval({ start, end });
    return days.filter(d => isSunday(d));
  }, [selectedMonth, selectedYear]);

  // 3. Fetch plans matching these sundays
  const matrixPlans = useMemo(() => {
    return sundays.map(sunday => {
      const dateStr = format(sunday, 'yyyy-MM-dd');
      // Find existing plan for this day
      const existing = plans.find(p => p.date === dateStr);
      if (existing) return existing;

      // Return a virtual shell
      const virtualPlan: WorshipPlan = {
        id: `virtual-${dateStr}`,
        title: `Culto de Domingo - ${format(sunday, 'dd/MM')}`,
        date: dateStr,
        startTime: '18:00',
        items: [],
        tenantId: plans[0]?.tenantId || '',
        isVirtual: true,
        neededPositions: []
      };
      return virtualPlan;
    });
  }, [sundays, plans]);

  // Get current position at cell, considering in-memory edits
  const getCellPosition = (plan: WorshipPlan, role: string) => {
    const editKey = `${plan.id}::${role}`;
    if (editedPositions[editKey] !== undefined) {
      return editedPositions[editKey];
    }
    return plan.neededPositions?.find(pos => pos.role === role);
  };

  const handleCellClick = (plan: WorshipPlan, role: string) => {
    const currentPos = getCellPosition(plan, role);
    setAssignmentCell({
      dateStr: plan.date,
      planId: plan.isVirtual ? undefined : plan.id,
      role,
      currentPosition: currentPos
    });
    setUserSearch('');
  };

  const handleAssignMember = (userId: string | null) => {
    if (!assignmentCell) return;
    const { dateStr, planId, role, currentPosition } = assignmentCell;
    const planKey = planId || `virtual-${dateStr}`;
    const editKey = `${planKey}::${role}`;

    if (userId === null) {
      // Remove volunteer
      const updatedPos: NeededPosition = {
        id: currentPosition?.id || Math.random().toString(36).substring(2, 9),
        role,
        status: 'draft',
        userId: undefined,
        userName: undefined
      };
      setEditedPositions(prev => ({
        ...prev,
        [editKey]: updatedPos
      }));
    } else {
      const member = users.find(u => u.id === userId);
      if (member) {
        const updatedPos: NeededPosition = {
          id: currentPosition?.id || Math.random().toString(36).substring(2, 9),
          role,
          status: 'draft',
          userId: member.id,
          userName: member.name
        };
        setEditedPositions(prev => ({
          ...prev,
          [editKey]: updatedPos
        }));
      }
    }

    setAssignmentCell(null);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // Group edits by plan (id or date)
      const editsByPlanKey: Record<string, Record<string, NeededPosition>> = {};
      Object.entries(editedPositions).forEach(([key, position]) => {
        const [planKey, role] = key.split('::');
        if (!editsByPlanKey[planKey]) {
          editsByPlanKey[planKey] = {};
        }
        editsByPlanKey[planKey][role] = position;
      });

      // Save each plan update
      for (const [planKey, roleEdits] of Object.entries(editsByPlanKey)) {
        let planId = planKey;
        let planObj = plans.find(p => p.id === planKey);

        if (planKey.startsWith('virtual-')) {
          const dateStr = planKey.replace('virtual-', '');
          const sundayDate = parseISO(dateStr);
          // Create new physical plan first
          const newId = await createPlan({
            title: `Culto de Domingo - ${format(sundayDate, 'dd/MM')}`,
            date: dateStr,
            startTime: '18:00',
            items: []
          });
          planId = newId;
          // Find the newly created plan in memory (or approximate shell)
          planObj = {
            id: newId,
            title: `Culto de Domingo - ${format(sundayDate, 'dd/MM')}`,
            date: dateStr,
            startTime: '18:00',
            items: [],
            tenantId: plans[0]?.tenantId || '',
            neededPositions: []
          };
        }

        if (planObj) {
          // Merge current neededPositions with edited ones
          const currentPositions = planObj.neededPositions || [];
          const updatedPositions = [...currentPositions];

          Object.entries(roleEdits).forEach(([role, newPos]) => {
            const index = updatedPositions.findIndex(pos => pos.role === role);
            if (index > -1) {
              if (!newPos.userId) {
                // If removed user, keeping role placeholder but with undefined user
                updatedPositions[index] = { ...updatedPositions[index], userId: undefined, userName: undefined, status: 'draft' };
              } else {
                updatedPositions[index] = { ...updatedPositions[index], ...newPos };
              }
            } else {
              // Add new role assignment if user is set
              if (newPos.userId) {
                updatedPositions.push(newPos);
              }
            }
          });

          await updatePlan(planId, {
            neededPositions: updatedPositions
          });
        }
      }

      setEditedPositions({});
      toast({
        title: 'Sucesso! 🎉',
        description: 'Todas as alterações na escala foram salvas no Firestore.'
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao atualizar as escalas.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRole = async () => {
    if (!selectedArea || !newRoleName.trim()) return;
    const cleanName = newRoleName.trim();
    if (areaRoles.includes(cleanName)) {
      toast({
        title: 'Função já existe',
        description: 'Esta função já está cadastrada nesta área.',
        variant: 'destructive'
      });
      return;
    }
    try {
      await updateArea(selectedArea.id, {
        roles: [...areaRoles, cleanName]
      });
      setNewRoleName('');
      setShowAddRoleDialog(false);
      toast({
        title: 'Função adicionada',
        description: `A função "${cleanName}" foi adicionada a "${selectedArea.name}".`
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao adicionar função',
        description: 'Não foi possível salvar a alteração.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRole = async (roleToDelete: string) => {
    if (!selectedArea) return;
    try {
      await updateArea(selectedArea.id, {
        roles: areaRoles.filter(r => r !== roleToDelete)
      });
      toast({
        title: 'Função removida',
        description: `A função "${roleToDelete}" foi removida com sucesso.`
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao remover função',
        description: 'Não foi possível remover a função do Firestore.',
        variant: 'destructive'
      });
    }
  };

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    return users.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase()));
  }, [users, userSearch]);

  const isLoading = isWorshipLoading || isMembersLoading || isEventsLoading || isAreasLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[75vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasUnsavedChanges = Object.keys(editedPositions).length > 0;

  return (
    <div className="space-y-6 pt-16 px-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl"
            onClick={() => router.push('/dashboard/volunteering/worship')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Grid3X3 className="size-5 text-primary" /> Matrix de Escalas worship
            </h2>
            <p className="text-xs text-slate-400 font-medium">Agendamento rápido de voluntários multi-semanas para domingo</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex flex-wrap items-center gap-2">
            {/* Area of Service Selector */}
            <Select value={selectedAreaId} onValueChange={v => { setSelectedAreaId(v); setEditedPositions({}); }}>
              <SelectTrigger className="w-[180px] bg-slate-50/50 hover:bg-slate-50 border-slate-200 h-9 rounded-xl text-sm font-medium">
                <SelectValue placeholder="Selecione a Área" />
              </SelectTrigger>
              <SelectContent>
                {serviceAreas.map(area => (
                  <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMonth.toString()} onValueChange={v => { setSelectedMonth(parseInt(v)); setEditedPositions({}); }}>
              <SelectTrigger className="w-[140px] bg-slate-50/50 hover:bg-slate-50 border-slate-200 h-9 rounded-xl text-sm font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear.toString()} onValueChange={v => { setSelectedYear(parseInt(v)); setEditedPositions({}); }}>
              <SelectTrigger className="w-[100px] bg-slate-50/50 hover:bg-slate-50 border-slate-200 h-9 rounded-xl text-sm font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSaveAll}
            disabled={!hasUnsavedChanges || isSaving}
            className="bg-primary hover:bg-primary/95 text-white shadow-sm h-9 rounded-xl px-4 text-xs font-semibold gap-2 ml-auto md:ml-0"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Salvar Matriz
          </Button>
        </div>
      </div>

      {hasUnsavedChanges && (
        <div className="flex items-center justify-between bg-amber-50/80 border border-amber-200/60 rounded-xl px-4 py-3 text-xs text-amber-800 animate-fade-in shadow-sm">
          <span className="font-semibold flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500 animate-pulse" /> Você tem alterações pendentes que não foram salvas no servidor.
          </span>
          <Button size="sm" variant="ghost" className="h-7 text-amber-900 hover:bg-amber-100 font-bold" onClick={handleSaveAll}>
            Salvar Agora
          </Button>
        </div>
      )}

      {/* Matrix Table Grid */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-4 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider sticky left-0 bg-slate-50 z-10 border-r border-slate-200 w-[200px]">
                  Função (Role)
                </th>
                {matrixPlans.map(plan => {
                  const sundayDate = parseISO(plan.date);
                  return (
                    <th key={plan.id} className="py-4 px-4 font-bold text-slate-800 text-center min-w-[160px] border-r border-slate-200">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {format(sundayDate, 'EEEE', { locale: ptBR })}
                        </span>
                        <span className="text-sm font-black text-slate-800 mt-0.5">
                          {format(sundayDate, "dd 'de' MMM", { locale: ptBR })}
                        </span>
                        {plan.isVirtual ? (
                          <span className="inline-block mt-1.5 px-2 py-0.5 text-[9px] font-black text-slate-400 bg-slate-100 rounded-full">
                            Sem Ordem
                          </span>
                        ) : (
                          <span className="inline-block mt-1.5 px-2 py-0.5 text-[9px] font-black text-emerald-600 bg-emerald-50 rounded-full border border-emerald-200/40">
                            Ativo
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {areaRoles.map(role => (
                <tr key={role} className="hover:bg-slate-50/40 transition-colors group/row">
                  <td className="py-4 px-6 font-bold text-slate-700 text-xs sticky left-0 bg-white hover:bg-slate-55 z-10 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span>{role}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRole(role)}
                        className="size-6 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover/row:opacity-100 transition-opacity"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                  {matrixPlans.map(plan => {
                    const cellPos = getCellPosition(plan, role);
                    const isEdited = editedPositions[`${plan.id}::${role}`] !== undefined;

                    return (
                      <td
                        key={plan.id}
                        onClick={() => handleCellClick(plan, role)}
                        className={`py-3 px-4 border-r border-slate-150 cursor-pointer text-center relative group min-h-[64px] transition-all hover:bg-slate-50/80 ${
                          isEdited ? 'bg-amber-50/10' : ''
                        }`}
                      >
                        {cellPos?.userId ? (
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <Avatar className="h-7 w-7 border border-slate-200">
                              <AvatarImage src="" />
                              <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">
                                {cellPos.userName?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[11px] font-bold text-slate-700 truncate max-w-[140px]">
                              {cellPos.userName}
                            </span>
                            {isEdited && (
                              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" title="Alteração pendente" />
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-2 text-slate-300 hover:text-slate-600 transition-colors">
                            <UserPlus2 className="size-4 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                            <span className="text-[10px] font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Escalar</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Elegant Button to Add Role in the left column */}
              <tr className="hover:bg-slate-50/40 transition-colors">
                <td className="py-3 px-6 sticky left-0 bg-white hover:bg-slate-50 z-10 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowAddRoleDialog(true)}
                    className="text-xs font-semibold text-primary hover:text-primary hover:bg-primary/5 flex items-center gap-1.5 w-full justify-start h-8 rounded-lg"
                  >
                    <Plus className="size-3.5" /> Adicionar Função
                  </Button>
                </td>
                <td colSpan={matrixPlans.length} className="bg-slate-50/10"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={!!assignmentCell} onOpenChange={open => !open && setAssignmentCell(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">
              Escalar Voluntário - {assignmentCell?.role}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Escolha um voluntário da equipe para o dia{' '}
              {assignmentCell && format(parseISO(assignmentCell.dateStr), "dd 'de' MMMM", { locale: ptBR })}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <input
              type="text"
              placeholder="Buscar voluntário..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="w-full text-xs h-9 border border-slate-200 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-slate-50/50"
            />

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl bg-white pr-1">
              {filteredUsers.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">Nenhum voluntário encontrado.</p>
              ) : (
                filteredUsers.map(member => (
                  <button
                    key={member.id}
                    onClick={() => handleAssignMember(member.id)}
                    className="w-full flex items-center justify-between p-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="bg-primary/5 text-primary text-[9px] font-bold">
                          {member.name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{member.name}</span>
                    </div>
                    {assignmentCell?.currentPosition?.userId === member.id && (
                      <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/40">
                        Atual
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between items-center border-t border-slate-100 pt-4 mt-2">
            {assignmentCell?.currentPosition?.userId ? (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-55 hover:text-red-700 border-red-200 font-bold text-xs gap-1.5"
                onClick={() => handleAssignMember(null)}
              >
                <Trash2 className="size-3.5" /> Remover voluntário
              </Button>
            ) : (
              <div />
            )}
            <Button variant="ghost" size="sm" className="text-xs font-bold text-slate-500" onClick={() => setAssignmentCell(null)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Role Dialog */}
      <Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">
              Adicionar Função
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Digite o nome da nova função a ser adicionada na Área de Serviço "{selectedArea?.name}".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <Label htmlFor="roleName" className="text-xs font-bold text-slate-600">Nome da Função</Label>
            <Input
              id="roleName"
              placeholder="Ex: Baixo, Backing Vocal, Projeção"
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
              className="text-xs rounded-xl"
            />
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-xs font-bold text-slate-500" onClick={() => { setShowAddRoleDialog(false); setNewRoleName(''); }}>
              Cancelar
            </Button>
            <Button size="sm" className="text-xs font-bold bg-primary text-white hover:bg-primary/90" onClick={handleAddRole}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ScaleMatrixPage() {
  return (
    <WorshipProvider>
      <MatrixViewInner />
    </WorshipProvider>
  );
}

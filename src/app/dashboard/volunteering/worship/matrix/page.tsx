'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorshipProvider, useWorship, WorshipPlan, NeededPosition } from '@/contexts/worship-context';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
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
import { useDoc } from '@/firebase';

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

type MatrixColumn = {
  id: string; // Unique ID for keying, e.g. "group-2026-07-05-Manhã" or "event-2026-07-05-eventId"
  date: string; // YYYY-MM-DD
  title: string; // Display title, e.g. "Manhã" or "Culto clássico"
  subtitle?: string; // Display subtitle, e.g. "Clássico / Família"
  isUnified: boolean;
  eventIds: string[]; // List of event IDs associated with this column
  eventNames: string[]; // List of event names associated with this column
  plans: WorshipPlan[]; // List of physical plans on this Sunday date that belong to this column
  isVirtual: boolean; // True if no physical plan exists for ANY event in this column
};

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
  const { data: tenantConfig } = useDoc<any>('config/tenant_details');
  const dualServiceRuleActive = tenantConfig?.volunteeringRules?.worshipDualService || false;

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Keep track of pending edits in-memory before saving to Firestore
  // Key format: `${columnId}::${role}` -> NeededPosition
  const [editedPositions, setEditedPositions] = useState<Record<string, NeededPosition>>({});

  // Dialog State for assigning volunteer
  const [assignmentCell, setAssignmentCell] = useState<{
    column: MatrixColumn;
    role: string;
    currentPosition?: NeededPosition;
  } | null>(null);

  // Search filter for volunteers in dialog
  const [userSearch, setUserSearch] = useState('');

  // DM Checkbox state
  const [isDmCheckbox, setIsDmCheckbox] = useState(false);

  // 1. Resolve selected Area (Locked to Louvor / Worship)
  const selectedArea = useMemo(() => {
    if (!serviceAreas || serviceAreas.length === 0) return null;
    const worshipArea = serviceAreas.find(a => {
      const lower = a.name.toLowerCase();
      return lower.includes('louvor') || lower.includes('worship');
    });
    return worshipArea || serviceAreas[0];
  }, [serviceAreas]);

  // Sync selectedAreaId when component loads or serviceAreas resolves
  useEffect(() => {
    if (selectedArea) {
      setSelectedAreaId(selectedArea.id);
    }
  }, [selectedArea]);

  // Fallback Roles logic
  const getAreaFallbackRoles = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('louvor') || lower.includes('worship')) {
      return ['Lead', 'Back 1', 'Back 2', 'Guitarra', 'Baixo', 'Bateria', 'Violão', 'Teclado'];
    }
    if (lower.includes('técnica') || lower.includes('som') || lower.includes('mídia') || lower.includes('tecnica') || lower.includes('midia')) {
      return ['Sonoplasta', 'Projeção', 'Câmera 1', 'Câmera 2', 'Diretor de TV', 'Iluminação'];
    }
    return ['Coordenador', 'Voluntário 1', 'Voluntário 2', 'Apoio'];
  };

  const areaRoles = useMemo(() => {
    if (!selectedArea) return [];
    if (selectedArea.roles && selectedArea.roles.length > 0) {
      return selectedArea.roles;
    }
    const lower = selectedArea.name.toLowerCase();
    if (lower.includes('louvor') || lower.includes('worship')) {
      return ['Lead', 'Backing Vocal', 'Backing Vocal 2', 'Guitarra', 'Baixo', 'Bateria', 'Violão', 'Teclado'];
    }
    return getAreaFallbackRoles(selectedArea.name);
  }, [selectedArea]);

  // 2. Calculate Sunday dates for the selected month/year
  const sundays = useMemo(() => {
    const start = startOfMonth(new Date(selectedYear, selectedMonth, 1));
    const end = endOfMonth(new Date(selectedYear, selectedMonth, 1));
    const days = eachDayOfInterval({ start, end });
    return days.filter(d => isSunday(d));
  }, [selectedMonth, selectedYear]);

  // 3. Filter Sunday template events
  const sundayEvents = useMemo(() => {
    if (!events) return [];
    return events.filter(e => {
      const day = e.dayOfWeek?.toLowerCase();
      return day === 'domingo' || day === 'sunday';
    });
  }, [events]);

  // 4. Generate dynamic Matrix Columns (handles unified vs individual scheduling)
  const matrixColumns = useMemo(() => {
    const cols: MatrixColumn[] = [];
    sundays.forEach(sunday => {
      const dateStr = format(sunday, 'yyyy-MM-dd');
      const dayPlans = plans.filter(p => p.date === dateStr);

      const matchedEventIds = new Set<string>();
      
      const mode = selectedArea?.scheduleMode || (selectedArea?.unifiedCelebrations ? 'grouped' : 'individual');

      // Grouped scheduling logic
      if (mode === 'grouped') {
        const groups = selectedArea?.serviceGroups || selectedArea?.unifiedGroups?.map((ug: any) => {
          const matchedIds = sundayEvents
            .filter(e => ug.eventNames.some((name: string) => e.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(e.name.toLowerCase())))
            .map(e => e.id);
          return {
            name: ug.name,
            eventIds: matchedIds
          };
        }) || [];

        groups.forEach((group: any) => {
          const groupEvents = sundayEvents.filter(e => group.eventIds?.includes(e.id));

          if (groupEvents.length > 0) {
            const groupEventIds = groupEvents.map(e => e.id);
            const groupEventNames = groupEvents.map(e => e.name);

            groupEvents.forEach(e => matchedEventIds.add(e.id));

            const matchedPlans = dayPlans.filter(p =>
              groupEvents.some(ge => ge.id === p.serviceEventId || ge.name === p.serviceEventName || p.title === ge.name)
            );

            cols.push({
              id: `group-${dateStr}-${group.name}`,
              date: dateStr,
              title: group.name,
              subtitle: groupEvents.map(e => e.name.replace(/culto/gi, '').trim()).join(' / '),
              isUnified: true,
              eventIds: groupEventIds,
              eventNames: groupEventNames,
              plans: matchedPlans,
              isVirtual: matchedPlans.length === 0
            });
          }
        });
      } else if (mode === 'unified') {
        // Unified mode: single column for the entire Sunday, combining all events
        if (sundayEvents.length > 0) {
          cols.push({
            id: `unified-${dateStr}`,
            date: dateStr,
            title: `Todos os Cultos`,
            subtitle: sundayEvents.map(e => e.name.replace(/culto/gi, '').trim()).join(' / '),
            isUnified: true,
            eventIds: sundayEvents.map(e => e.id),
            eventNames: sundayEvents.map(e => e.name),
            plans: dayPlans,
            isVirtual: dayPlans.length === 0
          });
          sundayEvents.forEach(e => matchedEventIds.add(e.id));
        }
      }

      // Add unmatched template events as individual columns
      const unmatchedEvents = sundayEvents.filter(e => !matchedEventIds.has(e.id));
      unmatchedEvents.forEach(e => {
        const matchedPlan = dayPlans.find(p => p.serviceEventId === e.id || p.serviceEventName === e.name || p.title === e.name);
        cols.push({
          id: `event-${dateStr}-${e.id}`,
          date: dateStr,
          title: e.name,
          subtitle: e.time,
          isUnified: false,
          eventIds: [e.id],
          eventNames: [e.name],
          plans: matchedPlan ? [matchedPlan] : [],
          isVirtual: !matchedPlan
        });
      });

      // If no events matched and no columns generated, fallback to a raw Sunday column
      if (cols.filter(c => c.date === dateStr).length === 0) {
        cols.push({
          id: `sunday-${dateStr}`,
          date: dateStr,
          title: `Culto de Domingo`,
          subtitle: `Fim de semana`,
          isUnified: false,
          eventIds: [],
          eventNames: [],
          plans: dayPlans[0] ? [dayPlans[0]] : [],
          isVirtual: !dayPlans[0]
        });
      }
    });

    // Sort columns chronologically by date
    return cols.sort((a, b) => a.date.localeCompare(b.date));
  }, [sundays, plans, sundayEvents, selectedArea]);

  // Get current position at cell, considering in-memory edits
  const getCellPosition = (column: MatrixColumn, role: string) => {
    const editKey = `${column.id}::${role}`;
    if (editedPositions[editKey] !== undefined) {
      return editedPositions[editKey];
    }
    // Return first available position from existing physical plans in this column
    for (const plan of column.plans) {
      const pos = plan.neededPositions?.find(p => p.role === role);
      if (pos) return pos;
    }
    return undefined;
  };

  const handleCellClick = (column: MatrixColumn, role: string) => {
    const currentPos = getCellPosition(column, role);
    setAssignmentCell({
      column,
      role,
      currentPosition: currentPos
    });
    setUserSearch('');
    setIsDmCheckbox(currentPos?.isDM || false);
  };

  const handleToggleDm = (checked: boolean) => {
    setIsDmCheckbox(checked);
    if (!assignmentCell) return;
    const { column, role, currentPosition } = assignmentCell;
    const editKey = `${column.id}::${role}`;

    // Se houver alguém escalado (ou já selecionado na célula), atualiza seu status de DM nas editedPositions
    const existingPos = editedPositions[editKey] || currentPosition;
    if (existingPos && (existingPos.userId || existingPos.userName)) {
      setEditedPositions(prev => ({
        ...prev,
        [editKey]: {
          ...existingPos,
          isDM: checked
        }
      }));
    }
  };

  const handleAssignMember = (userId: string | null) => {
    if (!assignmentCell) return;
    const { column, role, currentPosition } = assignmentCell;
    const editKey = `${column.id}::${role}`;

    if (userId === null) {
      // Remove volunteer
      const updatedPos: NeededPosition = {
        id: currentPosition?.id || Math.random().toString(36).substring(2, 9),
        role,
        status: 'draft',
        userId: undefined,
        userName: undefined,
        isDM: false
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
          userName: member.name,
          isDM: isDmCheckbox
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
      // Group edits by column ID
      const editsByColumnId: Record<string, Record<string, NeededPosition>> = {};
      Object.entries(editedPositions).forEach(([key, position]) => {
        const [columnId, role] = key.split('::');
        if (!editsByColumnId[columnId]) {
          editsByColumnId[columnId] = {};
        }
        editsByColumnId[columnId][role] = position;
      });

      // Process edits for each column
      for (const [columnId, roleEdits] of Object.entries(editsByColumnId)) {
        // Find corresponding column from matrixColumns
        const col = matrixColumns.find(c => c.id === columnId);
        if (!col) continue;

        // Ensure we create/update a physical plan for all events in this column
        const eventsToProcess = col.eventIds.length > 0 
          ? col.eventIds.map((id, idx) => ({ id, name: col.eventNames[idx] }))
          : [{ id: undefined, name: col.title }];

        for (const evt of eventsToProcess) {
          // Find existing plan for this event on this date
          let planObj = plans.find(p => p.date === col.date && (
            (evt.id && p.serviceEventId === evt.id) ||
            p.serviceEventName === evt.name ||
            p.title === evt.name
          ));

          let planId = planObj?.id;

          if (!planObj) {
            // Create a physical plan for this event
            const sundayDate = parseISO(col.date);
            const matchedEvt = events.find(e => e.id === evt.id);
            const startTime = matchedEvt?.time || '18:00';
            
            const newId = await createPlan({
              title: evt.name || `Culto de Domingo - ${format(sundayDate, 'dd/MM')}`,
              date: col.date,
              startTime,
              serviceEventId: evt.id || undefined,
              serviceEventName: evt.name || undefined,
              items: [],
              neededPositions: []
            });
            planId = newId;
            planObj = {
              id: newId,
              title: evt.name || `Culto de Domingo - ${format(sundayDate, 'dd/MM')}`,
              date: col.date,
              startTime,
              items: [],
              tenantId: plans[0]?.tenantId || '',
              neededPositions: []
            };
          }

          if (planObj && planId) {
            // Merge current neededPositions with edited ones
            const currentPositions = planObj.neededPositions || [];
            const updatedPositions = [...currentPositions];

            Object.entries(roleEdits).forEach(([role, newPos]) => {
              const index = updatedPositions.findIndex(pos => pos.role === role);
              if (index > -1) {
                if (!newPos.userId) {
                  // Remove volunteer
                  updatedPositions[index] = {
                    ...updatedPositions[index],
                    userId: undefined,
                    userName: undefined,
                    status: 'draft'
                  };
                } else {
                  // Update volunteer
                  updatedPositions[index] = {
                    ...updatedPositions[index],
                    userId: newPos.userId,
                    userName: newPos.userName,
                    status: 'draft',
                    isDM: newPos.isDM
                  };
                }
              } else {
                // Add new position
                if (newPos.userId) {
                  updatedPositions.push({
                    id: Math.random().toString(36).substring(2, 9),
                    role,
                    userId: newPos.userId,
                    userName: newPos.userName,
                    status: 'draft',
                    isDM: newPos.isDM
                  });
                }
              }
            });

            await updatePlan(planId, {
              neededPositions: updatedPositions
            });
          }
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
    let list = users;
    if (userSearch) {
      list = users.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase()));
    }
    return [...list].sort((a, b) => {
      const role = assignmentCell?.role;
      if (role) {
        const aEligible = a.worshipRoles?.includes(role) ? 1 : 0;
        const bEligible = b.worshipRoles?.includes(role) ? 1 : 0;
        if (aEligible !== bEligible) return bEligible - aEligible;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [users, userSearch, assignmentCell]);

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
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Grid3X3 className="size-5 text-primary" /> Matrix de Escalas {selectedArea?.name || 'worship'}
            </h2>
            <p className="text-xs text-slate-400 font-medium">Agendamento rápido de voluntários multi-semanas para domingo</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex flex-wrap items-center gap-2">
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
                {matrixColumns.map(column => {
                  const sundayDate = parseISO(column.date);
                  return (
                    <th key={column.id} className="py-4 px-4 font-bold text-slate-850 dark:text-slate-200 text-center min-w-[160px] border-r border-slate-200 dark:border-slate-800">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-slate-450 dark:text-slate-400 font-bold uppercase tracking-wider">
                          {format(sundayDate, 'EEEE', { locale: ptBR })} - {format(sundayDate, 'dd/MM')}
                        </span>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">
                          {column.title}
                        </span>
                        {column.subtitle && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-550 font-medium mt-0.5 max-w-[155px] truncate">
                            {column.subtitle}
                          </span>
                        )}
                        {column.isVirtual ? (
                          <span className="inline-block mt-1.5 px-2 py-0.5 text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-500 rounded-full">
                            Sem Ordem
                          </span>
                        ) : (
                          <span className="inline-block mt-1.5 px-2 py-0.5 text-[9px] font-black text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30 rounded-full border border-emerald-200/40 dark:border-emerald-800/40">
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
                  {matrixColumns.map(column => {
                    const cellPos = getCellPosition(column, role);
                    const isEdited = editedPositions[`${column.id}::${role}`] !== undefined;

                    return (
                      <td
                        key={column.id}
                        onClick={() => handleCellClick(column, role)}
                        className={`py-3 px-4 border-r border-slate-150 dark:border-slate-800 cursor-pointer text-center relative group min-h-[64px] transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/20 ${
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
                            <div className="flex items-center justify-center gap-1 max-w-[140px] w-full">
                              <span className="text-[11px] font-bold text-slate-700 truncate">
                                {cellPos.userName}
                              </span>
                              {cellPos?.isDM && (
                                <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-1 py-0.5 rounded border border-purple-200/40 shrink-0">
                                  (DM)
                                </span>
                              )}
                            </div>
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
                <td colSpan={matrixColumns.length} className="bg-slate-50/10"></td>
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
              Escolha um voluntário da equipe para{' '}
              {assignmentCell && `${format(parseISO(assignmentCell.column.date), "dd 'de' MMMM", { locale: ptBR })} (${assignmentCell.column.title})`}.
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
                      <div className="flex flex-col">
                        <span>{member.name}</span>
                        {member.worshipRoles && member.worshipRoles.length > 0 && (
                          <span className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">
                            🎸 {member.worshipRoles.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {dualServiceRuleActive && member.worshipRoles && member.worshipRoles.length > 0 && (!member.serviceAreaId || member.serviceAreaId === selectedArea?.id) && (
                        <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200/40 uppercase">
                          ⚠️ Só Louvor
                        </span>
                      )}
                      {assignmentCell?.currentPosition?.userId === member.id && (
                        <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/40">
                          Atual
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex items-center gap-2 py-3 px-1 border-t border-slate-100">
              <input
                type="checkbox"
                id="is-dm-checkbox"
                checked={isDmCheckbox}
                onChange={(e) => handleToggleDm(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
              />
              <Label htmlFor="is-dm-checkbox" className="text-xs font-bold text-slate-700 cursor-pointer">
                Diretor Musical (DM) deste culto
              </Label>
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
    <VolunteeringProvider>
      <WorshipProvider>
        <MatrixViewInner />
      </WorshipProvider>
    </VolunteeringProvider>
  );
}

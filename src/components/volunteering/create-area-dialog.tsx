'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useVolunteering, type AreaOfService, type AreaType, type ServiceScheduleMode, type ServiceGroup, type FixedMonthlyPattern, type FifthWeekRotationItem } from '@/contexts/volunteering-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, ShieldAlert, Download, Users, UserPlus, Search, UserCheck, Calendar, Sparkles, CalendarDays, RefreshCw } from 'lucide-react';
import { PersonSearchInput } from '@/components/common/person-search-input';
import { useMembersData, useEventsData, useVolunteeringServiceData } from "@/hooks/useDomainData";
import { useFirebase, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreateAreaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingArea: AreaOfService | null;
}

export function CreateAreaDialog({ open, onOpenChange, existingArea }: CreateAreaDialogProps) {
  const { users } = useMembersData();
  const { events } = useEventsData();
  const { serviceAreas: areas, teams } = useVolunteeringServiceData();
  const { firestore } = useFirebase();

  const { addArea, updateArea } = useVolunteering();
  const { data: tenantConfig } = useDoc<any>('config/tenant_details');
  const dualServiceRuleActive = tenantConfig?.volunteeringRules?.worshipDualService || false;
  
  const [name, setName] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [leaderContact, setLeaderContact] = useState('');
  const [areaType, setAreaType] = useState<AreaType>('regular');
  const [scheduleMode, setScheduleMode] = useState<ServiceScheduleMode>('unified');
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Estado da Escala Fixa Mensal
  const [fixedPattern, setFixedPattern] = useState<FixedMonthlyPattern>({
    weeks: {
      1: {},
      2: {},
      3: {},
      4: {}
    },
    fifthWeekRotation: [
      { id: '1', label: '1º Rodízio (Março / Abril)', months: [2, 3], slots: {} },
      { id: '2', label: '2º Rodízio (Maio / Julho)', months: [4, 6], slots: {} },
      { id: '3', label: '3º Rodízio (Agosto / Outubro)', months: [7, 9], slots: {} },
      { id: '4', label: '4º Rodízio (Novembro / Dezembro)', months: [10, 11], slots: {} }
    ]
  });

  // Tab state
  const [activeTab, setActiveTab] = useState<'basic' | 'members'>('basic');
  const [memberSearch, setMemberSearch] = useState('');

  // Filter recurring events for fixed schedule
  const recurringEventsList = useMemo(() => {
    if (!events || events.length === 0) return [];
    // Sort Sunday first, then Thursday, etc.
    const dayPriority: Record<string, number> = { domingo: 1, quinta: 2, quarta: 3, sabado: 4, terca: 5, segunda: 6, sexta: 7 };
    return [...events].sort((a, b) => {
      const pA = dayPriority[a.dayOfWeek?.toLowerCase() || ''] || 99;
      const pB = dayPriority[b.dayOfWeek?.toLowerCase() || ''] || 99;
      if (pA !== pB) return pA - pB;
      return (a.time || '').localeCompare(b.time || '');
    });
  }, [events]);

  // Filter Sunday events for grouped mode
  const sundayEventsList = useMemo(() => {
    if (!events) return [];
    return events.filter(e => e.dayOfWeek?.toLowerCase() === 'domingo' || e.dayOfWeek?.toLowerCase() === 'sunday');
  }, [events]);

  useEffect(() => {
    if (open) {
      setName(existingArea?.name || '');
      setLeaderId(existingArea?.leaderId || '');
      setLeaderContact(existingArea?.leaderContact || '');
      
      const type = existingArea?.areaType || (existingArea?.name?.toLowerCase().includes('louvor') || existingArea?.name?.toLowerCase().includes('worship') ? 'worship' : 'regular');
      setAreaType(type);
      
      const mode = existingArea?.scheduleMode || (existingArea?.unifiedCelebrations ? 'grouped' : 'unified');
      setScheduleMode(mode);

      // Load fixedMonthlyPattern if available
      if (existingArea?.fixedMonthlyPattern) {
        setFixedPattern({
          weeks: {
            1: existingArea.fixedMonthlyPattern.weeks?.[1] || {},
            2: existingArea.fixedMonthlyPattern.weeks?.[2] || {},
            3: existingArea.fixedMonthlyPattern.weeks?.[3] || {},
            4: existingArea.fixedMonthlyPattern.weeks?.[4] || {}
          },
          fifthWeekRotation: existingArea.fixedMonthlyPattern.fifthWeekRotation || [
            { id: '1', label: '1º Rodízio (Março / Abril)', months: [2, 3], slots: {} },
            { id: '2', label: '2º Rodízio (Maio / Julho)', months: [4, 6], slots: {} },
            { id: '3', label: '3º Rodízio (Agosto / Outubro)', months: [7, 9], slots: {} },
            { id: '4', label: '4º Rodízio (Novembro / Dezembro)', months: [10, 11], slots: {} }
          ]
        });
      } else {
        setFixedPattern({
          weeks: { 1: {}, 2: {}, 3: {}, 4: {} },
          fifthWeekRotation: [
            { id: '1', label: '1º Rodízio (Março / Abril)', months: [2, 3], slots: {} },
            { id: '2', label: '2º Rodízio (Maio / Julho)', months: [4, 6], slots: {} },
            { id: '3', label: '3º Rodízio (Agosto / Outubro)', months: [7, 9], slots: {} },
            { id: '4', label: '4º Rodízio (Novembro / Dezembro)', months: [10, 11], slots: {} }
          ]
        });
      }

      setRoles(existingArea?.roles || []);
      setActiveTab('basic');
      setMemberSearch('');
      
      if (existingArea?.serviceGroups) {
        setServiceGroups(existingArea.serviceGroups);
      } else if (existingArea?.unifiedGroups) {
        // Map old unifiedGroups structure to new serviceGroups
        const mappedGroups = existingArea.unifiedGroups.map(group => {
          const matchedIds = events
            .filter(e => group.eventNames.some(name => e.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(e.name.toLowerCase())))
            .map(e => e.id);
          return {
            name: group.name,
            eventIds: matchedIds
          };
        });
        setServiceGroups(mappedGroups);
      } else {
        setServiceGroups([]);
      }
    }
  }, [open, existingArea, events]);

  const handleUpdateWeekSlot = (weekNum: 1 | 2 | 3 | 4, eventId: string, userId: string) => {
    setFixedPattern(prev => ({
      ...prev,
      weeks: {
        ...prev.weeks,
        [weekNum]: {
          ...(prev.weeks[weekNum] || {}),
          [eventId]: userId === 'none' ? '' : userId
        }
      }
    }));
  };

  const handleUpdateFifthRotationSlot = (rotationIdx: number, eventId: string, userId: string) => {
    setFixedPattern(prev => {
      const nextRotations = [...(prev.fifthWeekRotation || [])];
      if (nextRotations[rotationIdx]) {
        nextRotations[rotationIdx] = {
          ...nextRotations[rotationIdx],
          slots: {
            ...nextRotations[rotationIdx].slots,
            [eventId]: userId === 'none' ? '' : userId
          }
        };
      }
      return {
        ...prev,
        fifthWeekRotation: nextRotations
      };
    });
  };

  useEffect(() => {
    if (leaderId && leaderId !== 'null') {
      const selectedLeader = users.find(u => u.id === leaderId);
      if (selectedLeader) {
        setLeaderContact(selectedLeader.phone || selectedLeader.email || '');
      }
    } else {
      setLeaderContact('');
    }
  }, [leaderId, users]);

  // Membros que já pertencem a esta área de serviço
  const currentAreaMembers = useMemo(() => {
    if (!users || !existingArea) return [];
    if (areaType === 'worship') {
      return users.filter(u => u.worshipRoles && u.worshipRoles.length > 0);
    }
    return users.filter(u => u.serviceAreaId === existingArea.id);
  }, [users, existingArea, areaType]);

  // Membros atuais filtrados pela busca (se houver)
  const filteredCurrentMembers = useMemo(() => {
    if (!memberSearch.trim()) return currentAreaMembers;
    const term = memberSearch.toLowerCase();
    return currentAreaMembers.filter(u => 
      u.name?.toLowerCase().includes(term) || 
      u.email?.toLowerCase().includes(term)
    );
  }, [currentAreaMembers, memberSearch]);

  // Busca sob demanda de outros voluntários para adicionar (só exibe se digitar >= 2 caracteres)
  const searchAvailableUsers = useMemo(() => {
    if (!users || !existingArea || memberSearch.trim().length < 2) return [];
    const term = memberSearch.toLowerCase();
    const currentMemberIds = new Set(currentAreaMembers.map(u => u.id));

    return users
      .filter(u => !currentMemberIds.has(u.id) && (
        u.name?.toLowerCase().includes(term) || 
        u.email?.toLowerCase().includes(term)
      ))
      .slice(0, 15);
  }, [users, existingArea, memberSearch, currentAreaMembers]);

  // Download do JSON pré-preenchido com os membros desta área e referências
  const handleDownloadAreaJson = () => {
    if (!existingArea) return;
    const areaTeams = (teams || []).filter(t => t.areaId === existingArea.id).map(t => t.name);

    const payload = {
      voluntarios: currentAreaMembers.map(u => {
        const userTeam = (teams || []).find(t => t.id === u.serviceTeamId);
        return {
          nome: u.name,
          email: u.email || '',
          area: existingArea.name,
          equipe: userTeam?.name || ''
        };
      }),
      _referencia_areas_e_equipes: {
        _aviso_para_ia: "Este bloco lista as áreas e equipes cadastradas para guiar a IA. Será ignorado na importação.",
        areaAtual: {
          nome: existingArea.name,
          tipo: areaType,
          equipes: areaTeams
        },
        todasAsAreas: (areas || []).map(a => ({
          nome: a.name,
          tipo: a.areaType || 'regular',
          equipes: (teams || []).filter(t => t.areaId === a.id).map(t => t.name)
        }))
      }
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voluntarios_area_${existingArea.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const nonCompliantCount = useMemo(() => {
    if (!dualServiceRuleActive || !users || !existingArea) return 0;
    return users.filter(u => 
      u.worshipRoles && u.worshipRoles.length > 0 &&
      (!u.serviceAreaId || u.serviceAreaId === existingArea.id)
    ).length;
  }, [users, dualServiceRuleActive, existingArea]);

  const handleAddGroup = () => {
    setServiceGroups([...serviceGroups, { name: `Grupo ${serviceGroups.length + 1}`, eventIds: [] }]);
  };

  const handleRemoveGroup = (index: number) => {
    setServiceGroups(serviceGroups.filter((_, i) => i !== index));
  };

  const handleGroupFieldChange = (index: number, field: keyof ServiceGroup, value: any) => {
    setServiceGroups(prev => prev.map((g, i) => i === index ? { ...g, [field]: value } : g));
  };

  const handleToggleEventInGroup = (groupIndex: number, eventId: string) => {
    const group = serviceGroups[groupIndex];
    let newEventIds = [...group.eventIds];
    if (newEventIds.includes(eventId)) {
      newEventIds = newEventIds.filter(id => id !== eventId);
    } else {
      newEventIds.push(eventId);
    }
    handleGroupFieldChange(groupIndex, 'eventIds', newEventIds);
  };

  const handleAddRoleLocal = () => {
    const val = newRole.trim();
    if (!val) return;
    if (!roles.includes(val)) {
      setRoles([...roles, val]);
    }
    setNewRole('');
  };

  const handleRemoveRoleLocal = (role: string) => {
    setRoles(roles.filter(r => r !== role));
  };

  const handleToggleWorshipRole = async (user: any, role: string) => {
    if (!existingArea) return;
    const currentRoles = user.worshipRoles || [];
    let newRoles = [...currentRoles];
    if (newRoles.includes(role)) {
      newRoles = newRoles.filter(r => r !== role);
    } else {
      newRoles.push(role);
    }
    
    // Update user document in Firestore
    const userDocRef = doc(firestore, 'users', user.id);
    await updateDocumentNonBlocking(userDocRef, {
      worshipRoles: newRoles,
      worshipAreaId: newRoles.length > 0 ? existingArea.id : ''
    });
  };

  const handleToggleRegularMember = async (user: any) => {
    if (!existingArea) return;
    const isCurrentlyInArea = user.serviceAreaId === existingArea.id;
    const newAreaId = isCurrentlyInArea ? '' : existingArea.id;
    
    // Update user document in Firestore
    const userDocRef = doc(firestore, 'users', user.id);
    await updateDocumentNonBlocking(userDocRef, {
      serviceAreaId: newAreaId,
      ...(isCurrentlyInArea ? { serviceTeamId: '' } : {})
    });
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    
    // Map serviceGroups to backwards compatible unifiedGroups for safety
    const unifiedGroupsMapped = serviceGroups.map(group => {
      const matchedNames = events
        .filter(e => group.eventIds.includes(e.id))
        .map(e => e.name);
      return {
        name: group.name,
        eventNames: matchedNames
      };
    });

    const areaData = {
      name,
      leaderId: leaderId === 'null' ? '' : leaderId,
      leaderContact,
      areaType,
      scheduleMode,
      serviceGroups: scheduleMode === 'grouped' ? serviceGroups : [],
      fixedMonthlyPattern: scheduleMode === 'fixed_monthly' ? fixedPattern : undefined,
      roles: areaType === 'worship' ? roles : [],
      unifiedCelebrations: scheduleMode === 'grouped',
      unifiedGroups: scheduleMode === 'grouped' ? unifiedGroupsMapped : []
    };

    if (existingArea) {
      await updateArea(existingArea.id, areaData);
    } else {
      await addArea(areaData);
    }

    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto rounded-2xl transition-all", scheduleMode === 'fixed_monthly' ? "max-w-3xl" : "max-w-md")}>
        <DialogHeader>
          <DialogTitle>{existingArea ? 'Editar Área de Serviço' : 'Criar Nova Área de Serviço'}</DialogTitle>
          <DialogDescription>
            Defina o nome da área de serviço, regras de escala e líder responsável.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Row if editing ANY area */}
        {existingArea && (
          <div className="flex border-b border-slate-200 mb-2">
            <button
              type="button"
              className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition-all ${activeTab === 'basic' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab('basic')}
            >
              ⚙️ Configurações Gerais
            </button>
            <button
              type="button"
              className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition-all ${activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab('members')}
            >
              {areaType === 'worship' ? '🎸 Equipe e Elegibilidade' : '👥 Membros da Equipe'}
            </button>
          </div>
        )}

        {activeTab === 'basic' ? (
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="area-name">Nome da Área</Label>
              <Input
                id="area-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Mídia"
                required
              />
            </div>

            {/* Area Type Toggle */}
            <div className="space-y-2">
              <Label>Tipo da Área</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`px-4 py-2 text-xs font-bold border rounded-xl transition-all ${areaType === 'regular' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}`}
                  onClick={() => setAreaType('regular')}
                >
                  👋 Área Regular
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-xs font-bold border rounded-xl transition-all ${areaType === 'worship' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}`}
                  onClick={() => setAreaType('worship')}
                >
                  🎸 Louvor / Worship
                </button>
              </div>
            </div>

            {/* Schedule Mode Toggle */}
            <div className="space-y-2">
              <Label>Modo de Escala</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  className={`px-2 py-2 text-[11px] font-bold border rounded-xl transition-all leading-tight ${scheduleMode === 'unified' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}`}
                  onClick={() => setScheduleMode('unified')}
                >
                  🔵 Unificada
                </button>
                <button
                  type="button"
                  className={`px-2 py-2 text-[11px] font-bold border rounded-xl transition-all leading-tight ${scheduleMode === 'individual' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}`}
                  onClick={() => setScheduleMode('individual')}
                >
                  🟣 Individual
                </button>
                <button
                  type="button"
                  className={`px-2 py-2 text-[11px] font-bold border rounded-xl transition-all leading-tight ${scheduleMode === 'grouped' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}`}
                  onClick={() => setScheduleMode('grouped')}
                >
                  🟠 Agrupada
                </button>
                <button
                  type="button"
                  className={`px-2 py-2 text-[11px] font-bold border rounded-xl transition-all leading-tight ${scheduleMode === 'fixed_monthly' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}`}
                  onClick={() => setScheduleMode('fixed_monthly')}
                >
                  📅 Fixa Mensal
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                {scheduleMode === 'unified' && 'Uma única equipe servirá em todos os cultos do dia.'}
                {scheduleMode === 'individual' && 'Equipes completamente separadas e independentes para cada culto.'}
                {scheduleMode === 'grouped' && 'Permite agrupar cultos em blocos (Ex: Clássico e Família) para compartilhar equipes.'}
                {scheduleMode === 'fixed_monthly' && 'Padrão fixo por semana do mês (1º ao 4º dia) com rodízio anual especial para 5ºs domingos e quintas.'}
              </p>
            </div>

            {/* Fixed Monthly Mode Settings */}
            {scheduleMode === 'fixed_monthly' && (
              <div className="space-y-4 border border-slate-200 bg-slate-50/60 rounded-2xl p-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-primary" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                      1. Padrão das 4 Primeiras Semanas do Mês
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">1º ao 4º culto do mês</span>
                </div>

                <div className="space-y-3">
                  {recurringEventsList.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Nenhum evento cadastrado no sistema.</p>
                  ) : (
                    recurringEventsList.map(event => (
                      <div key={event.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-primary" />
                            {event.name} {event.time ? `(${event.time})` : ''}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            {event.dayOfWeek || 'Semanal'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          {[1, 2, 3, 4].map(wNum => {
                            const currentVal = fixedPattern.weeks[wNum as 1|2|3|4]?.[event.id] || '';
                            return (
                              <div key={wNum} className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-500">
                                  {wNum}ª Semana
                                </Label>
                                <Select
                                  value={currentVal || 'none'}
                                  onValueChange={(v) => handleUpdateWeekSlot(wNum as 1|2|3|4, event.id, v)}
                                >
                                  <SelectTrigger className="h-8 text-[11px] bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-56">
                                    <SelectItem value="none" className="text-slate-400 text-xs">-- Vazio --</SelectItem>
                                    {users.map(u => (
                                      <SelectItem key={u.id} value={u.id} className="text-xs">
                                        {u.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Seção 2: Rodízio Especial de 5ª Semana */}
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="size-4 text-amber-600" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                        2. Rodízio Especial para 5ºs Domingos e Quintas
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold text-amber-700 border-amber-300 bg-amber-50">
                      Meses com 5 semanas
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(fixedPattern.fifthWeekRotation || []).map((rotation, rIdx) => (
                      <div key={rotation.id || rIdx} className="bg-white border border-amber-200/80 rounded-xl p-3 shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between pb-1 border-b border-amber-100">
                          <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                            ✨ {rotation.label}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {recurringEventsList.map(event => {
                            const val = rotation.slots?.[event.id] || '';
                            return (
                              <div key={event.id} className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-600 truncate block">
                                  {event.name}
                                </Label>
                                <Select
                                  value={val || 'none'}
                                  onValueChange={(v) => handleUpdateFifthRotationSlot(rIdx, event.id, v)}
                                >
                                  <SelectTrigger className="h-8 text-[11px] bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-56">
                                    <SelectItem value="none" className="text-slate-400 text-xs">-- Vazio --</SelectItem>
                                    {users.map(u => (
                                      <SelectItem key={u.id} value={u.id} className="text-xs">
                                        {u.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Grouped Mode Settings */}
            {scheduleMode === 'grouped' && (
              <div className="space-y-3 border rounded-xl p-3 bg-slate-50/50">
                <div className="flex justify-between items-center">
                  <Label className="font-bold text-slate-800 text-xs">Grupos de Cultos</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddGroup} className="h-7 text-[10px] px-2">
                    + Adicionar Grupo
                  </Button>
                </div>

                {serviceGroups.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Nenhum grupo cadastrado. Adicione um grupo para linkar os cultos.</p>
                ) : (
                  <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                    {serviceGroups.map((group, gIdx) => (
                      <div key={gIdx} className="border border-slate-150 bg-white rounded-lg p-2.5 space-y-2 shadow-sm relative">
                        <div className="flex items-center gap-2 pr-6">
                          <Input
                            className="h-7 text-xs font-bold"
                            value={group.name}
                            onChange={(e) => handleGroupFieldChange(gIdx, 'name', e.target.value)}
                            placeholder="Nome do grupo (ex: Manhã)"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveGroup(gIdx)}
                            className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>

                        <div className="space-y-1 pt-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Cultos integrados:</span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {sundayEventsList.map(evt => {
                              const isChecked = group.eventIds.includes(evt.id);
                              return (
                                <label key={evt.id} className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-slate-650 select-none">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleEventInGroup(gIdx, evt.id)}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                  />
                                  <span className="truncate" title={`${evt.name} (${evt.time})`}>
                                    {evt.name}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Roles Settings */}
            {areaType === 'worship' && (
              <div className="space-y-2 border rounded-xl p-3 bg-slate-50/50">
                <Label className="font-bold text-slate-800 text-xs">Funções da Equipe de Louvor</Label>
                <div className="flex flex-wrap gap-1 min-h-[36px] border border-slate-200 rounded-lg p-1.5 bg-white">
                  {roles.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">Nenhuma função configurada. Adicione abaixo.</span>
                  ) : (
                    roles.map(r => (
                      <span key={r} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        {r}
                        <button type="button" onClick={() => handleRemoveRoleLocal(r)} className="hover:text-red-500 font-bold ml-0.5">×</button>
                      </span>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Teclado, Bateria..."
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="h-8 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRoleLocal();
                      }
                    }}
                  />
                  <Button type="button" size="sm" onClick={handleAddRoleLocal} className="h-8 text-xs shrink-0">
                    + Adicionar
                  </Button>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="leader-id">Líder (Opcional)</Label>
              <PersonSearchInput
                value={leaderId}
                onChange={setLeaderId}
                users={users}
                placeholder="Buscar líder..."
                optional
              />
            </div>
            <div>
              <Label htmlFor="leader-contact">Contato do Líder (Opcional)</Label>
              <Input
                id="leader-contact"
                value={leaderContact}
                onChange={(e) => setLeaderContact(e.target.value)}
                placeholder="Telefone ou e-mail"
              />
            </div>
          </div>
        ) : (
          /* Members Panel */
          <div className="space-y-4 py-2">
            {/* Header com contador e botão de exportação JSON */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <span className="text-xs font-bold text-slate-800">
                  {filteredCurrentMembers.length} {filteredCurrentMembers.length === 1 ? 'Voluntário' : 'Voluntários'} nesta Área
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadAreaJson}
                className="h-7 text-[11px] font-bold gap-1 bg-white hover:bg-slate-100 shadow-sm"
              >
                <Download className="size-3 text-amber-600" />
                Baixar JSON desta Área
              </Button>
            </div>

            {/* Campo de Busca */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="h-9 text-xs pl-8 pr-4 rounded-xl"
              />
              {memberSearch && (
                <button
                  type="button"
                  onClick={() => setMemberSearch('')}
                  className="absolute right-2.5 top-2.5 text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Non-compliance Alert Box para Louvor */}
            {areaType === 'worship' && dualServiceRuleActive && nonCompliantCount > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-amber-800 dark:text-amber-300 p-2.5 rounded-xl text-xs font-semibold flex items-start gap-2 leading-normal">
                <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>Existem {nonCompliantCount} voluntário(s) escalados apenas no Louvor que não servem em nenhuma outra área de serviço.</span>
              </div>
            )}

            {/* SEÇÃO 1: MEMBROS ATUAIS DESTA ÁREA */}
            <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Membros da Equipe ({filteredCurrentMembers.length})
              </span>

              {filteredCurrentMembers.length === 0 ? (
                <div className="p-4 border rounded-xl bg-slate-50 text-center text-xs text-slate-500 italic">
                  {memberSearch.trim()
                    ? 'Nenhum membro desta área corresponde ao filtro.'
                    : 'Nenhum voluntário vinculado a esta área de serviço ainda. Use o campo de busca abaixo para adicionar pessoas.'}
                </div>
              ) : (
                filteredCurrentMembers.map(user => {
                  const hasRegularArea = user.serviceAreaId && user.serviceAreaId !== existingArea?.id;
                  const regularAreaObj = hasRegularArea ? areas.find(a => a.id === user.serviceAreaId) : null;
                  const userHasWorshipRoles = user.worshipRoles && user.worshipRoles.length > 0;
                  const showAlert = dualServiceRuleActive && userHasWorshipRoles && !hasRegularArea;

                  if (areaType === 'worship') {
                    return (
                      <div key={user.id} className="border border-slate-150 rounded-xl p-3 bg-white space-y-2 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 border border-slate-200">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">
                                {user.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-800">{user.name}</span>
                              {hasRegularArea ? (
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Serviço: {regularAreaObj?.name}</span>
                              ) : (
                                showAlert && (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                                    ⚠️ Apenas Louvor
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Configurable Roles list */}
                        <div className="space-y-1 pt-1.5 border-t border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Elegibilidade:</span>
                          <div className="flex flex-wrap gap-1">
                            {roles.map(role => {
                              const isEligible = user.worshipRoles?.includes(role);
                              return (
                                <button
                                  key={role}
                                  type="button"
                                  onClick={() => handleToggleWorshipRole(user, role)}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                                    isEligible 
                                      ? 'bg-primary text-white border-primary shadow-sm' 
                                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {role}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={user.id} className="border border-slate-150 rounded-xl p-3 bg-white flex items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 border border-slate-200">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">
                              {user.name?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-800">{user.name}</span>
                            <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5">
                              <UserCheck className="size-3" />
                              Nesta equipe
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-7 px-3 text-[10px] font-bold rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border-red-200 hover:text-red-700 transition-all"
                          onClick={() => handleToggleRegularMember(user)}
                        >
                          Remover
                        </Button>
                      </div>
                    );
                  }
                })
              )}
            </div>

            {/* SEÇÃO 2: RESULTADOS DE BUSCA PARA ADICIONAR NOVAS PESSOAS */}
            {memberSearch.trim().length >= 2 ? (
              <div className="space-y-2 pt-2 border-t border-dashed">
                <span className="text-[10px] font-black text-primary uppercase tracking-wider flex items-center gap-1">
                  <UserPlus className="size-3.5" />
                  Pessoas Encontradas para Adicionar ({searchAvailableUsers.length})
                </span>

                {searchAvailableUsers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">
                    Nenhuma outra pessoa encontrada com o termo "{memberSearch}".
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {searchAvailableUsers.map(user => {
                      const hasOtherArea = user.serviceAreaId && user.serviceAreaId !== existingArea?.id;
                      const otherAreaObj = hasOtherArea ? areas.find(a => a.id === user.serviceAreaId) : null;

                      return (
                        <div key={user.id} className="border border-slate-150 rounded-lg p-2 bg-slate-50/70 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <Avatar className="h-6 w-6 border border-slate-200">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="bg-primary/5 text-primary text-[9px] font-bold">
                                {user.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="truncate">
                              <span className="text-xs font-bold text-slate-800 truncate block">{user.name}</span>
                              {hasOtherArea && (
                                <span className="text-[9px] text-amber-600 font-semibold truncate block">
                                  Já serve em: {otherAreaObj?.name}
                                </span>
                              )}
                            </div>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            className="h-6 px-2.5 text-[10px] font-bold rounded-lg bg-primary hover:bg-primary/90 text-white shrink-0"
                            onClick={() => {
                              if (areaType === 'worship') {
                                if (roles.length > 0) {
                                  handleToggleWorshipRole(user, roles[0]);
                                }
                              } else {
                                handleToggleRegularMember(user);
                              }
                            }}
                          >
                            + Adicionar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center">
                <p className="text-[11px] text-slate-500 font-medium">
                  🔍 Digite pelo menos <strong className="text-slate-800">2 letras</strong> no campo de busca para pesquisar e adicionar novos voluntários a esta área.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {activeTab === 'basic' ? (
            <>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setActiveTab('basic')} className="w-full">
              Voltar para Configurações Gerais
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

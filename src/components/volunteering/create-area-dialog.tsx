'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useVolunteering, type AreaOfService, type AreaType, type ServiceScheduleMode, type ServiceGroup } from '@/contexts/volunteering-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, ShieldAlert } from 'lucide-react';
import { PersonSearchInput } from '@/components/common/person-search-input';
import { useMembersData, useEventsData, useVolunteeringServiceData } from "@/hooks/useDomainData";
import { useFirebase, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface CreateAreaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingArea: AreaOfService | null;
}

export function CreateAreaDialog({ open, onOpenChange, existingArea }: CreateAreaDialogProps) {
  const { users } = useMembersData();
  const { events } = useEventsData();
  const { serviceAreas: areas } = useVolunteeringServiceData();
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

  // Tab state
  const [activeTab, setActiveTab] = useState<'basic' | 'members'>('basic');
  const [memberSearch, setMemberSearch] = useState('');

  // Filter Sunday events
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

  // Volunteers filter and compliance calculations
  const filteredWorshipUsers = useMemo(() => {
    if (!users) return [];
    
    let list = users;
    if (memberSearch) {
      list = users.filter(u => 
        u.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        (areaType === 'worship' && u.worshipRoles && u.worshipRoles.length > 0)
      );
    }

    if (areaType === 'worship') {
      return [...list].sort((a, b) => {
        const aHas = a.worshipRoles && a.worshipRoles.length > 0 ? 1 : 0;
        const bHas = b.worshipRoles && b.worshipRoles.length > 0 ? 1 : 0;
        if (aHas !== bHas) return bHas - aHas;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else {
      return [...list].sort((a, b) => {
        const aHas = a.serviceAreaId === existingArea?.id ? 1 : 0;
        const bHas = b.serviceAreaId === existingArea?.id ? 1 : 0;
        if (aHas !== bHas) return bHas - aHas;
        return (a.name || '').localeCompare(b.name || '');
      });
    }
  }, [users, memberSearch, areaType, existingArea]);

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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
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
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  className={`px-3 py-2 text-[11px] font-bold border rounded-xl transition-all leading-tight ${scheduleMode === 'unified' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}`}
                  onClick={() => setScheduleMode('unified')}
                >
                  🔵 Unificada
                </button>
                <button
                  type="button"
                  className={`px-3 py-2 text-[11px] font-bold border rounded-xl transition-all leading-tight ${scheduleMode === 'individual' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}`}
                  onClick={() => setScheduleMode('individual')}
                >
                  🟣 Individual
                </button>
                <button
                  type="button"
                  className={`px-3 py-2 text-[11px] font-bold border rounded-xl transition-all leading-tight ${scheduleMode === 'grouped' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}`}
                  onClick={() => setScheduleMode('grouped')}
                >
                  🟠 Agrupada
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                {scheduleMode === 'unified' && 'Uma única equipe servirá em todos os cultos do dia.'}
                {scheduleMode === 'individual' && 'Equipes completamente separadas e independentes para cada culto.'}
                {scheduleMode === 'grouped' && 'Permite agrupar cultos em blocos (Ex: Clássico e Família) para compartilhar equipes.'}
              </p>
            </div>

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
            <Input
              placeholder="Buscar voluntários..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="h-9 text-xs"
            />

            {/* Non-compliance Alert Box */}
            {areaType === 'worship' && dualServiceRuleActive && nonCompliantCount > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-amber-800 dark:text-amber-300 p-2.5 rounded-xl text-xs font-semibold flex items-start gap-2 leading-normal">
                <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>Existem {nonCompliantCount} voluntário(s) escalados apenas no Louvor que não servem em nenhuma outra área de serviço.</span>
              </div>
            )}

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {filteredWorshipUsers.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">Nenhum voluntário encontrado.</p>
              ) : (
                filteredWorshipUsers.map(user => {
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
                    const isMemberOfThisArea = user.serviceAreaId === existingArea?.id;
                    const hasOtherArea = user.serviceAreaId && user.serviceAreaId !== existingArea?.id;
                    const otherAreaObj = hasOtherArea ? areas.find(a => a.id === user.serviceAreaId) : null;

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
                            {hasOtherArea && (
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">Outra área: {otherAreaObj?.name}</span>
                            )}
                            {isMemberOfThisArea && (
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">👥 Nesta equipe</span>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant={isMemberOfThisArea ? 'outline' : 'default'}
                          className={`h-7 px-3 text-[10px] font-bold rounded-lg transition-all ${
                            isMemberOfThisArea 
                              ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 hover:text-red-700' 
                              : 'hover:bg-primary/90'
                          }`}
                          onClick={() => handleToggleRegularMember(user)}
                        >
                          {isMemberOfThisArea ? 'Remover' : 'Adicionar'}
                        </Button>
                      </div>
                    );
                  }
                })
              )}
            </div>
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

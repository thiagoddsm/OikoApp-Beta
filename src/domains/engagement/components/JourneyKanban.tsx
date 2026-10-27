'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useEngagementData, useMembersData } from '@/hooks/useDomainData';
import { useJourneyService } from '../hooks/useJourneyService';
import { useTenant } from '@/contexts/tenant-context';
import { useFirebase } from '@/firebase';
import { 
  Loader2, Search, ListChecks, ExternalLink, ArrowRight, 
  Sparkles, Users, BookOpen, ShieldCheck, CheckCircle2, ChevronRight
} from 'lucide-react';
import { JourneyStage } from '../entities/JourneyStage';

export function JourneyKanban() {
  const { journeyStages, isLoading: loadingStages } = useEngagementData();
  const { users, isLoading: loadingUsers } = useMembersData(500); // Carrega batch inicial para o kanban
  const journeyService = useJourneyService();
  const { tenantId } = useTenant();
  const { user } = useFirebase();

  // Estado local para Optimistic UI (drag and drop imediato)
  const [localMembers, setLocalMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageForSteps, setSelectedStageForSteps] = useState<JourneyStage | null>(null);
  const [showUnassigned, setShowUnassigned] = useState(false);

  useEffect(() => {
    if (users) {
      setLocalMembers(users);
    }
  }, [users]);

  // Filtragem por busca
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return localMembers;
    const q = searchQuery.toLowerCase().trim();
    return localMembers.filter(m => 
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.phone && m.phone.includes(q))
    );
  }, [localMembers, searchQuery]);

  // Membros sem etapa definida
  const unassignedMembers = useMemo(() => {
    const stageIds = new Set(journeyStages.map(s => s.id));
    return filteredMembers.filter(m => !m.journeyStageId || !stageIds.has(m.journeyStageId));
  }, [filteredMembers, journeyStages]);

  if (loadingStages || loadingUsers) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando jornada e membros...</p>
        </div>
      </div>
    );
  }

  if (journeyStages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center border rounded-xl bg-muted/20 mt-8 p-6">
        <h3 className="text-lg font-semibold mb-2">Nenhuma etapa configurada</h3>
        <p className="text-muted-foreground max-w-md">
          Configure as etapas da jornada ministerial para começar o acompanhamento do discipulado.
        </p>
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent, memberId: string) => {
    e.dataTransfer.setData('memberId', memberId);
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const memberId = e.dataTransfer.getData('memberId');
    if (!memberId || !journeyService || !tenantId || !user) return;

    const member = localMembers.find(m => m.id === memberId);
    if (!member || member.journeyStageId === stageId) return;

    const oldStageId = member.journeyStageId;

    // Optimistic UI Update: Move o membro localmente antes da confirmação do servidor
    setLocalMembers(prev => prev.map(m => m.id === memberId ? { ...m, journeyStageId: stageId } : m));

    try {
      await journeyService.moveMemberToStage({
        tenantId,
        memberId,
        newStageId: stageId,
        oldStageId,
        reason: 'Mudança manual via Kanban',
        actor: { type: 'user', id: user.uid, name: user.displayName || undefined },
        source: 'manual'
      });
    } catch (error) {
      console.error('Falha ao mover membro', error);
      // Rollback da interface em caso de falha
      setLocalMembers(prev => prev.map(m => m.id === memberId ? { ...m, journeyStageId: oldStageId } : m));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessário para permitir o drop
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-180px)]">
      
      {/* BARRA SUPERIOR DE FILTRO & CONTROLES */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar membro por nome ou e-mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant={showUnassigned ? "default" : "outline"}
            size="sm"
            onClick={() => setShowUnassigned(!showUnassigned)}
            className="text-xs h-9 gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Sem Fase Definida</span>
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-5 text-[11px]">
              {unassignedMembers.length}
            </Badge>
          </Button>

          <Link 
            href="/discipulado/batismo/encontro-1" 
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-300 dark:text-amber-400 dark:border-amber-500/30 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Roteiro Batismo 1 (Mobile)</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </Link>
        </div>
      </div>

      {/* ÁREA KANBAN COM SCROLL HORIZONTAL */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0 items-start">
        
        {/* COLUNA DE MEMBROS SEM FASE (OPCIONAL / EXPANDIDA SE ATIVA) */}
        {showUnassigned && (
          <div 
            className="flex-shrink-0 w-80 flex flex-col gap-3 bg-muted/40 p-4 rounded-xl border-2 border-dashed border-border h-full max-h-full"
            onDrop={(e) => handleDrop(e, '')}
            onDragOver={handleDragOver}
          >
            <div className="flex justify-between items-center mb-1">
              <div>
                <h3 className="font-bold text-sm text-foreground">Sem Fase Definida</h3>
                <p className="text-[11px] text-muted-foreground">Arraste para uma coluna</p>
              </div>
              <Badge variant="outline" className="font-bold">
                {unassignedMembers.length}
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
              {unassignedMembers.map(member => (
                <Card 
                  key={member.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, member.id)}
                  className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow hover:border-primary/50 bg-card"
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="h-9 w-9 border">
                      <AvatarImage src={member.photoUrl} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                        {(member.name || 'U').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden flex-1">
                      <span className="font-semibold text-xs leading-none mb-1 truncate">{member.name}</span>
                      <span className="text-[11px] text-muted-foreground truncate" title={member.email}>
                        {member.email || member.phone || 'Sem contato'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* COLUNAS DAS ETAPAS DA JORNADA */}
        {journeyStages.map((stage, idx) => {
          const stageMembers = filteredMembers.filter(m => m.journeyStageId === stage.id);

          return (
            <div 
              key={stage.id} 
              className="flex-shrink-0 w-80 flex flex-col gap-3 bg-muted/20 p-4 rounded-xl border border-border/70 h-full max-h-full transition-colors"
              onDrop={(e) => handleDrop(e, stage.id)}
              onDragOver={handleDragOver}
            >
              {/* HEADER DA COLUNA */}
              <div className="flex flex-col gap-1.5 pb-2 border-b border-border/60">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="text-xs font-bold text-muted-foreground">#{stage.order}</span>
                    <h3 className="font-bold text-sm tracking-tight text-foreground truncate" title={stage.name}>
                      {stage.name}
                    </h3>
                  </div>
                  <Badge variant="secondary" className={`${stage.color || 'bg-slate-100 text-slate-800'} text-xs font-semibold shrink-0`}>
                    {stageMembers.length}
                  </Badge>
                </div>

                {stage.characteristic && (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                      ✨ {stage.characteristic}
                    </span>
                  </div>
                )}

                {stage.description && (
                  <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2" title={stage.description}>
                    {stage.description}
                  </p>
                )}

                {/* BOTÃO PARA VER PASSOS / ROTEIROS */}
                {stage.steps && stage.steps.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedStageForSteps(stage)}
                    className="w-full mt-1 h-7 text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-between px-2 bg-background/50 hover:bg-background border border-border/40"
                  >
                    <span className="flex items-center gap-1">
                      <ListChecks className="w-3.5 h-3.5 text-primary" />
                      <span>Passos da Fase ({stage.steps.length})</span>
                    </span>
                    <ChevronRight className="w-3 h-3 opacity-60" />
                  </Button>
                )}
              </div>
              
              {/* LISTA DE MEMBROS NA ETAPA */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
                {stageMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center p-3 border border-dashed rounded-lg text-muted-foreground/60 text-xs">
                    <span>Nenhum membro nesta fase</span>
                    <span className="text-[10px] mt-1">Arraste um card aqui</span>
                  </div>
                ) : (
                  stageMembers.map(member => (
                    <Card 
                      key={member.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, member.id)}
                      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow hover:border-primary/50 bg-card border-border/80"
                    >
                      <CardContent className="p-3.5 flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border">
                            <AvatarImage src={member.photoUrl} />
                            <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                              {(member.name || 'U').substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col overflow-hidden flex-1">
                            <span className="font-semibold text-xs leading-snug truncate" title={member.name}>
                              {member.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate" title={member.email}>
                              {member.email || member.phone || 'Sem contato'}
                            </span>
                          </div>
                        </div>

                        {/* Rápido atalho se estiver em Novo Convertido */}
                        {stage.order === 2 && (
                          <div className="pt-1 border-t border-border/40 flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">Transição: Batismo</span>
                            <Link 
                              href="/discipulado/batismo/encontro-1" 
                              target="_blank"
                              className="text-[10px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-0.5"
                            >
                              <span>Encontro 1</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE DETALHES DOS PASSOS DA FASE */}
      <Dialog open={!!selectedStageForSteps} onOpenChange={(open) => !open && setSelectedStageForSteps(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedStageForSteps && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="font-bold text-xs">
                    Etapa #{selectedStageForSteps.order}
                  </Badge>
                  {selectedStageForSteps.characteristic && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      ✨ {selectedStageForSteps.characteristic}
                    </span>
                  )}
                </div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <span>{selectedStageForSteps.name}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {selectedStageForSteps.description || 'Passos de transição e discipulado pastoral para avançar para a próxima fase.'}
                </DialogDescription>
              </DialogHeader>

              {/* LISTA DOS PASSOS */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ListChecks className="w-4 h-4 text-primary" />
                  <span>Passos / Encontros de Discipulado ({selectedStageForSteps.steps?.length || 0})</span>
                </h4>

                <div className="space-y-2">
                  {selectedStageForSteps.steps?.map((stepText, stepIdx) => {
                    const hasLink = selectedStageForSteps.stepLinks?.[stepIdx];

                    return (
                      <div 
                        key={stepIdx}
                        className="p-3 rounded-xl border border-border bg-muted/30 flex items-start gap-3 hover:border-primary/40 transition-colors"
                      >
                        <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {stepIdx + 1}
                        </span>
                        <div className="flex-1 space-y-1.5">
                          <p className="text-xs font-medium text-foreground leading-relaxed">
                            {stepText}
                          </p>

                          {/* Se for o passo 1 do Batismo ou tiver link cadastrado */}
                          {(hasLink || (selectedStageForSteps.order === 2 && stepIdx === 0)) && (
                            <div className="pt-1">
                              <Link 
                                href="/discipulado/batismo/encontro-1"
                                target="_blank"
                                className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition-all shadow-sm"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Abrir Roteiro do Encontro 1 (Mobile)</span>
                                <ExternalLink className="w-3 h-3 opacity-80" />
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

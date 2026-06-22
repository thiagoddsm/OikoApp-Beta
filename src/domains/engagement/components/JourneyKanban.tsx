'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEngagementData, useMembersData } from '@/hooks/useDomainData';
import { useJourneyService } from '../hooks/useJourneyService';
import { useTenant } from '@/contexts/tenant-context';
import { useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';

export function JourneyKanban() {
  const { journeyStages, isLoading: loadingStages } = useEngagementData();
  const { users, isLoading: loadingUsers } = useMembersData(500); // Carrega batch inicial para o kanban
  const journeyService = useJourneyService();
  const { tenantId } = useTenant();
  const { user } = useFirebase();

  // Estado local para Optimistic UI (drag and drop imediato)
  const [localMembers, setLocalMembers] = useState<any[]>([]);

  useEffect(() => {
    if (users) {
      setLocalMembers(users);
    }
  }, [users]);

  if (loadingStages || loadingUsers) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (journeyStages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center border rounded-xl bg-muted/20 mt-8">
        <h3 className="text-lg font-semibold mb-2">Nenhuma etapa configurada</h3>
        <p className="text-muted-foreground">Configure as etapas da jornada ministerial (journey_stages) para começar.</p>
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
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
      {journeyStages.map(stage => (
        <div 
          key={stage.id} 
          className="flex-shrink-0 w-80 flex flex-col gap-3 bg-muted/30 p-4 rounded-xl border border-border/50"
          onDrop={(e) => handleDrop(e, stage.id)}
          onDragOver={handleDragOver}
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{stage.name}</h3>
            <Badge variant="secondary" className={stage.color || 'bg-slate-100 text-slate-800'}>
              {localMembers.filter(m => m.journeyStageId === stage.id).length}
            </Badge>
          </div>
          
          <div className="flex-1 overflow-y-auto flex flex-col gap-3">
            {localMembers.filter(m => m.journeyStageId === stage.id).map(member => (
              <Card 
                key={member.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, member.id)}
                className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow hover:border-primary/50"
              >
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={member.photoUrl} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {(member.name || 'U').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-semibold text-sm leading-none mb-1 truncate">{member.name}</span>
                      <span className="text-xs text-muted-foreground truncate" title={member.email}>
                        {member.email || 'Sem contato'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

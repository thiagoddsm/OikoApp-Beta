'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Zap, ArrowRight, Activity, MessageSquare, Briefcase, Loader2 } from 'lucide-react';
import { useAutomationRules } from '@/hooks/useDomainData';
import { useAutomationRepository } from '../hooks/useAutomationRepository';

export function AutomationRulesConfig() {
  const { rules, isLoading } = useAutomationRules();
  const repository = useAutomationRepository();

  const getActionIcon = (type: string) => {
    switch(type) {
      case 'SEND_WHATSAPP': return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'CREATE_TASK': return <Briefcase className="w-4 h-4 text-blue-500" />;
      case 'MOVE_STAGE': return <ArrowRight className="w-4 h-4 text-purple-500" />;
      default: return <Zap className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getActionLabel = (type: string) => {
    switch(type) {
      case 'SEND_WHATSAPP': return 'Enviar WhatsApp';
      case 'CREATE_TASK': return 'Criar Tarefa Pastoral';
      case 'MOVE_STAGE': return 'Avançar na Jornada';
      default: return type;
    }
  };

  const toggleRule = async (ruleId: string, currentStatus: boolean) => {
    if (!repository) return;
    try {
      await repository.update(ruleId, { isActive: !currentStatus });
    } catch (error) {
      console.error('Failed to toggle rule', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Motor de Automação</h2>
          <p className="text-muted-foreground">Configure gatilhos automáticos baseados nas atividades dos membros.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center border rounded-xl bg-muted/20 mt-8">
          <h3 className="text-lg font-semibold mb-2">Nenhuma automação configurada</h3>
          <p className="text-muted-foreground">Crie sua primeira regra para iniciar o motor.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rules.map(rule => (
            <Card key={rule.id} className={`transition-all ${rule.isActive ? 'border-l-4 border-l-primary' : 'opacity-60'}`}>
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-base">{rule.name}</CardTitle>
                  <CardDescription>
                    Status: {rule.isActive ? <span className="text-green-600 font-medium">Ativo</span> : 'Inativo'}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Switch 
                    checked={rule.isActive} 
                    onCheckedChange={() => toggleRule(rule.id, rule.isActive)} 
                  />
                  <Badge variant="outline" className="bg-primary/5 text-[10px]">
                    {rule.triggerEvent}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 mt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                    <Activity className="w-4 h-4 shrink-0" />
                    <span>SE <strong>{rule.triggerEvent}</strong> e {rule.conditions?.length || 0} condição(ões)</span>
                  </div>
                  
                  <div className="flex justify-center">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>

                  <div className="flex items-center gap-2 text-sm font-medium bg-background border p-2 rounded-md shadow-sm">
                    {getActionIcon(rule.actionType)}
                    <span>ENTÃO {getActionLabel(rule.actionType)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

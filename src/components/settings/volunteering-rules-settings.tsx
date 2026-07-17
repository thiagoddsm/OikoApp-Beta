'use client';

import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { useFirebase, useDoc } from '@/firebase';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function VolunteeringRulesSettings() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { data: tenantConfig, isLoading } = useDoc<any>('config/tenant_details');

  const [worshipDualService, setWorshipDualService] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tenantConfig) {
      setWorshipDualService(tenantConfig.volunteeringRules?.worshipDualService || false);
    }
  }, [tenantConfig]);

  const handleSave = async () => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      const mergedConfig = {
        ...(tenantConfig || {}),
        volunteeringRules: {
          ...(tenantConfig?.volunteeringRules || {}),
          worshipDualService
        }
      };

      await setDoc(doc(firestore, 'config', 'tenant_details'), mergedConfig);
      toast({
        title: 'Configurações salvas!',
        description: 'As regras de voluntariado foram atualizadas com sucesso.'
      });
    } catch (e) {
      console.error(e);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-20 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 py-2 border rounded-xl px-4 bg-slate-50/50">
        <input
          type="checkbox"
          id="worship-dual-service"
          checked={worshipDualService}
          onChange={(e) => setWorshipDualService(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
        />
        <div className="grid gap-0.5 leading-none">
          <Label htmlFor="worship-dual-service" className="text-sm font-bold cursor-pointer text-slate-800">
            Regra de Duplo Serviço (Louvor)
          </Label>
          <p className="text-[11px] text-muted-foreground leading-normal">
            Todo participante da equipe de Louvor deve servir também em pelo menos mais uma área regular de voluntariado. Alerta os líderes na matriz e na escala caso o membro sirva apenas no Louvor.
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Regras
        </Button>
      </div>
    </div>
  );
}

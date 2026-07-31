'use client';

import React, { useState } from 'react';
import { useFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { PROXIMOS_PASSOS_OPTIONS } from './journey-status-config';
import { addTimelineEvent } from '@/lib/timeline';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ProximosPassosChecklistProps {
  userId: string;
  proximosPassos?: string[];
  proximosPassosConcluidos?: string[];
  readOnly?: boolean;
}

export function ProximosPassosChecklist({
  userId,
  proximosPassos = [],
  proximosPassosConcluidos = [],
  readOnly = false
}: ProximosPassosChecklistProps) {
  const { firestore, user: currentUser } = useFirebase();
  const { toast } = useToast();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  if (!proximosPassos || proximosPassos.length === 0) {
    return (
      <span className="text-xs text-slate-400 italic">Nenhum próximo passo selecionado pelo membro</span>
    );
  }

  const handleToggle = async (stepKey: string) => {
    if (readOnly || !firestore || !userId) return;

    setLoadingKey(stepKey);
    const isCompleted = proximosPassosConcluidos.includes(stepKey);
    const userRef = doc(firestore, 'users', userId);
    const option = PROXIMOS_PASSOS_OPTIONS.find(o => o.value === stepKey);
    const label = option?.label || stepKey;

    try {
      if (isCompleted) {
        await updateDoc(userRef, {
          proximosPassosConcluidos: arrayRemove(stepKey)
        });
        await addTimelineEvent(userId, firestore, {
          category: 'decision',
          entityTitle: 'Próximos Passos & Conexão',
          eventDescription: `REABRIU ETAPA: "${label}"`,
          statusBadge: 'PENDENTE',
          source: 'automatic',
          authorId: currentUser?.uid,
        });
        toast({ title: 'Status Atualizado', description: 'Etapa marcada como pendente e registrada na Linha do Tempo.' });
      } else {
        await updateDoc(userRef, {
          proximosPassosConcluidos: arrayUnion(stepKey)
        });
        await addTimelineEvent(userId, firestore, {
          category: 'decision',
          entityTitle: 'Próximos Passos & Conexão',
          eventDescription: `CONCLUIU ETAPA: "${label}"`,
          statusBadge: 'CONCLUÍDO',
          source: 'automatic',
          authorId: currentUser?.uid,
        });
        toast({ title: 'Etapa Concluída! 🎉', description: 'Desejo de conexão marcado como concluído e registrado na Linha do Tempo.' });
      }
    } catch (err: any) {
      console.error('Error toggling step:', err);
      toast({ variant: 'destructive', title: 'Erro ao salvar status', description: err.message || 'Falha ao atualizar.' });
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="space-y-2">
      {proximosPassos.map(key => {
        const option = PROXIMOS_PASSOS_OPTIONS.find(o => o.value === key);
        const label = option?.label || key;
        const isDone = proximosPassosConcluidos.includes(key);
        const isLoading = loadingKey === key;

        return (
          <div
            key={key}
            onClick={() => !readOnly && handleToggle(key)}
            className={cn(
              "flex items-center justify-between p-2.5 rounded-lg border transition-all text-xs font-medium",
              readOnly ? "cursor-default" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800",
              isDone
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-950 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300"
                : "bg-white border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
            )}
          >
            <div className="flex items-center gap-2.5">
              {isLoading ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : isDone ? (
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <Circle className="size-4 text-slate-300 dark:text-slate-600 shrink-0" />
              )}
              <span className={cn(isDone && "line-through text-emerald-800/80 dark:text-emerald-400/80 font-normal")}>
                {label}
              </span>
            </div>

            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-bold px-2 py-0.5",
                isDone
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
              )}
            >
              {isDone ? 'Concluído' : 'Pendente'}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

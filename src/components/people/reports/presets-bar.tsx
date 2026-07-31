'use client';

import React from 'react';
import { REPORT_PRESETS, ReportPreset } from '@/domain/people/people-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PresetsBarProps {
  activePresetId: string | null;
  onSelectPreset: (preset: ReportPreset) => void;
  onClearFilters: () => void;
}

export function PresetsBar({ activePresetId, onSelectPreset, onClearFilters }: PresetsBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-primary" /> Consultas Rápidas (Presets Configurados)
        </label>
        {activePresetId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold gap-1"
          >
            <XCircle className="size-3.5" /> Limpar Presets
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {REPORT_PRESETS.map(preset => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-sm',
                isActive
                  ? 'bg-primary text-white border-primary shadow-md font-bold'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800'
              )}
              title={preset.description}
            >
              <span>{preset.label}</span>
              {isActive && <Badge className="bg-white/20 text-white text-[9px] px-1 h-3.5 border-none font-bold">Ativo</Badge>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

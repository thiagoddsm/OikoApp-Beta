'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PeopleQueryFilter } from '@/domain/people/people-query';

interface GcFiltersProps {
  filters: PeopleQueryFilter['gc'];
  onChange: (updates: Partial<PeopleQueryFilter['gc']>) => void;
  cells: any[];
  redes: any[];
}

export function GcFilters({ filters = {}, onChange, cells = [], redes = [] }: GcFiltersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
      {/* Pertence a GC? */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Vinculado a GC?</Label>
        <Select value={filters.hasGc || 'all'} onValueChange={val => onChange({ hasGc: val as any })}>
          <SelectTrigger className="h-9 bg-white text-xs font-semibold">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos (Com e Sem GC)</SelectItem>
            <SelectItem value="yes">Sim (Vinculado)</SelectItem>
            <SelectItem value="no">Não (Sem GC)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Célula Específica */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Célula Específica</Label>
        <Select value={filters.cellId || 'all'} onValueChange={val => onChange({ cellId: val })}>
          <SelectTrigger className="h-9 bg-white text-xs font-semibold">
            <SelectValue placeholder="Todas as Células" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Células</SelectItem>
            {cells.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Rede / Área de GC */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Rede de GC</Label>
        <Select value={filters.redeId || 'all'} onValueChange={val => onChange({ redeId: val })}>
          <SelectTrigger className="h-9 bg-white text-xs font-semibold">
            <SelectValue placeholder="Todas as Redes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Redes</SelectItem>
            {redes.map(r => (
              <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cargo / Papel no GC */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Papel / Função no GC</Label>
        <Select value={filters.role || 'all'} onValueChange={val => onChange({ role: val })}>
          <SelectTrigger className="h-9 bg-white text-xs font-semibold">
            <SelectValue placeholder="Todos os Cargos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Cargos</SelectItem>
            <SelectItem value="lider">Líder de GC</SelectItem>
            <SelectItem value="colider">Co-líder / Treinamento</SelectItem>
            <SelectItem value="supervisor">Supervisor</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

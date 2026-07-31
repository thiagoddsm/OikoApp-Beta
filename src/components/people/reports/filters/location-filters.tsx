'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PeopleQueryFilter } from '@/domain/people/people-query';

interface LocationFiltersProps {
  filters: PeopleQueryFilter['location'];
  onChange: (updates: Partial<PeopleQueryFilter['location']>) => void;
}

export function LocationFilters({ filters = {}, onChange }: LocationFiltersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Bairro</Label>
        <Input
          placeholder="Ex: Centro, Icaraí, Trindade..."
          value={filters.bairro === 'all' ? '' : filters.bairro || ''}
          onChange={e => onChange({ bairro: e.target.value })}
          className="h-9 bg-white text-xs"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Cidade</Label>
        <Input
          placeholder="Ex: Niterói, São Gonçalo, Rio de Janeiro..."
          value={filters.cidade === 'all' ? '' : filters.cidade || ''}
          onChange={e => onChange({ cidade: e.target.value })}
          className="h-9 bg-white text-xs"
        />
      </div>
    </div>
  );
}

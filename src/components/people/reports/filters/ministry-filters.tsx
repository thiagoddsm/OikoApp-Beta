'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PeopleQueryFilter } from '@/domain/people/people-query';

interface MinistryFiltersProps {
  filters: PeopleQueryFilter['ministry'];
  onChange: (updates: Partial<PeopleQueryFilter['ministry']>) => void;
  serviceAreas: any[];
  teams: any[];
}

export function MinistryFilters({ filters = {}, onChange, serviceAreas = [], teams = [] }: MinistryFiltersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {/* É Voluntário / Serve? */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Voluntário / Serve?</Label>
        <Select value={filters.isVolunteer || 'all'} onValueChange={val => onChange({ isVolunteer: val as any })}>
          <SelectTrigger className="h-9 bg-white text-xs font-semibold">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos (Voluntários e Não Voluntários)</SelectItem>
            <SelectItem value="yes">Sim (Voluntário Ativo)</SelectItem>
            <SelectItem value="no">Não (Sem Ministério)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Área de Serviço Específica */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Área de Serviço</Label>
        <Select value={filters.serviceAreaId || 'all'} onValueChange={val => onChange({ serviceAreaId: val })}>
          <SelectTrigger className="h-9 bg-white text-xs font-semibold">
            <SelectValue placeholder="Todas as Áreas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Áreas de Serviço</SelectItem>
            {serviceAreas.map(sa => (
              <SelectItem key={sa.id} value={sa.id}>{sa.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Equipe Específica */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Equipe de Escala</Label>
        <Select value={filters.teamId || 'all'} onValueChange={val => onChange({ teamId: val })}>
          <SelectTrigger className="h-9 bg-white text-xs font-semibold">
            <SelectValue placeholder="Todas as Equipes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Equipes</SelectItem>
            {teams.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

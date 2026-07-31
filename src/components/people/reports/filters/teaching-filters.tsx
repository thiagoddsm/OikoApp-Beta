'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PeopleQueryFilter } from '@/domain/people/people-query';

interface TeachingFiltersProps {
  filters: PeopleQueryFilter['teaching'];
  onChange: (updates: Partial<PeopleQueryFilter['teaching']>) => void;
  courses: any[];
}

export function TeachingFilters({ filters = {}, onChange, courses = [] }: TeachingFiltersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Membresia Modular Concluída? */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Curso de Membresia Concluído?</Label>
        <Select value={filters.membresiaCompleted || 'all'} onValueChange={val => onChange({ membresiaCompleted: val as any })}>
          <SelectTrigger className="h-9 bg-white text-xs font-semibold">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="yes">Sim (Membresia Concluída)</SelectItem>
            <SelectItem value="no">Não (Pendente/Em andamento)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Aluno em Algum Curso? */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Matriculado em Curso?</Label>
        <Select value={filters.hasCourse || 'all'} onValueChange={val => onChange({ hasCourse: val as any })}>
          <SelectTrigger className="h-9 bg-white text-xs font-semibold">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="yes">Sim (Possui Cursos)</SelectItem>
            <SelectItem value="no">Não (Sem Cursos)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Curso Específico */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Curso Específico</Label>
        <Select value={filters.courseId || 'all'} onValueChange={val => onChange({ courseId: val })}>
          <SelectTrigger className="h-9 bg-white text-xs font-semibold">
            <SelectValue placeholder="Todos os Cursos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Cursos</SelectItem>
            {courses.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PeopleQueryFilter } from '@/domain/people/people-query';

interface PersonalFiltersProps {
  filters: PeopleQueryFilter['personal'];
  onChange: (updates: Partial<PeopleQueryFilter['personal']>) => void;
  availableTags?: string[];
}

const MONTHS = [
  { value: 'all', label: 'Todos os Meses' },
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

export function PersonalFilters({ filters = {}, onChange, availableTags = [] }: PersonalFiltersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {/* Status de Integração */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Status de Integração</Label>
        <Select value={filters.integrationStatus || 'all'} onValueChange={val => onChange({ integrationStatus: val })}>
          <SelectTrigger className="h-9 bg-white text-xs font-semibold">
            <SelectValue placeholder="Todos os Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="membro">Membro</SelectItem>
            <SelectItem value="novo_convertido">Novo Convertido</SelectItem>
            <SelectItem value="reconciliado">Reconciliado</SelectItem>
            <SelectItem value="transferido">Transferido</SelectItem>
            <SelectItem value="nao_alcancado">Não Alcançado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Gênero */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Gênero</Label>
        <Select value={filters.gender || 'all'} onValueChange={val => onChange({ gender: val })}>
          <SelectTrigger className="h-9 bg-white text-xs font-semibold">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="masculino">Masculino</SelectItem>
            <SelectItem value="feminino">Feminino</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Estado Civil */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Estado Civil</Label>
        <Select value={filters.maritalStatus || 'all'} onValueChange={val => onChange({ maritalStatus: val })}>
          <SelectTrigger className="h-9 bg-white text-xs font-semibold">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="solteiro">Solteiro(a)</SelectItem>
            <SelectItem value="casado">Casado(a)</SelectItem>
            <SelectItem value="divorciado">Divorciado(a)</SelectItem>
            <SelectItem value="viuvo">Viúvo(a)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Batizado */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Batizado</Label>
        <Select value={filters.isBaptized || 'all'} onValueChange={val => onChange({ isBaptized: val as any })}>
          <SelectTrigger className="h-9 bg-white text-xs font-semibold">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="yes">Sim (Batizado)</SelectItem>
            <SelectItem value="no">Não (Pendente)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Aniversariante */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Mês Aniversário</Label>
        <Select value={filters.birthMonth || 'all'} onValueChange={val => onChange({ birthMonth: val })}>
          <SelectTrigger className="h-9 bg-white text-xs font-semibold">
            <SelectValue placeholder="Todos os Meses" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Faixa Etária */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Faixa de Idade</Label>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            placeholder="Min"
            value={filters.ageMin ?? ''}
            onChange={e => onChange({ ageMin: e.target.value })}
            className="h-9 bg-white text-xs px-2"
          />
          <span className="text-xs text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            value={filters.ageMax ?? ''}
            onChange={e => onChange({ ageMax: e.target.value })}
            className="h-9 bg-white text-xs px-2"
          />
        </div>
      </div>
    </div>
  );
}

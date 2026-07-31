'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PeopleQueryFilter } from '@/domain/people/people-query';

interface CompletenessFiltersProps {
  filters: PeopleQueryFilter['completeness'];
  onChange: (updates: Partial<PeopleQueryFilter['completeness']>) => void;
}

export function CompletenessFilters({ filters = {}, onChange }: CompletenessFiltersProps) {
  const items = [
    { key: 'missingPhone', label: 'Sem Telefone Cadastrado' },
    { key: 'missingPhoto', label: 'Sem Foto de Perfil' },
    { key: 'missingAddress', label: 'Sem Endereço / Bairro' },
    { key: 'missingCpf', label: 'Sem CPF' },
    { key: 'missingBirthDate', label: 'Sem Data de Nascimento' },
    { key: 'missingMaritalStatus', label: 'Sem Estado Civil' },
  ] as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 bg-amber-50/50 p-3 rounded-lg border border-amber-200/60">
      {items.map(item => {
        const isChecked = !!filters[item.key];
        return (
          <div key={item.key} className="flex items-center space-x-2">
            <Checkbox
              id={`completeness-${item.key}`}
              checked={isChecked}
              onCheckedChange={checked => onChange({ [item.key]: !!checked })}
            />
            <Label
              htmlFor={`completeness-${item.key}`}
              className="text-xs font-semibold text-amber-900 cursor-pointer leading-none"
            >
              {item.label}
            </Label>
          </div>
        );
      })}
    </div>
  );
}

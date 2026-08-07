'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Filter } from 'lucide-react';
import { FilterRuleBlock, FilterCategory, FilterOperator, CATEGORY_LABELS } from '@/types/membership-board-types';
import { useUser } from '@/firebase/provider';

interface QueryBuilderBlocksProps {
  rules: FilterRuleBlock[];
  onChange: (rules: FilterRuleBlock[]) => void;
}

interface SystemOptions {
  courses: { id: string; name: string }[];
  events: { id: string; name: string }[];
  cells: { id: string; name: string }[];
  ministries: { id: string; name: string }[];
}

const FIELD_OPTIONS_BY_CATEGORY: Record<FilterCategory, { key: string; label: string; operators: FilterOperator[] }[]> = {
  membresia: [
    { key: 'status', label: 'Status de Membresia', operators: ['equals', 'not_equals', 'in'] },
    { key: 'gender', label: 'Gênero', operators: ['equals'] },
    { key: 'age', label: 'Idade (anos)', operators: ['equals', 'greater_than', 'less_than'] },
    { key: 'maritalStatus', label: 'Estado Civil', operators: ['equals', 'in'] },
    { key: 'isBaptized', label: 'Batizado', operators: ['is_active'] },
  ],
  eventos: [
    { key: 'eventId', label: 'Participou do Evento (Selecione da Lista)', operators: ['equals', 'contains'] },
    { key: 'status', label: 'Status do Ingresso / Inscrição', operators: ['equals', 'in'] },
  ],
  ensino: [
    { key: 'courseId', label: 'Matriculado no Curso (Selecione da Lista)', operators: ['equals', 'contains'] },
    { key: 'classId', label: 'Matriculado na Turma Específica', operators: ['equals'] },
    { key: 'paymentStatus', label: 'Status Financeiro do Curso', operators: ['equals', 'in'] },
  ],
  pequenos_grupos: [
    { key: 'cellId', label: 'Pertence ao GC / Célula (Selecione da Lista)', operators: ['equals', 'contains'] },
    { key: 'role', label: 'Cargo no GC (Líder / Membro / Anfitrião)', operators: ['equals', 'in'] },
  ],
  ministerios: [
    { key: 'ministryId', label: 'Voluntário no Ministério (Selecione da Lista)', operators: ['equals', 'contains'] },
  ],
  financeiro: [
    { key: 'isDizimista', label: 'Dizimista Ativo / Cadastrado', operators: ['is_active'] },
    { key: 'status', label: 'Status de Mensalidades Asaas', operators: ['equals', 'in'] },
  ],
  discipulado: [
    { key: 'hasDiscipulador', label: 'Possui Discipulador Acompanhando', operators: ['is_active'] },
    { key: 'isDiscipulador', label: 'É Discipulador Ativo', operators: ['is_active'] },
  ],
};

const PREDEFINED_SELECT_OPTIONS: Record<string, { label: string; value: string }[]> = {
  status: [
    { label: 'Ativo', value: 'ativo' },
    { label: 'Inativo', value: 'inativo' },
    { label: 'Visitante', value: 'visitante' },
    { label: 'Pendente', value: 'pending' },
    { label: 'Pago', value: 'pago' },
    { label: 'Aprovado', value: 'approved' },
  ],
  gender: [
    { label: 'Masculino', value: 'Masculino' },
    { label: 'Feminino', value: 'Feminino' },
  ],
  maritalStatus: [
    { label: 'Solteiro(a)', value: 'Solteiro' },
    { label: 'Casado(a)', value: 'Casado' },
    { label: 'Divorciado(a)', value: 'Divorciado' },
    { label: 'Viúvo(a)', value: 'Viuvo' },
  ],
  role: [
    { label: 'Líder de GC', value: 'lider' },
    { label: 'Vice-Líder', value: 'vice_lider' },
    { label: 'Anfitrião', value: 'anfitriao' },
    { label: 'Membro Regular', value: 'membro' },
  ],
  paymentStatus: [
    { label: 'Pago', value: 'pago' },
    { label: 'Em Aberto', value: 'em_aberto' },
    { label: 'Isento / Bolsa', value: 'isento' },
  ],
};

export function QueryBuilderBlocks({ rules, onChange }: QueryBuilderBlocksProps) {
  const { user } = useUser();
  const [options, setOptions] = useState<SystemOptions>({ courses: [], events: [], cells: [], ministries: [] });
  const [loadingOptions, setLoadingOptions] = useState<boolean>(false);

  useEffect(() => {
    fetchOptions();
  }, [user]);

  const fetchOptions = async () => {
    if (!user) return;
    setLoadingOptions(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/membership/options', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOptions({
          courses: data.courses || [],
          events: data.events || [],
          cells: data.cells || [],
          ministries: data.ministries || [],
        });
      }
    } catch (e) {
      console.error('Erro ao carregar opções do sistema:', e);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleAddRule = (category: FilterCategory) => {
    const defaultField = FIELD_OPTIONS_BY_CATEGORY[category][0]?.key || 'status';
    const newRule: FilterRuleBlock = {
      id: 'rule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      category,
      field: defaultField,
      operator: 'equals',
      value: '',
      logicalOperator: 'AND',
      isNegated: false,
    };
    onChange([...rules, newRule]);
  };

  const handleUpdateRule = (id: string, updates: Partial<FilterRuleBlock>) => {
    onChange(rules.map(r => (r.id === id ? { ...r, ...updates } : r)));
  };

  const handleRemoveRule = (id: string) => {
    onChange(rules.filter(r => r.id !== id));
  };

  const renderValueInput = (rule: FilterRuleBlock) => {
    if (rule.operator === 'is_active') return null;

    // Seletores Inteligentes Dinâmicos baseados no campo
    if (rule.field === 'courseId' && options.courses.length > 0) {
      return (
        <Select value={rule.value || ''} onValueChange={val => handleUpdateRule(rule.id, { value: val })}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Selecione o curso..." />
          </SelectTrigger>
          <SelectContent>
            {options.courses.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (rule.field === 'eventId' && options.events.length > 0) {
      return (
        <Select value={rule.value || ''} onValueChange={val => handleUpdateRule(rule.id, { value: val })}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Selecione o evento..." />
          </SelectTrigger>
          <SelectContent>
            {options.events.map(e => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (rule.field === 'cellId' && options.cells.length > 0) {
      return (
        <Select value={rule.value || ''} onValueChange={val => handleUpdateRule(rule.id, { value: val })}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Selecione o GC..." />
          </SelectTrigger>
          <SelectContent>
            {options.cells.map(cell => (
              <SelectItem key={cell.id} value={cell.id}>
                {cell.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (rule.field === 'ministryId' && options.ministries.length > 0) {
      return (
        <Select value={rule.value || ''} onValueChange={val => handleUpdateRule(rule.id, { value: val })}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Selecione o ministério..." />
          </SelectTrigger>
          <SelectContent>
            {options.ministries.map(m => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Seletores Predefinidos
    const predefined = PREDEFINED_SELECT_OPTIONS[rule.field];
    if (predefined) {
      return (
        <Select value={rule.value || ''} onValueChange={val => handleUpdateRule(rule.id, { value: val })}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Selecione a opção..." />
          </SelectTrigger>
          <SelectContent>
            {predefined.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Fallback para Input Texto Puro
    return (
      <Input
        placeholder="Digite o valor..."
        value={rule.value || ''}
        onChange={e => handleUpdateRule(rule.id, { value: e.target.value })}
        className="h-9 text-xs"
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Barra de Adicionar Regra por Categoria */}
      <div className="space-y-2">
        <Label className="text-xs font-black uppercase text-slate-600 dark:text-slate-400">
          Adicionar Bloco de Filtro Por Módulo
        </Label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORY_LABELS) as FilterCategory[]).map(cat => {
            const meta = CATEGORY_LABELS[cat];
            return (
              <Button
                key={cat}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddRule(cat)}
                className="h-8 text-xs font-bold gap-1 border-slate-300 dark:border-slate-700 hover:border-primary hover:text-primary transition-all"
              >
                <Plus size={12} />
                {meta.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Lista de Blocos de Regras */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <Filter size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-500">Nenhum bloco de filtro adicionado.</p>
            <p className="text-xs text-slate-400">Clique em um dos módulos acima para construir sua consulta combinada.</p>
          </div>
        ) : (
          rules.map((rule, index) => {
            const catMeta = CATEGORY_LABELS[rule.category];
            const availableFields = FIELD_OPTIONS_BY_CATEGORY[rule.category] || [];
            const selectedFieldObj = availableFields.find(f => f.key === rule.field) || availableFields[0];

            return (
              <Card
                key={rule.id}
                className={`transition-all border-2 ${
                  rule.isNegated
                    ? 'border-rose-300 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/60'
                    : 'border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800'
                }`}
              >
                <CardContent className="p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-3 border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      {index > 0 && (
                        <Select
                          value={rule.logicalOperator}
                          onValueChange={val => handleUpdateRule(rule.id, { logicalOperator: val as 'AND' | 'OR' })}
                        >
                          <SelectTrigger className="h-7 w-20 text-[10px] font-black uppercase bg-slate-100 border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AND">E (AND)</SelectItem>
                            <SelectItem value="OR">OU (OR)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      <Badge className={`${catMeta.color} text-white font-bold gap-1 text-[11px]`}>
                        Bloco #{index + 1}: {catMeta.label}
                      </Badge>
                    </div>

                    {/* Toggle de Negação / Exclusão (Padrão Eklesia) */}
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                      <Switch
                        id={`negated-${rule.id}`}
                        checked={rule.isNegated ?? false}
                        onCheckedChange={checked => handleUpdateRule(rule.id, { isNegated: checked })}
                      />
                      <Label htmlFor={`negated-${rule.id}`} className="text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                        {rule.isNegated ? (
                          <span className="text-rose-600 font-black">🚫 EXCLUIR se atender</span>
                        ) : (
                          'Inclusão Normal'
                        )}
                      </Label>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveRule(rule.id)}
                      className="size-7 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>

                  {/* Parametrização dos Filtros */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Campo */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-slate-500">Campo</Label>
                      <Select
                        value={rule.field}
                        onValueChange={val => {
                          const newFieldObj = availableFields.find(f => f.key === val);
                          handleUpdateRule(rule.id, {
                            field: val,
                            operator: newFieldObj?.operators[0] || 'equals',
                            value: '',
                          });
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields.map(f => (
                            <SelectItem key={f.key} value={f.key}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Operador */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-slate-500">Operador</Label>
                      <Select
                        value={rule.operator}
                        onValueChange={val => handleUpdateRule(rule.id, { operator: val as FilterOperator })}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(selectedFieldObj?.operators || ['equals']).map(op => (
                            <SelectItem key={op} value={op}>
                              {op === 'equals' && 'Igual a'}
                              {op === 'not_equals' && 'Diferente de'}
                              {op === 'contains' && 'Contém texto'}
                              {op === 'greater_than' && 'Maior que'}
                              {op === 'less_than' && 'Menor que'}
                              {op === 'in' && 'Presente na lista'}
                              {op === 'is_active' && 'É Verdadeiro / Ativo'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Valor Parametrizado (Seletor Inteligente ou Texto) */}
                    {rule.operator !== 'is_active' && (
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">Valor de Busca (Lista do Sistema)</Label>
                        {renderValueInput(rule)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PeopleQueryFilter } from '@/domain/people/people-query';

interface JourneyFiltersProps {
  filters: PeopleQueryFilter['journey'];
  onChange: (updates: Partial<PeopleQueryFilter['journey']>) => void;
}

export function JourneyFilters({ filters = {}, onChange }: JourneyFiltersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {/* Próximo Passo / Desejo de Conexão */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Desejo de Conexão / Passo</Label>
        <Select value={filters.proximoPasso || 'all'} onValueChange={val => onChange({ proximoPasso: val })}>
          <SelectTrigger className="h-9 bg-white text-xs font-semibold">
            <SelectValue placeholder="Todos os Desejos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Desejos</SelectItem>
            <SelectItem value="batismo">Quero me batizar nas águas</SelectItem>
            <SelectItem value="gc">Quero me integrar em uma Célula / GC</SelectItem>
            <SelectItem value="voluntariado">Quero me voluntariar em uma área</SelectItem>
            <SelectItem value="congregar">Estou procurando uma igreja para me integrar</SelectItem>
            <SelectItem value="aconselhamento">Preciso de atendimento pastoral / aconselhamento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status da Etapa / Conclusão */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Status do Desejo</Label>
        <Select value={filters.proximoPassoStatus || 'all'} onValueChange={val => onChange({ proximoPassoStatus: val as any })}>
          <SelectTrigger className="h-9 bg-white text-xs font-semibold">
            <SelectValue placeholder="Todos os Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos (Pendentes e Concluídos)</SelectItem>
            <SelectItem value="pending">🟡 Pendente (Aguardando Conclusão)</SelectItem>
            <SelectItem value="completed">🟢 Concluído (Conferido)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Início da Caminhada */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Início da Caminhada</Label>
        <Select value={filters.caminhadaInicio || 'all'} onValueChange={val => onChange({ caminhadaInicio: val })}>
          <SelectTrigger className="h-9 bg-white text-xs font-semibold">
            <SelectValue placeholder="Todas as opções" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Opções</SelectItem>
            <SelectItem value="conversao">Me converti aqui na IBM</SelectItem>
            <SelectItem value="reconciliacao">Me reconciliei com Jesus aqui</SelectItem>
            <SelectItem value="transferencia">Vim transferido de outra igreja</SelectItem>
            <SelectItem value="conhecendo">Ainda conhecendo / Não convertido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Igreja Anterior */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">De qual igreja veio?</Label>
        <Input
          placeholder="Ex: PIBA, Assembléia, Primeira Igreja..."
          value={filters.igrejaAntiga || ''}
          onChange={e => onChange({ igrejaAntiga: e.target.value })}
          className="h-9 bg-white text-xs"
        />
      </div>

      {/* Quem convidou */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Quem convidou?</Label>
        <Input
          placeholder="Nome de quem convidou..."
          value={filters.nomeConvidou || ''}
          onChange={e => onChange({ nomeConvidou: e.target.value })}
          className="h-9 bg-white text-xs"
        />
      </div>

      {/* Como conheceu */}
      <div className="space-y-1">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Como conheceu a igreja?</Label>
        <Input
          placeholder="Ex: Redes sociais, amigo, evento..."
          value={filters.comoConheceu || ''}
          onChange={e => onChange({ comoConheceu: e.target.value })}
          className="h-9 bg-white text-xs"
        />
      </div>
    </div>
  );
}

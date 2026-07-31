'use client';

import React, { useMemo } from 'react';
import { usePeopleReport } from './hooks/use-people-report';
import { PresetsBar } from './presets-bar';
import { PersonalFilters } from './filters/personal-filters';
import { JourneyFilters } from './filters/journey-filters';
import { GcFilters } from './filters/gc-filters';
import { MinistryFilters } from './filters/ministry-filters';
import { TeachingFilters } from './filters/teaching-filters';
import { CompletenessFilters } from './filters/completeness-filters';
import { LocationFilters } from './filters/location-filters';
import { Kpis } from './results/kpis';
import { PeopleTableResults } from './results/people-table';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, Filter, Users, HeartHandshake, HandHelping, GraduationCap, ShieldCheck, MapPin, Compass } from 'lucide-react';

export function PeopleReportsPage() {
  const {
    users,
    filteredUsers,
    filters,
    activePresetId,
    cells,
    serviceAreas,
    teams,
    courses,
    redes,
    isLoading,
    applyPreset,
    clearFilters,
    updateSearchTerm,
    updatePersonalFilters,
    updateJourneyFilters,
    updateGcFilters,
    updateMinistryFilters,
    updateTeachingFilters,
    updateCompletenessFilters,
    updateLocationFilters,
  } = usePeopleReport();

  const cellMap = useMemo(() => new Map(cells.map(c => [c.id, c.nome])), [cells]);
  const areaMap = useMemo(() => new Map(serviceAreas.map(a => [a.id, a.name])), [serviceAreas]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground">Carregando motor de busca de pessoas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black italic tracking-tight uppercase text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="size-7 text-primary" /> Relatórios & Consultas Cruzadas
          </h1>
          <p className="text-xs text-muted-foreground">
            Motor de consulta inteligente para filtrar membros por dados pessoais, GC, ministérios, ensino e qualidade cadastral.
          </p>
        </div>
      </div>

      {/* Barra de Presets de 1-Clique */}
      <PresetsBar
        activePresetId={activePresetId}
        onSelectPreset={applyPreset}
        onClearFilters={clearFilters}
      />

      {/* Painel Principal de Filtros por Abas / Blocos de Domínio */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail, telefone ou CPF..."
                value={filters.searchTerm || ''}
                onChange={e => updateSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-white text-xs"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-9 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              Resetar Filtros
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <Tabs defaultValue="personal" className="space-y-4">
            <TabsList className="flex flex-wrap h-auto bg-slate-100 dark:bg-slate-800 p-1 gap-1">
              <TabsTrigger value="personal" className="text-xs font-bold gap-1.5 py-1.5">
                <Users className="size-3.5" /> Pessoal / Cadastro
              </TabsTrigger>
              <TabsTrigger value="journey" className="text-xs font-bold gap-1.5 py-1.5 text-primary">
                <Compass className="size-3.5" /> Jornada & Conexão
              </TabsTrigger>
              <TabsTrigger value="gc" className="text-xs font-bold gap-1.5 py-1.5">
                <HeartHandshake className="size-3.5" /> Células (GC)
              </TabsTrigger>
              <TabsTrigger value="ministry" className="text-xs font-bold gap-1.5 py-1.5">
                <HandHelping className="size-3.5" /> Serviço / Voluntariado
              </TabsTrigger>
              <TabsTrigger value="teaching" className="text-xs font-bold gap-1.5 py-1.5">
                <GraduationCap className="size-3.5" /> Ensino & Membresia
              </TabsTrigger>
              <TabsTrigger value="completeness" className="text-xs font-bold gap-1.5 py-1.5 text-amber-700 dark:text-amber-400">
                <ShieldCheck className="size-3.5" /> Qualidade Cadastral
              </TabsTrigger>
              <TabsTrigger value="location" className="text-xs font-bold gap-1.5 py-1.5">
                <MapPin className="size-3.5" /> Localização
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="pt-2">
              <PersonalFilters filters={filters.personal} onChange={updatePersonalFilters} />
            </TabsContent>

            <TabsContent value="journey" className="pt-2">
              <JourneyFilters filters={filters.journey} onChange={updateJourneyFilters} />
            </TabsContent>

            <TabsContent value="gc" className="pt-2">
              <GcFilters filters={filters.gc} onChange={updateGcFilters} cells={cells} redes={redes} />
            </TabsContent>

            <TabsContent value="ministry" className="pt-2">
              <MinistryFilters filters={filters.ministry} onChange={updateMinistryFilters} serviceAreas={serviceAreas} teams={teams} />
            </TabsContent>

            <TabsContent value="teaching" className="pt-2">
              <TeachingFilters filters={filters.teaching} onChange={updateTeachingFilters} courses={courses} />
            </TabsContent>

            <TabsContent value="completeness" className="pt-2">
              <CompletenessFilters filters={filters.completeness} onChange={updateCompletenessFilters} />
            </TabsContent>

            <TabsContent value="location" className="pt-2">
              <LocationFilters filters={filters.location} onChange={updateLocationFilters} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Cards de KPIs */}
      <Kpis totalUsers={users.length} filteredUsers={filteredUsers} />

      {/* Tabela de Resultados */}
      <PeopleTableResults filteredUsers={filteredUsers} cellMap={cellMap} areaMap={areaMap} />
    </div>
  );
}

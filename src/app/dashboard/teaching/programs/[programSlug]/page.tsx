'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTeachingPrograms } from '@/hooks/useTeachingPrograms';
import { CAPABILITIES_METADATA } from '@/lib/programs/capability-registry';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Music2, BookOpen, Hand, HeartHandshake, PlayCircle, GraduationCap, ArrowLeft, Calendar, Users, DollarSign, CheckSquare, History, FileQuestion, Book } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { WaveAdminDashboard } from '@/components/teaching/wave/admin-dashboard';
import { WaveFinanceDashboard } from '@/components/teaching/wave/wave-finance-dashboard';
import { StudentsManagement } from '@/components/teaching/students-management';
import { TeachersManagement } from '@/components/teaching/teachers-management';

const ICON_MAP: Record<string, any> = {
  Music2,
  BookOpen,
  Hand,
  HeartHandshake,
  PlayCircle,
  GraduationCap
};

export default function ProgramDetailPage() {
  const params = useParams();
  const programSlug = params.programSlug as string;
  const { programs, isLoading } = useTeachingPrograms();

  const program = useMemo(() => {
    return programs.find(p => p.slug === programSlug || p.id === programSlug);
  }, [programs, programSlug]);

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Programa Não Encontrado</h2>
        <p className="text-slate-500 text-sm">O programa de ensino "{programSlug}" não existe ou foi arquivado.</p>
        <Link href="/dashboard/teaching/programs">
          <Button variant="outline"><ArrowLeft className="mr-2 size-4" /> Voltar aos Programas</Button>
        </Link>
      </div>
    );
  }

  const IconComponent = ICON_MAP[program.icon] || GraduationCap;
  const capabilities = program.capabilities || [];

  return (
    <VolunteeringProvider>
      <div className="space-y-6">
        {/* Program Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/teaching/programs">
              <Button variant="ghost" size="icon" className="size-9">
                <ArrowLeft className="size-5 text-slate-500" />
              </Button>
            </Link>
            <div className="p-3 rounded-2xl text-white shadow-sm" style={{ backgroundColor: program.color || '#6366f1' }}>
              <IconComponent className="size-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{program.name}</h1>
                <Badge variant="outline" className="text-xs uppercase">{program.attendanceMode}</Badge>
              </div>
              <p className="text-sm text-slate-500 line-clamp-1">{program.description}</p>
            </div>
          </div>
        </div>

        {/* Declarative Tabs powered by Capabilities */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex flex-wrap h-auto p-1 bg-slate-100 dark:bg-slate-850 rounded-xl mb-6">
            <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold py-2">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="courses" className="rounded-lg text-xs font-semibold py-2">
              Cursos & Turmas
            </TabsTrigger>

            {/* Conditional Capability-driven Tabs */}
            {capabilities.includes('financial') && (
              <TabsTrigger value="financial" className="rounded-lg text-xs font-semibold py-2 flex items-center gap-1.5">
                <DollarSign className="size-3.5" /> Financeiro
              </TabsTrigger>
            )}

            {capabilities.includes('electronic_point') && (
              <TabsTrigger value="diario" className="rounded-lg text-xs font-semibold py-2 flex items-center gap-1.5">
                <CheckSquare className="size-3.5" /> Ponto & Diário
              </TabsTrigger>
            )}

            {capabilities.includes('replacement_queue') && (
              <TabsTrigger value="reposicoes" className="rounded-lg text-xs font-semibold py-2 flex items-center gap-1.5">
                <History className="size-3.5" /> Reposições
              </TabsTrigger>
            )}

            {capabilities.includes('quizzes') && (
              <TabsTrigger value="quizzes" className="rounded-lg text-xs font-semibold py-2 flex items-center gap-1.5">
                <FileQuestion className="size-3.5" /> Quizzes & EAD
              </TabsTrigger>
            )}

            <TabsTrigger value="students" className="rounded-lg text-xs font-semibold py-2 flex items-center gap-1.5">
              <Users className="size-3.5" /> Alunos
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview */}
          <TabsContent value="overview">
            {program.slug === 'wave' ? (
              <WaveAdminDashboard />
            ) : (
              <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                <CardHeader>
                  <CardTitle>Painel do Programa: {program.name}</CardTitle>
                  <CardDescription>Resumo de atividades e turmas ativas deste programa.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950">
                      <p className="text-xs text-slate-400">Capacidades Ativas</p>
                      <p className="text-2xl font-bold text-indigo-600 mt-1">{capabilities.length}</p>
                    </div>
                    <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950">
                      <p className="text-xs text-slate-400">Modalidade de Frequência</p>
                      <p className="text-2xl font-bold text-emerald-600 capitalize mt-1">{program.attendanceMode}</p>
                    </div>
                    <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950">
                      <p className="text-xs text-slate-400">Identificador Interno</p>
                      <p className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-1">{program.slug}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab 2: Courses & Classes */}
          <TabsContent value="courses">
            <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle>Cursos e Turmas de {program.name}</CardTitle>
                <CardDescription>Gestão de disciplinas e agendamento de aulas deste programa.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">Listagem de disciplinas cadastradas vinculadas a {program.name}.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Financial (if capability present) */}
          {capabilities.includes('financial') && (
            <TabsContent value="financial">
              <WaveFinanceDashboard />
            </TabsContent>
          )}

          {/* Tab 4: Electronic Point / Diario */}
          {capabilities.includes('electronic_point') && (
            <TabsContent value="diario">
              <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                <CardHeader>
                  <CardTitle>Ponto Eletrônico & Diários</CardTitle>
                  <CardDescription>Sessões ativas e diários de aula dos mentores de {program.name}.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/teaching/diario">
                    <Button className="bg-indigo-600 text-white">Abrir Central do Diário de Classe</Button>
                  </Link>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Tab 5: Reposicoes */}
          {capabilities.includes('replacement_queue') && (
            <TabsContent value="reposicoes">
              <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                <CardHeader>
                  <CardTitle>Fila de Reposições de {program.name}</CardTitle>
                  <CardDescription>Reagendamento automático de faltas de alunos ou professores.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/teaching/reposicoes">
                    <Button className="bg-indigo-600 text-white">Abrir Fila de Reposições</Button>
                  </Link>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Tab 6: Students */}
          <TabsContent value="students">
            <StudentsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </VolunteeringProvider>
  );
}

'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, Rocket, TrendingUp, AlertTriangle, CheckCircle2, DollarSign, Award, ChevronRight } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { useCoursesData, useMembersData } from '@/hooks/useDomainData';
import Link from 'next/link';

const performanceData = [
  { name: 'DIS Libras', frequencia: 94, promocao: 88 },
  { name: 'Lumine Membros', frequencia: 91, promocao: 95 },
  { name: 'Wave Mentoria', frequencia: 89, promocao: 82 },
  { name: 'Cuidar / Cursos', frequencia: 96, promocao: 90 },
];

export function CoordinatorDashboard() {
  const { users } = useMembersData();
  const { courses, classes, enrollmentRequests } = useCoursesData();

  const totalClasses = classes.length;
  const totalStudents = useMemo(() => {
    const set = new Set<string>();
    classes.forEach(c => c.students?.forEach(s => set.add(s)));
    return set.size;
  }, [classes]);

  const pendingRequestsCount = enrollmentRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="size-6 text-indigo-600" />
            Dashboard Executivo do Coordenador de Ensino
          </h1>
          <p className="text-xs text-slate-500">
            Métricas estratégicas do ciclo letivo, retenção pedagógica, promoções pendentes e inadimplência.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-indigo-600 text-white font-bold px-3 py-1 text-xs">
            Ciclo Ativo: 2026/2
          </Badge>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-indigo-100 bg-indigo-50/40 dark:bg-indigo-950/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-indigo-700 dark:text-indigo-300">Alunos Ativos no Ciclo</CardTitle>
            <Users className="size-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-indigo-900 dark:text-indigo-100">{totalStudents}</div>
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">Matrículas ativas confirmadas</p>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-purple-50/40 dark:bg-purple-950/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-purple-700 dark:text-purple-300">Turmas em Andamento</CardTitle>
            <BookOpen className="size-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-purple-900 dark:text-purple-100">{totalClasses}</div>
            <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">Turmas presenciais e mentorias</p>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-amber-50/40 dark:bg-amber-950/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-amber-700 dark:text-amber-300">Solicitações Pendentes</CardTitle>
            <AlertTriangle className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-900 dark:text-amber-100">{pendingRequestsCount}</div>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Inscrições aguardando aprovação</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-emerald-50/40 dark:bg-emerald-950/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">Frequência Média Global</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100">92.5%</div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Presença consolidada (Presencial + EAD)</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="size-5 text-indigo-600" />
              Aproveitamento & Taxa de Promoção por Programa
            </CardTitle>
            <CardDescription className="text-xs">Comparativo de frequência e retenção entre os programas de ensino.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="frequencia" name="Frequência Média (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="promocao" name="Taxa de Conclusão (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Action Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Rocket className="size-5 text-purple-600" />
              Ações do Coordenador
            </CardTitle>
            <CardDescription className="text-xs">Atalhos rápidos para operações secretariais do ciclo.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <Link href="/dashboard/teaching/dis">
              <Button className="w-full justify-between bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 mb-2">
                <span>Promover Turmas do DIS Libras</span>
                <ChevronRight className="size-4" />
              </Button>
            </Link>

            <Link href="/dashboard/teaching/diario">
              <Button variant="outline" className="w-full justify-between font-bold text-xs h-10">
                <span>Auditar Diários & Ponto Eletrônico</span>
                <ChevronRight className="size-4" />
              </Button>
            </Link>

            <Link href="/dashboard/teaching/reports">
              <Button variant="outline" className="w-full justify-between font-bold text-xs h-10">
                <span>Relatórios Executivos em PDF</span>
                <ChevronRight className="size-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

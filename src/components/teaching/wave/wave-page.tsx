'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { School, Banknote, UserCheck, Calendar } from 'lucide-react';
import { WaveAdminDashboard } from '@/components/teaching/wave/admin-dashboard';
import { WaveFinanceDashboard } from './wave-finance-dashboard';
import { TeacherDashboard } from './teacher-dashboard';

const modules = [
  {
    id: "teacher",
    title: "Minha Agenda & Diários",
    icon: Calendar,
    description: "Controle de aulas ao vivo, presenças, diário pedagógico obrigatório e homework.",
    component: <TeacherDashboard />
  },
  {
    id: "admin",
    title: "Painel Administrativo",
    icon: School,
    description: "Visão geral, gestão de agendas, turmas, matrículas e estoque de instrumentos.",
    component: <WaveAdminDashboard />
  },
  {
    id: "finance",
    title: "Módulo Financeiro",
    icon: Banknote,
    description: "Automação de cobranças, repasses de comissão e controle de receitas/despesas.",
    component: <WaveFinanceDashboard />
  }
];

export function WaveMusicSchoolPage() {
  return (
    <div className="space-y-6">
      <Card className="border shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <CardTitle className="text-xl font-black text-slate-800">
            Wave - Escola de Música
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Gerenciamento pedagógico, agenda de atendimentos, diários de classe e financeiro da escola de música.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="teacher" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-xl bg-slate-100 p-1 rounded-xl">
              {modules.map((mod) => (
                <TabsTrigger key={mod.id} value={mod.id} className="text-xs font-bold gap-2">
                  <mod.icon className="size-4" />
                  {mod.title}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {modules.map((mod) => (
              <TabsContent key={mod.id} value={mod.id} className="mt-6">
                {mod.component}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

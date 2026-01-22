
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { School, Banknote, User, Music } from 'lucide-react';
import { WaveAdminDashboard } from '@/components/teaching/wave/admin-dashboard';
import { WaveFinanceDashboard } from './wave-finance-dashboard';
import { TeacherDashboard } from './teacher-dashboard';
import { StudentDashboard } from './student-dashboard';


const modules = [
    {
        id: "admin",
        title: "Painel Administrativo",
        icon: School,
        description: "Visão geral, gestão de agendas, salas, matrículas e estoque de instrumentos.",
        component: <WaveAdminDashboard />
    },
    {
        id: "finance",
        title: "Módulo Financeiro",
        icon: Banknote,
        description: "Automação de cobranças, gateway de pagamento, régua de cobrança e pagamento de professores.",
        component: <WaveFinanceDashboard />
    },
    {
        id: "teacher",
        title: "Área do Professor",
        icon: User,
        description: "Agenda de aulas, diário de classe, repositório de arquivos e solicitações.",
        component: <TeacherDashboard />
    },
    {
        id: "student",
        title: "Área do Aluno",
        icon: Music,
        description: "Carteirinha digital, cronograma, material didático, registro de estudos e financeiro simplificado.",
        component: <StudentDashboard />
    }
]

export function WaveMusicSchoolPage() {
  return (
     <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Wave - Escola de Música
          </CardTitle>
          <CardDescription>
            Este é o centro de gerenciamento completo para a escola de música. Navegue pelas abas para acessar cada módulo.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="admin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                    {modules.map((mod) => (
                        <TabsTrigger key={mod.id} value={mod.id}>
                            <mod.icon className="mr-2 size-4" />
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

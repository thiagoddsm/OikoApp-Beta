'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { School, Banknote, User, HandHelping, Share2 } from 'lucide-react';
import { DisFinanceDashboard } from './dis-finance-dashboard';
import { DisAdminDashboard } from './dis-admin-dashboard';
import { DisTeacherArea } from './dis-teacher-area';
import { DisStudentArea } from './dis-student-area';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useVolunteering } from '@/contexts/volunteering-context';

const modules = [
    {
        id: "admin",
        title: "Painel Administrativo",
        icon: School,
        description: "Visão geral, gestão de agendas, salas, matrículas e estoque de materiais.",
        component: <DisAdminDashboard />
    },
    {
        id: "finance",
        title: "Módulo Financeiro",
        icon: Banknote,
        description: "Gestão de faturas, integração com Conta Azul e acompanhamento de pagamentos.",
        component: <DisFinanceDashboard />
    },
    {
        id: "teacher",
        title: "Área do Professor",
        icon: User,
        description: "Agenda de aulas, diário de classe, repositório de arquivos e solicitações.",
        component: <DisTeacherArea />
    },
    {
        id: "student",
        title: "Área do Aluno",
        icon: HandHelping,
        description: "Carteirinha digital, cronograma, material didático, registro de estudos e financeiro simplificado.",
        component: <DisStudentArea />
    }
];

export function DisSchoolPage() {
  const { toast } = useToast();
  const { courses } = useVolunteering();

  const handleCopyLink = () => {
    const disCourse = courses.find(c => c.ministryName.toLowerCase() === 'dis' || c.name.toLowerCase().includes('libras'));
    const baseUrl = window.location.origin;
    const link = disCourse 
        ? `${baseUrl}/public/enrollment?courseId=${disCourse.id}`
        : `${baseUrl}/public/enrollment`;
    
    navigator.clipboard.writeText(link);
    toast({
        title: "Link Copiado!",
        description: "O link de inscrição para o DIS foi copiado para a área de transferência.",
    });
  };

  return (
     <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>DIS - Escola de Inclusão</CardTitle>
            <CardDescription>
                Centro de gerenciamento completo para a escola de inclusão e Libras.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={handleCopyLink}>
            <Share2 className="mr-2 size-4" />
            Link de Inscrição
          </Button>
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


'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { School, Banknote, User, HandHelping } from 'lucide-react';
import { UnderConstruction } from '@/components/common/under-construction';

const modules = [
    {
        id: "admin",
        title: "Painel Administrativo",
        icon: School,
        description: "Visão geral, gestão de agendas, salas, matrículas e estoque de materiais.",
        component: <UnderConstruction pageTitle="Painel Administrativo" pageDescription="Visão geral, gestão de agendas, salas, matrículas e estoque de materiais." />
    },
    {
        id: "finance",
        title: "Módulo Financeiro",
        icon: Banknote,
        description: "Automação de cobranças, gateway de pagamento, régua de cobrança e pagamento de professores.",
        component: <UnderConstruction pageTitle="Módulo Financeiro" pageDescription="Automação de cobranças, gateway de pagamento, régua de cobrança e pagamento de professores." />
    },
    {
        id: "teacher",
        title: "Área do Professor",
        icon: User,
        description: "Agenda de aulas, diário de classe, repositório de arquivos e solicitações.",
        component: <UnderConstruction pageTitle="Área do Professor" pageDescription="Agenda de aulas, diário de classe, repositório de arquivos e solicitações." />
    },
    {
        id: "student",
        title: "Área do Aluno",
        icon: HandHelping,
        description: "Carteirinha digital, cronograma, material didático, registro de estudos e financeiro simplificado.",
        component: <UnderConstruction pageTitle="Área do Aluno" pageDescription="Carteirinha digital, cronograma, material didático, registro de estudos e financeiro simplificado." />
    }
];

export function DisSchoolPage() {
  return (
     <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            DIS - Escola de Inclusão
          </CardTitle>
          <CardDescription>
            Este é o centro de gerenciamento completo para a escola de inclusão e Libras. Navegue pelas abas para acessar cada módulo.
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

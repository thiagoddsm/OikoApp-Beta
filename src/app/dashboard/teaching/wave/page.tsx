
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { School, Banknote, User, Music, Waves } from 'lucide-react';
import { UnderConstruction } from '@/components/common/under-construction';


const modules = [
    {
        id: "admin",
        title: "Painel Administrativo",
        icon: School,
        description: "Visão geral, gestão de agendas, salas, matrículas e estoque de instrumentos."
    },
    {
        id: "finance",
        title: "Módulo Financeiro",
        icon: Banknote,
        description: "Automação de cobranças, gateway de pagamento, régua de cobrança e pagamento de professores."
    },
    {
        id: "teacher",
        title: "Área do Professor",
        icon: User,
        description: "Agenda de aulas, chamada digital, diário de classe, repositório de arquivos e solicitações."
    },
    {
        id: "student",
        title: "Área do Aluno",
        icon: Music,
        description: "Carteirinha digital, cronograma, material didático, registro de estudos e financeiro simplificado."
    }
]

export default function WaveMusicSchoolPage() {
  return (
     <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Waves className="size-6 text-primary" />
            Wave - Escola de Música
          </CardTitle>
          <CardDescription>
            Este é o centro de gerenciamento completo para a escola de música. Navegue pelas abas para acessar cada módulo.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="admin" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    {modules.map((mod) => (
                        <TabsTrigger key={mod.id} value={mod.id}>
                            <mod.icon className="mr-2 size-4" />
                            {mod.title}
                        </TabsTrigger>
                    ))}
                </TabsList>
                
                {modules.map((mod) => (
                    <TabsContent key={mod.id} value={mod.id} className="mt-6">
                        <UnderConstruction 
                            pageTitle={mod.title}
                            pageDescription={mod.description}
                        />
                    </TabsContent>
                ))}
            </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

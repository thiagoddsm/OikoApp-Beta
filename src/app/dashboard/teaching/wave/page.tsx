
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HardHat, School, Banknote, User, Music } from 'lucide-react';

const modules = [
    {
        title: "Painel Administrativo",
        icon: School,
        description: "Visão geral, gestão de agendas, salas, matrículas e estoque de instrumentos."
    },
    {
        title: "Módulo Financeiro",
        icon: Banknote,
        description: "Automação de cobranças, gateway de pagamento, régua de cobrança e pagamento de professores."
    },
    {
        title: "Área do Professor",
        icon: User,
        description: "Agenda de aulas, chamada digital, diário de classe, repositório de arquivos e solicitações."
    },
    {
        title: "Área do Aluno",
        icon: Music,
        description: "Carteirinha digital, cronograma, material didático, registro de estudos e financeiro simplificado."
    }
]

export default function WaveMusicSchoolPage() {
  return (
     <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle>Wave - Escola de Música</CardTitle>
          <CardDescription>
            Este é o centro de gerenciamento completo para a escola de música. Abaixo estão os módulos planejados para o aplicativo.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((mod) => (
             <Card key={mod.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <mod.icon className="h-5 w-5" />
                    </div>
                    {mod.title}
                </CardTitle>
                <CardDescription>{mod.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg text-center p-4">
                  <HardHat className="size-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Módulo em construção
                  </p>
                </div>
              </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
}

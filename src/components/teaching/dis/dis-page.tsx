
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { School, Banknote, Share2 } from 'lucide-react';
import { DisFinanceDashboard } from './dis-finance-dashboard';
import { DisAdminDashboard } from './dis-admin-dashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    }
];

export function DisSchoolPage() {
  const { toast } = useToast();
  const { courses } = useVolunteering();

  const handleCopyLink = async () => {
    const disCourse = courses.find(c => c.ministryName.toLowerCase() === 'dis' || c.name.toLowerCase().includes('libras'));
    const baseUrl = window.location.origin;
    const link = disCourse 
        ? `${baseUrl}/public/enrollment?courseId=${disCourse.id}`
        : `${baseUrl}/public/enrollment`;
    
    try {
        await navigator.clipboard.writeText(link);
        toast({
            title: "Link Copiado!",
            description: "O link de inscrição para o DIS foi copiado para a área de transferência.",
        });
    } catch (err) {
        toast({
            title: "Copie o Link Manualmente",
            description: (
              <div className="flex flex-col gap-2">
                <p>Seu navegador bloqueou a cópia automática. Use o link abaixo:</p>
                <Input value={link} readOnly className="bg-muted text-sm" />
              </div>
            ),
            duration: 10000,
        });
    }
  };

  return (
     <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>DIS - Escola de Inclusão</CardTitle>
            <CardDescription>
                Gerenciamento administrativo e financeiro da escola de inclusão.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={handleCopyLink}>
            <Share2 className="mr-2 size-4" />
            Link de Inscrição
          </Button>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="admin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-sm">
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

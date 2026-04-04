
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function InscricoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inscrições</h1>
        <p className="text-muted-foreground">Gerencie as inscrições para eventos, classes e outras atividades.</p>
      </div>
      <Tabs defaultValue="eventos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
        </TabsList>
        
        {/* Conteúdo da Aba Geral */}
        <TabsContent value="geral" className="space-y-4">
          <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Nenhuma inscrição geral disponível no momento.</p>
          </div>
        </TabsContent>

        {/* Conteúdo da Aba Eventos */}
        <TabsContent value="eventos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Eventos com Inscrições Abertas</CardTitle>
              <CardDescription>Veja os próximos eventos e garanta a sua vaga.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg border">
                <div className="mb-4 sm:mb-0">
                  <h3 className="font-bold text-lg text-primary">Jantar dos Namorados 2026</h3>
                  <p className="text-sm text-muted-foreground">O Riso que Restaura - Uma noite de comunhão e risadas para casais.</p>
                </div>
                <Link href="/dashboard/inscricoes/eventos/jantar-dos-namorados" passHref legacyBehavior>
                  <a target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:underline">
                    Ver Página do Evento
                    <ArrowRight size={16} />
                  </a>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

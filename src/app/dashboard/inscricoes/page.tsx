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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase italic tracking-tighter">Inscrições</h1>
        <p className="text-muted-foreground">Gerencie as inscrições para eventos, classes e outras atividades.</p>
      </div>
      <Tabs defaultValue="eventos" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="geral" className="px-6 font-bold">Geral</TabsTrigger>
          <TabsTrigger value="eventos" className="px-6 font-bold">Eventos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="geral" className="space-y-4">
          <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-xl bg-muted/10">
            <p className="text-muted-foreground font-medium italic">Nenhuma inscrição geral disponível no momento.</p>
          </div>
        </TabsContent>

        <TabsContent value="eventos" className="space-y-4">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-lg">Eventos com Inscrições Abertas</CardTitle>
              <CardDescription>Veja os próximos eventos estratégicos da IBM e garanta a sua vaga.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-rose-50 border-2 border-rose-100 rounded-2xl transition-all hover:shadow-md">
                <div className="mb-4 sm:mb-0 text-center sm:text-left">
                  <h3 className="font-black text-xl text-rose-600 uppercase italic tracking-tighter">Jantar dos Namorados 2026</h3>
                  <p className="text-sm text-rose-900/70 font-medium">O Riso que Restaura - Uma noite de comunhão e risadas para casais.</p>
                </div>
                <Button asChild className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-rose-200">
                  <Link href="/eventos/jantar-dos-namorados" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    Ver Página do Evento
                    <ArrowRight size={16} />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


'use client';

import React from 'react';
import { useCollection } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PlusCircle, CalendarCheck, Star } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Culto = {
  id: string;
  title: string;
  theme?: string;
  date: any; // Using 'any' to handle both Timestamp and string for now
  preacher?: string;
};

type Evento = {
  id: string;
  title: string;
  theme?: string;
  description?: string;
  location?: string;
};

function formatDate(date: any): string {
    if (!date) return 'Data não definida';
    try {
        const d = date.toDate ? date.toDate() : new Date(date);
        return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
        return 'Data inválida';
    }
}


function CultosList() {
    const { data: cultos, isLoading } = useCollection<Culto>('cultos', [], [{ field: 'date', direction: 'desc' }]);

    if (isLoading) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }

    if (!cultos || cultos.length === 0) {
        return <p className="text-center text-muted-foreground p-8">Nenhum culto encontrado.</p>;
    }

    return (
        <div className="space-y-4">
            {cultos.map(culto => (
                <Card key={culto.id}>
                    <CardHeader>
                        <CardTitle>{culto.title}</CardTitle>
                        <CardDescription>{formatDate(culto.date)}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {culto.theme && <p className="text-sm">Tema: {culto.theme}</p>}
                        {culto.preacher && <p className="text-sm">Pregador: {culto.preacher}</p>}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function EventosList() {
    const { data: eventos, isLoading } = useCollection<Evento>('eventos');

     if (isLoading) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }

    if (!eventos || eventos.length === 0) {
        return <p className="text-center text-muted-foreground p-8">Nenhum evento geral encontrado.</p>;
    }

     return (
        <div className="space-y-4">
            {eventos.map(evento => (
                <Card key={evento.id}>
                    <CardHeader>
                        <CardTitle>{evento.title}</CardTitle>
                        <CardDescription>{evento.theme}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                         {evento.description && <p className="text-sm">{evento.description}</p>}
                         {evento.location && <p className="text-sm font-semibold">Local: {evento.location}</p>}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}


export default function EventsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="size-5" />
          Eventos & Produção
        </CardTitle>
        <CardDescription>
          Planeje seus cultos e eventos, desde o briefing até o cronograma minuto a minuto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cultos">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="cultos">
                <CalendarCheck className="mr-2 size-4" />
                Cultos
              </TabsTrigger>
              <TabsTrigger value="eventos">
                <Star className="mr-2 size-4" />
                Eventos Gerais
              </TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
                {/* TODO: Add Dialogs for creation */}
                <Button variant="outline"><PlusCircle className="mr-2 size-4" />Criar Evento</Button>
                <Button><PlusCircle className="mr-2 size-4" />Criar Culto</Button>
            </div>
          </div>
          <TabsContent value="cultos">
            <CultosList />
          </TabsContent>
          <TabsContent value="eventos">
            <EventosList />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

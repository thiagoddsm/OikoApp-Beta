
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, CalendarCheck, MoreVertical } from "lucide-react";
import Link from 'next/link';

// Mock data, in a real app this would come from a context or a server call
const events = [
  { id: '1', name: 'Culto da Família', type: 'Culto', date: 'Todos os Domingos, 19:00', status: 'Ativo' },
  { id: '2', name: 'Conferência de Mulheres', type: 'Evento', date: '15/09/2024', status: 'Planejado' },
  { id: '3', name: 'Vigília de Oração', type: 'Culto', date: 'Toda última Sexta, 22:00', status: 'Ativo' },
];

export default function EventsListPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                  <CalendarCheck className="size-6 text-primary" />
                  Gerenciamento de Eventos
              </CardTitle>
              <CardDescription>
                  Visualize todos os cultos e eventos planejados. Use o Briefing Pro para criar novos.
              </CardDescription>
            </div>
            <Button asChild>
                <Link href="/dashboard/events/briefing">
                    <PlusCircle className="mr-2 size-4" />
                    Novo Briefing
                </Link>
            </Button>
        </CardHeader>
        <CardContent>
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome do Evento</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Data / Frequência</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {events.map((event) => (
                            <TableRow key={event.id}>
                                <TableCell className="font-medium">{event.name}</TableCell>
                                <TableCell>
                                    <Badge variant={event.type === 'Culto' ? 'default' : 'secondary'}>{event.type}</Badge>
                                </TableCell>
                                <TableCell>{event.date}</TableCell>
                                <TableCell>{event.status}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="size-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

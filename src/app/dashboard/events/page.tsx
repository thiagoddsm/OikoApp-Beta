
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, CalendarCheck, MoreHorizontal, Loader2, CheckCircle, XCircle, Trash2, Share2 } from "lucide-react";
import Link from 'next/link';
import { useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type StrategicEvent = {
  id: string;
  eventName: string;
  ministry: string;
  date: string;
  status: string;
}

const statusConfig: { [key: string]: { label: string; color: string; } } = {
  analise_estrategica: { label: "Análise Estratégica", color: "bg-yellow-100 text-yellow-800" },
  aprovado: { label: "Aprovado", color: "bg-green-100 text-green-800" },
  rejeitado: { label: "Rejeitado", color: "bg-red-100 text-red-800" },
};

export default function EventsListPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const eventsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'strategic_events')) : null, [firestore]);
  const { data: events, isLoading } = useCollection<StrategicEvent>(eventsQuery);

  const sortedEvents = useMemo(() => {
    if (!events) return [];
    return [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [events]);

  const handleStatusChange = (id: string, status: string) => {
    if (!firestore) return;
    const eventDocRef = doc(firestore, 'strategic_events', id);
    updateDocumentNonBlocking(eventDocRef, { status });
    toast({
      title: "Status Atualizado",
      description: `O evento foi marcado como ${statusConfig[status]?.label || status}.`,
    });
  };
  
  const handleDelete = (id: string) => {
    if (!firestore) return;
    const eventDocRef = doc(firestore, 'strategic_events', id);
    deleteDocumentNonBlocking(eventDocRef);
     toast({
      variant: 'destructive',
      title: "Exclusão Iniciada",
      description: "O protocolo do evento será excluído.",
    });
  }
  
  const handleShareLink = () => {
    const url = `${window.location.origin}/public/event-planning`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copiado!",
      description: "O link para o formulário público foi copiado para sua área de transferência."
    })
  }

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
                  Visualize, aprove e gerencie todos os eventos planejados e protocolados.
              </CardDescription>
            </div>
             <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleShareLink}>
                    <Share2 className="mr-2 size-4" />
                    Compartilhar Formulário
                </Button>
                <Button asChild>
                    <Link href="/dashboard/events/planning">
                        <PlusCircle className="mr-2 size-4" />
                        Novo Planejamento
                    </Link>
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome do Evento</TableHead>
                            <TableHead>Ministério</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                                </TableCell>
                            </TableRow>
                        ) : sortedEvents.length === 0 ? (
                           <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    Nenhum evento protocolado encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedEvents.map((event) => {
                                const statusInfo = statusConfig[event.status] || { label: event.status, color: "bg-gray-100 text-gray-800" };
                                return (
                                <TableRow key={event.id}>
                                    <TableCell className="font-medium">
                                        <Link href={`/dashboard/events/${event.id}`} className="hover:underline">
                                            {event.eventName}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{event.ministry}</TableCell>
                                    <TableCell>{format(new Date(event.date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={statusInfo.color}>{statusInfo.label}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                       <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                              <span className="sr-only">Abrir menu</span>
                                              <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleStatusChange(event.id, 'aprovado')}>
                                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Aprovar
                                            </DropdownMenuItem>
                                             <DropdownMenuItem onClick={() => handleStatusChange(event.id, 'rejeitado')}>
                                              <XCircle className="mr-2 h-4 w-4 text-red-600" /> Rejeitar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDelete(event.id)} className="text-destructive">
                                               <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )})
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

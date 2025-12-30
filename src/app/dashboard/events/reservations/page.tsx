'use client';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { CreateReservationDialog } from '@/components/volunteering/create-reservation-dialog';
import { ReservationsTable } from '@/components/volunteering/reservations-table';
import { ReservationsCalendar } from '@/components/volunteering/reservations-calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export default function ReservationsPage() {
    const [isDialogOpen, setDialogOpen] = useState(false);

    return (
        <VolunteeringProvider>
             <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-3">
                                <CalendarClock className="size-6 text-primary"/>
                                Reserva de Salas
                            </CardTitle>
                            <CardDescription>
                                Gerencie as solicitações e o calendário de reservas de salas e ambientes da igreja.
                            </CardDescription>
                        </div>
                        <Button onClick={() => setDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4"/>
                            Nova Reserva
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="list">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="list">Lista de Solicitações</TabsTrigger>
                                <TabsTrigger value="calendar">Calendário</TabsTrigger>
                            </TabsList>
                            <TabsContent value="list" className="mt-4">
                                <ReservationsTable />
                            </TabsContent>
                            <TabsContent value="calendar" className="mt-4">
                                <ReservationsCalendar />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
            <CreateReservationDialog open={isDialogOpen} onOpenChange={setDialogOpen} />
        </VolunteeringProvider>
    );
}

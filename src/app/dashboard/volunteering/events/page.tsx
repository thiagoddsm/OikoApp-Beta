
'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { EventsManagement } from '@/components/volunteering/events-management';
import { CalendarCheck } from 'lucide-react';

export default function EventsPage() {
    return (
        <VolunteeringProvider>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <CalendarCheck className="size-6 text-primary"/>
                            Gerenciar Eventos
                        </CardTitle>
                        <CardDescription>
                            Adicione, visualize e gerencie os eventos fixos e pontuais que demandam voluntários.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <EventsManagement />
                    </CardContent>
                </Card>
            </div>
        </VolunteeringProvider>
    );
}


'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { ScheduleGenerator } from '@/components/volunteering/schedule-generator';
import { CalendarCog } from 'lucide-react';

export default function SchedulePage() {
    return (
        <VolunteeringProvider>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <CalendarCog className="size-6 text-primary"/>
                            Gerador de Escalas de Voluntários
                        </CardTitle>
                        <CardDescription>
                            Gere escalas mensais para as áreas de serviço com base nas equipes e eventos cadastrados.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScheduleGenerator />
                    </CardContent>
                </Card>
            </div>
        </VolunteeringProvider>
    );
}

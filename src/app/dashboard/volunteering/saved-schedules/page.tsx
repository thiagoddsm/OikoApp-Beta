
'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { SavedSchedulesList } from '@/components/volunteering/saved-schedules-list';
import { Save } from 'lucide-react';

export default function SavedSchedulesPage() {
    return (
        <VolunteeringProvider>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <Save className="size-6 text-primary"/>
                            Escalas Salvas
                        </CardTitle>
                        <CardDescription>
                            Visualize e gerencie todas as escalas de voluntários que foram salvas no sistema.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SavedSchedulesList />
                    </CardContent>
                </Card>
            </div>
        </VolunteeringProvider>
    );
}

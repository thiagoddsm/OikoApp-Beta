
'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { VolunteersManagement } from '@/components/volunteering/volunteers-management';
import { Users2 } from 'lucide-react';

export default function VolunteersPage() {
    return (
        <VolunteeringProvider>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <Users2 className="size-6 text-primary"/>
                            Gestão de Servos
                        </CardTitle>
                        <CardDescription>
                            Gerencie o status de serviço de todos os membros, e atribua-os a áreas e equipes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <VolunteersManagement />
                    </CardContent>
                </Card>
            </div>
        </VolunteeringProvider>
    );
}

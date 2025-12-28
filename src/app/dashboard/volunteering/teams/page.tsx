
'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { TeamsManagement } from '@/components/volunteering/teams-management';
import { Shield } from 'lucide-react';

export default function TeamsPage() {
    return (
        <VolunteeringProvider>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <Shield className="size-6 text-primary"/>
                            Gerenciar Equipes
                        </CardTitle>
                        <CardDescription>
                            Adicione, visualize e gerencie as equipes de voluntários.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TeamsManagement />
                    </CardContent>
                </Card>
            </div>
        </VolunteeringProvider>
    );
}

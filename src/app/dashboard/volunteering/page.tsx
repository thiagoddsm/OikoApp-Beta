
'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { AreasManagement } from '@/components/volunteering/areas-management';

export default function VolunteeringPage() {
    return (
        <VolunteeringProvider>
            <Card>
                <CardHeader>
                    <CardTitle>Gestão de Áreas de Serviço</CardTitle>
                    <CardDescription>
                        Crie, edite e organize as diferentes áreas onde os voluntários podem servir na igreja.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AreasManagement />
                </CardContent>
            </Card>
        </VolunteeringProvider>
    );
}

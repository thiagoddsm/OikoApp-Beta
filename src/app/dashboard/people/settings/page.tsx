'use client';

import { JourneySettingsManager } from '@/components/people/journey-settings-manager';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function PeopleSettingsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Configurações da Jornada do Membro</CardTitle>
                <CardDescription>
                    Gerencie as etapas da trilha de discipulado, personalize os checklists e defina os detalhes de cada fase.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <JourneySettingsManager />
            </CardContent>
        </Card>
    );
}

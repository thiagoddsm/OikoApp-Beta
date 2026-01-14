
'use client';

import { EventPlanningForm } from '@/components/events/planning-form';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { useParams } from 'next/navigation';
import { useDoc } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Define the type for the event data, matching the Firestore structure
type StrategicEvent = {
  id: string;
  eventName: string;
  // Add other properties as needed from your backend.json
  [key: string]: any; 
};


export default function EventDetailPage() {
    const params = useParams();
    const eventId = params.eventId as string;

    const { data: eventData, isLoading } = useDoc<StrategicEvent>(eventId ? `strategic_events/${eventId}` : null);
    
    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!eventData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Evento não encontrado</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>O evento que você está tentando visualizar não foi encontrado ou foi removido.</p>
                </CardContent>
            </Card>
        )
    }
    
    return (
        <VolunteeringProvider>
            <EventPlanningForm existingEvent={eventData} />
        </VolunteeringProvider>
    );
}

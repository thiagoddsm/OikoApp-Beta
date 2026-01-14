
'use client';

import { EventPlanningForm } from '@/components/events/planning-form';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { UnderConstruction } from '@/components/common/under-construction';
import { useParams } from 'next/navigation';


export default function EventDetailPage() {
    const params = useParams();
    const eventId = params.eventId as string;

    // TODO: Fetch event data using eventId and pass it to EventPlanningForm
    
    return (
        <VolunteeringProvider>
             <UnderConstruction 
                pageTitle="Detalhes do Evento"
                pageDescription="Esta página mostrará os detalhes do evento protocolado para análise e edição."
             />
            {/* <EventPlanningForm existingEvent={eventData} /> */}
        </VolunteeringProvider>
    );
}


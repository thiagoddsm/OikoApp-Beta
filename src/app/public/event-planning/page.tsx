'use client';

import { EventPlanningForm } from '@/components/events/planning-form';
import { VolunteeringProvider } from '@/contexts/volunteering-context';

export default function PublicEventPlanningPage() {
    return (
        <VolunteeringProvider>
            <EventPlanningForm />
        </VolunteeringProvider>
    );
}

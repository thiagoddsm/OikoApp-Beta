'use client';

import { EventPlanningForm } from '@/components/events/planning-form';
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { Loader2 } from 'lucide-react';

function EventPlanningPageContent() {
    const { rooms, isLoading } = useVolunteering();

    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return <EventPlanningForm rooms={rooms} />;
}

export default function EventPlanningPage() {
    return (
        <VolunteeringProvider>
            <EventPlanningPageContent />
        </VolunteeringProvider>
    );
}

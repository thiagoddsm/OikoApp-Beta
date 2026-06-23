'use client';

import { EventPlanningForm } from '@/components/events/planning-form';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { TenantProvider } from '@/contexts/tenant-context';

export default function PublicEventPlanningPage() {
    return (
        <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <TenantProvider>
                    <VolunteeringProvider>
                        <EventPlanningForm />
                    </VolunteeringProvider>
                </TenantProvider>
            </div>
        </main>
    );
}


'use client';

import { EventPlanningForm } from '@/components/events/planning-form';
import { useCollection, useMemoFirebase, FirebaseClientProvider } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Loader2 } from 'lucide-react';

type Room = {
    id: string;
    name: string;
};

function EventPlanningPublicContent() {
    const { firestore } = useFirebase();

    const roomsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'rooms'));
    }, [firestore]);

    const { data: rooms, isLoading: isLoadingRooms } = useCollection<Room>(roomsQuery);

    if (isLoadingRooms) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return <EventPlanningForm rooms={rooms || []} />;
}


export default function PublicEventPlanningPage() {
    return (
        <FirebaseClientProvider>
            <EventPlanningPublicContent />
        </FirebaseClientProvider>
    );
}

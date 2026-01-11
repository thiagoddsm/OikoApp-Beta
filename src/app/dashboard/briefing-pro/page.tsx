
'use client';
import { useFirebase, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// This is the traffic controller page for BriefingPro.
// It checks the user's role and redirects to the appropriate view.
export default function BriefingProPage() {
    const { user, isUserLoading } = useFirebase();
    const router = useRouter();

    // Fetch the user's data, which contains their role
    const { data: userData, isLoading: isUserDataLoading } = useDoc<{ roles?: string[]; }>(user ? `users/${user.uid}`: null);
    
    const isLoading = isUserLoading || isUserDataLoading;

    useEffect(() => {
        if (isLoading) {
            return; // Wait for user data to load
        }

        if (!user) {
            router.replace('/login'); // Should be handled by layout, but as a fallback
            return;
        }

        const userRole = userData?.roles?.[0] || 'palco'; // Default to 'palco' role
        
        switch (userRole) {
            case 'coordenador':
            case 'admin':
            case 'pastor_senior':
                router.replace('/dashboard/briefing-pro/coordenador');
                break;
            case 'backstage':
                 router.replace('/dashboard/briefing-pro/backstage');
                break;
            case 'palco':
            default:
                router.replace('/dashboard/briefing-pro/palco');
                break;
        }

    }, [user, userData, isLoading, router]);

    return (
         <div className="flex h-96 w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Verificando permissões e redirecionando...</p>
        </div>
    );
}

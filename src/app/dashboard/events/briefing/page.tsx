
'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page now acts as a redirect to the new Briefing Pro main page.
export default function BriefingRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/briefing-pro');
    }, [router]);

    return (
        <div className="flex h-96 w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Carregando Briefing Pro...</p>
        </div>
    );
}

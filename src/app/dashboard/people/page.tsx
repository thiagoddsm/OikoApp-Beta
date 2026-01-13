'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter, usePathname } from 'next/navigation';
import JourneyPage from './journey/page';
import ListPage from './list/page';

export default function PeoplePage() {
    const router = useRouter();
    const pathname = usePathname();

    const activeTab = pathname.includes('/list') ? 'list' : 'journey';

    const handleTabChange = (value: string) => {
        router.push(`/dashboard/people/${value}`);
    };

    return (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="journey">Jornada (CRM)</TabsTrigger>
                <TabsTrigger value="list">Lista de Pessoas</TabsTrigger>
            </TabsList>
            <TabsContent value="journey">
                <JourneyPage />
            </TabsContent>
            <TabsContent value="list">
                <ListPage />
            </TabsContent>
        </Tabs>
    );
}

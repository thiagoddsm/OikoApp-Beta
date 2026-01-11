
'use client';
import React from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Loader2 } from 'lucide-react';

export function SavedSchedulesList() {
    const { savedSchedules, isLoading } = useVolunteering();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div>
            {savedSchedules.length > 0 ? (
                <div className="space-y-4">
                    {savedSchedules.map(schedule => (
                        <div key={schedule.id} className="p-4 border rounded-lg">
                            <h3 className="font-bold">Escala para {schedule.month}</h3>
                            <p className="text-sm text-muted-foreground">Área ID: {schedule.areaId}</p>
                            {/* Aqui você pode renderizar a escala salva de forma mais elaborada */}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-center p-8 h-64 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Nenhuma escala foi salva ainda.</p>
                </div>
            )}
        </div>
    );
}

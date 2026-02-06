'use client';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { TeachingCalendar } from '@/components/teaching/teaching-calendar';
import { GraduationCap, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ClassFormDialog } from '@/components/teaching/class-form-dialog';

export default function TeachingCalendarPage() {
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);

    const handleEventClick = (cls: any) => {
        // Agora recebemos o objeto Class diretamente
        setSelectedClass(cls);
        setEditDialogOpen(true);
    };

    return (
        <VolunteeringProvider>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <GraduationCap className="size-6 text-primary"/>
                            Calendário Escolar
                        </CardTitle>
                        <CardDescription>
                            Visualize a grade de aulas e a ocupação das salas destinadas ao ensino.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Alert className="bg-blue-50 border-blue-200">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertTitle className="text-blue-800">Sincronização Direta</AlertTitle>
                            <AlertDescription className="text-blue-700 text-xs">
                                Este calendário exibe as turmas cadastradas em tempo real. 
                                Navegue até 2026 para visualizar o próximo semestre planejado.
                            </AlertDescription>
                        </Alert>

                        <TeachingCalendar onEventClick={handleEventClick} />
                    </CardContent>
                </Card>
            </div>

            {selectedClass && (
                <ClassFormDialog 
                    open={isEditDialogOpen} 
                    onOpenChange={setEditDialogOpen} 
                    existingClass={selectedClass} 
                    courseId={selectedClass.courseId} 
                />
            )}
        </VolunteeringProvider>
    );
}
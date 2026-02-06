'use client';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { TeachingCalendar } from '@/components/teaching/teaching-calendar';
import { GraduationCap, Info, Search, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ClassFormDialog } from '@/components/teaching/class-form-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function TeachingCalendarPage() {
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const handleEventClick = (cls: any) => {
        setSelectedClass(cls);
        setEditDialogOpen(true);
    };

    return (
        <VolunteeringProvider>
            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-3">
                                <GraduationCap className="size-6 text-primary"/>
                                Calendário Escolar
                            </CardTitle>
                            <CardDescription>
                                Visualize a grade de aulas e a ocupação das salas destinadas ao ensino.
                            </CardDescription>
                        </div>
                        
                        <div className="w-full md:max-w-sm">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Pesquisar turma ou curso..." 
                                    className="pl-8 bg-background h-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => setSearchTerm('')} 
                                        className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-destructive"
                                    >
                                        <X className="size-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
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

                        <TeachingCalendar onEventClick={handleEventClick} searchTerm={searchTerm} />
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

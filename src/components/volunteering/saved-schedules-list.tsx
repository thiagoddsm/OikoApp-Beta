'use client';
import React, { useState, useMemo } from 'react';
import { useVolunteering, type SavedSchedule } from '@/contexts/volunteering-context';
import { Loader2, FileText, Trash2, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { DeleteConfirmationDialog } from '../structure/delete-confirmation-dialog';
import { Input } from '../ui/input';
import { useRouter } from 'next/navigation';

export function SavedSchedulesList() {
    const { savedSchedules, isLoading, deleteSchedule } = useVolunteering();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [scheduleToDelete, setScheduleToDelete] = useState<SavedSchedule | null>(null);

    const filteredSchedules = useMemo(() => {
        return savedSchedules.filter(schedule =>
            schedule.month.toLowerCase().includes(searchTerm.toLowerCase()) ||
            schedule.areaId.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => b.month.localeCompare(a.month));
    }, [savedSchedules, searchTerm]);

    const handleDelete = (schedule: SavedSchedule) => {
        setScheduleToDelete(schedule);
    };
    
    const confirmDelete = () => {
        if (scheduleToDelete) {
            deleteSchedule(scheduleToDelete.id);
            setScheduleToDelete(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Escalas Geradas</h3>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por mês ou área..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filteredSchedules.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSchedules.map(schedule => (
                        <Card key={schedule.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    Escala de {schedule.month}
                                </CardTitle>
                                <CardDescription>Área ID: {schedule.areaId}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-muted-foreground">
                                    {/* Adicionar mais detalhes aqui se necessário */}
                                    Esta escala contém as alocações de voluntários para o período especificado.
                                </p>
                            </CardContent>
                            <div className="p-4 pt-0 flex justify-end gap-2">
                                 <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/volunteering/saved-schedules/${schedule.id}`)}>
                                    Ver Detalhes
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDelete(schedule)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-center p-8 h-64 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Nenhuma escala salva encontrada.</p>
                </div>
            )}
            
            {scheduleToDelete && (
                <DeleteConfirmationDialog
                    open={!!scheduleToDelete}
                    onOpenChange={(open) => !open && setScheduleToDelete(null)}
                    onConfirm={confirmDelete}
                    itemName={`escala de ${scheduleToDelete.month}`}
                    itemType="Escala"
                />
            )}
        </>
    );
}

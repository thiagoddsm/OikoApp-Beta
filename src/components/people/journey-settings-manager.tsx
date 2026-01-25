
'use client';

import React, { useState } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Loader2, PlusCircle, Edit, Trash2, GraduationCap, Handshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { JourneyStageFormDialog } from './journey-stage-form-dialog';
import { DeleteConfirmationDialog } from '../structure/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';

type DiscipleshipChecklist = {
    id: string;
    title: string;
    questions: { id: string; label: string; }[];
    requiredCourseId?: string;
    requiresDualApproval?: boolean;
};

type Course = {
    id: string;
    name: string;
};

export function JourneySettingsManager() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const checklistsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'discipleship_checklists')) : null, [firestore]);
    const { data: stages, isLoading } = useCollection<DiscipleshipChecklist>(checklistsQuery);

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

    const [isFormOpen, setFormOpen] = useState(false);
    const [isDeleteOpen, setDeleteOpen] = useState(false);
    const [selectedStage, setSelectedStage] = useState<DiscipleshipChecklist | null>(null);

    const handleAdd = () => {
        setSelectedStage(null);
        setFormOpen(true);
    };

    const handleEdit = (stage: DiscipleshipChecklist) => {
        setSelectedStage(stage);
        setFormOpen(true);
    };

    const handleDelete = (stage: DiscipleshipChecklist) => {
        setSelectedStage(stage);
        setDeleteOpen(true);
    };
    
    const confirmDelete = () => {
        if (!selectedStage || !firestore) return;
        // Logic to delete the doc
        // deleteDocumentNonBlocking(doc(firestore, 'discipleship_checklists', selectedStage.id));
        toast({ title: "Função não implementada", description: "A exclusão de etapas será implementada."});
        setDeleteOpen(false);
    }

    if (isLoading || isLoadingCourses) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button onClick={handleAdd}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Nova Etapa
                </Button>
            </div>
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Título da Etapa</TableHead>
                            <TableHead>Nº de Perguntas</TableHead>
                            <TableHead>Pré-requisitos</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stages && stages.map(stage => {
                            const course = courses?.find(c => c.id === stage.requiredCourseId);
                            return (
                                <TableRow key={stage.id}>
                                    <TableCell className="font-medium">{stage.title}</TableCell>
                                    <TableCell>{stage.questions?.length || 0}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-4">
                                            {stage.requiredCourseId && course && (
                                                <div className="flex items-center gap-1 text-sm text-emerald-700">
                                                    <GraduationCap className="size-4" /> {course.name}
                                                </div>
                                            )}
                                            {stage.requiresDualApproval && (
                                                <div className="flex items-center gap-1 text-sm text-amber-700">
                                                    <Handshake className="size-4" /> Aprovação Dupla
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(stage)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(stage)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            <JourneyStageFormDialog
                open={isFormOpen}
                onOpenChange={setFormOpen}
                existingStage={selectedStage}
                courses={courses || []}
            />
             {selectedStage && (
                <DeleteConfirmationDialog
                    open={isDeleteOpen}
                    onOpenChange={setDeleteOpen}
                    onConfirm={confirmDelete}
                    itemName={selectedStage.title}
                    itemType="Etapa da Jornada"
                />
            )}
        </>
    );
}

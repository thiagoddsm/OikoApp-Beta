
'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Loader2, PlusCircle, Edit, GraduationCap, ShieldCheck, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { JourneyStageFormDialog } from './journey-stage-form-dialog';
import { Badge } from '@/components/ui/badge';
import { journeyColumns } from '@/components/users/journey-status-config';

type DiscipleshipChecklist = {
    id: string;
    title: string;
    questions: { id: string; label: string; type: string; }[];
    requiredCourseId?: string;
    requiresDisciplerApproval?: boolean;
    requiresSupervisorApproval?: boolean;
};

type Course = {
    id: string;
    name: string;
};

export function JourneySettingsManager() {
    const { firestore } = useFirebase();

    const checklistsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'discipleship_checklists')) : null, [firestore]);
    const { data: stages, isLoading } = useCollection<DiscipleshipChecklist>(checklistsQuery);

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

    const [isFormOpen, setFormOpen] = useState(false);
    const [selectedStage, setSelectedStage] = useState<DiscipleshipChecklist | null>(null);

    const handleAdd = () => {
        setSelectedStage(null);
        setFormOpen(true);
    };

    const handleEdit = (stageId: string) => {
        const stage = stages?.find(s => s.id === stageId) || { id: stageId, title: '', questions: [] };
        setSelectedStage(stage as DiscipleshipChecklist);
        setFormOpen(true);
    };

    if (isLoading || isLoadingCourses) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold">Configuração dos Requisitos de Etapa</h3>
                    <p className="text-sm text-muted-foreground">Defina os cursos, checklists e aprovações necessárias para cada estágio da jornada.</p>
                </div>
                <Button onClick={handleAdd} variant="outline" size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Novo Checklist
                </Button>
            </div>

            <div className="rounded-xl border shadow-sm bg-card overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Fase da Jornada</TableHead>
                            <TableHead>Título do Checklist</TableHead>
                            <TableHead>Validação Técnica</TableHead>
                            <TableHead>Validação Humana</TableHead>
                            <TableHead className="text-center">Itens</TableHead>
                            <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {journeyColumns.map(col => {
                            const config = stages?.find(s => s.id === col.id);
                            const requiredCourse = courses?.find(c => c.id === config?.requiredCourseId);
                            
                            return (
                                <TableRow key={col.id} className="hover:bg-muted/30">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900">{col.title}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">{col.id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm italic text-muted-foreground">
                                        {config?.title || "Não configurado"}
                                    </TableCell>
                                    <TableCell>
                                        {requiredCourse ? (
                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                                <GraduationCap className="size-3 mr-1" /> {requiredCourse.name}
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-slate-400">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {config?.requiresDisciplerApproval && (
                                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] w-fit">
                                                    <ShieldCheck className="size-3 mr-1" /> Discipulador
                                                </Badge>
                                            )}
                                            {config?.requiresSupervisorApproval && (
                                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] w-fit">
                                                    <ShieldCheck className="size-3 mr-1" /> Supervisor
                                                </Badge>
                                            )}
                                            {!config?.requiresDisciplerApproval && !config?.requiresSupervisorApproval && (
                                                <span className="text-xs text-slate-400">Automática</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1 text-slate-500">
                                            <ListChecks className="size-3" />
                                            <span className="text-xs font-bold">{config?.questions?.length || 0}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(col.id)}>
                                            <Edit className="h-4 w-4 mr-2" /> Configurar
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
        </div>
    );
}

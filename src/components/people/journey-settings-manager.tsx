
'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Loader2, PlusCircle, Edit, GraduationCap, ShieldCheck, ListChecks, Settings2, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { JourneyStageFormDialog } from './journey-stage-form-dialog';
import { Badge } from '@/components/ui/badge';
import { journeyColumns } from '@/components/users/journey-status-config';

type DiscipleshipChecklist = {
    id: string;
    title: string;
    questions: { id: string; label: string; type: string; }[];
    linkedStageId?: string;
};

type JourneyPhaseRequirement = {
    id: string; // stageId
    requiredCourseId?: string;
    requiresDisciplerApproval?: boolean;
    requiresSupervisorApproval?: boolean;
    requiresBaptism?: boolean;
    requiresActiveService?: boolean;
};

type Course = {
    id: string;
    name: string;
};

export function JourneySettingsManager() {
    const { firestore } = useFirebase();

    const checklistsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'discipleship_checklists')) : null, [firestore]);
    const { data: checklists, isLoading: isLoadingChecklists } = useCollection<DiscipleshipChecklist>(checklistsQuery);

    const requirementsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'journey_phase_requirements')) : null, [firestore]);
    const { data: requirements, isLoading: isLoadingRequirements } = useCollection<JourneyPhaseRequirement>(requirementsQuery);

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

    const [isRequirementFormOpen, setRequirementFormOpen] = useState(false);
    const [selectedRequirement, setSelectedRequirement] = useState<JourneyPhaseRequirement | null>(null);

    const [isChecklistFormOpen, setChecklistFormOpen] = useState(false);
    const [selectedChecklist, setSelectedChecklist] = useState<DiscipleshipChecklist | null>(null);

    const handleEditRequirement = (stageId: string) => {
        const req = requirements?.find(r => r.id === stageId) || { id: stageId, requiredCourseId: '' };
        setSelectedRequirement(req as JourneyPhaseRequirement);
        setRequirementFormOpen(true);
    };

    const handleAddChecklist = () => {
        setSelectedChecklist(null);
        setChecklistFormOpen(true);
    };

    const handleEditChecklist = (checklist: DiscipleshipChecklist) => {
        setSelectedChecklist(checklist);
        setChecklistFormOpen(true);
    };

    const isLoading = isLoadingChecklists || isLoadingRequirements || isLoadingCourses;

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold">Configuração da Jornada</h3>
                <p className="text-sm text-muted-foreground">Gerencie os critérios de avanço e as ferramentas de apoio da equipe.</p>
            </div>

            <Tabs defaultValue="phases" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
                    <TabsTrigger value="phases" className="font-bold">
                        <Settings2 className="size-4 mr-2" /> Fases da Jornada
                    </TabsTrigger>
                    <TabsTrigger value="checklists" className="font-bold">
                        <ClipboardList className="size-4 mr-2" /> Checklists Operacionais
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="phases" className="space-y-4">
                    <div className="rounded-xl border shadow-sm bg-card overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Fase</TableHead>
                                    <TableHead>Validação Técnica (Curso)</TableHead>
                                    <TableHead>Validação Humana (Aprovação)</TableHead>
                                    <TableHead className="text-right">Ação</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {journeyColumns.map(col => {
                                    const req = requirements?.find(r => r.id === col.id);
                                    const requiredCourse = courses?.find(c => c.id === req?.requiredCourseId);
                                    
                                    return (
                                        <TableRow key={col.id} className="hover:bg-muted/30">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{col.title}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">{col.id}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {requiredCourse ? (
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                                        <GraduationCap className="size-3 mr-1" /> {requiredCourse.name}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-slate-400">Nenhum curso obrigatório</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {req?.requiresBaptism && (
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] w-fit">
                                                            💧 Batismo
                                                        </Badge>
                                                    )}
                                                    {req?.requiresActiveService && (
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] w-fit">
                                                            🛠️ Serviço Ativo
                                                        </Badge>
                                                    )}
                                                    {req?.requiresDisciplerApproval && (
                                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] w-fit">
                                                            <ShieldCheck className="size-3 mr-1" /> Discipulador
                                                        </Badge>
                                                    )}
                                                    {req?.requiresSupervisorApproval && (
                                                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] w-fit">
                                                            <ShieldCheck className="size-3 mr-1" /> Supervisor
                                                        </Badge>
                                                    )}
                                                    {!req?.requiresBaptism && !req?.requiresActiveService && !req?.requiresDisciplerApproval && !req?.requiresSupervisorApproval && (
                                                        <span className="text-xs text-slate-400 italic">Livre / Automática</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => handleEditRequirement(col.id)}>
                                                    <Edit className="h-4 w-4 mr-2" /> Configurar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="checklists" className="space-y-4">
                    <div className="flex justify-end">
                        <Button onClick={handleAddChecklist} size="sm" className="font-bold">
                            <PlusCircle className="mr-2 h-4 w-4" /> Criar Checklist
                        </Button>
                    </div>
                    <div className="rounded-xl border shadow-sm bg-card overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Título</TableHead>
                                    <TableHead>Vínculo Sugerido</TableHead>
                                    <TableHead className="text-center">Itens</TableHead>
                                    <TableHead className="text-right">Ação</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {checklists?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">Nenhum checklist operacional criado.</TableCell>
                                    </TableRow>
                                ) : (
                                    checklists?.map(checklist => (
                                        <TableRow key={checklist.id} className="hover:bg-muted/30">
                                            <TableCell className="font-bold text-slate-900">{checklist.title}</TableCell>
                                            <TableCell>
                                                {checklist.linkedStageId ? (
                                                    <Badge variant="secondary" className="text-[10px] font-bold">
                                                        {journeyColumns.find(c => c.id === checklist.linkedStageId)?.title || checklist.linkedStageId}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">Geral / Sem vínculo</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1 text-slate-500">
                                                    <ListChecks className="size-3" />
                                                    <span className="text-xs font-bold">{checklist.questions?.length || 0}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => handleEditChecklist(checklist)}>
                                                    <Edit className="h-4 w-4 mr-2" /> Editar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>

            <JourneyStageFormDialog
                open={isRequirementFormOpen}
                onOpenChange={setRequirementFormOpen}
                mode="requirement"
                existingData={selectedRequirement}
                courses={courses || []}
            />

            <JourneyStageFormDialog
                open={isChecklistFormOpen}
                onOpenChange={setChecklistFormOpen}
                mode="checklist"
                existingData={selectedChecklist}
                courses={courses || []}
            />
        </div>
    );
}

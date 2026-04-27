'use client';
import React, { useState, useMemo } from 'react';
import { format, parseISO, isBefore, addWeeks, addMonths } from 'date-fns';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, HelpCircle, CheckCircle, Send, GraduationCap, PlusCircle, ShieldCheck, UserCheck, AlertTriangle, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { FollowUpTimeline, Note } from './follow-up-timeline';
import { query, collection } from 'firebase/firestore';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '../ui/textarea';
import { useVolunteering } from '@/contexts/volunteering-context';
import { journeyColumns } from './journey-status-config';
import { EnrollmentDialog } from '../teaching/enrollment-dialog';
import { sendJourneyAdvanceMessage } from '@/app/actions/whatsapp-actions';
import { Badge } from '../ui/badge';

const weekDayMap: Record<string, number> = {
    "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3,
    "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6
};

type ChecklistQuestion = {
    id: string;
    label: string;
    type: 'checkbox' | 'text' | 'date';
};

type DiscipleshipChecklist = {
    id: string;
    title: string;
    questions: ChecklistQuestion[];
    linkedStageId?: string;
};

type JourneyPhaseRequirement = {
    id: string;
    requiredCourseId?: string;
    requiresDisciplerApproval?: boolean;
    requiresSupervisorApproval?: boolean;
    requiresBaptism?: boolean;
    requiresActiveService?: boolean;
};

export function DiscipleshipNotes({ memberId, memberName, currentStatusId }: { memberId: string, memberName: string, currentStatusId: string }) {
    const { firestore } = useFirebase();
    const { data: config } = useDoc<any>('config/notifications');
    const { toast } = useToast();
    const { updateVolunteer, classes, courses, users } = useVolunteering();
    const [isSaving, setIsSaving] = useState<string | null>(null);
    const [isEnrollmentOpen, setEnrollmentOpen] = useState(false);
    
    const memberData = useMemo(() => users.find(u => u.id === memberId), [users, memberId]);
    
    const checklistsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'discipleship_checklists')) : null, [firestore]);
    const { data: checklists, isLoading: isLoadingChecklists } = useCollection<DiscipleshipChecklist>(checklistsQuery);

    const requirementsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'journey_phase_requirements')) : null, [firestore]);
    const { data: requirements, isLoading: isLoadingRequirements } = useCollection<JourneyPhaseRequirement>(requirementsQuery);
    
    const stageProgress = memberData?.journey?.stageProgress || {};

    const notesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `users/${memberId}/notes`)) : null, [firestore, memberId]);
    const { data: timelineNotes, isLoading: isLoadingNotes } = useCollection<Note>(notesQuery);

    // Integração: Validação Técnica vinda do Contexto de Cursos
    const myCoursesStatus = useMemo(() => {
        const studentClasses = classes.filter(cls => cls.students?.includes(memberId));
        const courseIds = Array.from(new Set(studentClasses.map(c => c.courseId)));
        
        return courseIds.map(courseId => {
            const course = courses.find(c => c.id === courseId);
            const courseClasses = classes.filter(c => c.courseId === courseId);
            const isMembership = course?.name.toLowerCase().includes('membro') || course?.name.toLowerCase().includes('pertencer');
            
            if (isMembership) {
                const modulesCompleted = new Set<number>();
                
                courseClasses.forEach(cls => {
                    // Pre-calculate occurrences for this class to map dates to modules
                    const occurrences: string[] = [];
                    if (cls.startDate) {
                        const start = parseISO(cls.startDate);
                        const end = cls.endDate ? parseISO(cls.endDate) : addMonths(start, 2);
                        const targetDay = cls.dayOfWeek ? weekDayMap[cls.dayOfWeek] : -1;
                        const holidays = new Set(cls.holidayDates || []);
                        const extras = cls.extraDates || [];
                        
                        let current = start;
                        let safe = 0;
                        if (cls.frequency && cls.frequency !== 'pontual') {
                            while (isBefore(current, end) || format(current, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
                                if (safe++ > 150) break;
                                let matches = false;
                                if (cls.frequency === 'semanal') {
                                    matches = targetDay === -1 || current.getDay() === targetDay;
                                } else if (cls.frequency === 'quinzenal') {
                                    const diffWeeks = Math.floor((current.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
                                    matches = diffWeeks % 2 === 0 && (targetDay === -1 || current.getDay() === targetDay);
                                }
                                const dateStr = format(current, 'yyyy-MM-dd');
                                if (matches && !holidays.has(dateStr)) occurrences.push(dateStr);
                                current = addWeeks(current, 1);
                            }
                        } else if (cls.frequency === 'pontual') {
                            occurrences.push(cls.startDate);
                        }
                        const allDates = Array.from(new Set([...occurrences, ...extras])).sort();

                        // Check attendance against these dates
                        cls.attendance?.forEach(att => {
                            const isPresent = att.presentStudentIds?.includes(memberId) || att.onlineStudentIds?.includes(memberId);
                            if (isPresent) {
                                const modIndex = allDates.indexOf(att.date);
                                if (modIndex !== -1) {
                                    modulesCompleted.add(modIndex + 1); // Module 1, 2, 3...
                                }
                            }
                        });
                    }
                });
                
                const mandatoryModules = [1, 2, 3, 4];
                const isCompleted = mandatoryModules.every(m => modulesCompleted.has(m));

                return {
                    id: courseId,
                    name: course?.name || 'Curso Desconhecido',
                    ministry: course?.ministryName || 'Ensino',
                    isCompleted,
                    attendedCount: modulesCompleted.size,
                    totalCount: 5, // Membership is usually 5 modules
                    isModular: true
                };
            }

            const allAttendanceDates = new Set<string>();
            const studentAttendedDates = new Set<string>();

            courseClasses.forEach(cls => {
                cls.attendance?.forEach(att => {
                    allAttendanceDates.add(`${cls.id}-${att.date}`);
                    const isPresent = att.presentStudentIds.includes(memberId) || att.onlineStudentIds?.includes(memberId);
                    if (isPresent) {
                        studentAttendedDates.add(`${cls.id}-${att.date}`);
                    }
                });
            });
            
            const totalCount = allAttendanceDates.size || courseClasses.length;
            const attendedCount = studentAttendedDates.size;
            
            const isCompleted = memberData?.journey?.courseStatus?.[courseId] === 'approved' || (totalCount > 0 && attendedCount >= totalCount);

            return {
                id: courseId,
                name: course?.name || 'Curso Desconhecido',
                ministry: course?.ministryName || 'Ensino',
                isCompleted,
                attendedCount,
                totalCount,
                isModular: false
            };
        });
    }, [classes, courses, memberId, memberData]);

    const activeChecklists = useMemo(() => {
        if (!checklists) return [];
        // Show checklists linked to current stage OR general ones
        return checklists.filter(c => !c.linkedStageId || c.linkedStageId === currentStatusId || c.linkedStageId === 'none');
    }, [checklists, currentStatusId]);

    const currentRequirements = useMemo(() => {
        const nextIndex = journeyColumns.findIndex(col => col.id === currentStatusId) + 1;
        if (nextIndex >= journeyColumns.length) return null;
        const nextStageId = journeyColumns[nextIndex].id;
        return requirements?.find(r => r.id === nextStageId) || null;
    }, [requirements, currentStatusId]);

    const validateTransition = (targetStageId: string): { valid: boolean; message?: string } => {
        if (!memberData) return { valid: false };

        const currentStageId = memberData.integrationStatus || 'nao_alcancado';
        const reqs = requirements?.find(r => r.id === targetStageId);
        
        // 1. Hardcoded Rules (Maintenance)
        if (targetStageId === 'novo_convertido' && currentStageId === 'nao_alcancado') {
            const hasDecision = memberData.decisao?.includes('Decisão por Cristo') || memberData.initialStatus === 'novo_convertido';
            if (!hasDecision) return { valid: false, message: "Este membro precisa registrar uma 'Decisão por Cristo' antes de se tornar Novo Convertido." };
        }

        // 2. Technical Validation: Baptism
        if (reqs?.requiresBaptism && memberData.batizado !== 'sim') {
            return { valid: false, message: "O membro precisa estar Batizado para avançar para esta fase." };
        }

        // 3. Technical Validation: Service
        if (reqs?.requiresActiveService && memberData.serviceStatus !== 'serving') {
            return { valid: false, message: "O membro precisa estar em Serviço Ativo para avançar para esta fase." };
        }

        // 4. Technical Validation: Courses
        if (reqs?.requiredCourseId) {
            const courseStatus = myCoursesStatus.find(c => c.id === reqs.requiredCourseId);
            if (!courseStatus?.isCompleted) {
                return { valid: false, message: `Necessário concluir o curso: ${courseStatus?.name || reqs.requiredCourseId}` };
            }
        }

        // 5. Human Validation: Approvals
        const progress = stageProgress[targetStageId] || { approvals: {} };
        if (reqs?.requiresDisciplerApproval && !progress.approvals?.discipler?.approved) {
            return { valid: false, message: "Exige aprovação manual do Discipulador." };
        }
        if (reqs?.requiresSupervisorApproval && !progress.approvals?.supervisor?.approved) {
            return { valid: false, message: "Exige aprovação manual do Supervisor." };
        }

        return { valid: true };
    };

    const handleCompleteStage = (currentStageId: string) => {
        const currentIndex = journeyColumns.findIndex(col => col.id === currentStageId);

        if (currentIndex === -1) return;
        if (currentIndex >= journeyColumns.length - 1) {
             toast({ title: "Jornada Completa", description: `${memberName} já atingiu o nível máximo.` });
            return;
        }

        const nextStage = journeyColumns[currentIndex + 1];
        const validation = validateTransition(nextStage.id);

        if (!validation.valid) {
            toast({
                variant: 'destructive',
                title: "Critério não atingido",
                description: validation.message,
            });
            return;
        }

        updateVolunteer(memberId, { integrationStatus: nextStage.id });
        
        // Notificação de avanço de jornada
        if (memberData?.phone && memberData?.name) {
            sendJourneyAdvanceMessage(memberData.name, String(memberData.phone), nextStage.title, config);
        }

        toast({
            title: "Status Atualizado!",
            description: `${memberName} avançou para "${nextStage.title}".`,
        });
    };

    const handleAnswerChange = (checklistId: string, questionId: string, value: boolean | string) => {
        const currentProgress = stageProgress[checklistId] || { answers: {}, approvals: {} };
        const updatedProgress = {
            ...currentProgress,
            answers: { ...currentProgress.answers, [questionId]: value }
        };
        
        updateVolunteer(memberId, {
            [`journey.stageProgress.${checklistId}`]: updatedProgress
        });
    };
    
    const handleApprovalChange = (checklistId: string, role: 'discipler' | 'supervisor', field: 'approved' | 'notes', value: any) => {
        const currentProgress = stageProgress[checklistId] || { answers: {}, approvals: {} };
        const updatedApprovals = {
            ...currentProgress.approvals,
            [role]: { ...(currentProgress.approvals?.[role] || { approved: false, notes: '' }), [field]: value }
        };
        
        updateVolunteer(memberId, {
            [`journey.stageProgress.${checklistId}`]: { ...currentProgress, approvals: updatedApprovals }
        });
    };

    const handleSaveStage = (checklist: DiscipleshipChecklist) => {
        setIsSaving(checklist.id);
        setTimeout(() => {
            setIsSaving(null);
            toast({ title: "Progresso Salvo", description: `As anotações de "${checklist.title}" foram arquivadas.` });
        }, 800);
    };

    if (isLoadingChecklists || isLoadingRequirements || isLoadingNotes) {
      return (
        <div className="flex items-center justify-center p-8 h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <Card className="bg-emerald-50/50 border-emerald-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-emerald-800">
                        <GraduationCap className="size-5" />
                        Validação Técnica (Cursos & Trilhos)
                    </CardTitle>
                    <CardDescription className="text-emerald-700/70">Histórico de formação e conclusão de disciplinas.</CardDescription>
                </div>
                <Button size="sm" onClick={() => setEnrollmentOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                    <PlusCircle className="mr-2 h-4 w-4" /> Matricular
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-3 mt-2">
                    {myCoursesStatus.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2">Nenhum curso ou trilho vinculado no momento.</p>
                    ) : (
                        myCoursesStatus.map(course => (
                            <div key={course.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-emerald-100 shadow-sm group hover:border-emerald-300 transition-colors">
                                <div className={cn(
                                    "size-2.5 rounded-full shrink-0", 
                                    course.isCompleted ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-amber-500 animate-pulse"
                                )} />
                                <div className="text-xs">
                                    <span className="font-bold text-emerald-900 block">{course.name}</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className={cn(
                                            "text-[9px] uppercase font-black px-1.5 h-4 border-none",
                                            course.isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                        )}>
                                            {course.isCompleted ? "Concluído" : "Cursando"}
                                        </Badge>
                                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">
                                            {course.attendedCount}/{course.totalCount} {course.isModular ? 'módulos' : 'aulas'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="border-b bg-slate-50/50">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><UserCheck className="size-5 text-primary" /> Progressão da Jornada</CardTitle>
                        <CardDescription>Critérios oficiais para avanço de fase.</CardDescription>
                    </div>
                    <Badge variant="outline" className="font-black uppercase text-[10px] bg-primary/5 text-primary border-primary/20">
                        Status Atual: {journeyColumns.find(c => c.id === currentStatusId)?.title || currentStatusId}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest">Trava de Segurança</h4>
                            <Badge variant="secondary" className="text-[9px] font-bold">Automação IBM</Badge>
                        </div>
                        
                        {!currentRequirements ? (
                            <div className="p-8 border-2 border-dashed rounded-xl text-center text-muted-foreground text-sm">
                                Jornada completa ou sem requisitos configurados para o próximo nível.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {currentRequirements.requiresBaptism && (
                                    <div className={cn("p-3 rounded-xl border flex items-center justify-between transition-all", memberData?.batizado === 'sim' ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100")}>
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-1.5 rounded-lg", memberData?.batizado === 'sim' ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>
                                                <span className="text-xs">💧</span>
                                            </div>
                                            <span className={cn("text-xs font-bold", memberData?.batizado === 'sim' ? "text-emerald-900" : "text-red-900")}>Batismo</span>
                                        </div>
                                        <Badge className={cn("text-[9px] font-black", memberData?.batizado === 'sim' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600")}>
                                            {memberData?.batizado === 'sim' ? 'OK' : 'PENDENTE'}
                                        </Badge>
                                    </div>
                                )}

                                {currentRequirements.requiresActiveService && (
                                    <div className={cn("p-3 rounded-xl border flex items-center justify-between transition-all", memberData?.serviceStatus === 'serving' ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100")}>
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-1.5 rounded-lg", memberData?.serviceStatus === 'serving' ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>
                                                <span className="text-xs">🛠️</span>
                                            </div>
                                            <span className={cn("text-xs font-bold", memberData?.serviceStatus === 'serving' ? "text-emerald-900" : "text-red-900")}>Serviço Ativo</span>
                                        </div>
                                        <Badge className={cn("text-[9px] font-black", memberData?.serviceStatus === 'serving' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600")}>
                                            {memberData?.serviceStatus === 'serving' ? 'OK' : 'PENDENTE'}
                                        </Badge>
                                    </div>
                                )}

                                {currentRequirements.requiredCourseId && (
                                    <div className={cn("p-3 rounded-xl border flex items-center justify-between transition-all", myCoursesStatus.find(c => c.id === currentRequirements.requiredCourseId)?.isCompleted ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100")}>
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-1.5 rounded-lg", myCoursesStatus.find(c => c.id === currentRequirements.requiredCourseId)?.isCompleted ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>
                                                <span className="text-xs">📚</span>
                                            </div>
                                            <span className={cn("text-xs font-bold", myCoursesStatus.find(c => c.id === currentRequirements.requiredCourseId)?.isCompleted ? "text-emerald-900" : "text-red-900")}>
                                                {courses.find(c => c.id === currentRequirements.requiredCourseId)?.name || 'Curso'}
                                            </span>
                                        </div>
                                        <Badge className={cn("text-[9px] font-black", myCoursesStatus.find(c => c.id === currentRequirements.requiredCourseId)?.isCompleted ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600")}>
                                            {myCoursesStatus.find(c => c.id === currentRequirements.requiredCourseId)?.isCompleted ? 'OK' : 'PENDENTE'}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest">Validação Humana</h4>
                        
                        {!currentRequirements ? (
                            <div className="p-8 border-2 border-dashed rounded-xl text-center text-muted-foreground text-sm">
                                Nível concluído.
                            </div>
                        ) : (
                            (() => {
                                const techValid = (!currentRequirements.requiresBaptism || memberData?.batizado === 'sim') &&
                                                 (!currentRequirements.requiresActiveService || memberData?.serviceStatus === 'serving');
                                
                                return (
                                    <div className="space-y-4">
                                        {!techValid ? (
                                            <div className="p-6 bg-amber-50 border border-amber-100 rounded-xl flex flex-col items-center justify-center text-center">
                                                <AlertTriangle className="text-amber-500 mb-2" />
                                                <p className="text-xs font-bold text-amber-900">Sondagem de Caráter Bloqueada</p>
                                                <p className="text-[10px] text-amber-800/70">Valide os requisitos de Batismo e Serviço primeiro.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {currentRequirements.requiresDisciplerApproval && (
                                                    <div className={cn("p-4 rounded-xl border-2 transition-all", (stageProgress[journeyColumns[journeyColumns.findIndex(c => c.id === currentStatusId) + 1]?.id]?.approvals?.discipler?.approved) ? "bg-emerald-50 border-emerald-500" : "bg-slate-50 border-slate-200")}>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn("p-1.5 rounded-lg", (stageProgress[journeyColumns[journeyColumns.findIndex(c => c.id === currentStatusId) + 1]?.id]?.approvals?.discipler?.approved) ? "bg-emerald-500 text-white" : "bg-slate-300 text-slate-500")}>
                                                                    <ShieldCheck size={16} />
                                                                </div>
                                                                <Label className="font-black text-xs uppercase">Discipulador</Label>
                                                            </div>
                                                            <Checkbox
                                                                checked={stageProgress[journeyColumns[journeyColumns.findIndex(c => c.id === currentStatusId) + 1]?.id]?.approvals?.discipler?.approved || false}
                                                                onCheckedChange={(v) => handleApprovalChange(journeyColumns[journeyColumns.findIndex(c => c.id === currentStatusId) + 1]?.id, 'discipler', 'approved', !!v)}
                                                            />
                                                        </div>
                                                        <Textarea
                                                            placeholder="Notas de validação..."
                                                            className="text-xs bg-white min-h-[60px]"
                                                            value={stageProgress[journeyColumns[journeyColumns.findIndex(c => c.id === currentStatusId) + 1]?.id]?.approvals?.discipler?.notes || ''}
                                                            onChange={(e) => handleApprovalChange(journeyColumns[journeyColumns.findIndex(c => c.id === currentStatusId) + 1]?.id, 'discipler', 'notes', e.target.value)}
                                                        />
                                                    </div>
                                                )}

                                                {currentRequirements.requiresSupervisorApproval && (
                                                    <div className={cn("p-4 rounded-xl border-2 transition-all", (stageProgress[journeyColumns[journeyColumns.findIndex(c => c.id === currentStatusId) + 1]?.id]?.approvals?.supervisor?.approved) ? "bg-indigo-50 border-indigo-500" : "bg-slate-50 border-slate-200")}>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn("p-1.5 rounded-lg", (stageProgress[journeyColumns[journeyColumns.findIndex(c => c.id === currentStatusId) + 1]?.id]?.approvals?.supervisor?.approved) ? "bg-indigo-500 text-white" : "bg-slate-300 text-slate-500")}>
                                                                    <ShieldCheck size={16} />
                                                                </div>
                                                                <Label className="font-black text-xs uppercase">Supervisor</Label>
                                                            </div>
                                                            <Checkbox
                                                                checked={stageProgress[journeyColumns[journeyColumns.findIndex(c => c.id === currentStatusId) + 1]?.id]?.approvals?.supervisor?.approved || false}
                                                                onCheckedChange={(v) => handleApprovalChange(journeyColumns[journeyColumns.findIndex(c => c.id === currentStatusId) + 1]?.id, 'supervisor', 'approved', !!v)}
                                                            />
                                                        </div>
                                                        <Textarea
                                                            placeholder="Notas de validação..."
                                                            className="text-xs bg-white min-h-[60px]"
                                                            value={stageProgress[journeyColumns[journeyColumns.findIndex(c => c.id === currentStatusId) + 1]?.id]?.approvals?.supervisor?.notes || ''}
                                                            onChange={(e) => handleApprovalChange(journeyColumns[journeyColumns.findIndex(c => c.id === currentStatusId) + 1]?.id, 'supervisor', 'notes', e.target.value)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        <div className="p-6 bg-slate-50 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center space-y-4 mt-6">
                                            <div className="size-12 rounded-full bg-white border shadow-sm flex items-center justify-center">
                                                <CheckCircle className={cn("size-6", validateTransition(journeyColumns[journeyColumns.findIndex(c => c.id === currentStatusId) + 1]?.id).valid ? "text-emerald-500" : "text-slate-300")} />
                                            </div>
                                            <Button 
                                                onClick={() => handleCompleteStage(currentStatusId)} 
                                                disabled={!validateTransition(journeyColumns[journeyColumns.findIndex(c => c.id === currentStatusId) + 1]?.id).valid}
                                                className="w-full font-bold shadow-lg shadow-primary/20"
                                            >
                                                Confirmar Avanço de Fase
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })()
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>


        <Card className="border-primary/20 shadow-sm">
            <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="flex items-center gap-2 text-primary">
                    <ClipboardList className="size-5" /> Apoio à Integração (Checklists)
                </CardTitle>
                <CardDescription>Ferramentas operacionais de acompanhamento (não afetam o status oficial).</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <Tabs defaultValue={activeChecklists[0]?.id} className="w-full">
                    <TabsList className="flex h-auto justify-start bg-muted/50 p-1 mb-6 min-w-max border">
                        {activeChecklists.map(checklist => (
                            <TabsTrigger key={checklist.id} value={checklist.id} className="font-bold">{checklist.title}</TabsTrigger>
                        ))}
                    </TabsList>
                    
                    {activeChecklists.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground italic border-2 border-dashed rounded-xl">
                            Nenhum checklist operacional disponível para esta fase.
                        </div>
                    ) : (
                        activeChecklists.map(checklist => {
                            const questions = checklist.questions || [];
                            const answers = stageProgress[checklist.id]?.answers || {};
                            const completedCount = questions.filter(q => !!answers[q.id]).length;
                            const progressPercent = questions.length > 0 ? Math.round((completedCount / questions.length) * 100) : 0;
                            
                            return (
                                <TabsContent key={checklist.id} value={checklist.id} className="space-y-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Status: {progressPercent === 100 ? 'Concluído' : 'Em andamento'}
                                        </div>
                                        <span className="text-xs font-black text-primary">{progressPercent}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 mb-6 overflow-hidden border">
                                        <div 
                                            className={cn("h-full transition-all duration-500", progressPercent === 100 ? "bg-emerald-500" : "bg-primary")} 
                                            style={{ width: `${progressPercent}%` }} 
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(checklist.questions || []).map(q => {
                                        const answer = stageProgress[checklist.id]?.answers?.[q.id];
                                        return (
                                            <div key={q.id} className="p-3 bg-white rounded-lg border shadow-sm flex items-start gap-3 hover:border-primary/30 transition-colors">
                                                <Checkbox
                                                    id={`${checklist.id}-${q.id}`}
                                                    checked={!!answer}
                                                    onCheckedChange={(checked) => handleAnswerChange(checklist.id, q.id, !!checked)}
                                                    className="mt-1"
                                                />
                                                <div className="flex-1 space-y-1">
                                                    <Label htmlFor={`${checklist.id}-${q.id}`} className="font-medium text-sm cursor-pointer">{q.label.replace('[nome]', memberName)}</Label>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-end pt-4 border-t">
                                    <Button size="sm" onClick={() => handleSaveStage(checklist)} disabled={isSaving === checklist.id} className="font-bold">
                                        {isSaving === checklist.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        Salvar Progresso
                                    </Button>
                                </div>
                            </TabsContent>
                        ))
                    )}
                </Tabs>
            </CardContent>
        </Card>

        <FollowUpTimeline memberId={memberId} memberName={memberName} initialNotes={timelineNotes || []} />
        
        <EnrollmentDialog 
            open={isEnrollmentOpen} 
            onOpenChange={setEnrollmentOpen} 
            initialStudentId={memberId} 
        />
      </div>
    );
}
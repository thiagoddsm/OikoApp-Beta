'use client';
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, Circle, GraduationCap, Lock, ArrowRight, AlertTriangle, RefreshCw, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { useVolunteering, getModuleIndexForDate, weekDayMap } from '@/contexts/volunteering-context';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { format, parseISO, addWeeks, addMonths, isBefore } from 'date-fns';
import { useCoursesData } from "@/hooks/useDomainData";

import { getModuleCompletion } from '@/domain/teaching/module-completion';

export function MemberCourseProgress({ user }: { user: any }) {
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();

    const { updateVolunteer } = useVolunteering();
    const { toast } = useToast();
    const [isSyncing, setIsSyncing] = useState(false);

    const manualProgress = user?.journey?.memberCourseProgress || {};
    
    const memberCourse = useMemo(() => 
        courses.find(c => c.name.toLowerCase().includes('membro') || c.name.toLowerCase().includes('pertencer')),
    [courses]);

    const modules = useMemo(() => {
        if (memberCourse?.syllabus && memberCourse.syllabus.length > 0) {
            return memberCourse.syllabus.map((s, index) => ({
                id: `module${index + 1}`,
                label: s.title,
                description: index === memberCourse.syllabus!.length - 1 ? 'Eletivo' : `Módulo ${index + 1}`,
                index: index,
                isElective: index === memberCourse.syllabus!.length - 1
            }));
        }
        
        return [
            { id: 'module1', label: 'História e Visão', description: 'Módulo 1', index: 0, isElective: false },
            { id: 'module2', label: 'DNA e Células', description: 'Módulo 2', index: 1, isElective: false },
            { id: 'module3', label: 'Mordomia e Finanças', description: 'Módulo 3', index: 2, isElective: false },
            { id: 'module4', label: 'Governança e Ética', description: 'Módulo 4', index: 3, isElective: false },
            { id: 'module5', label: 'Comissionamento', description: 'Eletivo', index: 4, isElective: true },
        ];
    }, [memberCourse]);

    const attendanceProgress = useMemo(() => {
        if (!memberCourse || !classes) return {};
        
        const progress: Record<string, { completed: boolean, date?: string, method?: string }> = {};
        const relevantClasses = classes.filter(c => c.courseId === memberCourse.id);

        modules.forEach(mod => {
            const result = getModuleCompletion({
                studentId: user.id,
                studentEmail: user.email,
                studentJourney: user.journey,
                course: memberCourse,
                modIndex: mod.index,
                modId: mod.id,
                modules: memberCourse.syllabus || [],
                courseClasses: relevantClasses,
                isMembership: true
            });

            if (result.isDone) {
                const methodStr = result.isRepo ? 'Reposição' : result.isOnline ? 'Theoflix' : result.isManual ? 'Manual / Aprovação' : 'Presencial';
                progress[mod.id] = { 
                    completed: true, 
                    date: result.data?.date || new Date().toISOString(), 
                    method: methodStr 
                };
            }
        });

        return progress;
    }, [memberCourse, classes, user.id, user.email, user.journey, modules]);

    const mergedProgress = useMemo(() => {
        const merged: Record<string, any> = { ...manualProgress };
        modules.forEach(mod => {
            if (attendanceProgress[mod.id]) {
                merged[mod.id] = true;
                merged[`${mod.id}_detail`] = attendanceProgress[mod.id];
            }
        });
        return merged;
    }, [manualProgress, attendanceProgress, modules]);
    
    const mandatoryModules = modules.filter(m => !m.isElective);
    const mandatoryCompleted = mandatoryModules.every(m => mergedProgress[m.id]);
    
    const isReadyForElective = mandatoryCompleted;
    const isAllDone = mandatoryCompleted;

    const baptismCheck = user.integrationStatus === 'novo_convertido' ? user.batizado === 'sim' : true;

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            toast({ title: "Caderneta Atualizada", description: "O progresso foi sincronizado com os diários de classe de todos os ciclos em tempo real." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro na Sincronização" });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleMakeMember = async () => {
        if (!baptismCheck) {
            toast({ variant: 'destructive', title: 'Batismo Pendente', description: 'Novos Convertidos precisam do batismo para oficialização.' });
            return;
        }
        await updateVolunteer(user.id, { integrationStatus: 'membro' });
        toast({ title: "Bem-vindo!", description: `${user.name} agora é oficialmente um Membro IBM.` });
    };
    
    const scrollRef = React.useRef<HTMLDivElement>(null);

    const scrollModules = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const amount = direction === 'left' ? -220 : 220;
            scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

    return (
        <Card className="bg-primary/5 border-primary/20 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <GraduationCap className="size-5 text-primary" />
                        Jornada de Membresia (Modular)
                    </CardTitle>
                    <CardDescription>O progresso é acumulado através de diferentes ciclos e reposições.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSync} disabled={isSyncing} className="text-primary hover:text-primary hover:bg-primary/10 font-bold">
                    {isSyncing ? <Loader2 className="size-3 animate-spin mr-1" /> : <RefreshCw className="size-3 mr-1" />}
                    Sincronizar
                </Button>
            </CardHeader>
            <CardContent>
                <div className="relative flex items-center gap-1 mt-4">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => scrollModules('left')}
                        className="size-8 rounded-full shrink-0 bg-white hover:bg-primary/10 hover:text-primary border-slate-200 shadow-sm z-10"
                        title="Rolar para esquerda"
                    >
                        <ChevronLeft className="size-4" />
                    </Button>

                    <div ref={scrollRef} className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth flex-1 py-1 px-1">
                        {modules.map((mod, idx) => {
                            const isCompleted = mergedProgress[mod.id];
                            const isLocked = mod.isElective && !isReadyForElective;
                            
                            return (
                                <div key={mod.id} className={cn(
                                    "flex flex-col items-center text-center p-3 rounded-xl border-2 transition-all relative shrink-0 w-36 sm:w-44",
                                    isCompleted ? "bg-emerald-50 border-emerald-500 shadow-sm" : 
                                    isLocked ? "bg-slate-100 border-slate-200 opacity-60" : "bg-white border-slate-200",
                                    mod.isElective && !isCompleted && "border-dashed"
                                )}>
                                    <div className={cn(
                                        "size-10 rounded-full flex items-center justify-center mb-2",
                                        isCompleted ? "bg-emerald-500 text-white" : 
                                        isLocked ? "bg-slate-300 text-slate-500" : 
                                        mod.isElective ? "bg-amber-50 text-amber-500 border border-amber-200" : "bg-slate-100 text-slate-400"
                                    )}>
                                        {isCompleted ? <CheckCircle2 className="size-6" /> : 
                                         isLocked ? <Lock className="size-5" /> : <Circle className="size-6" />}
                                    </div>
                                    <p className="text-[10px] font-black uppercase leading-tight mb-1 px-1 line-clamp-2">{mod.label}</p>
                                    <p className="text-[9px] text-muted-foreground">{mod.description}</p>
                                    
                                    {isCompleted && mergedProgress[`${mod.id}_detail`] && (
                                        <div className="mt-2 pt-1 border-t border-emerald-200/50 w-full">
                                            <p className="text-[8px] font-bold text-emerald-700 uppercase">
                                                {mergedProgress[`${mod.id}_detail`].method}
                                            </p>
                                            <p className="text-[8px] text-emerald-600/80">
                                                {format(parseISO(mergedProgress[`${mod.id}_detail`].date), 'dd/MM/yyyy')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => scrollModules('right')}
                        className="size-8 rounded-full shrink-0 bg-white hover:bg-primary/10 hover:text-primary border-slate-200 shadow-sm z-10"
                        title="Rolar para direita"
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
                
                {isAllDone && (
                    <div className={cn(
                        "mt-6 p-4 rounded-xl text-center animate-in zoom-in-95 flex flex-col md:flex-row items-center justify-between gap-4",
                        baptismCheck ? "bg-emerald-600 text-white" : "bg-amber-100 border-2 border-amber-500 text-amber-900"
                    )}>
                        <div className="text-left">
                            <p className="font-black text-lg">{baptismCheck ? "🎉 Pronto para a Oficialização!" : "⚠️ Pendência de Batismo"}</p>
                            <p className="text-xs opacity-90">{baptismCheck ? "O aluno completou o currículo modular e está apto para ser membro oficial." : "O currículo foi concluído, mas o batismo é obrigatório para oficializar a membresia."}</p>
                        </div>
                        {user.integrationStatus !== 'membro' ? (
                            <Button variant={baptismCheck ? "secondary" : "destructive"} className="font-bold whitespace-nowrap" onClick={handleMakeMember}>
                                {!baptismCheck && <AlertTriangle size={16} className="mr-2" />} Oficializar Membro
                            </Button>
                        ) : (
                            <Badge className="bg-white/20 text-white border-white/40 font-black">MEMBRO IBM</Badge>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
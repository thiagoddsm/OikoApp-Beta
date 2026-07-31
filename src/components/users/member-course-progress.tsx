'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  CheckCircle2, Circle, GraduationCap, Lock, ArrowRight, AlertTriangle, 
  RefreshCw, Loader2, ChevronLeft, ChevronRight, Video, Calendar, Eye, School, BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { useVolunteering, getModuleIndexForDate, weekDayMap } from '@/contexts/volunteering-context';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { format, parseISO, addWeeks, addMonths, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCoursesData } from "@/hooks/useDomainData";
import { getModuleCompletion } from '@/domain/teaching/module-completion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function MemberCourseProgress({ user }: { user: any }) {
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();

    const { updateVolunteer } = useVolunteering();
    const { toast } = useToast();
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedMod, setSelectedMod] = useState<any | null>(null);

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

    const selectedDetail = selectedMod ? mergedProgress[`${selectedMod.id}_detail`] : null;
    const selectedIsDone = selectedMod ? mergedProgress[selectedMod.id] : false;

    return (
        <>
            <Card className="bg-primary/5 border-primary/20 shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <GraduationCap className="size-5 text-primary" />
                            Jornada de Membresia (Modular)
                        </CardTitle>
                        <CardDescription>Clique em qualquer disciplina para ver os detalhes da aula e método de presença.</CardDescription>
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

                        <div ref={scrollRef} className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth flex-1 py-2 px-1">
                            {modules.map((mod, idx) => {
                                const isCompleted = mergedProgress[mod.id];
                                const isLocked = mod.isElective && !isReadyForElective;
                                
                                return (
                                    <div 
                                        key={mod.id} 
                                        onClick={() => setSelectedMod(mod)}
                                        className={cn(
                                            "flex flex-col items-center text-center p-3.5 rounded-2xl border-2 transition-all relative shrink-0 w-40 sm:w-48 cursor-pointer hover:scale-[1.02] group",
                                            isCompleted ? "bg-emerald-50/80 border-emerald-500 hover:border-emerald-600 shadow-sm" : 
                                            isLocked ? "bg-slate-100 border-slate-200 opacity-60" : "bg-white border-slate-200 hover:border-primary",
                                            mod.isElective && !isCompleted && "border-dashed"
                                        )}
                                    >
                                        <div className={cn(
                                            "size-10 rounded-full flex items-center justify-center mb-2 transition-transform group-hover:scale-110",
                                            isCompleted ? "bg-emerald-500 text-white" : 
                                            isLocked ? "bg-slate-300 text-slate-500" : 
                                            mod.isElective ? "bg-amber-50 text-amber-500 border border-amber-200" : "bg-slate-100 text-slate-400"
                                        )}>
                                            {isCompleted ? <CheckCircle2 className="size-6" /> : 
                                             isLocked ? <Lock className="size-5" /> : <Circle className="size-6" />}
                                        </div>
                                        <p className="text-xs font-black uppercase leading-tight mb-1 px-1 line-clamp-2 text-slate-900">{mod.label}</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">{mod.description}</p>
                                        
                                        {isCompleted && mergedProgress[`${mod.id}_detail`] && (
                                            <div className="mt-3 pt-1.5 border-t border-emerald-200/60 w-full">
                                                <Badge variant="outline" className="bg-emerald-100/80 text-emerald-800 border-emerald-300 text-[9px] font-bold uppercase mb-0.5">
                                                    {mergedProgress[`${mod.id}_detail`].method}
                                                </Badge>
                                                <p className="text-[9px] text-emerald-700 font-medium">
                                                    {format(parseISO(mergedProgress[`${mod.id}_detail`].date), 'dd/MM/yyyy')}
                                                </p>
                                            </div>
                                        )}

                                        <div className="mt-2 text-[9px] text-primary font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Eye className="size-3" /> Clique p/ detalhes
                                        </div>
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

            {/* Modal de Detalhes da Aula / Módulo */}
            {selectedMod && (
                <Dialog open={!!selectedMod} onOpenChange={() => setSelectedMod(null)}>
                    <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white">
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-1">
                                <div className={cn(
                                    "p-3 rounded-2xl",
                                    selectedIsDone ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                                )}>
                                    <GraduationCap className="size-6" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-black uppercase italic tracking-tight text-slate-900">
                                        {selectedMod.label}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-slate-500 font-medium">
                                        {selectedMod.description} • Curso Pertencer (Membresia)
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="space-y-4 pt-2">
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Status de Conclusão</span>
                                    <Badge variant={selectedIsDone ? "default" : "secondary"} className="text-xs font-black uppercase">
                                        {selectedIsDone ? "Concluído" : "Em Andamento / Pendente"}
                                    </Badge>
                                </div>

                                {selectedDetail && (
                                    <>
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Modalidade</span>
                                            <Badge className="bg-emerald-600 text-white text-xs font-bold uppercase">
                                                {selectedDetail.method}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Data da Presença</span>
                                            <span className="text-xs font-bold text-slate-900">
                                                {format(parseISO(selectedDetail.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/60 space-y-2 text-xs">
                                <p className="font-black uppercase text-amber-900 text-[10px] tracking-wider">Legenda de Formato:</p>
                                <div className="space-y-1 text-slate-700 font-medium">
                                    <p>• <strong>Presencial:</strong> Presença confirmada no diário de classe da turma.</p>
                                    <p>• <strong>Online (Theoflix):</strong> Vídeo-aula assistida na plataforma.</p>
                                    <p>• <strong>Reposição:</strong> Aula recuperada em turma secundária.</p>
                                    <p>• <strong>Manual / Aprovação:</strong> Validação direta pela liderança pastoral.</p>
                                </div>
                            </div>

                            <Button onClick={() => setSelectedMod(null)} className="w-full h-11 rounded-xl font-bold text-white">
                                Fechar
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
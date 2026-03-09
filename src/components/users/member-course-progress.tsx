
'use client';
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, Circle, GraduationCap, Lock, ArrowRight, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { format, parseISO } from 'date-fns';

const modules = [
    { id: 'module1', label: 'História e Visão', description: 'Módulo 1', index: 0 },
    { id: 'module2', label: 'DNA e Células', description: 'Módulo 2', index: 1 },
    { id: 'module3', label: 'Mordomia e Finanças', description: 'Módulo 3', index: 2 },
    { id: 'module4', label: 'Governança e Ética', description: 'Módulo 4', index: 3 },
    { id: 'module5', label: 'Comissionamento', description: 'Eletivo', index: 4 },
];

export function MemberCourseProgress({ user }: { user: any }) {
    const { updateVolunteer, classes, courses } = useVolunteering();
    const { toast } = useToast();
    const [isSyncing, setIsSyncing] = useState(false);

    // 1. Get flags from user document
    const manualProgress = user?.journey?.memberCourseProgress || {};
    
    // 2. Calcula progresso de todas as turmas onde este aluno esteve presente
    const memberCourse = useMemo(() => 
        courses.find(c => c.name.toLowerCase().includes('membro') || c.name.toLowerCase().includes('pertencer')),
    [courses]);

    const attendanceProgress = useMemo(() => {
        if (!memberCourse || !classes) return {};
        
        const progress: Record<string, boolean> = {};
        const relevantClasses = classes.filter(c => c.courseId === memberCourse.id);

        modules.forEach(mod => {
            // Verifica se o aluno esteve presente em QUALQUER turma (ciclo) na aula correspondente ao índice
            const isPresentInAnyCycle = relevantClasses.some(c => {
                const dates = c.extraDates ? [...(c.extraDates || []), c.startDate] : [c.startDate];
                // Lógica de Ciclo Mensal: a 1ª aula do ciclo é o Módulo 1, etc.
                // Buscamos se o ID do aluno aparece no registro de chamada de alguma data que corresponda ao módulo
                return c.attendance?.some(att => {
                    const classDates = Array.from(new Set(relevantClasses.flatMap(rc => {
                        // Expansão simplificada para encontrar a ordem das aulas no ciclo
                        const start = parseISO(rc.startDate || '');
                        return [0,1,2,3,4].map(i => format(addWeeks(start, i), 'yyyy-MM-dd'));
                    })));
                    
                    const dateIndexInCycle = classDates.indexOf(att.date);
                    return dateIndexInCycle === mod.index && (att.presentStudentIds.includes(user.id) || att.onlineStudentIds?.includes(user.id));
                });
            });
            if (isPresentInAnyCycle) progress[mod.id] = true;
        });

        return progress;
    }, [memberCourse, classes, user.id]);

    // Merge: Se marcado manualmente OU se houver presença física/online registrada
    const mergedProgress = useMemo(() => {
        const merged = { ...manualProgress };
        modules.forEach(mod => {
            if (attendanceProgress[mod.id]) merged[mod.id] = true;
        });
        return merged;
    }, [manualProgress, attendanceProgress]);
    
    const mandatoryCompleted = ['module1', 'module2', 'module3', 'module4'].every(m => mergedProgress[m]);
    const isReadyForModule5 = mandatoryCompleted;
    const isAllDone = mandatoryCompleted;

    const baptismCheck = user.integrationStatus === 'novo_convertido' ? user.batizado === 'sim' : true;

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await updateVolunteer(user.id, {
                'journey.memberCourseProgress': mergedProgress
            });
            toast({ title: "Caderneta Atualizada", description: "O progresso foi sincronizado com os diários de classe de todos os ciclos." });
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
                <Button variant="ghost" size="sm" onClick={handleSync} disabled={isSyncing} className="text-primary hover:text-primary hover:bg-primary/10">
                    {isSyncing ? <Loader2 className="size-3 animate-spin mr-1" /> : <RefreshCw className="size-3 mr-1" />}
                    Sincronizar
                </Button>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mt-4">
                    {modules.map((mod, idx) => {
                        const isCompleted = mergedProgress[mod.id];
                        const isLocked = mod.id === 'module5' && !isReadyForModule5;
                        const isElective = mod.id === 'module5';
                        
                        return (
                            <div key={mod.id} className={cn(
                                "flex flex-col items-center text-center p-3 rounded-xl border-2 transition-all relative",
                                isCompleted ? "bg-emerald-50 border-emerald-500 shadow-sm" : 
                                isLocked ? "bg-slate-100 border-slate-200 opacity-60" : "bg-white border-slate-200",
                                isElective && !isCompleted && "border-dashed"
                            )}>
                                <div className={cn(
                                    "size-10 rounded-full flex items-center justify-center mb-2",
                                    isCompleted ? "bg-emerald-500 text-white" : 
                                    isLocked ? "bg-slate-300 text-slate-500" : 
                                    isElective ? "bg-amber-50 text-amber-500 border border-amber-200" : "bg-slate-100 text-slate-400"
                                )}>
                                    {isCompleted ? <CheckCircle2 className="size-6" /> : 
                                     isLocked ? <Lock className="size-5" /> : <Circle className="size-6" />}
                                </div>
                                <p className="text-[10px] font-black uppercase leading-tight mb-1">{mod.label}</p>
                                <p className="text-[9px] text-muted-foreground">{mod.description}</p>
                                {idx < modules.length - 1 && (
                                    <div className="hidden sm:block absolute -right-4 top-1/2 -translate-y-1/2 z-10"><ArrowRight size={12} className="text-slate-300" /></div>
                                )}
                            </div>
                        );
                    })}
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

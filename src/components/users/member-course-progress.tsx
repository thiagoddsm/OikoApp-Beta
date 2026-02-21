'use client';
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, Circle, GraduationCap, Lock, ArrowRight, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';

const modules = [
    { id: 'module1', label: 'História e Visão', description: '1º Domingo', week: '1' },
    { id: 'module2', label: 'DNA e Células', description: '2º Domingo', week: '2' },
    { id: 'module3', label: 'Mordomia e Finanças', description: '3º Domingo', week: '3' },
    { id: 'module4', label: 'Governança e Ética', description: '4º Domingo', week: '4' },
    { id: 'module5', label: 'Comissionamento', description: '5º Domingo', week: 'last' },
];

export function MemberCourseProgress({ user }) {
    const { updateVolunteer, classes, courses } = useVolunteering();
    const { toast } = useToast();
    const [isSyncing, setIsSyncing] = useState(false);

    // 1. Get flags from user document
    const manualProgress = user?.journey?.memberCourseProgress || {};
    
    // 2. Calculate progress from actual class attendance in context
    const memberCourse = useMemo(() => 
        courses.find(c => c.name.toLowerCase().includes('membro') || c.name.toLowerCase().includes('pertencer')),
    [courses]);

    const attendanceProgress = useMemo(() => {
        if (!memberCourse || !classes) return {};
        
        const progress: Record<string, boolean> = {};
        const relevantClasses = classes.filter(c => c.courseId === memberCourse.id);

        modules.forEach(mod => {
            const classForMod = relevantClasses.find(c => c.weekOfMonth === mod.week);
            if (classForMod && classForMod.attendance) {
                const isPresent = classForMod.attendance.some(att => att.presentStudentIds.includes(user.id));
                if (isPresent) progress[mod.id] = true;
            }
        });

        return progress;
    }, [memberCourse, classes, user.id]);

    // Merge: If it's checked manually OR if attendance is recorded
    const mergedProgress = useMemo(() => {
        const merged = { ...manualProgress };
        modules.forEach(mod => {
            if (attendanceProgress[mod.id]) merged[mod.id] = true;
        });
        return merged;
    }, [manualProgress, attendanceProgress]);
    
    const completedCount = modules.filter(m => mergedProgress[m.id]).length;
    const isReadyForModule5 = modules.slice(0, 4).every(m => mergedProgress[m.id]);
    const isAllDone = completedCount === 5;

    const baptismCheck = user.integrationStatus === 'novo_convertido' ? user.batizado === 'sim' : true;

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await updateVolunteer(user.id, {
                'journey.memberCourseProgress': mergedProgress
            });
            toast({ title: "Progresso Sincronizado", description: "O perfil foi atualizado com base nos diários de classe." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro na Sincronização" });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleMakeMember = async () => {
        if (!baptismCheck) {
            toast({
                variant: 'destructive',
                title: 'Impossível Oficializar',
                description: 'Este membro é um Novo Convertido e precisa do Batismo nas águas para ser oficializado.',
            });
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
                        Status da Integração (Membresia)
                    </CardTitle>
                    <CardDescription>Acompanhamento dos 5 marcos dominicais para se tornar parte do organismo.</CardDescription>
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
                        
                        return (
                            <div 
                                key={mod.id} 
                                className={cn(
                                    "flex flex-col items-center text-center p-3 rounded-xl border-2 transition-all relative",
                                    isCompleted ? "bg-emerald-50 border-emerald-500 shadow-sm" : 
                                    isLocked ? "bg-slate-100 border-slate-200 opacity-60" : "bg-white border-slate-200"
                                )}
                            >
                                <div className={cn(
                                    "size-10 rounded-full flex items-center justify-center mb-2",
                                    isCompleted ? "bg-emerald-500 text-white" : 
                                    isLocked ? "bg-slate-300 text-slate-500" : "bg-slate-100 text-slate-400"
                                )}>
                                    {isCompleted ? <CheckCircle2 className="size-6" /> : 
                                     isLocked ? <Lock className="size-5" /> : <Circle className="size-6" />}
                                </div>
                                <p className="text-[10px] font-black uppercase leading-tight mb-1">{mod.label}</p>
                                <p className="text-[9px] text-muted-foreground">{mod.description}</p>
                                
                                {idx < modules.length - 1 && (
                                    <div className="hidden sm:block absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                                        <ArrowRight size={12} className="text-slate-300" />
                                    </div>
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
                            <p className="font-black text-lg">
                                {baptismCheck ? "🎉 Curso de Membro Concluído!" : "⚠️ Pendência de Batismo"}
                            </p>
                            <p className="text-xs opacity-90">
                                {baptismCheck 
                                    ? "Este membro completou todos os requisitos e está apto para a oficialização."
                                    : "As aulas foram concluídas, mas o Batismo é obrigatório para Novos Convertidos antes da oficialização."}
                            </p>
                        </div>
                        {user.integrationStatus !== 'membro' ? (
                            <Button 
                                variant={baptismCheck ? "secondary" : "destructive"} 
                                className="font-bold whitespace-nowrap" 
                                onClick={handleMakeMember}
                            >
                                {!baptismCheck && <AlertTriangle size={16} className="mr-2" />}
                                Oficializar Membresia Agora
                            </Button>
                        ) : (
                            <Badge className="bg-white/20 text-white border-white/40 font-black">MEMBRO OFICIALIZADO</Badge>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
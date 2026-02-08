'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, Circle, GraduationCap, Lock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useToast } from '@/hooks/use-toast';

const modules = [
    { id: 'module1', label: 'História e Visão', description: '1º Domingo' },
    { id: 'module2', label: 'DNA e Células', description: '2º Domingo' },
    { id: 'module3', label: 'Mordomia e Finanças', description: '3º Domingo' },
    { id: 'module4', label: 'Governança e Ética', description: '4º Domingo' },
    { id: 'module5', label: 'Comissionamento', description: '5º Domingo' },
];

export function MemberCourseProgress({ user }) {
    const { updateVolunteer } = useVolunteering();
    const { toast } = useToast();
    const progress = user?.journey?.memberCourseProgress || {};
    
    const completedCount = modules.filter(m => progress[m.id]).length;
    const isReadyForModule5 = modules.slice(0, 4).every(m => progress[m.id]);
    const isAllDone = completedCount === 5;

    const handleMakeMember = async () => {
        await updateVolunteer(user.id, { integrationStatus: 'membro' });
        toast({ title: "Bem-vindo!", description: `${user.name} agora é oficialmente um Membro IBM.` });
    };
    
    return (
        <Card className="bg-primary/5 border-primary/20 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <GraduationCap className="size-5 text-primary" />
                    Status da Integração (Membresia)
                </CardTitle>
                <CardDescription>Acompanhamento dos 5 marcos dominicais para se tornar parte do organismo.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mt-4">
                    {modules.map((mod, idx) => {
                        const isCompleted = progress[mod.id];
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
                    <div className="mt-6 p-4 bg-emerald-600 text-white rounded-xl text-center animate-in zoom-in-95 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-left">
                            <p className="font-black text-lg">🎉 Curso de Membro Concluído!</p>
                            <p className="text-xs opacity-90">Este membro completou todos os requisitos e está apto para a oficialização.</p>
                        </div>
                        {user.integrationStatus !== 'membro' ? (
                            <Button variant="secondary" className="font-bold whitespace-nowrap" onClick={handleMakeMember}>
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
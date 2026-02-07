
'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, Circle, GraduationCap, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const modules = [
    { id: 'module1', label: 'História e Visão', description: '1º Domingo' },
    { id: 'module2', label: 'DNA e Células', description: '2º Domingo' },
    { id: 'module3', label: 'Mordomia e Finanças', description: '3º Domingo' },
    { id: 'module4', label: 'Governança e Ética', description: '4º Domingo' },
    { id: 'module5', label: 'Comissionamento', description: '5º Domingo' },
];

export function MemberCourseProgress({ user }) {
    const progress = user?.journey?.memberCourseProgress || {};
    
    const completedCount = modules.filter(m => progress[m.id]).length;
    const isReadyForModule5 = modules.slice(0, 4).every(m => progress[m.id]);
    
    return (
        <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <GraduationCap className="size-5 text-primary" />
                    Status do Curso de Membros
                </CardTitle>
                <CardDescription>Acompanhamento dos 5 módulos dominicais obrigatórios.</CardDescription>
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
                                    "flex flex-col items-center text-center p-3 rounded-xl border-2 transition-all",
                                    isCompleted ? "bg-emerald-50 border-emerald-500" : 
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
                                <p className="text-xs font-black uppercase leading-tight mb-1">{mod.label}</p>
                                <p className="text-[10px] text-muted-foreground">{mod.description}</p>
                            </div>
                        );
                    })}
                </div>
                
                {completedCount === 5 && (
                    <div className="mt-6 p-4 bg-emerald-600 text-white rounded-lg text-center animate-in zoom-in-95">
                        <p className="font-bold">🎉 Curso de Membro Concluído!</p>
                        <p className="text-xs opacity-90">Este membro está apto para a cerimônia de oficialização.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

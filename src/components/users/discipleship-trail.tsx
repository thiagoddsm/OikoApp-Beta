
'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Handshake, School, MapIcon, Briefcase, Church, Group, BookOpen, UserPlus, Award, Shield, Target, UserX, UserCheck, Loader2 } from 'lucide-react';


const iconMap: Record<string, React.ElementType> = {
    'nao_alcancado': UserX,
    'novo_convertido': UserPlus,
    'reconciliado': UserCheck,
    'transferido': Church,
    'membro': Award,
    'consolidado': BookOpen,
    'lider_treinamento': Handshake,
    'lider_gc': Group,
    'lider_area': MapIcon,
    'lider_rede': Briefcase,
    'pastor': Shield,
    'default': Target
};

const phaseConfig: Record<string, { name: string; color: string; }> = {
    '1': { name: 'FASE 1: EVANGELISMO', color: "bg-gray-100 text-gray-800" },
    '2': { name: 'FASE 2: CONVERSÃO', color: "bg-indigo-100 text-indigo-800" },
    '3': { name: 'FASE 3: INTEGRAÇÃO', color: "bg-sky-100 text-sky-800" },
    '4': { name: 'FASE 4: DISCIPULADO', color: "bg-emerald-100 text-emerald-800" },
    '5': { name: 'FASE 5: LIDERANÇA', color: "bg-amber-100 text-amber-800" },
};

// Simplified mapping of status to phase. This should be managed in the settings in the future.
const statusToPhaseMap: Record<string, string> = {
    'nao_alcancado': '1',
    'novo_convertido': '2',
    'reconciliado': '3',
    'transferido': '3',
    'membro': '3',
    'consolidado': '4',
    'lider_treinamento': '4',
    'lider_gc': '5',
    'lider_area': '5',
    'lider_rede': '5',
    'pastor': '5',
};

const mainColors = {
    status: 'border-primary text-primary',
    course: 'border-emerald-500 text-emerald-600',
    discipulado: 'border-amber-500 text-amber-600'
}

type TimelineItemData = {
    id: string;
    title: string;
    questions: any[];
};


const TimelineCard = ({ item, isEven, onToggle, isExpanded, isCurrent, isFuture }) => {
    const mainColor = mainColors['status'];
    const Icon = iconMap[item.id] || iconMap['default'];

    return (
        <div className={cn("md:grid md:grid-cols-2 w-full")}>
            <div className={cn(
                "pl-12 md:pl-0 py-2 relative group",
                isEven ? 'md:text-right pr-8' : 'md:text-left pl-8 md:col-start-2',
                isFuture && 'opacity-60 grayscale-[50%]'
            )}>
                 <div className={cn(
                    "absolute top-6 w-4 h-4 rounded-full bg-background border-4 z-20 shadow-sm transition-transform duration-300",
                    isFuture ? 'border-slate-300' : mainColor,
                    isCurrent ? 'scale-125' : 'group-hover:scale-110',
                    isEven ? 'md:-right-2 -left-[9px]' : 'md:-left-2 -left-[9px]'
                 )}>
                    {isCurrent && <div className="absolute -inset-1.5 bg-primary/20 rounded-full animate-pulse"></div>}
                 </div>
                <div className={cn("hidden md:block absolute top-7 w-8 h-1 bg-slate-200 group-hover:bg-slate-300 transition-colors", isEven ? 'right-0' : 'left-0')}></div>
                
                <Card className={cn("shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden relative", isCurrent && "shadow-lg ring-2 ring-primary/50")} onClick={() => onToggle(item.id)}>
                    <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", isFuture ? 'bg-slate-300' : mainColor.split(' ')[0].replace('border-', 'bg-'))}></div>
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                             <div className={cn("flex-1", isEven ? 'md:order-1' : '')}>
                                <div className={cn("flex items-center gap-2", isEven ? 'md:flex-row-reverse' : '')}>
                                    <h3 className="font-bold text-base text-foreground">{item.title}</h3>
                                    <Icon className={cn("size-5", isFuture ? 'text-slate-400' : mainColor.split(' ')[1])} />
                                </div>
                            </div>
                            {isCurrent && (
                                <div className="p-1 bg-primary/10 rounded-full">
                                    <Target className="size-4 text-primary" />
                                </div>
                             )}
                        </div>
                    </CardContent>

                    {isExpanded && (
                         <div className="bg-muted/50 border-t border-border p-4 text-sm text-muted-foreground space-y-3">
                            <p><strong className="text-foreground text-xs uppercase">Checklist desta fase:</strong></p>
                            {item.questions && item.questions.length > 0 ? (
                                <ul className="list-disc list-inside space-y-1">
                                    {item.questions.map(q => <li key={q.id}>{q.label}</li>)}
                                </ul>
                            ) : (
                                <p className="italic">Nenhum checklist definido para esta etapa.</p>
                            )}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export function DiscipleshipTrail({ currentStatusId }: { currentStatusId?: string }) {
    const { firestore } = useFirebase();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const checklistsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'discipleship_checklists')) : null, [firestore]);
    const { data: timelineData, isLoading } = useCollection<TimelineItemData>(checklistsQuery);

    const toggleDetails = (id: string) => {
        setExpandedId(prevId => (prevId === id ? null : id));
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    if (!timelineData) {
        return <p>Não foi possível carregar as etapas da jornada.</p>
    }

    let lastPhaseId = "";
    
    const effectiveStatusId = currentStatusId || 'nao_alcancado';
    const currentIndex = timelineData.findIndex(item => item.id === effectiveStatusId);

    return (
        <div className="bg-background rounded-lg p-4 md:p-8">
            <div className="max-w-5xl mx-auto px-4 py-8 relative overflow-hidden">
                <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-1 md:w-1.5 bg-slate-200 -ml-0.5 md:-ml-1 z-0 rounded-full"></div>

                <div className="space-y-4 md:space-y-0 relative">
                    {timelineData.map((item, index) => {
                        const phaseId = statusToPhaseMap[item.id] || '1';
                        const showPhase = phaseId !== lastPhaseId;
                        lastPhaseId = phaseId;
                        const phaseInfo = phaseConfig[phaseId];
                        const isCurrent = item.id === effectiveStatusId;
                        const isFuture = currentIndex !== -1 && index > currentIndex;

                        return (
                            <React.Fragment key={item.id}>
                                {showPhase && (
                                    <div className="md:col-span-2 flex justify-center py-4 relative z-10">
                                        <span className={cn("px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm border", phaseInfo.color, isFuture && 'opacity-60 grayscale-[50%]')}>
                                            {phaseInfo.name}
                                        </span>
                                    </div>
                                )}
                                <TimelineCard
                                    item={item}
                                    isEven={index % 2 === 0}
                                    onToggle={toggleDetails}
                                    isExpanded={expandedId === item.id}
                                    isCurrent={isCurrent}
                                    isFuture={isFuture}
                                />
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

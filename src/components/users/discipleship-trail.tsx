'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
    Handshake, 
    GraduationCap, 
    Target, 
    Loader2, 
    CheckCircle2, 
    ShieldAlert 
} from 'lucide-react';
import { 
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { journeyColumns, statusToPhaseMap, phaseConfig, iconMap } from './journey-status-config';

type TimelineItemData = {
    id: string;
    title: string;
    questions: any[];
    requiredCourseId?: string;
    requiresDisciplerApproval?: boolean;
    requiresSupervisorApproval?: boolean;
};

type Course = {
    id: string;
    name: string;
};

const TimelineCard = ({ item, isEven, onToggle, isExpanded, isCurrent, isFuture, isCompleted, courseName }) => {
    const Icon = iconMap[item.id] || iconMap['default'];
    const hasTechnicalReq = !!item.requiredCourseId;
    const hasHumanReq = item.requiresDisciplerApproval || item.requiresSupervisorApproval;

    return (
        <div className={cn("md:grid md:grid-cols-2 w-full")}>
            <div className={cn(
                "pl-12 md:pl-0 py-2 relative group",
                isEven ? 'md:text-right pr-8' : 'md:text-left pl-8 md:col-start-2',
                isFuture && 'opacity-60'
            )}>
                 {/* Conector Central */}
                 <div className={cn(
                    "absolute top-6 w-4 h-4 rounded-full bg-background border-4 z-20 shadow-sm transition-transform duration-300",
                    isFuture ? 'border-slate-300' : isCompleted ? 'border-emerald-500 bg-emerald-500' : 'border-primary',
                    isCurrent ? 'scale-125 ring-4 ring-primary/20' : 'group-hover:scale-110',
                    isEven ? 'md:-right-2 -left-[9px]' : 'md:-left-2 -left-[9px]'
                 )}>
                    {isCompleted && <CheckCircle2 className="size-3 text-white -ml-0.5 -mt-0.5" />}
                 </div>
                
                <Card className={cn(
                    "shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden relative border-l-4",
                    isCurrent ? "ring-2 ring-primary/50 border-l-primary" : 
                    isCompleted ? "border-l-emerald-500" : "border-l-slate-300"
                )} onClick={() => onToggle(item.id)}>
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                             <div className={cn("flex-1", isEven ? 'md:order-1' : '')}>
                                <div className={cn("flex items-center gap-2", isEven ? 'md:flex-row-reverse' : '')}>
                                    <h3 className="font-bold text-base text-foreground">{item.title}</h3>
                                    <Icon className={cn("size-5", isFuture ? 'text-slate-400' : isCompleted ? 'text-emerald-600' : 'text-primary')} />
                                </div>
                            </div>
                            {isCurrent && (
                                <Badge className="bg-primary text-white text-[10px] uppercase font-black">Você está aqui</Badge>
                             )}
                        </div>

                        {/* Requisitos (Validação Técnica e Humana) */}
                        <div className={cn("flex items-center gap-3 mt-3", isEven ? "md:justify-end" : "md:justify-start")}>
                            {hasTechnicalReq && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge variant="outline" className="text-[9px] py-0 h-5 border-emerald-200 bg-emerald-50 text-emerald-700">
                                                <GraduationCap className="size-3 mr-1" /> Validação Técnica
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="text-xs">Requer conclusão do curso: {courseName}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            {hasHumanReq && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge variant="outline" className="text-[9px] py-0 h-5 border-amber-200 bg-amber-50 text-amber-700">
                                                <Handshake className="size-3 mr-1" /> Validação Humana
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="text-xs">Requer aprovação formal de líderes</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                    </CardContent>

                    {isExpanded && (
                         <div className="bg-muted/50 border-t border-border p-4 text-sm text-muted-foreground space-y-3">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase text-foreground/60 tracking-widest">Critérios desta Fase:</p>
                                {item.requiredCourseId && (
                                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-100/50 p-2 rounded">
                                        <GraduationCap size={14} /> Conclusão do curso: {courseName}
                                    </div>
                                )}
                                {hasHumanReq && (
                                    <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-100/50 p-2 rounded">
                                        <ShieldAlert size={14} /> Aprovação do {item.requiresSupervisorApproval ? 'Supervisor' : 'Discipulador'}
                                    </div>
                                )}
                                {item.questions && item.questions.length > 0 && (
                                    <ul className="list-disc list-inside text-xs space-y-1 mt-2">
                                        {item.questions.map(q => <li key={q.id}>{q.label}</li>)}
                                    </ul>
                                )}
                            </div>
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

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

    const courseMap = useMemo(() => new Map(courses?.map(c => [c.id, c.name]) || []), [courses]);
    
    const sortedTimelineData = useMemo(() => {
        if (!timelineData) return [];
        const orderMap = new Map(journeyColumns.map((col, index) => [col.id, index]));
        return [...timelineData].sort((a, b) => (orderMap.get(a.id) ?? 99) - (orderMap.get(b.id) ?? 99));
    }, [timelineData]);

    const toggleDetails = (id: string) => {
        setExpandedId(prevId => (prevId === id ? null : id));
    };

    if (isLoading || isLoadingCourses) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
    }

    if (!timelineData || timelineData.length === 0) {
        return (
            <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <p className="text-muted-foreground">Nenhuma etapa da trilha configurada no banco de dados.</p>
            </div>
        )
    }

    let lastPhaseId = "";
    const effectiveStatusId = currentStatusId || 'nao_alcancado';
    const currentIndex = sortedTimelineData.findIndex(item => item.id === effectiveStatusId);

    return (
        <div className="bg-background rounded-lg p-4 md:p-8">
            <div className="max-w-5xl mx-auto px-4 py-8 relative">
                {/* Linha de fundo */}
                <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-1 bg-slate-100 -ml-0.5 md:-ml-0.5 z-0 rounded-full"></div>

                <div className="space-y-4 md:space-y-0 relative">
                    {sortedTimelineData.map((item, index) => {
                        const phaseId = statusToPhaseMap[item.id] || '1';
                        const showPhase = phaseId !== lastPhaseId;
                        lastPhaseId = phaseId;
                        const phaseInfo = phaseConfig[phaseId];
                        const isCurrent = item.id === effectiveStatusId;
                        const isCompleted = currentIndex !== -1 && index < currentIndex;
                        const isFuture = currentIndex !== -1 && index > currentIndex;
                        const courseName = item.requiredCourseId ? courseMap.get(item.requiredCourseId) : null;

                        return (
                            <React.Fragment key={item.id}>
                                {showPhase && (
                                    <div className="md:col-span-2 flex justify-center py-6 relative z-10">
                                        <span className={cn(
                                            "px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border-2", 
                                            phaseInfo.color, 
                                            isFuture && 'opacity-40 grayscale'
                                        )}>
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
                                    isCompleted={isCompleted}
                                    isFuture={isFuture}
                                    courseName={courseName}
                                />
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
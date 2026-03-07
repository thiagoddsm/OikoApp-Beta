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
    ShieldAlert,
    Info,
    ChevronDown
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
    questions: { id: string; label: string }[];
    requiredCourseId?: string;
    requiresDisciplerApproval?: boolean;
    requiresSupervisorApproval?: boolean;
};

type Course = {
    id: string;
    name: string;
};

interface TimelineCardProps {
    item: TimelineItemData;
    isEven: boolean;
    onToggle: (id: string) => void;
    isExpanded: boolean;
    isCurrent: boolean;
    isFuture: boolean;
    isCompleted: boolean;
    courseName: string | null;
}

const TimelineCard = ({ item, isEven, onToggle, isExpanded, isCurrent, isFuture, isCompleted, courseName }: TimelineCardProps) => {
    const Icon = iconMap[item.id] || iconMap['default'];
    const hasTechnicalReq = !!item.requiredCourseId;
    const hasHumanReq = item.requiresDisciplerApproval || item.requiresSupervisorApproval;

    return (
        <div className={cn("md:grid md:grid-cols-2 w-full")}>
            <div className={cn(
                "pl-12 md:pl-0 py-2 relative group",
                isEven ? 'md:text-right pr-8' : 'md:text-left pl-8 md:col-start-2',
                isFuture && 'opacity-70'
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
                    isCurrent ? "ring-2 ring-primary/50 border-l-primary bg-primary/5" : 
                    isCompleted ? "border-l-emerald-500 bg-emerald-50/30" : "border-l-slate-300"
                )} onClick={() => onToggle(item.id)}>
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                             <div className={cn("flex-1", isEven ? 'md:order-1' : '')}>
                                <div className={cn("flex items-center gap-2", isEven ? 'md:flex-row-reverse' : '')}>
                                    <h3 className={cn("font-bold text-base", isFuture ? "text-slate-600" : "text-foreground")}>
                                        {item.title}
                                    </h3>
                                    <Icon className={cn("size-5 shrink-0", isFuture ? 'text-slate-400' : isCompleted ? 'text-emerald-600' : 'text-primary')} />
                                </div>
                            </div>
                            {isCurrent && (
                                <Badge className="bg-primary text-white text-[10px] uppercase font-black shrink-0">Atual</Badge>
                             )}
                        </div>

                        {/* Badges de Requisitos */}
                        <div className={cn("flex flex-wrap items-center gap-2 mt-3", isEven ? "md:justify-end" : "md:justify-start")}>
                            {hasTechnicalReq && (
                                <Badge variant="outline" className="text-[9px] py-0 h-5 border-emerald-200 bg-emerald-50 text-emerald-700 font-bold">
                                    <GraduationCap className="size-3 mr-1" /> Requisito Técnico
                                </Badge>
                            )}
                            {hasHumanReq && (
                                <Badge variant="outline" className="text-[9px] py-0 h-5 border-amber-200 bg-amber-50 text-amber-700 font-bold">
                                    <Handshake className="size-3 mr-1" /> Requisito Humano
                                </Badge>
                            )}
                            <div className={cn("text-[10px] text-muted-foreground flex items-center gap-1 mt-1 font-medium", isEven ? "md:flex-row-reverse" : "")}>
                                <ChevronDown className={cn("size-3 transition-transform", isExpanded && "rotate-180")} />
                                {isExpanded ? 'Ver menos' : 'Ver requisitos para avançar'}
                            </div>
                        </div>
                    </CardContent>

                    {isExpanded && (
                         <div className="bg-slate-50 border-t border-border p-4 text-sm space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b pb-1">O que é necessário para concluir esta fase:</p>
                                
                                {item.requiredCourseId && (
                                    <div className="flex items-start gap-2 text-xs font-bold text-emerald-800 bg-white border border-emerald-100 p-2 rounded-lg shadow-sm">
                                        <GraduationCap size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="uppercase text-[9px] text-emerald-600/70">Curso Obrigatório</p>
                                            <p>{courseName || 'Curso não identificado'}</p>
                                        </div>
                                    </div>
                                )}

                                {hasHumanReq && (
                                    <div className="flex items-start gap-2 text-xs font-bold text-amber-800 bg-white border border-amber-100 p-2 rounded-lg shadow-sm">
                                        <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="uppercase text-[9px] text-amber-600/70">Aprovação de Liderança</p>
                                            <p>Requer validação do {item.requiresSupervisorApproval ? 'Supervisor de Área' : 'Discipulador'}</p>
                                        </div>
                                    </div>
                                )}

                                {item.questions && item.questions.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Checklist Prático:</p>
                                        <ul className="space-y-1.5">
                                            {item.questions.map((q: any, idx: number) => (
                                                <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                                    <div className="size-1.5 rounded-full bg-primary/30 mt-1 shrink-0" />
                                                    {q.label}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {!item.questions?.length && !hasTechnicalReq && !hasHumanReq && (
                                    <p className="text-xs italic text-muted-foreground flex items-center gap-2">
                                        <Info size={14} /> Nenhum critério especial configurado.
                                    </p>
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
    
    const finalTimelineItems = useMemo(() => {
        return journeyColumns.map(col => {
            const dbItem = timelineData?.find(item => item.id === col.id);
            return {
                id: col.id,
                title: col.title,
                questions: dbItem?.questions || [],
                requiredCourseId: dbItem?.requiredCourseId,
                requiresDisciplerApproval: dbItem?.requiresDisciplerApproval,
                requiresSupervisorApproval: dbItem?.requiresSupervisorApproval,
            } as TimelineItemData;
        });
    }, [timelineData]);

    const toggleDetails = (id: string) => {
        setExpandedId(prevId => (prevId === id ? null : id));
    };

    if (isLoading || isLoadingCourses) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
    }

    let lastPhaseId = "";
    const effectiveStatusId = currentStatusId || 'nao_alcancado';
    const currentIndex = finalTimelineItems.findIndex(item => item.id === effectiveStatusId);

    return (
        <div className="bg-background rounded-lg p-2 md:p-4">
            <div className="max-w-5xl mx-auto px-2 py-4 relative">
                {/* Linha de fundo */}
                <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-1 bg-slate-100 -ml-0.5 md:-ml-0.5 z-0 rounded-full"></div>

                <div className="space-y-2 md:space-y-0 relative">
                    {finalTimelineItems.map((item, index) => {
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
                                    <div className="md:col-span-2 flex justify-center py-8 relative z-10">
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

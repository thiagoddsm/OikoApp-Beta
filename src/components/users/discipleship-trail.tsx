'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Handshake, School, MapIcon, Briefcase, Church, Group, BookOpen, UserPlus, Award, Shield, Target, UserX, UserCheck, Loader2, GraduationCap } from 'lucide-react';
import { journeyColumns, statusToPhaseMap, phaseConfig, iconMap } from './journey-status-config';

const mainColors = {
    status: 'border-primary text-primary',
    course: 'border-emerald-500 text-emerald-600',
    discipulado: 'border-amber-500 text-amber-600'
}

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


const TimelineCard = ({ item, isEven, onToggle, isExpanded, isCurrent, isFuture, courseName }) => {
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
                        {(item.requiredCourseId || item.requiresDisciplerApproval || item.requiresSupervisorApproval) && (
                            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                                {item.requiredCourseId && (
                                    <div className="flex items-center gap-1.5">
                                        <GraduationCap className="size-3.5" />
                                        <span className="font-medium">{courseName || 'Curso'}</span>
                                    </div>
                                )}
                                {(item.requiresDisciplerApproval || item.requiresSupervisorApproval) && (
                                     <div className="flex items-center gap-1.5">
                                        <Handshake className="size-3.5" />
                                        <span className="font-medium">Requer Aprovação</span>
                                    </div>
                                )}
                            </div>
                        )}
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

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

    const courseMap = useMemo(() => new Map(courses?.map(c => [c.id, c.name]) || []), [courses]);
    
    // Sort timelineData based on the order defined in journeyColumns
    const sortedTimelineData = useMemo(() => {
        if (!timelineData) return [];
        const orderMap = new Map(journeyColumns.map((col, index) => [col.id, index]));
        return [...timelineData].sort((a, b) => (orderMap.get(a.id) ?? 99) - (orderMap.get(b.id) ?? 99));
    }, [timelineData]);

    const toggleDetails = (id: string) => {
        setExpandedId(prevId => (prevId === id ? null : id));
    };

    if (isLoading || isLoadingCourses) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    if (!timelineData) {
        return <p>Não foi possível carregar as etapas da jornada.</p>
    }

    let lastPhaseId = "";
    
    const effectiveStatusId = currentStatusId || 'nao_alcancado';
    const currentIndex = sortedTimelineData.findIndex(item => item.id === effectiveStatusId);

    return (
        <div className="bg-background rounded-lg p-4 md:p-8">
            <div className="max-w-5xl mx-auto px-4 py-8 relative overflow-hidden">
                <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-1 md:w-1.5 bg-slate-200 -ml-0.5 md:-ml-1 z-0 rounded-full"></div>

                <div className="space-y-4 md:space-y-0 relative">
                    {sortedTimelineData.map((item, index) => {
                        const phaseId = statusToPhaseMap[item.id] || '1';
                        const showPhase = phaseId !== lastPhaseId;
                        lastPhaseId = phaseId;
                        const phaseInfo = phaseConfig[phaseId];
                        const isCurrent = item.id === effectiveStatusId;
                        const isFuture = currentIndex !== -1 && index > currentIndex;
                        const courseName = item.requiredCourseId ? courseMap.get(item.requiredCourseId) : null;

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

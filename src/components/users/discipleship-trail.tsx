'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Handshake, School, MapIcon, Briefcase, Church, Group, BookOpen, UserPlus, Award, Shield, Target, UserX, UserCheck } from 'lucide-react';


const timelineData = [
    {
        id: 'nao_alcancado',
        phase: "FASE 1: EVANGELISMO",
        phaseColor: "bg-gray-100 text-gray-800",
        title: "NÃO ALCANÇADO (CIDADE)",
        type: "status",
        icon: UserX,
        details: { objective: "Pessoas na cidade que ainda não foram alcançadas pelo evangelho.", duration: "Contínuo", responsible: "Toda a Igreja", criteria: "Ser alcançado por um convite ou ação evangelística." }
    },
    {
        id: 'novo_convertido',
        phase: "FASE 2: CONVERSÃO",
        phaseColor: "bg-indigo-100 text-indigo-800",
        title: "NOVO CONVERTIDO",
        type: "status",
        icon: UserPlus,
        details: { objective: "Apresentação do evangelho e decisão por Cristo. Inicia uma jornada de 7 encontros pré-batismo e 7 encontros para membresia.", duration: "Início da jornada", responsible: "Qualquer membro", criteria: "Decisão por Cristo e início do vínculo com a célula." }
    },
    {
        id: 'reconciliado',
        phase: "FASE 3: INTEGRAÇÃO",
        phaseColor: "bg-sky-100 text-sky-800",
        title: "RECONCILIADO",
        type: "status",
        icon: UserCheck,
        details: { objective: "Retorno à comunhão da igreja após um período de afastamento. Passa por 7 encontros de discipulado para realinhamento.", duration: "Variável", responsible: "Líder de GC, Consolidador", criteria: "Retorno à frequência na célula e/ou cultos." }
    },
    {
        id: 'transferido',
        phase: "FASE 3: INTEGRAÇÃO",
        phaseColor: "bg-sky-100 text-sky-800",
        title: "TRANSFERIDO",
        type: "status",
        icon: Church,
        details: { objective: "Acolhimento de membros vindos de outra igreja. Passa por 7 encontros de discipulado para integração à cultura da IBM.", duration: "1-2 meses", responsible: "Liderança de GC", criteria: "Integração em um GC e participação no Curso de Membros." }
    },
    {
        id: 'membro',
        phase: "FASE 3: INTEGRAÇÃO",
        phaseColor: "bg-sky-100 text-sky-800",
        title: "MEMBRO",
        type: "status",
        icon: Award,
        details: { objective: "Formalização do compromisso com a igreja local.", duration: "Contínuo", responsible: "Próprio indivíduo", criteria: "Conclusão do Curso de Membros e Batismo (se aplicável)." }
    },
    {
        id: 'consolidado',
        phase: "FASE 4: DISCIPULADO",
        phaseColor: "bg-emerald-100 text-emerald-800",
        title: "CONSOLIDADO",
        type: "discipulado",
        icon: BookOpen,
        details: { objective: "Aprofundamento na fé através de cura interior, paternidade de Deus e fundamentos.", duration: "7 Encontros", responsible: "Líder de GC", criteria: "Conclusão da classe 'Cresça' (TD) e início do serviço em um ministério." }
    },
    {
        id: 'lider_treinamento',
        phase: "FASE 4: DISCIPULADO",
        phaseColor: "bg-emerald-100 text-emerald-800",
        title: "LÍDER EM TREINAMENTO",
        type: "discipulado",
        icon: Handshake,
        details: { objective: "Aprender na prática a liderar um GC, acompanhando o líder atual.", duration: "Contínuo", responsible: "Líder de GC", criteria: "Adotar um novo convertido para cuidar (discipular)." }
    },
    {
        id: 'lider_gc',
        phase: "FASE 5: LIDERANÇA",
        phaseColor: "bg-amber-100 text-amber-800",
        title: "LÍDER DE GC",
        type: "status",
        icon: Group,
        details: { objective: "Liderar um pequeno grupo, cuidar de pessoas e formar novos líderes.", duration: "Contínuo", responsible: "Supervisor de Área", criteria: "Dupla Validação (F.D.E. do Mentor + Supervisor)." }
    },
    {
        id: 'lider_area',
        phase: "FASE 5: LIDERANÇA",
        phaseColor: "bg-amber-100 text-amber-800",
        title: "LÍDER DE ÁREA",
        type: "status",
        icon: MapIcon,
        details: { objective: "Gestão de múltiplos GCs e cuidado de líderes de GC.", duration: "Contínuo", responsible: "Líder de Rede", criteria: "Resultados consistentes na multiplicação de GCs." }
    },
    {
        id: 'lider_rede',
        phase: "FASE 5: LIDERANÇA",
        phaseColor: "bg-amber-100 text-amber-800",
        title: "LÍDER DE REDE",
        type: "status",
        icon: Briefcase,
        details: { objective: "Estratégia de rede e formação de supervisores de área.", duration: "Contínuo", responsible: "Pastor", criteria: "Formação de líderes de área." }
    },
    {
        id: 'pastor',
        phase: "FASE 5: LIDERANÇA",
        phaseColor: "bg-amber-100 text-amber-800",
        title: "PASTOR",
        type: "status",
        icon: Shield,
        details: { objective: "Apascentar o rebanho e direção espiritual geral da igreja.", duration: "Contínuo", responsible: "Presbitério", criteria: "Ordenação ao ministério pastoral." }
    }
];


const mainColors = {
    status: 'border-primary text-primary',
    course: 'border-emerald-500 text-emerald-600',
    discipulado: 'border-amber-500 text-amber-600'
}

const TimelineCard = ({ item, isEven, onToggle, isExpanded, isCurrent, isFuture }) => {
    const mainColor = mainColors[item.type] || mainColors.status;
    const Icon = item.icon;

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
                                {item.subtitle && <p className="text-sm text-muted-foreground font-medium">{item.subtitle}</p>}
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
                            <p><strong className="text-foreground text-xs uppercase">Objetivo:</strong> {item.details.objective}</p>
                            <div className="grid grid-cols-2 gap-2">
                                <p><strong className="text-foreground text-xs uppercase block">Duração:</strong> {item.details.duration}</p>
                                <p><strong className="text-foreground text-xs uppercase block">Responsável:</strong> {item.details.responsible}</p>
                            </div>
                            <div className="bg-background p-3 rounded border border-border">
                                <p className="font-bold text-xs uppercase text-foreground mb-1">Critério de Avanço</p>
                                <p className={cn("font-medium", isFuture ? 'text-muted-foreground' : 'text-primary')}>{item.details.criteria}</p>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export function DiscipleshipTrail({ currentStatusId }: { currentStatusId?: string }) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleDetails = (id: string) => {
        setExpandedId(prevId => (prevId === id ? null : id));
    };

    let lastPhase = "";
    
    const effectiveStatusId = currentStatusId || 'nao_alcancado';
    const currentIndex = timelineData.findIndex(item => item.id === effectiveStatusId);

    return (
        <div className="bg-background rounded-lg p-4 md:p-8">
            <div className="max-w-5xl mx-auto px-4 py-8 relative overflow-hidden">
                <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-1 md:w-1.5 bg-slate-200 -ml-0.5 md:-ml-1 z-0 rounded-full"></div>

                <div className="space-y-4 md:space-y-0 relative">
                    {timelineData.map((item, index) => {
                        const showPhase = item.phase !== lastPhase;
                        lastPhase = item.phase;
                        const isCurrent = item.id === effectiveStatusId;
                        const isFuture = currentIndex !== -1 && index > currentIndex;

                        return (
                            <React.Fragment key={item.id}>
                                {showPhase && (
                                    <div className="md:col-span-2 flex justify-center py-4 relative z-10">
                                        <span className={cn("px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm border", item.phaseColor, isFuture && 'opacity-60 grayscale-[50%]')}>
                                            {item.phase}
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

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, Church, MapIcon, Users, Handshake, Heart, Shield, School, UserPlus, Award, BookOpen, Group, Briefcase } from 'lucide-react';


const timelineData = [
    // FASE 1
    {
        id: 1,
        phase: "FASE 1: ENTRADA E CONVERSÃO",
        phaseColor: "bg-indigo-100 text-indigo-800",
        title: "NOVO CONVERTIDO",
        type: "status",
        badges: [
            { label: "STATUS", type: "status" },
            { label: "RITMO QUINZENAL", type: "neutral" }
        ],
        icon: UserPlus,
        details: {
            objective: "Apresentação do evangelho e decisão por Cristo.",
            duration: "7 Encontros Quinzenais (~3,5 meses)",
            responsible: "Co-Líder ou Consolidador",
            criteria: "Decisão por Cristo e início do vínculo com a célula."
        }
    },
    // FASE 2
    {
        id: 2,
        phase: "FASE 2: FUNDAMENTOS",
        phaseColor: "bg-sky-100 text-sky-800",
        title: "BATISMO",
        subtitle: "Curso: Imersão",
        type: "course",
        badges: [
            { label: "CURSO IMERSÃO", type: "course" }
        ],
        icon: Shield,
        details: {
            objective: "Entendimento sobre Salvação, Batismo e Ceia.",
            duration: "1 dia (Intensivo)",
            responsible: "Liderança de Ensino",
            criteria: "Conclusão do curso e testemunho público nas águas."
        }
    },
    {
        id: 3,
        phase: "FASE 2: FUNDAMENTOS",
        phaseColor: "bg-sky-100 text-sky-800",
        title: "MEMBRO",
        subtitle: "Curso de Membros + GC Ativo",
        type: "status",
        badges: [
            { label: "STATUS", type: "status" },
            { label: "CURSO MEMBROS", type: "course" }
        ],
        icon: Award,
        details: {
            objective: "Compreensão da visão, cultura e mordomia da IBM.",
            duration: "EAD ou Mentoria",
            responsible: "Liderança GC / Ensino",
            criteria: "OBRIGATÓRIO estar ativo em um GC. Conclusão do curso."
        }
    },
    // FASE 3
    {
        id: 4,
        phase: "FASE 3: CONSOLIDAÇÃO E LIDERANÇA",
        phaseColor: "bg-emerald-100 text-emerald-800",
        title: "CONSOLIDAÇÃO",
        subtitle: "Curso: Cresça",
        type: "course",
        badges: [
            { label: "CURSO CRESÇA", type: "course" },
            { label: "RITMO MENSAL", type: "neutral" }
        ],
        icon: BookOpen,
        details: {
            objective: "Cura Interior, Paternidade de Deus e Fundamentos da Fé.",
            duration: "7 Encontros Mensais",
            responsible: "Líder de GC",
            criteria: "Começar a servir em alguma área se ainda não o faz."
        }
    },
    {
        id: 5,
        phase: "FASE 3: CONSOLIDAÇÃO E LIDERANÇA",
        phaseColor: "bg-emerald-100 text-emerald-800",
        title: "CO-LÍDER",
        subtitle: "Líder em Treinamento",
        type: "discipulado",
        badges: [
            { label: "MENTORIA", type: "discipulado" },
            { label: "PRÁTICA", type: "neutral" }
        ],
        icon: Handshake,
        details: {
            objective: "'Fazer com outros'. Acompanhar o líder de GC em tudo.",
            duration: "Contínuo",
            responsible: "Mentor: Líder de GC",
            criteria: "Adotar um 'Não Alcançado' ou Novo Convertido para cuidar."
        }
    },
    {
        id: 6,
        phase: "FASE 3: CONSOLIDAÇÃO E LIDERANÇA",
        phaseColor: "bg-emerald-100 text-emerald-800",
        title: "LÍDER 1 (DESCOBERTA)",
        subtitle: "Curso Opcional: Molde de Servo",
        type: "status",
        badges: [
            { label: "STATUS", type: "status" },
            { label: "VOCACIONAL", type: "course" }
        ],
        icon: School,
        details: {
            objective: "Descoberta de vocação específica e dons espirituais.",
            duration: "Variável",
            responsible: "Supervisão / Liderança de Ministério",
            criteria: "Ter concluído a Consolidação + Validação F.D.E (Fiel, Disponível, Ensinável)."
        }
    },
    {
        id: 7,
        phase: "FASE 3: CONSOLIDAÇÃO E LIDERANÇA",
        phaseColor: "bg-emerald-100 text-emerald-800",
        title: "LÍDER DE GC (LIDERE 2)",
        subtitle: "Pré-requisito para Liderança de Ministério",
        type: "status",
        badges: [
            { label: "STATUS", type: "status" },
            { label: "CURSO LIDERE 2", type: "course" }
        ],
        icon: Group,
        details: {
            objective: "Liderar um pequeno grupo e formar novos discípulos.",
            duration: "7 Encontros Mensais",
            responsible: "Supervisor de Área",
            criteria: "Dupla Validação (F.D.E. do Mentor + Supervisor). Obrigatório para liderar Ministérios de Alcance."
        }
    },
    // FASE 4
    {
        id: 8,
        phase: "FASE 4: SUPERVISÃO E GESTÃO",
        phaseColor: "bg-purple-100 text-purple-800",
        title: "LÍDER DE ÁREA",
        subtitle: "Curso: Supervisione 1",
        type: "status",
        badges: [
            { label: "STATUS", type: "status" },
            { label: "GESTÃO", type: "course" }
        ],
        icon: MapIcon,
        details: {
            objective: "Gestão de múltiplos GCs e cuidado de líderes.",
            duration: "7 Encontros Mensais",
            responsible: "Líder de Rede",
            criteria: "Resultados consistentes na multiplicação de GCs."
        }
    },
    {
        id: 9,
        phase: "FASE 4: SUPERVISÃO E GESTÃO",
        phaseColor: "bg-purple-100 text-purple-800",
        title: "LÍDER DE REDE",
        subtitle: "Curso: Supervisione 2",
        type: "status",
        badges: [
            { label: "STATUS", type: "status" },
            { label: "ESTRATÉGIA", type: "course" }
        ],
        icon: Briefcase,
        details: {
            objective: "Estratégia de rede e formação de supervisores.",
            duration: "7 Encontros Mensais",
            responsible: "Pastor",
            criteria: "Formação de líderes de área."
        }
    },
    {
        id: 10,
        phase: "FASE 4: SUPERVISÃO E GESTÃO",
        phaseColor: "bg-purple-100 text-purple-800",
        title: "PASTOR",
        subtitle: "Curso: Avance (Teológico)",
        type: "status",
        badges: [
            { label: "ORDENAÇÃO", type: "status" },
            { label: "TEOLOGIA", type: "course" }
        ],
        icon: Church,
        details: {
            objective: "Apascentar o rebanho e direção espiritual.",
            duration: "Contínuo",
            responsible: "Presbitério",
            criteria: "Discipulado Mensal Contínuo (sem prazo de término)."
        }
    }
];

const badgeColors = {
    status: "bg-primary/10 text-primary border-primary/20",
    course: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    discipulado: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    neutral: "bg-muted text-muted-foreground"
};

const mainColors = {
    status: 'border-primary text-primary',
    course: 'border-emerald-500 text-emerald-600',
    discipulado: 'border-amber-500 text-amber-600'
}

const TimelineCard = ({ item, isEven, onToggle, isExpanded }) => {
    const mainColor = mainColors[item.type] || mainColors.status;
    const Icon = item.icon;

    return (
        <div className={cn("md:grid md:grid-cols-2 w-full")}>
            <div className={cn(
                "pl-12 md:pl-0 py-2 relative group",
                isEven ? 'md:text-right pr-8' : 'md:text-left pl-8 md:col-start-2'
            )}>
                 <div className={cn("absolute top-6 w-4 h-4 rounded-full bg-background border-4 z-20 shadow-sm group-hover:scale-125 transition-transform duration-300", mainColor, isEven ? 'md:-right-2 -left-[9px]' : 'md:-left-2 -left-[9px]')}></div>
                <div className={cn("hidden md:block absolute top-7 w-8 h-1 bg-slate-200 group-hover:bg-slate-300 transition-colors", isEven ? 'right-0' : 'left-0')}></div>
                
                <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden relative" onClick={() => onToggle(item.id)}>
                    <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", mainColor.split(' ')[0].replace('border-', 'bg-'))}></div>
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                             <div className={cn("flex-1", isEven ? 'md:order-1' : '')}>
                                <div className={cn("flex items-center gap-2", isEven ? 'md:flex-row-reverse' : '')}>
                                    <h3 className="font-bold text-base text-foreground">{item.title}</h3>
                                    <Icon className={cn("size-5", mainColor.split(' ')[1])} />
                                </div>
                                {item.subtitle && <p className="text-sm text-muted-foreground font-medium">{item.subtitle}</p>}
                            </div>
                        </div>
                        <div className={cn("flex flex-wrap gap-2 mt-3", isEven ? 'md:justify-end' : 'justify-start')}>
                            {item.badges.map(badge => (
                                <Badge key={badge.label} variant="outline" className={cn("text-xs", badgeColors[badge.type])}>{badge.label}</Badge>
                            ))}
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
                                <p className="font-medium text-primary">{item.details.criteria}</p>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export function DiscipleshipTrail() {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const toggleDetails = (id: number) => {
        setExpandedId(prevId => (prevId === id ? null : id));
    };

    let lastPhase = "";

    return (
        <div className="bg-background rounded-lg p-4 md:p-8">
            <div className="max-w-5xl mx-auto px-4 py-8 relative overflow-hidden">
                <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-1 md:w-1.5 bg-slate-200 -ml-0.5 md:-ml-1 z-0 rounded-full"></div>

                <div className="space-y-4 md:space-y-0 relative">
                    {timelineData.map((item, index) => {
                        const showPhase = item.phase !== lastPhase;
                        lastPhase = item.phase;
                        return (
                            <React.Fragment key={item.id}>
                                {showPhase && (
                                    <div className="md:col-span-2 flex justify-center py-4 relative z-10">
                                        <span className={cn("px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm border", item.phaseColor)}>
                                            {item.phase}
                                        </span>
                                    </div>
                                )}
                                <TimelineCard
                                    item={item}
                                    isEven={index % 2 === 0}
                                    onToggle={toggleDetails}
                                    isExpanded={expandedId === item.id}
                                />
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

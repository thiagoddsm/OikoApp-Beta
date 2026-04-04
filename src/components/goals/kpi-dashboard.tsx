'use client';
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, CheckSquare, Crosshair, UserPlus, GraduationCap, Pencil } from 'lucide-react';
import { EditGoalDialog } from '@/components/goals/edit-goal-dialog';

const kpiDefinitions: Record<string, { title: string; icon: React.ElementType }> = {
    'celulas': { title: 'Número de Células', icon: Users },
    'frequencia_culto': { title: 'Frequência Média no Culto', icon: CheckSquare },
    'conversoes': { title: 'Conversões', icon: UserPlus },
    'batismos': { title: 'Batismos', icon: Crosshair },
    'novos_lideres': { title: 'Formação de Novos Líderes', icon: GraduationCap },
};

interface KpiCardProps {
    kpi: string;
    goal: any;
    actualData: any;
}

function KpiCard({ kpi, goal, actualData }: KpiCardProps) {
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);

    const kpiInfo = kpiDefinitions[kpi] || { title: 'KPI Desconhecido', icon: TrendingUp };
    const { title, icon: Icon } = kpiInfo;
    
    const target = goal?.target || 0;
    const actual = actualData?.actual || 0;
    const progress = target > 0 ? (actual / target) * 100 : 0;

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Icon className="size-5" />
                            {title}
                        </CardTitle>
                        <CardDescription>Meta Anual: {target.toLocaleString('pt-BR')}</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setEditDialogOpen(true)}>
                        <Pencil className="size-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-sm font-medium">
                    <span>Realizado: {Math.round(actual).toLocaleString('pt-BR')}</span>
                    <span className={`${progress >= 100 ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {progress.toFixed(1)}%
                    </span>
                </div>
                <Progress value={progress} />

                <div className="h-40">
                   <p>Gráfico temporariamente indisponível.</p>
                </div>
            </CardContent>
            {isEditDialogOpen && (
                <EditGoalDialog 
                    open={isEditDialogOpen}
                    onOpenChange={setEditDialogOpen}
                    kpi={kpi}
                    title={title}
                    year={goal?.year || new Date().getFullYear()}
                    existingGoal={goal}
                />
            )}
        </Card>
    );
}

interface KpiDashboardProps {
    goals: any[];
    kpiData: Record<string, any>;
    year: number;
}

export default function KpiDashboard({ goals, kpiData, year }: KpiDashboardProps) {
    const goalsMap = useMemo(() => {
        const map = new Map<string, any>();
        if (goals) {
            goals.forEach((goal: any) => {
                if (goal.year === year) {
                    map.set(goal.kpi, goal);
                }
            });
        }
        return map;
    }, [goals, year]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.keys(kpiDefinitions).map(kpi => (
                    <KpiCard
                        key={kpi}
                        kpi={kpi}
                        goal={goalsMap.get(kpi)}
                        actualData={kpiData[kpi]}
                    />
                ))}
            </div>
        </div>
    );
}

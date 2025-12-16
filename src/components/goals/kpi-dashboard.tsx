
'use client';
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Users, TrendingUp, CheckSquare, Crosshair, UserPlus, GraduationCap, Pencil } from 'lucide-react';
import { EditGoalDialog } from '@/components/goals/edit-goal-dialog';

const kpiDefinitions = {
    'celulas': { title: 'Número de Células', icon: Users },
    'frequencia_culto': { title: 'Frequência Média no Culto', icon: CheckSquare },
    'conversoes': { title: 'Conversões', icon: UserPlus },
    'batismos': { title: 'Batismos', icon: Crosshair },
    'novos_lideres': { title: 'Formação de Novos Líderes', icon: GraduationCap },
};

const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function KpiCard({ kpi, goal, actualData }) {
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);

    const { title, icon: Icon } = kpiDefinitions[kpi] || { title: 'KPI Desconhecido', icon: TrendingUp };
    const target = goal?.target || 0;
    const actual = actualData?.actual || 0;
    const progress = target > 0 ? (actual / target) * 100 : 0;
    
    const monthlyTarget = target > 0 ? Math.round(target / 12) : 0;

    const chartData = useMemo(() => 
        monthLabels.map((month, index) => ({
            name: month,
            meta: goal?.monthlyTargets?.[index] || monthlyTarget,
            realizado: actualData?.monthlyActuals?.[index] || 0,
        }))
    , [goal, actualData, monthlyTarget]);

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
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
                            <Tooltip
                                cursor={{ fill: 'hsla(var(--muted))' }}
                                contentStyle={{
                                    background: 'hsl(var(--background))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: 'var(--radius)',
                                }}
                            />
                            <Bar dataKey="meta" name="Meta" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="realizado" name="Realizado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
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


export default function KpiDashboard({ goals, kpiData, year }) {
    const goalsMap = useMemo(() => {
        const map = new Map();
        goals.forEach(goal => {
            if (goal.year === year) {
                map.set(goal.kpi, goal);
            }
        });
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

'use client';
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Users,
  TrendingUp,
  CheckSquare,
  Crosshair,
  UserPlus,
  GraduationCap,
  Pencil,
  Settings2,
} from 'lucide-react';
import { EditGoalDialog } from '@/components/goals/edit-goal-dialog';
import { KpiSettingsDialog } from '@/components/goals/kpi-settings-dialog';
import { KpiDefinition } from '@/domain/kpi';

const ICON_MAP: Record<string, React.ElementType> = {
  Users,
  CheckSquare,
  UserPlus,
  Crosshair,
  GraduationCap,
  TrendingUp,
};

interface KpiCardProps {
  kpiDef: KpiDefinition;
  goal: any;
  actualData: any;
}

function KpiCard({ kpiDef, goal, actualData }: KpiCardProps) {
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);

  const Icon = ICON_MAP[kpiDef.iconName] || TrendingUp;
  const title = kpiDef.name;
  const target = goal?.target || 0;
  const actual = actualData?.actual || 0;
  const progress = target > 0 ? (actual / target) * 100 : 0;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Icon className="size-5 text-primary" />
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
          <span className={`${progress >= 100 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-muted-foreground'}`}>
            {progress.toFixed(1)}%
          </span>
        </div>
        <Progress value={progress} />

        <div className="h-20 flex items-center justify-center border border-dashed rounded-md bg-muted/20">
          <p className="text-xs text-muted-foreground">Histórico mensal disponível nos relatórios.</p>
        </div>
      </CardContent>

      {isEditDialogOpen && (
        <EditGoalDialog
          open={isEditDialogOpen}
          onOpenChange={setEditDialogOpen}
          kpi={kpiDef.id}
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
  kpiDefinitions: KpiDefinition[];
  kpiData: Record<string, any>;
  courses: any[];
  year: number;
}

export default function KpiDashboard({
  goals,
  kpiDefinitions,
  kpiData,
  courses,
  year,
}: KpiDashboardProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const goalsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (goals) {
      goals.forEach((goal: any) => {
        if (goal.year === year) {
          map.set(goal.kpiId || goal.kpi, goal);
        }
      });
    }
    return map;
  }, [goals, year]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Painel de Metas e KPIs ({year})</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe o desempenho anual da sua instituição com indicadores personalizáveis.
          </p>
        </div>
        <Button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2">
          <Settings2 className="size-4" />
          Gerenciar KPIs
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(kpiDefinitions || []).map(kpiDef => (
          <KpiCard
            key={kpiDef.id}
            kpiDef={kpiDef}
            goal={goalsMap.get(kpiDef.id)}
            actualData={kpiData?.[kpiDef.id]}
          />
        ))}
      </div>

      {isSettingsOpen && (
        <KpiSettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          kpiDefinitions={kpiDefinitions}
          courses={courses}
        />
      )}
    </div>
  );
}

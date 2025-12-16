
'use client';

import React, { useMemo } from 'react';
import { useFirebase, useCollection } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Users, UserCheck, UserPlus, TrendingUp, Bell, Activity, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

type User = {
  id: string;
  name: string;
  avatar?: string;
  integrationStatus?: string;
  absenceCount?: number;
};
type AttendanceReport = {
  id: string;
  cellId: string;
  conversoes?: number;
  date: Timestamp;
  leaderId: string;
};
type Cell = {
  id: string;
  nome: string;
  liderId: string;
};
type CultoRegistro = {
  id: string;
  adultos: number;
  criancas?: number;
  data: Timestamp;
};

const chartConfig = {
  total: {
    label: "Presença",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { user } = useFirebase();

  // Data fetching
  const { data: users, isLoading: loadingUsers } = useCollection<User>('users');
  const { data: reports, isLoading: loadingReports } = useCollection<AttendanceReport>('attendance_reports', [], [{field: 'date', direction: 'desc'}]);
  const { data: cells, isLoading: loadingCells } = useCollection<Cell>('cells');
  const { data: cultos, isLoading: loadingCultos } = useCollection<CultoRegistro>(
    user ? `cultos/${user.uid}/registros` : null,
    [],
    [{ field: 'data', direction: 'desc' }],
    8
  );
  
  const isLoading = loadingUsers || loadingReports || loadingCells || loadingCultos;

  // Memoized calculations
  const kpiCards = useMemo(() => {
    const totalMembers = users?.length || 0;
    const newVisitors = users?.filter(u => u.integrationStatus === 'visitante_culto' || u.integrationStatus === 'visitante_celula').length || 0;
    const conversions = reports?.reduce((sum, report) => sum + (report.conversoes || 0), 0) || 0;
    const avgAttendance = cultos && cultos.length > 0
      ? Math.round(cultos.reduce((sum, culto) => sum + culto.adultos + (culto.criancas || 0), 0) / cultos.length)
      : 0;

    return [
      { title: "Total de Membros", value: totalMembers, icon: Users },
      { title: "Presença Média Culto", value: avgAttendance, icon: UserCheck },
      { title: "Novos Visitantes", value: newVisitors, icon: UserPlus },
      { title: "Conversões (GCs)", value: conversions, icon: TrendingUp },
    ];
  }, [users, reports, cultos]);

  const attendanceData = useMemo(() => {
    if (!cultos) return [];
    return [...cultos].reverse().map(culto => {
        const date = culto.data?.toDate ? culto.data.toDate() : new Date();
        return {
            name: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }),
            total: culto.adultos + (culto.criancas || 0)
        }
    });
  }, [cultos]);
  
  const careAlerts = useMemo(() => {
      if (!users) return [];
      // Simple logic: users with absenceCount > 1
      return users.filter(u => u.absenceCount && u.absenceCount > 1).slice(0, 3);
  }, [users]);
  
  const leaderActivity = useMemo(() => {
    if (!cells || !users || !reports) return [];
    const userMap = new Map(users.map(u => [u.id, u]));

    return cells.slice(0,3).map(cell => {
      const leader = userMap.get(cell.liderId);
      const lastReport = reports.find(r => r.cellId === cell.id);
      
      let reportStatus: 'on-time' | 'late' | 'missing' = 'missing';
      let lastReportDate = 'Nenhum relatório';

      if (lastReport && lastReport.date) {
        const reportDate = lastReport.date.toDate();
        const daysSinceReport = (new Date().getTime() - reportDate.getTime()) / (1000 * 3600 * 24);
        lastReportDate = formatDistanceToNow(reportDate, { addSuffix: true, locale: ptBR });
        
        if (daysSinceReport <= 7) reportStatus = 'on-time';
        else if (daysSinceReport <= 14) reportStatus = 'late';
        else reportStatus = 'missing';
      }

      return {
        id: cell.liderId,
        name: leader?.name || 'Líder não encontrado',
        avatar: leader?.avatar || 'avatar-1',
        cellName: cell.nome,
        lastReport: lastReportDate,
        reportStatus: reportStatus
      };
    });
  }, [cells, users, reports]);


  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                Dados atualizados do Firestore
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral da Presença (Cultos)</CardTitle>
            <CardDescription>Presença total nas últimas 8 semanas</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart accessibilityLayer data={attendanceData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value}
                />
                <YAxis allowDecimals={false} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="total" fill="var(--color-total)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Avisos de Cuidado
            </CardTitle>
            <CardDescription>Membros com 2 ou mais ausências registradas.</CardDescription>
          </CardHeader>
          <CardContent>
            {careAlerts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membro</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ausências</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {careAlerts.map((member) => {
                      const avatar = PlaceHolderImages.find(p => p.id === member.avatar);
                      return (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                {avatar && <AvatarImage src={avatar.imageUrl} alt={avatar.description} />}
                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="font-medium">{member.name}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={member.integrationStatus === 'membro' ? 'default' : 'secondary'}>
                              {member.integrationStatus?.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{member.absenceCount} semanas</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
            ) : (
              <div className="flex items-center justify-center h-40 text-center text-muted-foreground">
                <p>Nenhum alerta de cuidado no momento. <br/> Bom trabalho!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Atividade dos Líderes de GC
          </CardTitle>
          <CardDescription>Acompanhe o envio de relatórios dos líderes de célula.</CardDescription>
        </CardHeader>
        <CardContent>
           {leaderActivity.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Líder</TableHead>
                    <TableHead>Célula</TableHead>
                    <TableHead>Último Relatório</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderActivity.map((leader) => {
                    const avatar = PlaceHolderImages.find(p => p.id === leader.avatar);
                    const statusVariant = {
                      'on-time': 'secondary',
                      'late': 'outline',
                      'missing': 'destructive'
                    } as const;
                    const statusText = {
                      'on-time': 'Em dia',
                      'late': 'Atrasado',
                      'missing': 'Pendente'
                    };
                    return (
                      <TableRow key={leader.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                             <Avatar className="h-8 w-8">
                                {avatar && <AvatarImage src={avatar.imageUrl} alt={avatar.description} />}
                                <AvatarFallback>{leader.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            <span className="font-medium">{leader.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{leader.cellName}</TableCell>
                        <TableCell className="text-muted-foreground">{leader.lastReport}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={statusVariant[leader.reportStatus]}>{statusText[leader.reportStatus]}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
                 <div className="flex items-center justify-center h-40 text-center text-muted-foreground">
                    <p>Nenhuma atividade de líder para mostrar. <br/> Verifique se há células e relatórios cadastrados.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

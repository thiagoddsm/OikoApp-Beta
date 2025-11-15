"use client";

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
import { Users, UserCheck, UserPlus, TrendingUp, Bell, Activity } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { overviewData, attendanceData, careAlerts, leaderActivity } from "@/lib/data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";

const chartConfig = {
  Total: {
    label: "Presença",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const kpiCards = [
    { title: "Total de Membros", value: overviewData.totalMembers, icon: Users, change: "+5%", changeType: 'increase' },
    { title: "Presença Média", value: overviewData.avgAttendance, icon: UserCheck, change: "+2%", changeType: 'increase' },
    { title: "Novos Visitantes", value: overviewData.newVisitors, icon: UserPlus, change: "+10%", changeType: 'increase' },
    { title: "Conversões", value: overviewData.conversions, icon: TrendingUp, change: "+1", changeType: 'increase' },
  ];

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
                <span className={cn("font-semibold", card.changeType === 'increase' ? 'text-emerald-600' : 'text-red-600')}>
                  {card.change}
                </span>{" "}
                do último mês
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral da Presença</CardTitle>
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
                  tickFormatter={(value) => value.slice(0, 5)}
                />
                <YAxis />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="Total" fill="var(--color-Total)" radius={4} />
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
            <CardDescription>Membros ausentes por 2 ou mais semanas.</CardDescription>
          </CardHeader>
          <CardContent>
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
                        <Badge variant={member.status === 'membro' ? 'default' : 'secondary'}>
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{member.absenceCount} semanas</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Atividade dos Líderes
          </CardTitle>
          <CardDescription>Acompanhe o envio de relatórios dos líderes de célula.</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}

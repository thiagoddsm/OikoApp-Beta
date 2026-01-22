
'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, Legend, Line, ComposedChart, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Users, Wallet, AlertTriangle, DoorOpen } from 'lucide-react';
import { ChartContainer } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';

const kpiData = [
  { title: "Alunos Ativos", value: "142", change: "+12%", changeColor: "text-green-600", icon: Users, iconColor: "text-blue-600", bgColor: "bg-blue-100" },
  { title: "Receita Mensal (Est.)", value: "R$ 18.450", change: "Baseado nas matrículas", changeColor: "text-gray-500", icon: Wallet, iconColor: "text-green-600", bgColor: "bg-green-100" },
  { title: "Inadimplência", value: "8%", change: "11 alunos pendentes", changeColor: "text-red-500", icon: AlertTriangle, iconColor: "text-red-600", bgColor: "bg-red-100" },
  { title: "Salas Ocupadas (Agora)", value: "4/6", change: "Alta demanda 18h-20h", changeColor: "text-yellow-600", icon: DoorOpen, iconColor: "text-yellow-600", bgColor: "bg-yellow-100" },
];

const financeChartData = [
  { name: 'Mai', Receita: 15000, Despesa: 12000, Lucro: 3000 },
  { name: 'Jun', Receita: 15500, Despesa: 12500, Lucro: 3000 },
  { name: 'Jul', Receita: 14800, Despesa: 13000, Lucro: 1800 },
  { name: 'Ago', Receita: 16200, Despesa: 12800, Lucro: 3400 },
  { name: 'Set', Receita: 17500, Despesa: 13500, Lucro: 4000 },
  { name: 'Out', Receita: 18450, Despesa: 14000, Lucro: 4450 },
];

const disciplineChartData = [
  { name: 'Piano', value: 35 },
  { name: 'Violão', value: 45 },
  { name: 'Bateria', value: 25 },
  { name: 'Canto', value: 30 },
  { name: 'Teoria', value: 15 },
];
const COLORS = ['#6750A4', '#8A75B5', '#AE9CCE', '#D1C4E7', '#F2F0F7'];

const roomData = [
    { name: 'Sala 1', instrument: 'Piano', status: 'Ocupada', professor: 'Prof. Ana', color: 'red' },
    { name: 'Sala 2', instrument: 'Violão', status: 'Livre', professor: null, color: 'green' },
    { name: 'Sala 3', instrument: 'Bateria', status: 'Ocupada', professor: 'Prof. Carlos', color: 'red' },
    { name: 'Sala 4', instrument: 'Canto', status: 'Livre', professor: null, color: 'green' },
    { name: 'Sala 5', instrument: 'Teoria', status: 'Livre', professor: null, color: 'green' },
    { name: 'Sala 6', instrument: 'Manutenção', status: 'Indisponível', professor: null, color: 'gray' },
];


export function WaveAdminDashboard() {
  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((item, index) => {
          const Icon = item.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                <div className={`p-2 ${item.bgColor} rounded-full`}>
                    <Icon className={`w-5 h-5 ${item.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.value}</div>
                <p className={`text-xs ${item.changeColor}`}>{item.change}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Fluxo de Caixa (Semestral)</CardTitle>
            <CardDescription>Comparativo entre receita, despesa e lucro líquido.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
             <ChartContainer config={{}} className="h-[300px] w-full">
                <ComposedChart data={financeChartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(value) => `R$${value/1000}k`} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                    <Legend />
                    <Bar dataKey="Receita" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Despesa" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="Lucro" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Distribuição por Disciplina</CardTitle>
                <CardDescription>Popularidade dos cursos com base nos alunos matriculados.</CardDescription>
            </CardHeader>
             <CardContent>
                <ChartContainer config={{}} className="h-[300px] w-full">
                    <PieChart>
                        <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                        <Legend />
                        <Pie
                            data={disciplineChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            innerRadius={60}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                        >
                            {disciplineChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>
      
       {/* Management Section */}
       <Card>
            <CardHeader>
                <CardTitle>Gestão Operacional</CardTitle>
                <CardDescription>Ocupação das salas e outras ferramentas de gestão.</CardDescription>
            </CardHeader>
            <CardContent>
                 <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 tracking-wider">Ocupação de Salas - Hoje</h4>
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {roomData.map((room) => {
                        const isOccupied = room.status === 'Ocupada';
                        const isMaintenance = room.status === 'Indisponível';
                        const colorClass = isMaintenance ? 'gray' : isOccupied ? 'red' : 'green';

                        return (
                            <Card key={room.name} className={`bg-${colorClass}-50 border-${colorClass}-200`}>
                                <CardHeader className="flex flex-row justify-between items-start p-3 pb-2">
                                    <CardTitle className={`text-sm font-bold text-gray-700`}>{room.name}</CardTitle>
                                    <div className={`w-2.5 h-2.5 rounded-full bg-${colorClass}-500 mt-1`}></div>
                                </CardHeader>
                                <CardContent className="p-3 pt-0">
                                    <p className="text-xs text-gray-500 mt-1">{room.instrument}</p>
                                    <Badge variant="outline" className={`text-xs font-semibold mt-2 bg-white`}>
                                        {room.status}
                                    </Badge>
                                </CardContent>
                            </Card>
                        )
                    })}
                 </div>
            </CardContent>
       </Card>

    </div>
  );
}

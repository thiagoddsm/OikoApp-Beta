'use client';
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection, useMemoFirebase } from '@/firebase';
import { useFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

type PatrimonioItem = {
    id: string;
    name: string;
    category: string;
    status: 'Disponível' | 'Emprestado' | 'Manutenção';
};

const KPI_CARDS = [
  { title: "Total de Itens", status: 'total', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { title: "Emprestados", status: 'Emprestado', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  { title: "Manutenção", status: 'Manutenção', color: 'text-red-600', bgColor: 'bg-red-50' },
];

const COLORS = ['#16a34a', '#facc15', '#dc2626', '#6b7280']; // green, yellow, red, gray


export function PatrimonyDashboardView() {
    const { firestore } = useFirebase();
    const patrimonioQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'patrimonio')) : null, [firestore]);
    const { data: items, isLoading } = useCollection<PatrimonioItem>(patrimonioQuery);

    const dashboardData = useMemo(() => {
        const kpis: Record<string, number> = {
            total: items?.length || 0,
            'Disponível': items?.filter(i => i.status === 'Disponível').length || 0,
            'Emprestado': items?.filter(i => i.status === 'Emprestado').length || 0,
            'Manutenção': items?.filter(i => i.status === 'Manutenção').length || 0,
        };

        const categoryDistribution = items?.reduce((acc, item) => {
            acc[item.category] = (acc[item.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const categoryData = Object.entries(categoryDistribution || {}).map(([name, value]) => ({ name, value }));
        
        const statusDistribution = [
            { name: 'Disponível', value: kpis['Disponível'] },
            { name: 'Emprestado', value: kpis['Emprestado'] },
            { name: 'Manutenção', value: kpis['Manutenção'] },
        ];


        return { kpis, categoryData, statusDistribution };
    }, [items]);

     if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {KPI_CARDS.map(kpi => (
                    <Card key={kpi.status} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                             <div className={`p-2 rounded-lg ${kpi.bgColor} ${kpi.color}`}>📦</div>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-3xl font-bold ${kpi.color}`}>
                                {dashboardData.kpis[kpi.status as keyof typeof dashboardData.kpis] ?? 0}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Distribuição por Categoria</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={dashboardData.categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                                    {dashboardData.categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Status do Inventário</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                       <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={dashboardData.statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} label>
                                     {dashboardData.statusDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

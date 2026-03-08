
'use client';
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useCollection, useMemoFirebase } from '@/firebase';
import { useFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

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

const PIE_COLORS = ['#6750A4', '#9A89C6', '#BDB2D9', '#D9D3E9', '#F2F0F7'];

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

        if (!items) return { kpis, categoryData: [], statusData: [] };

        const categoryCounts = items.reduce((acc, item) => {
            acc[item.category] = (acc[item.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));
        
        const statusData = [
            { name: 'Disponível', value: kpis['Disponível'] },
            { name: 'Emprestado', value: kpis['Emprestado'] },
            { name: 'Manutenção', value: kpis['Manutenção'] },
        ];
        
        return { kpis, categoryData, statusData };
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
                                {dashboardData.kpis[kpi.status] ?? 0}
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
                                <Pie
                                    data={dashboardData.categoryData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                >
                                     {dashboardData.categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
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
                            <BarChart data={dashboardData.statusData} layout="vertical" margin={{ left: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" hide />
                                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                <Bar dataKey="value" name="Quantidade" radius={[0, 4, 4, 0]} barSize={30} fill="hsl(var(--primary))" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

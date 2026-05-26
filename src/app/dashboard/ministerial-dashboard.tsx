"use client";
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Users, Calendar, UserPlus, ArrowRight, AlertTriangle, Plus, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, Timestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

type User = { id: string; name: string; avatar?: string; integrationStatus?: string; absenceCount?: number; createdAt?: any; };
type CultoRegistro = { id: string; adultos: number; criancas?: number; data: any; };
type Cell = { id: string; nome: string; };

const KpiCard = ({ title, value, percentage, icon: Icon, children, up }: any) => (
    <Card className="bg-white border-none shadow-sm rounded-2xl hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-2 flex-row items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Icon className="size-5" />
                <span>{title}</span>
            </div>
            {percentage && (
                 <div className={`flex items-center gap-1 text-xs font-bold ${up ? 'text-emerald-500' : 'text-red-500'}`}>
                    {up ? `+${percentage}%` : `-${percentage}%`}
                </div>
            )}
        </CardHeader>
        <CardContent>
             <p className="text-4xl font-bold text-slate-800 mb-2">{value}</p>
            {children}
        </CardContent>
    </Card>
);

const SimpleKpiCard = ({ title, value, icon: Icon, footer, link }: any) => (
     <Card className="bg-white border-none shadow-sm rounded-2xl hover:shadow-lg transition-shadow duration-300 p-6 flex flex-col justify-between">
        <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                 <Icon className="size-5" />
                <span>{title}</span>
            </div>
            <p className="text-5xl font-bold text-slate-800 mt-4">{value}</p>
        </div>
        {footer && <p className="text-xs text-slate-400 mt-2">{footer}</p>}
        {link &&  <a href="#" className="text-xs font-bold text-indigo-600 mt-4 flex items-center gap-1 group">
                     {link} <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform"/>
                  </a>}
    </Card>
)

const PresenceChart = ({ data }: { data: any[] }) => (
    <Card className="bg-white border-none shadow-sm rounded-2xl col-span-1 lg:col-span-2">
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="text-lg font-bold text-slate-800">Visão Geral de Presença</CardTitle>
                    <CardDescription>Estatísticas comparativas por período</CardDescription>
                </div>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-full">
                     <Button size="sm" variant="ghost" className="bg-white shadow rounded-full font-bold text-indigo-600 hover:bg-white">Mês</Button>
                     <Button size="sm" variant="ghost" className="rounded-full font-medium text-slate-500 hover:bg-slate-200" disabled>Semana</Button>
                </div>
            </div>
        </CardHeader>
        <CardContent className="h-[350px] w-full p-2">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="mainChartFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 0" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}}/>
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} width={30}/>
                    <Tooltip contentStyle={{ borderRadius: '12px', borderColor: '#e5e7eb', color: '#334155' }} cursor={{ stroke: '#4F46E5', strokeWidth: 1, strokeDasharray: '3 3' }}/>
                    <Area type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2.5} fill="url(#mainChartFill)" />
                </AreaChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>
);

const AlertsPanel = ({ alerts }: { alerts: User[] }) => (
    <Card className="bg-white border-none shadow-sm rounded-2xl relative flex flex-col h-full">
        <Button variant="ghost" className="absolute top-4 right-4 bg-red-500/10 text-red-500 rounded-full h-6 w-6 p-0"><AlertTriangle size={14} /></Button>
        <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">Alertas de Cuidado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 flex-1 px-4">
            {alerts.length > 0 ? alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between hover:bg-slate-50 p-2 rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 relative">
                           <span className="absolute bottom-0 -right-1 block h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-white" />
                            <AvatarImage src={`https://i.pravatar.cc/150?u=${alert.id}`} alt={alert.name} />
                            <AvatarFallback>{alert.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-sm text-slate-700">{alert.name}</p>
                            <p className="text-xs text-red-500 font-bold">{alert.absenceCount} semanas ausente</p>
                        </div>
                    </div>
                    <ChevronRight className="text-slate-400" size={18}/>
                </div>
            )) : (
                 <div className="text-center flex-1 flex flex-col justify-center items-center py-10 text-sm text-slate-500">
                    <p>Nenhum alerta de cuidado no momento. <br/> Bom trabalho!</p>
                </div>
            )}
        </CardContent>
        <div className="p-4 mt-auto">
             <Button variant="link" className="w-full text-indigo-600 font-bold hover:bg-indigo-50">
                Ver Todos os Alertas
            </Button>
        </div>
         <button className="absolute -bottom-5 right-5 h-16 w-16 bg-indigo-600 rounded-full text-white shadow-lg hover:bg-indigo-700 transition-transform hover:scale-105 active:scale-95 flex items-center justify-center">
            <Plus size={28} />
        </button>
    </Card>
);

const TrainingCard = () => (
    <div className="bg-[#0D1743] p-6 rounded-2xl shadow-lg">
        <h3 className="font-bold text-white text-md">Treinamento OikoApp</h3>
        <p className="text-sm text-slate-300 mt-2 mb-4">Aprenda a usar os novos filtros de exportação financeira.</p>
        <a href="#" className="font-bold text-indigo-400 text-sm flex items-center gap-2 group">
            Assistir agora <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
        </a>
    </div>
);

export function MinisterialDashboard() {
    const { firestore } = useFirebase();

    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const registrosPresencaQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'registros_de_presenca')) : null, [firestore]);
    const cellsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'cells')) : null, [firestore]);

    const { data: users, isLoading: loadingUsers } = useCollection<User>(usersQuery);
    const { data: allRegistrosPresenca, isLoading: loadingRegistros } = useCollection<CultoRegistro>(registrosPresencaQuery);
    const { data: cells, isLoading: loadingCells } = useCollection<Cell>(cellsQuery);

    const isLoading = loadingUsers || loadingRegistros || loadingCells;
    const currentYear = new Date().getFullYear();
    const monthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const kpiData = useMemo(() => {
        const totalMembers = users?.length || 0;
        
        const totalAttendanceSum = allRegistrosPresenca?.reduce((sum, c) => sum + (c.adultos || 0) + (c.criancas || 0), 0) || 0;
        const avgAttendance = allRegistrosPresenca && allRegistrosPresenca.length > 0 
            ? Math.round(totalAttendanceSum / allRegistrosPresenca.length) 
            : 0;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newVisitors = users?.filter(u => {
            const createdAtDate = u.createdAt instanceof Timestamp 
                ? u.createdAt.toDate() 
                : u.createdAt?.seconds 
                    ? new Date(u.createdAt.seconds * 1000) 
                    : null;
            return (
                u.integrationStatus === 'nao_alcancado' || 
                u.integrationStatus === 'novo_convertido' ||
                (createdAtDate && createdAtDate >= thirtyDaysAgo)
            );
        }).length || 0;

        const activeGroups = cells?.length || 0;

        return { totalMembers, newVisitors, avgAttendance, activeGroups };
    }, [users, allRegistrosPresenca, cells]);

    const chartData = useMemo(() => {
        const monthlySum = Array(12).fill(0);
        const monthlyCount = Array(12).fill(0);

        allRegistrosPresenca?.forEach(culto => {
            const date = culto.data instanceof Timestamp 
                ? culto.data.toDate() 
                : culto.data?.seconds 
                    ? new Date(culto.data.seconds * 1000) 
                    : null;
            if (date && date.getFullYear() === currentYear) {
                const m = date.getMonth();
                monthlySum[m] += (culto.adultos || 0) + (culto.criancas || 0);
                monthlyCount[m] += 1;
            }
        });

        const mainChartData = monthsShort.map((month, index) => {
            const avg = monthlyCount[index] > 0 ? Math.round(monthlySum[index] / monthlyCount[index]) : 0;
            return {
                month,
                value: avg
            };
        });

        const hasRealData = mainChartData.some(d => d.value > 0);
        const presenceData = hasRealData ? mainChartData : [
            { month: 'Jan', value: 0 }, { month: 'Fev', value: 0 }, { month: 'Mar', value: 0 },
            { month: 'Abr', value: 0 }, { month: 'Mai', value: 0 }, { month: 'Jun', value: 0 }, { month: 'Jul', value: 0 },
        ];

        const memberTrend = Array(6).fill(0).map((_, i) => {
            const limitDate = new Date();
            limitDate.setMonth(limitDate.getMonth() - (5 - i));
            const count = users?.filter(u => {
                const created = u.createdAt instanceof Timestamp 
                    ? u.createdAt.toDate() 
                    : u.createdAt?.seconds 
                        ? new Date(u.createdAt.seconds * 1000) 
                        : null;
                return !created || created <= limitDate;
            }).length || 0;
            return { v: count };
        });

        const attendanceTrend = allRegistrosPresenca 
            ? [...allRegistrosPresenca]
                .sort((a, b) => {
                    const da = a.data instanceof Timestamp ? a.data.toDate() : new Date();
                    const db = b.data instanceof Timestamp ? b.data.toDate() : new Date();
                    return da.getTime() - db.getTime();
                })
                .slice(-6)
                .map(c => ({ v: (c.adultos || 0) + (c.criancas || 0) }))
            : [];
        
        while (attendanceTrend.length < 6) {
            attendanceTrend.unshift({ v: 0 });
        }

        return { presenceData, memberTrend, attendanceTrend };
    }, [users, allRegistrosPresenca, currentYear]);

    const careAlerts = useMemo(() => {
        if (!users) return [];
        return users.filter(u => u.absenceCount && u.absenceCount > 1).slice(0, 3);
    }, [users]);

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-16rem)] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <KpiCard title="Membros Totais" value={kpiData.totalMembers} percentage={users && users.length > 0 ? 100 : undefined} icon={Users} up>
                      <div className="h-10 w-full -ml-4">
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData.memberTrend}><Area type="monotone" dataKey="v" stroke="#10B981" strokeWidth={2.5} fill="#A7F3D0" fillOpacity={0.4}/></AreaChart>
                         </ResponsiveContainer>
                      </div>
                 </KpiCard>
                 <KpiCard title="Presença Média" value={kpiData.avgAttendance} percentage={allRegistrosPresenca && allRegistrosPresenca.length > 0 ? 100 : undefined} icon={Calendar} up>
                    <div className="h-10 w-full -ml-4">
                       <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={chartData.attendanceTrend}><Area type="monotone" dataKey="v" stroke="#3B82F6" strokeWidth={2.5} fill="#BFDBFE" fillOpacity={0.4}/></AreaChart>
                       </ResponsiveContainer>
                    </div>
                 </KpiCard>
                 <SimpleKpiCard title="Novos Visitantes" value={kpiData.newVisitors} icon={UserPlus} footer={`Visitantes cadastrados nos últimos 30 dias`}/>
                 <SimpleKpiCard title="Grupos Ativos" value={kpiData.activeGroups} icon={Users} link="Ver todos os grupos"/>
            </div>

            {/* GRÁFICOS E ALERTAS */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                <PresenceChart data={chartData.presenceData} />
                <div className="xl:col-span-1 flex flex-col gap-8 h-full">
                    <AlertsPanel alerts={careAlerts} />
                    <TrainingCard />
                </div>
            </div>
       </div>
    );
}

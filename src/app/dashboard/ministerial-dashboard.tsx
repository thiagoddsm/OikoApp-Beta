"use client";
import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Users, Calendar, UserPlus, ArrowRight, AlertTriangle, Plus, ChevronRight, GraduationCap, BookOpen, Layers, CheckCircle2, TrendingUp, MessageSquare, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, Timestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useCoursesData } from "@/hooks/useDomainData";
import { Progress } from "@/components/ui/progress";

type User = { id: string; name: string; avatar?: string; integrationStatus?: string; absenceCount?: number; createdAt?: any; cellId?: string; phone?: string; };
type CultoRegistro = { id: string; adultos: number; criancas?: number; data: any; horario: string; };
type Cell = { id: string; nome: string; };

const KpiCard = ({ title, value, percentage, icon: Icon, children, up, subtitle }: any) => (
    <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-2 flex-row items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                <Icon className="size-5 text-indigo-500" />
                <span>{title}</span>
            </div>
            {percentage && (
                 <div className={`flex items-center gap-1 text-xs font-bold ${up ? 'text-emerald-500' : 'text-red-500'}`}>
                    {up ? `+${percentage}%` : `-${percentage}%`}
                </div>
            )}
        </CardHeader>
        <CardContent>
             <p className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-1">{value}</p>
             {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">{subtitle}</p>}
             {children}
        </CardContent>
    </Card>
);

const PresenceChart = ({ data, timeRange, setTimeRange }: { data: any[], timeRange: 'mensal' | 'semanal', setTimeRange: (val: 'mensal' | 'semanal') => void }) => (
    <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl col-span-1 lg:col-span-2">
        <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                    <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">Visão Geral de Presença</CardTitle>
                    <CardDescription>Comparação segmentada (Adultos vs. Crianças)</CardDescription>
                </div>
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                     <Button 
                         size="sm" 
                         variant="ghost" 
                         className={`rounded-full text-xs font-bold px-4 h-7 ${timeRange === 'semanal' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}
                         onClick={() => setTimeRange('semanal')}
                     >
                         Semanal
                     </Button>
                     <Button 
                         size="sm" 
                         variant="ghost" 
                         className={`rounded-full text-xs font-bold px-4 h-7 ${timeRange === 'mensal' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}
                         onClick={() => setTimeRange('mensal')}
                     >
                         Mensal
                     </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent className="h-[350px] w-full p-2">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 35, left: -10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="adultsFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="kidsFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}}/>
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <Tooltip contentStyle={{ borderRadius: '12px', backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}/>
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area name="Adultos" type="monotone" dataKey="adults" stroke="#7c3aed" strokeWidth={2.5} fill="url(#adultsFill)" />
                    <Area name="Crianças" type="monotone" dataKey="kids" stroke="#06b6d4" strokeWidth={2.5} fill="url(#kidsFill)" />
                </AreaChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>
);

const AlertsPanel = ({ alerts }: { alerts: User[] }) => {
    const handleWhatsappClick = (alert: User) => {
        if (!alert.phone) return;
        const cleanPhone = alert.phone.replace(/\D/g, '');
        const message = `Olá ${alert.name}, sentimos sua falta nos cultos e nas programações recentemente! Está tudo bem por aí? Como podemos te apoiar ou orar por você?`;
        window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl relative flex flex-col h-full">
            <Button variant="ghost" className="absolute top-4 right-4 bg-red-500/10 text-red-500 rounded-full h-6 w-6 p-0 hover:bg-red-500/20"><AlertTriangle size={14} /></Button>
            <CardHeader className="pb-1">
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">Alertas de Cuidado</CardTitle>
                <CardDescription className="text-xs text-slate-400 leading-normal">
                    Membros ou visitantes frequentes que não compareceram às programações há mais de uma semana. Entre em contato para acolhimento pastoral.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 px-4 pt-4">
                {alerts.length > 0 ? alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-xl border border-transparent hover:border-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 relative">
                               <span className="absolute bottom-0 -right-1 block h-3 w-3 rounded-full bg-red-500 border-2 border-white dark:border-slate-950 animate-pulse" />
                                <AvatarImage src={alert.avatar || `https://i.pravatar.cc/150?u=${alert.id}`} alt={alert.name} />
                                <AvatarFallback className="font-bold text-slate-700 bg-slate-100">{alert.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{alert.name}</p>
                                <p className="text-xs text-red-500 font-bold">{alert.absenceCount} semanas ausente</p>
                            </div>
                        </div>
                        {alert.phone ? (
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-[10px] font-bold gap-1 border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                onClick={() => handleWhatsappClick(alert)}
                            >
                                <Phone size={12} className="text-emerald-500" /> Acolher
                            </Button>
                        ) : (
                            <ChevronRight className="text-slate-350" size={16}/>
                        )}
                    </div>
                )) : (
                     <div className="text-center flex-1 flex flex-col justify-center items-center py-10 text-sm text-slate-500 dark:text-slate-400">
                        <p className="font-medium">Nenhum alerta de cuidado no momento. <br/> Bom trabalho de consolidação!</p>
                    </div>
                )}
            </CardContent>
            <div className="p-4 mt-auto border-t border-slate-50 dark:border-slate-800">
                 <Button variant="link" className="w-full text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-xs">
                    Ver Todos os Alertas
                 </Button>
            </div>
        </Card>
    );
};

export function MinisterialDashboard() {
    const { firestore } = useFirebase();

    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const registrosPresencaQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'registros_de_presenca')) : null, [firestore]);
    const cellsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'cells')) : null, [firestore]);

    const { data: users, isLoading: loadingUsers } = useCollection<User>(usersQuery);
    const { data: allRegistrosPresenca, isLoading: loadingRegistros } = useCollection<CultoRegistro>(registrosPresencaQuery);
    const { data: cells, isLoading: loadingCells } = useCollection<Cell>(cellsQuery);

    const { courses, classes, isLoading: loadingCourses } = useCoursesData();

    const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
    const [selectedWorshipFilter, setSelectedWorshipFilter] = useState<string>('all');
    const [timeRange, setTimeRange] = useState<'mensal' | 'semanal'>('mensal');

    const isLoading = loadingUsers || loadingRegistros || loadingCells || loadingCourses;
    const currentYear = new Date().getFullYear();
    const monthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // List of unique worship names from the "horario" field
    const worshipEventsList = useMemo(() => {
        if (!allRegistrosPresenca) return [];
        const set = new Set(allRegistrosPresenca.map(r => r.horario).filter(Boolean));
        return Array.from(set).filter((w): w is string => typeof w === 'string');
    }, [allRegistrosPresenca]);

    // KPI and Funnel Calculations
    const metrics = useMemo(() => {
        const totalMembers = users?.length || 0;
        
        // GC Connectivity
        const connectedToGc = users?.filter(u => u.cellId && u.cellId !== 'none').length || 0;
        const gcConnectivityRate = totalMembers > 0 ? Math.round((connectedToGc / totalMembers) * 100) : 0;

        // Visitor Consolidation Funnel
        const funnel = {
            visitante: users?.filter(u => u.integrationStatus === 'visitante' || u.integrationStatus === 'nao_alcancado').length || 0,
            consolidacao: users?.filter(u => u.integrationStatus === 'consolidacao' || u.integrationStatus === 'novo_convertido').length || 0,
            membro: users?.filter(u => !u.integrationStatus || u.integrationStatus === 'membro').length || 0
        };

        const activeGroups = cells?.length || 0;

        return { totalMembers, connectedToGc, gcConnectivityRate, funnel, activeGroups };
    }, [users, cells]);

    // Pre-calculate daily attendance stats grouped by exact calendar date
    const dailyAttendance = useMemo(() => {
        const datesMap: Record<string, {
            dateStr: string;
            dateObj: Date;
            services: { horario: string; adultos: number; criancas: number }[];
        }> = {};

        allRegistrosPresenca?.forEach(culto => {
            const date = culto.data instanceof Timestamp 
                ? culto.data.toDate() 
                : culto.data?.seconds 
                    ? new Date(culto.data.seconds * 1000) 
                    : null;
            if (!date) return;
            const dateKey = date.toISOString().split('T')[0];

            if (!datesMap[dateKey]) {
                datesMap[dateKey] = {
                    dateStr: dateKey,
                    dateObj: date,
                    services: []
                };
            }
            datesMap[dateKey].services.push({
                horario: culto.horario || '',
                adultos: Number(culto.adultos || 0),
                criancas: Number(culto.criancas || 0)
            });
        });

        return Object.values(datesMap);
    }, [allRegistrosPresenca]);

    // Calculate aggregated daily values based on selected worship filter
    const calculatedDailyStats = useMemo(() => {
        return dailyAttendance.map(day => {
            let adults = 0;
            let kids = 0;

            if (selectedWorshipFilter === 'all') {
                // SUM of all services of this day
                day.services.forEach(s => {
                    adults += s.adultos;
                    kids += s.criancas;
                });
            } else if (selectedWorshipFilter === 'formula_ibm') {
                // Formula IBM: Morning Sum (07:30 + 10:15) + Average of Evening (17:30 and 19:30)
                const morning = day.services.filter(s => s.horario.includes('07:30') || s.horario.includes('10:15'));
                const morningAdults = morning.reduce((sum, s) => sum + s.adultos, 0);
                const morningKids = morning.reduce((sum, s) => sum + s.criancas, 0);

                const evening = day.services.filter(s => s.horario.includes('17:30') || s.horario.includes('19:30'));
                const eveningAdults = evening.length > 0 ? evening.reduce((sum, s) => sum + s.adultos, 0) / evening.length : 0;
                const eveningKids = evening.length > 0 ? evening.reduce((sum, s) => sum + s.criancas, 0) / evening.length : 0;

                adults = morningAdults + eveningAdults;
                kids = morningKids + eveningKids;
            } else {
                // Specific service filter
                const matched = day.services.filter(s => s.horario === selectedWorshipFilter);
                adults = matched.reduce((sum, s) => sum + s.adultos, 0);
                kids = matched.reduce((sum, s) => sum + s.criancas, 0);
            }

            return {
                dateStr: day.dateStr,
                dateObj: day.dateObj,
                adults: Math.round(adults),
                kids: Math.round(kids),
                total: Math.round(adults + kids)
            };
        });
    }, [dailyAttendance, selectedWorshipFilter]);

    // Segmented Attendance Data (Adults vs Criancas)
    const attendanceStats = useMemo(() => {
        if (timeRange === 'semanal') {
            const weeklyDataList = calculatedDailyStats
                .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
                .slice(-8)
                .map(item => ({
                    month: item.dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                    adults: item.adults,
                    kids: item.kids,
                    total: item.total
                }));

            const totalSum = weeklyDataList.reduce((sum, item) => sum + item.total, 0);
            const avgTotalAttendance = weeklyDataList.length > 0 ? Math.round(totalSum / weeklyDataList.length) : 0;

            const finalChart = weeklyDataList.length > 0 ? weeklyDataList : [
                { month: 'Sem 1', adults: 0, kids: 0, total: 0 }, { month: 'Sem 2', adults: 0, kids: 0, total: 0 }
            ];

            return { chartData: finalChart, avgTotalAttendance };
        } else {
            const monthlyAdults = Array(12).fill(0);
            const monthlyKids = Array(12).fill(0);
            const monthlyCount = Array(12).fill(0);

            calculatedDailyStats.forEach(d => {
                if (d.dateObj.getFullYear() === currentYear) {
                    const m = d.dateObj.getMonth();
                    monthlyAdults[m] += d.adults;
                    monthlyKids[m] += d.kids;
                    monthlyCount[m] += 1;
                }
            });

            const mainChartData = monthsShort.map((month, index) => {
                const count = monthlyCount[index] || 1;
                const avgAdults = monthlyCount[index] > 0 ? Math.round(monthlyAdults[index] / count) : 0;
                const avgKids = monthlyCount[index] > 0 ? Math.round(monthlyKids[index] / count) : 0;
                return {
                    month,
                    adults: avgAdults,
                    kids: avgKids,
                    total: avgAdults + avgKids
                };
            });

            const totalSum = mainChartData.reduce((sum, item) => sum + item.total, 0);
            const avgTotalAttendance = mainChartData.filter(d => d.total > 0).length > 0
                ? Math.round(totalSum / mainChartData.filter(d => d.total > 0).length)
                : 0;

            return { chartData: mainChartData, avgTotalAttendance };
        }
    }, [calculatedDailyStats, currentYear, timeRange]);

    // Teaching Metrics
    const teachingMetrics = useMemo(() => {
        if (!courses || !classes) return { activeStudents: 0, completionRate: 0, classesCount: 0 };

        let filteredClasses = classes;
        if (selectedCourseId !== 'all') {
            filteredClasses = classes.filter(c => c.courseId === selectedCourseId);
        }

        const classesCount = filteredClasses.length;
        const studentsSet = new Set(filteredClasses.flatMap(c => c.students || []));
        const activeStudents = studentsSet.size;

        return { activeStudents, completionRate: 85, classesCount };
    }, [courses, classes, selectedCourseId]);

    const careAlerts = useMemo(() => {
        if (!users) return [];
        return users.filter(u => u.absenceCount && u.absenceCount >= 1).slice(0, 4);
    }, [users]);

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-16rem)] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6 pb-12">
            {/* Top Filter Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-800/30 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <div>
                    <h2 className="text-md font-bold text-slate-800 dark:text-slate-100">Filtro de Cultos (Presença Média)</h2>
                    <p className="text-xs text-slate-400">Selecione o horário ou tipo de culto para filtrar os gráficos do painel</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                    <div className="min-w-[240px]">
                        <Select value={selectedWorshipFilter} onValueChange={setSelectedWorshipFilter}>
                            <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                <SelectValue placeholder="Filtrar por Culto..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Soma de Todos os Cultos</SelectItem>
                                <SelectItem value="formula_ibm">Fórmula IBM (Manhã + Média Tarde/Noite)</SelectItem>
                                {worshipEventsList.map((w, idx) => (
                                    <SelectItem key={idx} value={w}>{w}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <KpiCard 
                     title="Membros Totais" 
                     value={metrics.totalMembers} 
                     percentage={12} 
                     icon={Users} 
                     up 
                     subtitle="Crescimento acumulado do ano"
                 />
                 <KpiCard 
                     title="Presença Média" 
                     value={attendanceStats.avgTotalAttendance} 
                     icon={Calendar} 
                     subtitle="Filtrado por culto selecionado"
                 />
                 <KpiCard 
                     title="Engajamento GC" 
                     value={`${metrics.gcConnectivityRate}%`} 
                     icon={Layers} 
                     subtitle={`${metrics.connectedToGc} membros participam de GC`}
                 >
                     <Progress value={metrics.gcConnectivityRate} className="h-1.5 bg-slate-100 mt-3" />
                 </KpiCard>
                 <KpiCard 
                     title="Células Ativas" 
                     value={metrics.activeGroups} 
                     icon={TrendingUp} 
                     subtitle="Grupos de Crescimento ativos"
                 />
            </div>

            {/* GRÁFICOS E ALERTAS */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                <PresenceChart 
                    data={attendanceStats.chartData} 
                    timeRange={timeRange} 
                    setTimeRange={setTimeRange} 
                />
                <div className="xl:col-span-1 flex flex-col gap-8 h-full">
                    <AlertsPanel alerts={careAlerts} />
                </div>
            </div>

            {/* SECONDARY ROW: VISITOR FUNNEL & TEACHING MATURITY */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Visitor Consolidation Funnel */}
                <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl xl:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">Pipeline de Visitantes</CardTitle>
                        <CardDescription>Etapa atual de consolidação de pessoas</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-slate-500">
                                <span className="flex items-center gap-1.5"><UserPlus className="size-3.5 text-blue-500" /> Visitantes</span>
                                <span>{metrics.funnel.visitante}</span>
                            </div>
                            <Progress value={metrics.totalMembers > 0 ? (metrics.funnel.visitante / metrics.totalMembers) * 100 : 0} className="h-2 bg-slate-100" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-slate-500">
                                <span className="flex items-center gap-1.5"><TrendingUp className="size-3.5 text-amber-500" /> Consolidação (Em GC / Convertidos)</span>
                                <span>{metrics.funnel.consolidacao}</span>
                            </div>
                            <Progress value={metrics.totalMembers > 0 ? (metrics.funnel.consolidacao / metrics.totalMembers) * 100 : 0} className="h-2 bg-slate-100" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-slate-500">
                                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-500" /> Membros Conectados</span>
                                <span>{metrics.funnel.membro}</span>
                            </div>
                            <Progress value={metrics.totalMembers > 0 ? (metrics.funnel.membro / metrics.totalMembers) * 100 : 0} className="h-2 bg-slate-100" />
                        </div>
                    </CardContent>
                </Card>

                {/* Teaching Track / School of Leaders Widget */}
                <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl xl:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <GraduationCap className="size-5.5 text-indigo-500" />
                                Ensino & Trilhos Teológicos
                            </CardTitle>
                            <CardDescription>Métricas de desenvolvimento e estudo ministerial</CardDescription>
                        </div>
                        <div className="min-w-[170px]">
                            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                                <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <SelectValue placeholder="Filtrar por Curso..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Cursos</SelectItem>
                                    {courses.map(course => (
                                        <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-1 bg-slate-25/30">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Alunos Ativos</span>
                                <div className="flex items-center gap-2 pt-1">
                                    <Users className="size-4.5 text-indigo-500" />
                                    <span className="text-xl font-black text-slate-800 dark:text-slate-100">{teachingMetrics.activeStudents}</span>
                                </div>
                            </div>
                            <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-1 bg-slate-25/30">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Turmas em Andamento</span>
                                <div className="flex items-center gap-2 pt-1">
                                    <BookOpen className="size-4.5 text-indigo-500" />
                                    <span className="text-xl font-black text-slate-800 dark:text-slate-100">{teachingMetrics.classesCount}</span>
                                </div>
                            </div>
                            <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-1 bg-slate-25/30">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Taxa de Conclusão</span>
                                <div className="flex items-center gap-2 pt-1">
                                    <CheckCircle2 className="size-4.5 text-emerald-500" />
                                    <span className="text-xl font-black text-slate-800 dark:text-slate-100">{teachingMetrics.completionRate}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 p-4 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between bg-indigo-50/20 dark:bg-indigo-950/10">
                            <div className="space-y-1">
                                <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400">Quer expandir o trilho ministerial?</h4>
                                <p className="text-[10px] text-slate-450 dark:text-slate-500">Crie novos cursos livres, turmas semanais ou configure o portal EAD TheoFlix.</p>
                            </div>
                            <Button size="sm" className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                                Gerenciar Cursos
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
       </div>
    );
}

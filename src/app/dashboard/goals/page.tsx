
'use client';
import React, { useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import KpiDashboard from '@/components/goals/kpi-dashboard';
import { Loader2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

type Goal = {
    id: string;
    kpi: string;
    year: number;
    target: number;
    monthlyTargets?: number[];
    monthlyActuals?: number[];
};

type CultoRegistro = {
  id: string;
  adultos: number;
  criancas?: number;
  data: Timestamp; 
};

type Report = {
    conversoes?: number;
    date: Timestamp;
};

type User = {
    id: string;
    hierarchy?: {
        role?: string;
    },
    promotionDate?: Timestamp;
};

type Cell = {
    id: string;
    createdAt?: Timestamp;
}

export default function GoalsPage() {
    const { firestore, user } = useFirebase();

    const goalsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'goals')) : null, [firestore]);
    const cellsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'cells')) : null, [firestore]);
    const cultosQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'registros_de_presenca')) : null, [firestore]);
    const reportsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'attendance_reports')) : null, [firestore]);
    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);

    const { data: goals, isLoading: isLoadingGoals } = useCollection<Goal>(goalsQuery);
    const { data: cells, isLoading: isLoadingCells } = useCollection<Cell>(cellsQuery);
    const { data: cultos, isLoading: isLoadingCultos } = useCollection<CultoRegistro>(cultosQuery);
    const { data: reports, isLoading: isLoadingReports } = useCollection<Report>(reportsQuery);
    const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
    const { data: courses, isLoading: isLoadingCourses } = useCollection<any>(coursesQuery);
    
    const currentYear = new Date().getFullYear();
    const isLoading = isLoadingGoals || isLoadingCells || isLoadingCultos || isLoadingReports || isLoadingUsers || isLoadingCourses;

    const kpiData = useMemo(() => {
        const getMonthlyData = (collection: any[] | null, dateField: string) => {
            const monthly = Array(12).fill(0);
            if (!collection) return monthly;
            collection.forEach(item => {
                const date = item[dateField] instanceof Timestamp ? item[dateField].toDate() : null;
                if (date && date.getFullYear() === currentYear) {
                    const month = date.getMonth();
                    monthly[month] += 1;
                }
            });
            return monthly;
        };

        const getMonthlySum = (collection: any[] | null, dateField: string, valueField: string) => {
             const monthly = Array(12).fill(0);
            if (!collection) return monthly;
            collection.forEach(item => {
                const date = item[dateField] instanceof Timestamp ? item[dateField].toDate() : null;
                if (date && date.getFullYear() === currentYear) {
                    const month = date.getMonth();
                    monthly[month] += (item[valueField] || 0);
                }
            });
            return monthly;
        };
        
        const horarioToKpiKey: Record<string, string> = {
            "Domingo - 07:30": "frequencia_culto_dom_0730",
            "Domingo - 10:15": "frequencia_culto_dom_1015",
            "Domingo - 17:30": "frequencia_culto_dom_1730",
            "Domingo - 19:30": "frequencia_culto_dom_1930",
            "Quinta - 20:00": "frequencia_culto_qui_2000",
            "Evento": "frequencia_culto_evento"
        };

        const cultoMonthlyAttendance: Record<string, number[]> = {};
        const cultoMonthlyCounts: Record<string, number[]> = {};

        Object.values(horarioToKpiKey).forEach(key => {
            cultoMonthlyAttendance[key] = Array(12).fill(0);
            cultoMonthlyCounts[key] = Array(12).fill(0);
        });

        cultos?.forEach(culto => {
            const date = culto.data instanceof Timestamp ? culto.data.toDate() : null;
            if (date && date.getFullYear() === currentYear) {
                const month = date.getMonth();
                const key = horarioToKpiKey[culto.horario] || "frequencia_culto_evento";
                
                if (cultoMonthlyAttendance[key]) {
                    cultoMonthlyAttendance[key][month] += (culto.adultos || 0) + (culto.criancas || 0);
                    cultoMonthlyCounts[key][month] += 1;
                }
            }
        });

        const cultosKpis: Record<string, { actual: number; monthlyActuals: number[] }> = {};
        
        Object.values(horarioToKpiKey).forEach(key => {
            const mAttendance = cultoMonthlyAttendance[key];
            const mCounts = cultoMonthlyCounts[key];
            
            const avgMonthlyAttendance = mAttendance.map((total, i) => 
                mCounts[i] > 0 ? Math.round(total / mCounts[i]) : 0
            );
            
            const totalAverage = avgMonthlyAttendance.filter(v => v > 0);
            const overallAvgAttendance = totalAverage.length > 0 
                ? Math.round(totalAverage.reduce((a, b) => a + b, 0) / totalAverage.length) 
                : 0;
                
            cultosKpis[key] = {
                actual: overallAvgAttendance,
                monthlyActuals: avgMonthlyAttendance
            };
        });

        // Encontrar o curso de Batismo
        const batismoCourse = courses?.find(c => c.name?.toLowerCase().includes('batismo'));
        const batismoCourseId = batismoCourse?.id;

        const baptizedUsers = users?.filter(u => {
            const hasDirectBaptism = u.batizado === 'sim' || u.dataBatismo || u.churchData?.baptismDate;
            const hasCourseApproval = batismoCourseId && u.journey?.courseStatus?.[batismoCourseId] === 'approved';
            return hasDirectBaptism || hasCourseApproval;
        }) || [];

        // Distribuir batismos mensalmente baseado na data de batismo ou data de aprovação do curso (caso tenha)
        const batismosMonthlyActuals = Array(12).fill(0);
        baptizedUsers.forEach(u => {
            let date: Date | null = null;
            if (u.dataBatismo) {
                try { date = new Date(u.dataBatismo); } catch {}
            } else if (u.churchData?.baptismDate instanceof Timestamp) {
                date = u.churchData.baptismDate.toDate();
            } else if (batismoCourseId && u.journey?.courseApprovedAt?.[batismoCourseId]) {
                const approvalVal = u.journey.courseApprovedAt[batismoCourseId];
                if (approvalVal instanceof Timestamp) {
                    date = approvalVal.toDate();
                } else {
                    try { date = new Date(approvalVal); } catch {}
                }
            } else if (u.createdAt instanceof Timestamp) {
                date = u.createdAt.toDate();
            }
            
            if (date && date.getFullYear() === currentYear) {
                const month = date.getMonth();
                batismosMonthlyActuals[month] += 1;
            }
        });

        return {
            'celulas': { actual: cells?.length || 0, monthlyActuals: getMonthlyData(cells, 'createdAt') },
            ...cultosKpis,
            'conversoes': { actual: reports?.reduce((sum, r) => sum + (r.conversoes || 0), 0) || 0, monthlyActuals: getMonthlySum(reports, 'date', 'conversoes') },
            'batismos': { actual: baptizedUsers.length, monthlyActuals: batismosMonthlyActuals },
            'novos_lideres': { 
                actual: users?.filter(u => {
                    const status = u.integrationStatus;
                    const role = u.hierarchy?.role;
                    return (
                        (status && ['lider_treinamento', 'lider_gc', 'lider_area', 'lider_rede', 'pastor'].includes(status)) ||
                        (role && ['lider_treinamento', 'lider_gc', 'lider_area', 'lider_rede', 'pastor', 'pastor_senior', 'admin'].includes(role))
                    );
                }).length || 0, 
                monthlyActuals: getMonthlyData(users?.filter(u => {
                    const status = u.integrationStatus;
                    const role = u.hierarchy?.role;
                    return (
                        (status && ['lider_treinamento', 'lider_gc', 'lider_area', 'lider_rede', 'pastor'].includes(status)) ||
                        (role && ['lider_treinamento', 'lider_gc', 'lider_area', 'lider_rede', 'pastor', 'pastor_senior', 'admin'].includes(role))
                    );
                }) || null, 'promotionDate')
            }
        };
    }, [cells, cultos, reports, users, courses, currentYear]);

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return <KpiDashboard goals={goals || []} kpiData={kpiData} year={currentYear} />;
}

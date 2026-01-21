
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

    const { data: goals, isLoading: isLoadingGoals } = useCollection<Goal>(goalsQuery);
    const { data: cells, isLoading: isLoadingCells } = useCollection<Cell>(cellsQuery);
    const { data: cultos, isLoading: isLoadingCultos } = useCollection<CultoRegistro>(cultosQuery);
    const { data: reports, isLoading: isLoadingReports } = useCollection<Report>(reportsQuery);
    const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
    
    const currentYear = new Date().getFullYear();
    const isLoading = isLoadingGoals || isLoadingCells || isLoadingCultos || isLoadingReports || isLoadingUsers;

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
        
        const monthlyAttendance = Array(12).fill(0);
        const monthlyCounts = Array(12).fill(0);

        cultos?.forEach(culto => {
            const date = culto.data instanceof Timestamp ? culto.data.toDate() : null;
            if (date && date.getFullYear() === currentYear) {
                const month = date.getMonth();
                monthlyAttendance[month] += (culto.adultos || 0) + (culto.criancas || 0);
                monthlyCounts[month] += 1;
            }
        });

        const avgMonthlyAttendance = monthlyAttendance.map((total, i) => monthlyCounts[i] > 0 ? Math.round(total / monthlyCounts[i]) : 0);
        
        const totalAverage = avgMonthlyAttendance.filter(v => v > 0);
        const overallAvgAttendance = totalAverage.length > 0 ? Math.round(totalAverage.reduce((a, b) => a + b, 0) / totalAverage.length) : 0;


        return {
            'celulas': { actual: cells?.length || 0, monthlyActuals: getMonthlyData(cells, 'createdAt') },
            'frequencia_culto': { actual: overallAvgAttendance, monthlyActuals: avgMonthlyAttendance },
            'conversoes': { actual: reports?.reduce((sum, r) => sum + (r.conversoes || 0), 0) || 0, monthlyActuals: getMonthlySum(reports, 'date', 'conversoes') },
            'batismos': { actual: 0, monthlyActuals: Array(12).fill(0) }, // Placeholder
            'novos_lideres': { actual: users?.filter(u => u.hierarchy?.role === 'lider_gc').length || 0, monthlyActuals: getMonthlyData(users, 'promotionDate') } // promotionDate should be added to user
        };
    }, [cells, cultos, reports, users, currentYear]);

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return <KpiDashboard goals={goals || []} kpiData={kpiData} year={currentYear} />;
}

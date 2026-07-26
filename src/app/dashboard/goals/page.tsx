'use client';
import React from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useTenant } from '@/contexts/tenant-context';
import KpiDashboard from '@/components/goals/kpi-dashboard';
import { useKpiDefinitions } from '@/hooks/useKpiDefinitions';
import { useKpiEngine } from '@/hooks/useKpiEngine';
import { Loader2 } from 'lucide-react';

export default function GoalsPage() {
    const { tenantId } = useTenant();
    const { firestore, user, isUserLoading } = useFirebase();

    const ready = !isUserLoading && !!user && !!firestore && !!tenantId;

    // Queries isoladas pelo tenant
    const goalsQuery = useMemoFirebase(() => {
        if (!ready) return null;
        return query(collection(firestore!, `goals/${tenantId}/items`));
    }, [ready, firestore, tenantId]);

    // Queries com suporte a fallback
    const cellsQuery = useMemoFirebase(() => {
        if (!ready) return null;
        return query(collection(firestore!, 'cells'));
    }, [ready, firestore]);

    const cultosQuery = useMemoFirebase(() => {
        if (!ready) return null;
        return query(collection(firestore!, 'registros_de_presenca'));
    }, [ready, firestore]);

    const reportsQuery = useMemoFirebase(() => {
        if (!ready) return null;
        return query(collection(firestore!, 'attendance_reports'));
    }, [ready, firestore]);

    const usersQuery = useMemoFirebase(() => {
        if (!ready) return null;
        return query(collection(firestore!, 'users'));
    }, [ready, firestore]);

    const coursesQuery = useMemoFirebase(() => {
        if (!ready) return null;
        return query(collection(firestore!, 'courses'));
    }, [ready, firestore]);

    const { data: goals, isLoading: isLoadingGoals } = useCollection<any>(goalsQuery);
    const { data: cells, isLoading: isLoadingCells } = useCollection<any>(cellsQuery);
    const { data: cultos, isLoading: isLoadingCultos } = useCollection<any>(cultosQuery);
    const { data: reports, isLoading: isLoadingReports } = useCollection<any>(reportsQuery);
    const { data: users, isLoading: isLoadingUsers } = useCollection<any>(usersQuery);
    const { data: courses, isLoading: isLoadingCourses } = useCollection<any>(coursesQuery);

    const { kpiDefinitions, isLoading: isLoadingKpiDefs } = useKpiDefinitions();

    const currentYear = new Date().getFullYear();
    const isLoading = isUserLoading || isLoadingGoals || isLoadingCells || isLoadingCultos || isLoadingReports || isLoadingUsers || isLoadingCourses || isLoadingKpiDefs;

    const kpiDefinitionsSafe = kpiDefinitions || [];

    const kpiData = useKpiEngine({
        kpiDefinitions: kpiDefinitionsSafe,
        cells,
        cultos,
        reports,
        users,
        courses,
        currentYear,
    });

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <KpiDashboard
            goals={goals || []}
            kpiDefinitions={kpiDefinitionsSafe}
            kpiData={kpiData || {}}
            courses={courses || []}
            year={currentYear}
        />
    );
}

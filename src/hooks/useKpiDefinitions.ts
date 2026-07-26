import { useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useTenant } from '@/contexts/tenant-context';
import { KpiDefinition } from '@/domain/kpi';
import { SYSTEM_KPI_TEMPLATES } from '@/constants/kpi-templates';

export function useKpiDefinitions() {
  const { tenantId } = useTenant();
  const { firestore, user, isUserLoading } = useFirebase();

  const ready = !isUserLoading && !!user && !!firestore && !!tenantId;

  // Busca as definições personalizadas do tenant em kpi_definitions
  const kpiDefsQuery = useMemoFirebase(() => {
    if (!ready) return null;
    return query(collection(firestore!, `kpi_definitions/${tenantId}/items`));
  }, [ready, firestore, tenantId]);

  const { data: tenantKpis, isLoading } = useCollection<KpiDefinition>(kpiDefsQuery);

  const kpiDefinitions = useMemo(() => {
    // Se o tenant já tem KPIs cadastrados na subcoleção, usa eles
    if (tenantKpis && tenantKpis.length > 0) {
      return tenantKpis.filter(k => k.active !== false);
    }

    // Caso contrário, gera os KPIs iniciais dinamicamente a partir dos templates globais
    return SYSTEM_KPI_TEMPLATES.map((tmpl, idx) => ({
      id: tmpl.id,
      tenantId: tenantId || undefined,
      templateId: tmpl.id,
      name: tmpl.name,
      description: tmpl.description,
      iconName: tmpl.iconName,
      category: tmpl.category,
      dataSource: tmpl.defaultDataSource,
      active: true,
      order: idx + 1,
    })) as KpiDefinition[];
  }, [tenantKpis, tenantId]);

  return {
    kpiDefinitions,
    isLoading: isUserLoading || isLoading,
    hasCustomDefinitions: !!(tenantKpis && tenantKpis.length > 0),
  };
}


'use client';

import DashboardSaude from '@/components/dashboard/health-dashboard';

export default function CellDetailsPage() {
  // Por enquanto, esta página apenas renderiza o dashboard de saúde estático.
  // No futuro, ele receberá o cellId e buscará os dados dinamicamente.
  return <DashboardSaude />;
}

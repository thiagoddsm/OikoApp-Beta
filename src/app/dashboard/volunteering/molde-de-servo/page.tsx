import { Suspense } from 'react';
import { getShapeResults } from './actions';
import { ShapeDashboard } from '@/components/volunteering/shape-dashboard';
import { Skeleton } from '@/components/ui/skeleton';

export default async function MoldeDeServoPage() {
  const results = await getShapeResults();
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Molde de Servo</h2>
          <p className="text-muted-foreground">Resultados do Teste S.H.A.P.E. dos membros</p>
        </div>
      </div>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ShapeDashboard initialResults={results} />
      </Suspense>
    </div>
  );
}

import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { query, collection, where } from 'firebase/firestore';
import { useTenant } from '@/contexts/tenant-context';
import { Cell, Area, Rede } from '@/domain/cell';

export const useChurch = () => {
  const { tenantId } = useTenant();
  const { firestore, user, isUserLoading } = useFirebase();

  const { data: tenant, isLoading: loadingTenant } = useDoc<any>(
    tenantId ? `tenants/${tenantId}` : null
  );

  const ready = !isUserLoading && !!user && !!firestore && !!tenantId;

  // Queries baseadas no tenant — useMemoFirebase marca o query como memoizado
  // para que useCollection não emita warnings de "unmemoized query".
  const cellsQ = useMemoFirebase(() => {
    if (!ready) return null;
    return query(collection(firestore!, 'cells'), where('tenantId', '==', tenantId));
  }, [ready, firestore, tenantId]);

  const areasQ = useMemoFirebase(() => {
    if (!ready) return null;
    return query(collection(firestore!, 'areas'), where('tenantId', '==', tenantId));
  }, [ready, firestore, tenantId]);

  const redesQ = useMemoFirebase(() => {
    if (!ready) return null;
    return query(collection(firestore!, 'redes'), where('tenantId', '==', tenantId));
  }, [ready, firestore, tenantId]);

  // Buscando os dados (em tempo real)
  const { data: cells, isLoading: loadingCells } = useCollection<Cell>(cellsQ);
  const { data: areas, isLoading: loadingAreas } = useCollection<Area>(areasQ);
  const { data: redes, isLoading: loadingRedes } = useCollection<Rede>(redesQ);

  return {
    tenantId,
    tenant,
    cells: cells || [],
    areas: areas || [],
    redes: redes || [],
    isLoading: loadingCells || loadingAreas || loadingRedes || loadingTenant
  };
};

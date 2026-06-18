import { useMemo } from 'react';
import { query, collection, where } from 'firebase/firestore';
import { useCollection, firestore } from '@/firebase';
import { useTenant } from '@/contexts/tenant-context';
import { Cell, Area, Rede } from '@/domain/cell';

export const useChurch = () => {
  const { tenantId } = useTenant();

  // Queries baseadas no tenant
  const cellsQ = useMemo(() => {
    if (!firestore || !tenantId) return null;
    return query(collection(firestore, 'cells'), where('tenantId', '==', tenantId));
  }, [tenantId]);

  const areasQ = useMemo(() => {
    if (!firestore || !tenantId) return null;
    return query(collection(firestore, 'areas'), where('tenantId', '==', tenantId));
  }, [tenantId]);

  const redesQ = useMemo(() => {
    if (!firestore || !tenantId) return null;
    return query(collection(firestore, 'redes'), where('tenantId', '==', tenantId));
  }, [tenantId]);

  // Buscando os dados (em tempo real)
  const { data: cells, isLoading: loadingCells } = useCollection<Cell>(cellsQ);
  const { data: areas, isLoading: loadingAreas } = useCollection<Area>(areasQ);
  const { data: redes, isLoading: loadingRedes } = useCollection<Rede>(redesQ);

  return {
    cells: cells || [],
    areas: areas || [],
    redes: redes || [],
    isLoading: loadingCells || loadingAreas || loadingRedes
  };
};

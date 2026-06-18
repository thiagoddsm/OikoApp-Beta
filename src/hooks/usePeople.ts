import { useMemo } from 'react';
import { query, collection, where } from 'firebase/firestore';
import { useCollection, firestore } from '@/firebase';
import { useTenant } from '@/contexts/tenant-context';
import { Member } from '@/domain/member';

export const usePeople = () => {
  const { tenantId } = useTenant();

  // No futuro, leremos de 'members' em vez de 'users' para a membresia pura.
  // Por enquanto, usando a nova estrutura de tenantId em users para manter retrocompatibilidade
  // com as migrações feitas nos scripts anteriores.
  const membersQ = useMemo(() => {
    if (!firestore || !tenantId) return null;
    // Quando a separação for 100% migrada no código, trocaremos 'users' por 'members'
    return query(collection(firestore, 'users'), where('tenantId', '==', tenantId));
  }, [tenantId]);

  const { data: members, isLoading } = useCollection<Member>(membersQ);

  return {
    members: members || [],
    isLoading
  };
};

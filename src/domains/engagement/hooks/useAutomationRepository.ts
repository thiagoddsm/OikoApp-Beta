import { useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { AutomationRepository } from '../repositories/AutomationRepository';

export function useAutomationRepository() {
  const { firestore } = useFirebase();
  return useMemo(() => firestore ? new AutomationRepository(firestore) : null, [firestore]);
}

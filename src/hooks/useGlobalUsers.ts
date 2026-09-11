import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, Firestore } from 'firebase/firestore';
import { User } from '@/contexts/volunteering-context';

let globalUsers: any[] | null = null;
let globalUsersLoading = true;
let unsubscribe: (() => void) | null = null;
let activeUid: string | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

export function useGlobalUsers(firestore: Firestore | undefined | null, user: any, roleResolved: boolean) {
  const [data, setData] = useState<any[] | null>(globalUsers);
  const [isLoading, setIsLoading] = useState(globalUsersLoading);

  useEffect(() => {
    const listener = () => {
      setData(globalUsers);
      setIsLoading(globalUsersLoading);
    };
    listeners.add(listener);

    // Se o usuário mudou (logout / troca de conta), limpa o listener anterior
    const currentUid = user?.uid || null;
    if (activeUid !== currentUid) {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      activeUid = currentUid;
      globalUsers = null;
      globalUsersLoading = true;
    }

    if (!unsubscribe && firestore && user && roleResolved) {
      globalUsersLoading = true;
      notifyListeners();
      
      const q = query(collection(firestore, 'users'), orderBy('name'));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          globalUsers = snapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id }));
          globalUsersLoading = false;
          notifyListeners();
        },
        (error) => {
          console.error("Global users error:", error);
          globalUsersLoading = false;
          if (unsubscribe === unsub) {
            unsubscribe = null;
          }
          notifyListeners();
        }
      );
      unsubscribe = unsub;
    }
    return () => {
      listeners.delete(listener);
    };
  }, [firestore, user, roleResolved]);

  return { users: data || [], isLoading: isLoading || globalUsersLoading };
}

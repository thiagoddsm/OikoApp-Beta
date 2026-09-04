import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, Firestore } from 'firebase/firestore';
import { User } from '@/contexts/volunteering-context';

let globalUsers: any[] | null = null;
let globalUsersLoading = true;
let unsubscribe: (() => void) | null = null;
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

    if (!unsubscribe && firestore && user && roleResolved) {
      globalUsersLoading = true;
      notifyListeners();
      
      const q = query(collection(firestore, 'users'), orderBy('name'));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          globalUsers = snapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id }));
          globalUsersLoading = false;
          notifyListeners();
        },
        (error) => {
          console.error("Global users error:", error);
          globalUsersLoading = false;
          globalUsers = [];
          notifyListeners();
        }
      );
    }
    return () => {
      listeners.delete(listener);
    };
  }, [firestore, user, roleResolved]);

  return { users: data || [], isLoading: isLoading || globalUsersLoading };
}

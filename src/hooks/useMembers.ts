import { useState, useMemo } from 'react';
import { collection, query, limit, startAfter, orderBy } from 'firebase/firestore';
import { useFirebase, useCollection } from '@/firebase';

export function useMembers(pageSize = 30) {
  const { firestore, user } = useFirebase();
  const [lastDoc, setLastDoc] = useState<any>(null);

  const membersQuery = useMemo(() => {
    if (!firestore || !user) return null;
    let q = query(collection(firestore, 'users'), orderBy('name'), limit(pageSize));
    if (lastDoc) {
      q = query(collection(firestore, 'users'), orderBy('name'), startAfter(lastDoc), limit(pageSize));
    }
    return q;
  }, [firestore, user, lastDoc, pageSize]);

  const { data: members, isLoading } = useCollection(membersQuery);

  const loadMore = (lastVisibleDoc: any) => {
    setLastDoc(lastVisibleDoc);
  };

  return { members, isLoading, loadMore };
}

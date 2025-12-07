'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  WhereFilterOp,
} from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

export type QueryConstraint = {
  field: string;
  operator: WhereFilterOp;
  value: any;
};

export type OrderConstraint = {
  field: string;
  direction: 'asc' | 'desc';
};

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * It builds the query internally to ensure reference stability.
 *
 * @template T Type for document data.
 * @param {string | null} path - The path to the collection. Hook is dormant if null.
 * @param {QueryConstraint[]} [constraints=[]] - An array of 'where' clauses.
 * @param {OrderConstraint[]} [order=[]] - An array of 'orderBy' clauses.
 * @param {number} [limitBy] - The 'limit' for the query.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
  path: string | null,
  constraints: QueryConstraint[] = [],
  order: OrderConstraint[] = [],
  limitBy?: number
): UseCollectionResult<T> {
  const { firestore } = useFirebase();
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  // Memoize dependency arrays to prevent re-renders
  const memoizedConstraints = JSON.stringify(constraints);
  const memoizedOrder = JSON.stringify(order);

  useEffect(() => {
    if (!firestore || !path) {
      setIsLoading(false);
      setData(null);
      return;
    }

    setIsLoading(true);
    let q: Query = collection(firestore, path);

    try {
      const parsedConstraints = JSON.parse(memoizedConstraints);
      if (parsedConstraints.length > 0) {
        const whereClauses = parsedConstraints.map(c => where(c.field, c.operator, c.value));
        q = query(q, ...whereClauses);
      }
      
      const parsedOrder = JSON.parse(memoizedOrder);
      if (parsedOrder.length > 0) {
          const orderClauses = parsedOrder.map(o => orderBy(o.field, o.direction));
          q = query(q, ...orderClauses);
      }
  
      if (limitBy) {
        q = query(q, limit(limitBy));
      }
    } catch(e) {
        console.error("Failed to build query:", e);
        setError(e as Error);
        setIsLoading(false);
        return;
    }
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: WithId<T>[] = snapshot.docs.map(doc => ({
          ...(doc.data() as T),
          id: doc.id,
        }));
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: path,
        });
        setError(contextualError);
        setData(null);
        setIsLoading(false);
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [firestore, path, memoizedConstraints, memoizedOrder, limitBy]);

  return { data, isLoading, error };
}

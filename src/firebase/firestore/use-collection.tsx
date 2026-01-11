'use client';

import { useState, useEffect, useMemo } from 'react';
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
 * It can accept either a path string or a pre-built Query object.
 *
 * @template T Type for document data.
 * @param {string | Query | null} pathOrQuery - The path to the collection or a Firestore Query object. Hook is dormant if null.
 * @param {QueryConstraint[]} [constraints=[]] - An array of 'where' clauses (only used if path is a string).
 * @param {OrderConstraint[]} [order=[]] - An array of 'orderBy' clauses (only used if path is a string).
 * @param {number} [limitBy] - The 'limit' for the query (only used if path is a string).
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
  pathOrQuery: string | Query | null,
  constraints: QueryConstraint[] = [],
  order: OrderConstraint[] = [],
  limitBy?: number
): UseCollectionResult<T> {
  const { firestore } = useFirebase();
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  const memoizedConstraints = JSON.stringify(constraints);
  const memoizedOrder = JSON.stringify(order);

  useEffect(() => {
    if (!firestore || !pathOrQuery) {
      setIsLoading(false);
      setData(null);
      setError(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    let unsubscribe = () => {};

    try {
      let q: Query;
      let pathForError: string;

      if (typeof pathOrQuery === 'string') {
        pathForError = pathOrQuery;
        
        // Start with the base collection reference
        let queryRef: any = collection(firestore, pathOrQuery);
        
        // Apply where constraints
        const parsedConstraints = JSON.parse(memoizedConstraints);
        if (parsedConstraints.length > 0) {
          const whereClauses = parsedConstraints.map(c => where(c.field, c.operator, c.value));
          queryRef = query(queryRef, ...whereClauses);
        }
        
        // Apply order by constraints
        const parsedOrder = JSON.parse(memoizedOrder);
        if (parsedOrder.length > 0) {
            const orderClauses = parsedOrder.map(o => orderBy(o.field, o.direction));
            queryRef = query(queryRef, ...orderClauses);
        }
    
        // Apply limit
        if (limitBy) {
          queryRef = query(queryRef, limit(limitBy));
        }
        q = queryRef;
      } else {
        q = pathOrQuery as Query;
        pathForError = (q as any)._query?.path?.segments.join('/') || 'unknown query path';
      }
      
      unsubscribe = onSnapshot(
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
            path: pathForError,
          });
          setError(contextualError);
          setData(null);
          setIsLoading(false);
          errorEmitter.emit('permission-error', contextualError);
        }
      );

    } catch(e) {
        console.error("Failed to build or subscribe to query:", e);
        setError(e as Error);
        setIsLoading(false);
    }

    return () => unsubscribe();
  }, [firestore, pathOrQuery, memoizedConstraints, memoizedOrder, limitBy]);

  return { data, isLoading, error };
}

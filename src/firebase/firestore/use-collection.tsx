'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
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

/**
 * React hook to subscribe to a Firestore query in real-time.
 * It is designed to work with a pre-built and memoized Query object.
 *
 * @template T Type for document data.
 * @param {Query | null} query - A Firestore Query object, typically created with `query()` and memoized with `useMemoFirebase`. The hook is dormant if the query is null.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
  query: Query | null,
): UseCollectionResult<T> {
  const { firestore } = useFirebase();
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // The hook is dormant if the query is not provided.
    if (!firestore || !query) {
      setIsLoading(false);
      setData(null);
      setError(null);
      return;
    }

    // A crucial check to ensure the query object is stable.
    // Queries created inline will cause infinite loops.
    // The `useMemoFirebase` utility adds this `__memo` flag.
    if (!(query as any).__memo) {
        const queryPath = (query as any)._query?.path?.segments.join('/') || 'unknown';
        console.error(`An unmemoized query was passed to useCollection for path: "${queryPath}". This will cause performance issues and potential infinite loops. Please wrap the query creation in useMemoFirebase().`);
    }
    
    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      query,
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
        const pathForError = (query as any)._query?.path?.segments.join('/') || 'unknown query path';
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

    return () => unsubscribe();
  }, [firestore, query]); // The effect depends directly on the query object.

  return { data, isLoading, error };
}

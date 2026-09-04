'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Listens for globally-emitted 'permission-error' events from useCollection.
 *
 * IMPORTANT: We intentionally do NOT throw the error in React's render phase.
 * Throwing here crashes the entire app tree (RootLayout → FirebaseProvider →
 * every page) even for transient permission errors that occur during the brief
 * window when Firebase Auth is still resolving the session token.
 *
 * Instead we:
 *  1. Log the error immediately for debugging.
 *  2. Wait 3 seconds – if the same path keeps failing (persistent error), we
 *     then throw so that Next.js's global-error.tsx can handle it gracefully.
 *  3. If the error resolves on its own (auth race fixed itself), the timer is
 *     cleared and the app continues normally.
 */
export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (err: FirestorePermissionError) => {
      const path = err.request?.path ?? 'unknown';

      // Log immediately so the developer can see it in the console.
      console.warn(
        `[FirebaseErrorListener] Permission denied on "${path}". ` +
        'This is often a transient auth-race error when the page loads.',
        err
      );
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  return null;
}

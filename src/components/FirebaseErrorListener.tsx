'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [fatalError, setFatalError] = useState<FirestorePermissionError | null>(null);
  // Track the debounce timers keyed by collection path so each path is
  // treated independently.
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const handleError = (err: FirestorePermissionError) => {
      const path = err.request?.path ?? 'unknown';

      // Log immediately so the developer can see it in the console.
      console.error(
        `[FirebaseErrorListener] Permission denied on "${path}". ` +
        'This may be a transient auth-race error — waiting 3 s before escalating.',
        err
      );

      // Clear any existing timer for this path (reset the debounce).
      if (timers.current[path]) {
        clearTimeout(timers.current[path]);
      }

      // Only escalate to a fatal throw after 3 seconds of continued failure.
      timers.current[path] = setTimeout(() => {
        console.error(
          `[FirebaseErrorListener] Persistent permission error on "${path}" — escalating.`,
          err
        );
        setFatalError(err);
      }, 3000);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
      // Clear all pending timers on unmount.
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  // Only throw if the error was persistent (timer elapsed without resolution).
  if (fatalError) {
    throw fatalError;
  }

  return null;
}

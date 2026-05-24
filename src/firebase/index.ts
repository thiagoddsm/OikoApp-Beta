// FORCE-CONFIG-INLINE: Bypassing import to defeat dev server cache.

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Hardcoded config to ensure the storageBucket is read.
const firebaseConfig = {
  "projectId": "studio-8044285263-a0cc3",
  "appId": "1:430562702363:web:862e7ab0e02fc9301434be",
  "storageBucket": "studio-8044285263-a0cc3.firebasestorage.app",
  "apiKey": "AIzaSyD4Tom0uDpf6tM_FAhRduGzEQGhSrjwitY",
  "authDomain": "studio-8044285263-a0cc3.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "430562702363"
};

function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp)
  };
}

export function initializeFirebase() {
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
    initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
    });
    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';

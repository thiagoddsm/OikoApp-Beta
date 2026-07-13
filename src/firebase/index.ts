// FORCE-CONFIG-INLINE: Bypassing import to defeat dev server cache.

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Hardcoded config to ensure the storageBucket is read.
const firebaseConfig = {
  "projectId": "studio-1424813022-71754",
  "appId": "1:989586605112:web:66250f4d31e88166a212cd",
  "storageBucket": "studio-1424813022-71754.firebasestorage.app",
  "apiKey": "AIzaSyAOSAJ0WPPXAxbSMtiq7UZxkjzE6vizVq8",
  "authDomain": "studio-1424813022-71754.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "989586605112"
};

function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp)
  };
}

let firebaseAppInstance: FirebaseApp | undefined;
let firestoreDbInstance: any;

export function initializeFirebase() {
  if (!getApps().length) {
    firebaseAppInstance = initializeApp(firebaseConfig);
    try {
      firestoreDbInstance = initializeFirestore(firebaseAppInstance, {
        localCache: typeof window !== 'undefined' ? persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        }) : undefined,
        ignoreUndefinedProperties: true,
      });
    } catch (err) {
      console.warn("Firestore tab persistence connection error (using fallback):", err);
      firestoreDbInstance = getFirestore(firebaseAppInstance);
    }
  } else {
    firebaseAppInstance = getApp();
    if (!firestoreDbInstance) {
      firestoreDbInstance = getFirestore(firebaseAppInstance);
    }
  }

  return {
    firebaseApp: firebaseAppInstance,
    auth: getAuth(firebaseAppInstance),
    firestore: firestoreDbInstance,
    storage: getStorage(firebaseAppInstance)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';


import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Hardcoded fallback Project ID found in firebase/config.ts
const FALLBACK_PROJECT_ID = "studio-1424813022-71754";

export function getAdminApp(): App {
  const appName = 'oiko-notification-admin';
  const apps = getApps();
  const existingApp = apps.find(a => a.name === appName);
  
  if (existingApp) {
    return existingApp;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  let app: App;

  if (serviceAccountKey) {
    try {
      let cleanKey = serviceAccountKey.trim();
      if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
        cleanKey = cleanKey.slice(1, -1);
      }
      const sa = JSON.parse(cleanKey);
      app = initializeApp({
        credential: cert(sa),
        projectId: sa.project_id || FALLBACK_PROJECT_ID
      }, appName);
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY");
      console.error("Error details:", e);
      console.error("Key string starts with:", serviceAccountKey?.substring(0, 50));
      app = initializeApp({ projectId: FALLBACK_PROJECT_ID }, appName);
    }
  } else {
    // Fallback to explicit project ID or hardcoded one
    app = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || FALLBACK_PROJECT_ID
    }, appName);
  }

  return app;
}

import { getAuth } from 'firebase-admin/auth';

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

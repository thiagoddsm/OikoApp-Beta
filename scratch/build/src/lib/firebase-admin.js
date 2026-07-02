"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminApp = getAdminApp;
exports.getAdminDb = getAdminDb;
exports.getAdminAuth = getAdminAuth;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
// Hardcoded fallback Project ID found in firebase/config.ts
const FALLBACK_PROJECT_ID = "studio-1424813022-71754";
function getAdminApp() {
    const appName = 'oiko-notification-admin';
    const apps = (0, app_1.getApps)();
    const existingApp = apps.find(a => a.name === appName);
    if (existingApp) {
        return existingApp;
    }
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    let app;
    if (serviceAccountKey) {
        try {
            let cleanKey = serviceAccountKey.trim();
            if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
                cleanKey = cleanKey.slice(1, -1);
            }
            const sa = JSON.parse(cleanKey);
            app = (0, app_1.initializeApp)({
                credential: (0, app_1.cert)(sa),
                projectId: sa.project_id || FALLBACK_PROJECT_ID
            }, appName);
        }
        catch (e) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY");
            console.error("Error details:", e);
            console.error("Key string starts with:", serviceAccountKey?.substring(0, 50));
            app = (0, app_1.initializeApp)({ projectId: FALLBACK_PROJECT_ID }, appName);
        }
    }
    else {
        // Fallback to explicit project ID or hardcoded one
        app = (0, app_1.initializeApp)({
            projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || FALLBACK_PROJECT_ID
        }, appName);
    }
    return app;
}
const auth_1 = require("firebase-admin/auth");
function getAdminDb() {
    return (0, firestore_1.getFirestore)(getAdminApp());
}
function getAdminAuth() {
    return (0, auth_1.getAuth)(getAdminApp());
}

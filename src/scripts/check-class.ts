import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('secrets/firebase-admin.json', 'utf8'));
if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function run() {
    const classId = 'yu1XM4d6aFMziBFQgNYC';
    const doc = await db.collection('classes').doc(classId).get();
    const data = doc.data();
    console.log("Overrides:", JSON.stringify(data?.scheduleOverrides, null, 2));
    console.log("Extra Sessions:", JSON.stringify(data?.extraSessions, null, 2));
}

run();

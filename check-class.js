import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const fbConfig = JSON.parse(readFileSync('firebase_config.json', 'utf8'));
const app = initializeApp(fbConfig);
const db = getFirestore(app);

async function main() {
    const classId = '7DWtLaZjKr9IwAVRZQIR';
    const docRef = doc(db, 'classes', classId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
        console.log('Class not found');
        return;
    }
    const data = snap.data();
    console.log(JSON.stringify({
        startDate: data.startDate,
        scheduleOverrides: data.scheduleOverrides,
        extraSessions: data.extraSessions
    }, null, 2));
    process.exit(0);
}

main().catch(console.error);

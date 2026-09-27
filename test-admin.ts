import { getAdminDb } from './src/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

async function test() {
    try {
        const db = getAdminDb();
        const res = await db.collection('hangout_questions').add({
            text: 'Teste local',
            author: 'Anônimo',
            answered: false,
            createdAt: Timestamp.now()
        });
        console.log('Success!', res.id);
    } catch (e) {
        console.error('Failed:', e);
    }
}

test();

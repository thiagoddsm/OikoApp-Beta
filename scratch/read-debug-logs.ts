import { getAdminDb } from '../src/lib/firebase-admin';

async function main() {
    const db = getAdminDb();
    const snaps = await db.collection('gc_bot_debug')
        .orderBy('receivedAt', 'desc')
        .limit(10)
        .get();

    snaps.forEach((doc: any) => {
        const data = doc.data();
        if (data.responseType === 'poll') {
            console.log('--- POLL EVENT ---');
            console.log('fromPhone:', data.fromPhone);
            console.log('payload:', JSON.stringify(data.payload, null, 2));
            console.log('rawPollUpdate:', JSON.stringify(data.rawPollUpdate, null, 2));
            console.log('receivedAt:', data.receivedAt.toDate());
        } else if (data.responseType === 'button') {
            console.log('--- BUTTON EVENT ---');
            console.log('fromPhone:', data.fromPhone);
            console.log('payload:', JSON.stringify(data.payload, null, 2));
            console.log('receivedAt:', data.receivedAt.toDate());
        }
    });
}

main().catch(console.error);

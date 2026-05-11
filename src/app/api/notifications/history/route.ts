import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const db = getAdminDb();
        const historySnap = await db.collection('notifications_history')
            .orderBy('sentAt', 'desc')
            .limit(20)
            .get();

        const broadcasts = historySnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            sentAt: (doc.data().sentAt as any)?.toDate?.() || doc.data().sentAt
        }));

        return NextResponse.json({ success: true, broadcasts });
    } catch (error: any) {
        console.error('Fetch History Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
    try {
        const db = getAdminDb();
        const { searchParams } = new URL(request.url);
        const broadcastId = searchParams.get('broadcastId');

        // Se um broadcastId específico foi pedido, retornar os telefones dos destinatários
        if (broadcastId) {
            const sentSnap = await db.collection('notifications_sent_messages')
                .where('broadcastId', '==', broadcastId)
                .limit(500)
                .get();
            
            const recipients = sentSnap.docs.map(d => d.data().recipient);
            return NextResponse.json({ success: true, recipients });
        }

        // Caso contrário, retornar lista de broadcasts
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

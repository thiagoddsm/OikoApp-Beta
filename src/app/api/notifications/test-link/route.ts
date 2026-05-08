import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const db = getAdminDb();
        const phone = '5521989001302';
        const jid = '5521989001302@s.whatsapp.net';
        const lid = '43817323462720@lid';
        const name = 'Thiago Dias';

        const contactRef = db.collection('notifications_contacts').doc(phone);
        await contactRef.set({
            phoneNumber: phone,
            jid: jid,
            lid: lid,
            name: name,
            updatedAt: new Date(),
        }, { merge: true });

        // Redundância sem o 55
        await db.collection('notifications_contacts').doc('21989001302').set({
            phoneNumber: '21989001302',
            jid: jid,
            lid: lid,
            name: name,
            updatedAt: new Date(),
        }, { merge: true });

        return NextResponse.json({ success: true, message: `Thiago Dias vinculado com LID ${lid}` });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

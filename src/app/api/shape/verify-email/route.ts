import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ found: false });
    const db = getAdminDb();
    const snap = await db.collection('users').where('email', '==', email.toLowerCase().trim()).limit(1).get();
    if (snap.empty) return NextResponse.json({ found: false });
    const doc = snap.docs[0];
    const data = doc.data();
    const maskName = (n: string) => n ? n.split(' ').map(p => p.length <= 1 ? p : p[0] + '*'.repeat(p.length - 1)).join(' ') : '';
    const maskPhone = (p: any) => { const d = String(p||'').replace(/\D/g,''); return d.length < 4 ? '****' : `(${d.substring(0,2)}) *****-${d.slice(-2)}`; };
    return NextResponse.json({ found: true, userId: doc.id, maskedName: maskName(data.name), maskedPhone: maskPhone(data.phone) });
  } catch(e) {
    console.error(e);
    return NextResponse.json({ found: false });
  }
}

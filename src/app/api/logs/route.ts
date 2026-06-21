import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection('gc_bot_debug').orderBy('receivedAt', 'desc').limit(20).get();
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data(), receivedAt: d.data().receivedAt.toDate() }));
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

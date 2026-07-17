import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection('saved_schedules').limit(10).get();
    const docs = snap.docs.map(doc => ({
      id: doc.id,
      month: doc.data().month,
      areaId: doc.data().areaId,
      scheduleLength: doc.data().schedule?.length || 0,
      firstItem: doc.data().schedule?.[0] || null
    }));
    return NextResponse.json({ success: true, docs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

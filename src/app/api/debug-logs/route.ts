import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET() {
  const db = getAdminDb();
  const snapshot = await db.collection('gc_bot_debug').orderBy('timestamp', 'desc').limit(10).get();
  const logs: any[] = [];
  snapshot.forEach(doc => {
    logs.push(doc.data());
  });
  return NextResponse.json(logs);
}

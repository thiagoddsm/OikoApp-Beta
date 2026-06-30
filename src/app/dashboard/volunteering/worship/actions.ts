'use server';

import { getAdminDb } from '@/lib/firebase-admin';

export async function syncLiveWorshipOrder(data: {
  items: any[];
  cultInfo: any;
  liveState: any;
}) {
  try {
    const db = getAdminDb();
    const docRef = db.doc('artifacts/gestao-de-culto/public/data/worship-order/singleton');
    await docRef.set(data, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error('Error syncing live worship order:', error);
    return { success: false, error: error?.message || String(error) };
  }
}

'use server';

import { getAdminDb } from '@/lib/firebase-admin';

export async function submitCheckIn(params: {
  areaId: string;
  month: string;
  eventName: string;
  date: string;
  slotIndex: number;
  memberId: string;
}) {
  const { areaId, month, eventName, date, slotIndex, memberId } = params;
  try {
    const db = getAdminDb();
    const docId = `${areaId}_${month}`;
    const docRef = db.collection('saved_schedules').doc(docId);
    
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists) {
        throw new Error('Escala não encontrada.');
      }
      
      const data = snap.data() || {};
      const checkIns = data.checkIns || {};
      const checkInKey = `${date}_${eventName}_${slotIndex}`;
      
      checkIns[checkInKey] = {
        status: 'present',
        memberId: memberId,
        timestamp: new Date(),
        method: 'qr_code'
      };
      
      transaction.update(docRef, { checkIns });
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("Public checkin failed:", error);
    return { success: false, error: error.message };
  }
}

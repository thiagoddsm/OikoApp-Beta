'use server';

import { getAdminDb } from '@/lib/firebase-admin';

export async function getPublicCheckInData(areaId: string, dateParam: string) {
  try {
    const db = getAdminDb();
    
    // 1. Fetch Area Name
    const areaSnap = await db.collection('areas_of_service').doc(areaId).get();
    if (!areaSnap.exists) {
      throw new Error('Área de serviço não encontrada.');
    }
    const areaData = areaSnap.data() || {};
    const areaName = areaData.name || '';

    // 2. Parse Date
    const [year, month, day] = dateParam.split('-');
    const monthString = `${year}-${month}`;
    const formattedDate = `${day}/${month}/${year}`;
    
    // 3. Fetch Saved Schedule
    const docId = `${areaId}_${monthString}`;
    const scheduleSnap = await db.collection('saved_schedules').doc(docId).get();
    if (!scheduleSnap.exists) {
      return { 
        success: true, 
        data: {
          areaName,
          date: formattedDate,
          slots: [],
          monthString
        }
      };
    }
    
    const scheduleData = scheduleSnap.data() || {};
    const allSlots = scheduleData.schedule || [];
    
    // Filter slots for this date
    const daySlots = allSlots.filter((item: any) => item.date === formattedDate);
    
    // Get unique member IDs
    const memberIds = Array.from(new Set(daySlots.flatMap((s: any) => s.memberIds || []).filter(Boolean))) as string[];
    
    // Fetch names for these members
    const memberNames: Record<string, string> = {};
    await Promise.all(memberIds.map(async (id) => {
      const uSnap = await db.collection('users').doc(id).get();
      if (uSnap.exists) {
        memberNames[id] = uSnap.data()?.name || 'Voluntário';
      }
    }));

    // Map slots with names and check-in statuses
    const checkIns = scheduleData.checkIns || {};
    const slots = daySlots.map((item: any) => {
      const checkInKey = `${item.date}_${item.eventName}_${item.slotIndex || 0}`;
      const checkIn = checkIns[checkInKey];
      const volunteerId = item.memberIds?.[0] || '';
      return {
        eventName: item.eventName,
        slotIndex: item.slotIndex || 0,
        teamName: item.teamName || '',
        volunteerId,
        volunteerName: volunteerId ? (memberNames[volunteerId] || 'Voluntário') : '',
        checkInStatus: checkIn?.status || 'pending'
      };
    });

    return {
      success: true,
      data: {
        areaName,
        date: formattedDate,
        slots,
        monthString
      }
    };
  } catch (error: any) {
    console.error("getPublicCheckInData failed:", error);
    return { success: false, error: error.message };
  }
}

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

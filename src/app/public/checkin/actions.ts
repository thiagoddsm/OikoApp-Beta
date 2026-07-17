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
    
    // 3. Fetch all volunteers for this area
    const volunteersSnap = await db.collection('users')
      .where('serviceAreaId', '==', areaId)
      .get();
      
    const worshipSnap = await db.collection('users')
      .where('worshipAreaId', '==', areaId)
      .get();

    const allVolunteersMap = new Map();
    volunteersSnap.docs.forEach(doc => {
      allVolunteersMap.set(doc.id, doc.data().name || 'Voluntário');
    });
    worshipSnap.docs.forEach(doc => {
      allVolunteersMap.set(doc.id, doc.data().name || 'Voluntário');
    });

    const areaVolunteers = Array.from(allVolunteersMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // 4. Fetch Saved Schedule
    const docId = `${areaId}_${monthString}`;
    const scheduleSnap = await db.collection('saved_schedules').doc(docId).get();
    if (!scheduleSnap.exists) {
      return { 
        success: true, 
        data: {
          areaName,
          date: formattedDate,
          slots: [],
          monthString,
          areaVolunteers
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

    // Add avulso checkins that might exist
    const avulsoCheckins: any[] = [];
    Object.keys(checkIns).forEach(key => {
      if (key.startsWith(`${formattedDate}_avulso_`)) {
        const checkIn = checkIns[key];
        const vId = checkIn.memberId;
        avulsoCheckins.push({
          eventName: 'Serviço Voluntário Extra',
          slotIndex: -1,
          teamName: 'Extra',
          volunteerId: vId,
          volunteerName: allVolunteersMap.get(vId) || 'Voluntário Extra',
          checkInStatus: 'present',
          isAvulso: true
        });
      }
    });

    return {
      success: true,
      data: {
        areaName,
        date: formattedDate,
        slots: [...slots, ...avulsoCheckins],
        monthString,
        areaVolunteers
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
  isAvulso?: boolean;
}) {
  const { areaId, month, eventName, date, slotIndex, memberId, isAvulso } = params;
  try {
    const db = getAdminDb();
    const docId = `${areaId}_${month}`;
    const docRef = db.collection('saved_schedules').doc(docId);
    
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);
      
      // If document doesn't exist (e.g. no scale generated yet but doing checkin), initialize it
      const scheduleData = snap.exists ? (snap.data() || {}) : {
        areaId,
        month,
        schedule: [],
        confirmations: {}
      };
      
      const checkIns = scheduleData.checkIns || {};
      const checkInKey = isAvulso 
        ? `${date}_avulso_${memberId}` 
        : `${date}_${eventName}_${slotIndex}`;
      
      checkIns[checkInKey] = {
        status: 'present',
        memberId: memberId,
        timestamp: new Date(),
        method: 'qr_code'
      };
      
      if (!snap.exists) {
        transaction.set(docRef, { ...scheduleData, checkIns });
      } else {
        transaction.update(docRef, { checkIns });
      }
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("Public checkin failed:", error);
    return { success: false, error: error.message };
  }
}

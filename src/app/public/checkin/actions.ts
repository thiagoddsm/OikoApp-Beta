'use server';

import { getAdminDb } from '@/lib/firebase-admin';

export async function getPublicCheckInData(areaId: string | null, dateParam: string) {
  try {
    const db = getAdminDb();
    
    // 1. Parse Date
    const [year, month, day] = dateParam.split('-');
    const monthString = `${year}-${month}`;
    const formattedDate = `${day}/${month}/${year}`;
    
    // 2. Fetch all areas of service to map IDs to Names
    const areasSnap = await db.collection('areas_of_service').get();
    const areasMap = new Map();
    const allAreas: { id: string, name: string }[] = [];
    areasSnap.docs.forEach(doc => {
      areasMap.set(doc.id, doc.data().name || 'Área');
      allAreas.push({ id: doc.id, name: doc.data().name || 'Área' });
    });
    allAreas.sort((a, b) => a.name.localeCompare(b.name));

    // 3. If no areaId is selected, return the list of active areas for this date
    if (!areaId) {
      const schedulesSnap = await db.collection('saved_schedules')
        .where('month', '==', monthString)
        .get();
        
      const activeAreas: { id: string, name: string }[] = [];
      schedulesSnap.docs.forEach(doc => {
        const data = doc.data();
        const hasDate = data.schedule?.some((item: any) => item.date === formattedDate);
        if (hasDate) {
          activeAreas.push({
            id: data.areaId,
            name: areasMap.get(data.areaId) || 'Área Desconhecida'
          });
        }
      });
      
      activeAreas.sort((a, b) => a.name.localeCompare(b.name));

      return {
        success: true,
        data: {
          date: formattedDate,
          activeAreas,
          allAreas,
          monthString
        }
      };
    }

    // 4. If areaId is provided, fetch volunteers and slots for that area
    const areaName = areasMap.get(areaId) || 'Área Desconhecida';

    // Fetch all volunteers for this area
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

    // Fetch Saved Schedule
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

    // Map slots with names and check-in/out statuses
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
        checkInStatus: checkIn?.status || 'pending',
        checkInTime: checkIn?.checkInTime || (checkIn?.timestamp ? new Date(checkIn.timestamp.toMillis ? checkIn.timestamp.toMillis() : checkIn.timestamp).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) : null),
        checkOutTime: checkIn?.checkOutTime || null,
        badgeReturned: checkIn?.badgeReturned ?? false
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
          checkInStatus: checkIn?.status || 'present',
          checkInTime: checkIn?.checkInTime || (checkIn?.timestamp ? new Date(checkIn.timestamp.toMillis ? checkIn.timestamp.toMillis() : checkIn.timestamp).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) : null),
          checkOutTime: checkIn?.checkOutTime || null,
          badgeReturned: checkIn?.badgeReturned ?? false,
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
      
      const now = new Date();
      const timeFormatted = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

      const existingData = checkIns[checkInKey] || {};

      checkIns[checkInKey] = {
        ...existingData,
        status: 'present',
        memberId: memberId,
        checkInTime: timeFormatted,
        checkInTimestamp: now.toISOString(),
        badgeGiven: true,
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

export async function submitCheckOut(params: {
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
      if (!snap.exists) throw new Error("Escala não encontrada.");

      const scheduleData = snap.data() || {};
      const checkIns = scheduleData.checkIns || {};
      const checkInKey = isAvulso 
        ? `${date}_avulso_${memberId}` 
        : `${date}_${eventName}_${slotIndex}`;

      const now = new Date();
      const timeFormatted = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

      const existingData = checkIns[checkInKey] || {};

      let durationMinutes = null;
      if (existingData.checkInTimestamp) {
        const inDate = new Date(existingData.checkInTimestamp);
        const diffMs = now.getTime() - inDate.getTime();
        durationMinutes = Math.round(diffMs / (1000 * 60));
      }

      checkIns[checkInKey] = {
        ...existingData,
        status: 'checked_out',
        checkOutTime: timeFormatted,
        checkOutTimestamp: now.toISOString(),
        durationMinutes,
        badgeReturned: true
      };

      transaction.update(docRef, { checkIns });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Public checkout failed:", error);
    return { success: false, error: error.message };
  }
}

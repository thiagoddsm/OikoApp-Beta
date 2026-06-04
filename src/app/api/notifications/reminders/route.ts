import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  return handleReminders(request);
}

export async function POST(request: Request) {
  return handleReminders(request);
}

async function handleReminders(request: Request) {
  try {
    const db = getAdminDb();
    
    // 1. Validar Token Secreto (se configurado nas variáveis de ambiente)
    const { searchParams } = new URL(request.url);
    const clientSecret = searchParams.get('secret') || request.headers.get('x-cron-secret');
    const systemSecret = process.env.CRON_SECRET;
    
    if (systemSecret && clientSecret !== systemSecret) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    // 2. Calcular data de amanhã no fuso de Brasília (UTC-3)
    const now = new Date();
    const utcOffset = now.getTimezoneOffset(); // em minutos
    const brTime = new Date(now.getTime() - (utcOffset * 60 * 1000) - (3 * 3600 * 1000));
    const tomorrow = new Date(brTime.getTime() + 24 * 3600 * 1000);
    
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const year = tomorrow.getFullYear();
    const tomorrowStr = `${day}/${month}/${year}`;

    // 3. Buscar configurações do WhatsApp
    const configSnap = await db.collection('config').doc('notifications').get();
    if (!configSnap.exists) {
      return NextResponse.json({ error: "Configurações de notificação não encontradas." }, { status: 500 });
    }
    const configData = configSnap.data();
    const apiKey = configData?.instanceKey || configData?.whatsappApiKey;
    const serverUrl = configData?.serverUrl || 'https://us.api-wa.me';

    if (!apiKey) {
      return NextResponse.json({ error: "WhatsApp Gateway não configurado." }, { status: 500 });
    }

    // 4. Buscar usuários com telefone
    const usersSnap = await db.collection('users').get();
    const userMap = new Map();
    usersSnap.forEach(d => {
      const data = d.data();
      if (data.phone) {
        userMap.set(d.id, {
          name: data.name || 'Membro',
          phone: data.phone
        });
      }
    });

    // 5. Buscar áreas de serviço
    const areasSnap = await db.collection('areas_of_service').get();
    const areaMap = new Map();
    areasSnap.forEach(d => {
      areaMap.set(d.id, d.data().name);
    });

    // 6. Buscar números na blacklist
    const blacklistNumbers = new Set<string>();
    try {
      const blacklistSnap = await db.collection('notifications_blacklist').get();
      blacklistSnap.forEach(doc => {
        const phone = doc.id.replace(/\D/g, '');
        if (phone) blacklistNumbers.add(phone);
      });
    } catch (e: any) {
      console.warn("Falha ao ler blacklist:", e.message);
    }

    // 7. Buscar escalas salvas e filtrar itens para amanhã
    const schedulesSnap = await db.collection('saved_schedules').get();
    const remindersToSend: {
      volunteerId: string;
      volunteerName: string;
      phone: string;
      areaName: string;
      eventName: string;
      teamName: string | null;
    }[] = [];

    schedulesSnap.forEach(doc => {
      const data = doc.data();
      const areaId = data.areaId;
      const areaName = areaMap.get(areaId) || 'Serviço';
      const scheduleList = data.schedule || [];

      scheduleList.forEach((item: any) => {
        if (item.date === tomorrowStr && item.memberIds && item.memberIds.length > 0) {
          item.memberIds.forEach((mId: string) => {
            const u = userMap.get(mId);
            if (u) {
              const cleanedPhone = u.phone.replace(/\D/g, '');
              if (!blacklistNumbers.has(cleanedPhone)) {
                remindersToSend.push({
                  volunteerId: mId,
                  volunteerName: u.name,
                  phone: u.phone,
                  areaName,
                  eventName: item.eventName,
                  teamName: item.teamName || null
                });
              }
            }
          });
        }
      });
    });

    if (remindersToSend.length === 0) {
      return NextResponse.json({ success: true, message: `Nenhum voluntário escalado para amanhã (${tomorrowStr}).` });
    }

    // 8. Agrupar por voluntário para enviar mensagem consolidada
    const grouped = new Map<string, typeof remindersToSend>();
    remindersToSend.forEach(r => {
      const list = grouped.get(r.volunteerId) || [];
      list.push(r);
      grouped.set(r.volunteerId, list);
    });

    // 9. Inicializar WhatsApp Client
    const { getWhatsAppClient, formatWhatsAppNumber } = await import('@/lib/whatsapp');
    const whatsapp = await getWhatsAppClient({ server: serverUrl, key: apiKey });

    let sentCount = 0;
    let errorCount = 0;

    for (const [volunteerId, list] of grouped.entries()) {
      const first = list[0];
      const firstName = first.volunteerName.trim().split(' ')[0];
      const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

      let scheduleText = '';
      if (list.length === 1) {
        scheduleText = `na área de ${first.areaName}:\n\n• ${first.eventName}${first.teamName ? ` [Equipe ${first.teamName}]` : ''}`;
      } else {
        scheduleText = `nas seguintes áreas:\n\n` + list.map(item => `• Área ${item.areaName}: ${item.eventName}${item.teamName ? ` [Equipe ${item.teamName}]` : ''}`).join('\n');
      }

      const message = `Olá, ${capitalizedFirstName}! 🗓️ Passando para lembrar da sua escala de voluntariado amanhã (${tomorrowStr}) ${scheduleText}\n\nContamos com você! Em caso de imprevistos, avise sua liderança o quanto antes.`;
      const formattedPhone = formatWhatsAppNumber(first.phone);

      try {
        await whatsapp.sendMessage({
          type: 'text',
          body: {
            to: formattedPhone,
            text: message
          }
        });
        sentCount++;
      } catch (err: any) {
        errorCount++;
        console.error(`Erro ao enviar lembrete automático para ${first.volunteerName}:`, err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processamento concluído para amanhã (${tomorrowStr}).`,
      sentCount,
      errorCount
    });

  } catch (error: any) {
    console.error("API Reminders Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { getAdminDb } from '@/lib/firebase-admin';
import { getWhatsAppClient } from '@/lib/whatsapp';

export interface GcReportSession {
  id: string; // Telefone do lÃ­der formatado (ex: 5521999998888)
  cellId: string;
  liderId: string;
  step: 'START' | 'CHOOSE_CHANNEL' | 'CHECK_MEETING' | 'MEETING_STATUS_CHOICE' | 'POSTPONED_DATE' | 'CANCELLED_REASON' | 'ATTENDANCE' | 'ATTENDANCE_CONFIRM' | 'CARE_CHOICE' | 'CARE_SELECT' | 'CARE_MEMBER_THERMOMETER' | 'CARE_MEMBER_PRAYER' | 'METRICS_LESSON' | 'EXPECTED_VISITORS_POLL' | 'METRICS_VISITORS' | 'METRICS_CONVERSIONS' | 'FEEDBACK' | 'SUMMARY_CONFIRM';
  members: { id: string; name: string }[];
  expectedVisitors?: { id: string; name: string; phone: string }[];
  
  // Modo EdiÃ§Ã£o de RelatÃ³rio
  editingLogId?: string;

  // Controle de reuniÃ£o (Adiada ou Cancelada)
  meetingOccurred?: boolean;
  meetingStatus?: 'postponed' | 'cancelled';
  postponedDate?: string;
  cancelledReason?: string;
  
  // Controle da Chamada
  attendancePage?: number;
  attendanceAccumulated?: string[]; // IDs dos membros marcados como presentes
  pollSelections?: any; // Mapeamento de seleÃ§Ãµes das enquetes

  // Controle do ResponsÃ¡vel que estÃ¡ respondendo
  respondentId?: string;
  respondentName?: string;
  respondentRole?: 'secretario' | 'lider';

  // Controle de Cuidado
  careMembersQueue?: string[];      // IDs dos membros que precisam de cuidado
  currentCareIndex?: number;        // Ãndice na fila de cuidado
  careSelections?: any; // Mapeamento de seleÃ§Ãµes de cuidado
  
  attendance: { [memberId: string]: 'presente' | 'ausente_sem_justificativa' };
  thermometers?: { [memberId: string]: { termometro: number; pedidoOracao: string } };
  
  metrics: {
    licao: string;
    visitantes: string;
    conversoes: number;
  };
  feedback: string;
  pendingFeedback?: string;
  isTestData?: boolean;
  createdAt: any;
  updatedAt: any;
}

/**
 * Envia uma mensagem com botÃµes interativos.
 */
async function sendButtons(to: string, text: string, buttons: { id: string; text: string }[], title?: string) {
  const whatsapp = await getWhatsAppClient();
  await whatsapp.sendMessage({
    type: 'button',
    body: {
      to,
      text,
      title,
      buttons
    }
  });
}

async function sendText(to: string, text: string) {
  const whatsapp = await getWhatsAppClient();
  await whatsapp.sendMessage({
    type: 'text',
    body: {
      to,
      text
    }
  });
}

/**
 * Envia um botÃ£o interativo via WAME.
 * Quando o usuÃ¡rio clica, o Evolution recebe a resposta como buttonsResponseMessage.
 */
async function sendButton(to: string, text: string, buttons: { id: string, text: string }[], title?: string, footer?: string) {
  const whatsapp = await getWhatsAppClient();
  await whatsapp.sendMessage({
    type: 'button',
    body: {
      to,
      text,
      title,
      footer,
      buttons
    }
  });
}


/**
 * Envia uma mensagem de lista interativa (Menu).
 */
async function sendList(to: string, text: string, buttonText: string, sections: any[], title?: string, footer?: string) {
  const whatsapp = await getWhatsAppClient();
  await whatsapp.sendMessage({
    type: 'list',
    body: {
      to,
      text,
      buttonText,
      title,
      footer,
      sections
    }
  });
}

/**
 * Envia uma enquete de mÃºltipla escolha.
 */
async function sendPoll(to: string, name: string, options: string[], selectableCount: number) {
  const whatsapp = await getWhatsAppClient();
  await whatsapp.sendMessage({
    type: 'poll',
    body: {
      to,
      name,
      options,
      selectableCount
    }
  });
}

async function sendMembersListAsPoll(to: string, membersList: { id: string; name: string }[], isCare: boolean) {
  const whatsapp = await getWhatsAppClient();
  const title = isCare ? 'Quem precisa de CUIDADO?' : 'Quem estava PRESENTE?';
  if (membersList.length === 0) {
    await sendText(to, 'Nenhum membro encontrado na cÃ©lula.');
    return;
  }

  const chunkSize = 10;
  for (let i = 0; i < membersList.length; i += chunkSize) {
    const chunk = membersList.slice(i, i + chunkSize);
    const options = chunk.map(m => m.name.substring(0, 50));
    
    let pollName = title;
    if (membersList.length > chunkSize) {
      pollName = `${title} (Parte ${Math.floor(i / chunkSize) + 1})`;
    }
    
    await whatsapp.sendMessage({
      type: 'poll',
      body: {
        to,
        name: pollName,
        options,
        selectableCount: options.length
      }
    });

    // Delay entre enquetes para garantir ordem de chegada
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // Delay adicional antes do botÃ£o de concluir para chegar DEPOIS das enquetes
  await new Promise(resolve => setTimeout(resolve, 1500));

  const buttonId = isCare ? 'care_done' : 'attendance_done';
  const buttonText = isCare ? 'Concluir SeleÃ§Ã£o' : 'Concluir Chamada';
  await sendButton(
    to,
    'ðŸ‘‰ Quando terminar de marcar na(s) enquete(s) acima, clique no botÃ£o abaixo para avanÃ§armos.',
    [{ id: buttonId, text: buttonText }],
    'Igreja Batista da ManhÃ£',
    'OpÃ§Ãµes do RelatÃ³rio'
  );

}

/**
 * Inicializa a sessÃ£o do relatÃ³rio de GC para um secretÃ¡rio ou lÃ­der.
 */
export async function startGcReportSession(
  cellId: string, 
  recipientPhone: string, 
  isTestData = false,
  recipientInfo?: { userId?: string; name?: string; role?: 'secretario' | 'lider' },
  editingLogId?: string
): Promise<boolean> {
  const db = getAdminDb();
  const sessionRef = db.collection('gc_report_sessions').doc(recipientPhone);

  try {
    // 1. Limpar sessÃ£o antiga se existir
    const existingSession = await sessionRef.get();
    if (existingSession.exists) {
      console.log(`[GC Bot] SessÃ£o anterior encontrada para ${recipientPhone}. Deletando...`);
      await sessionRef.delete();
    }

    // 2. Buscar informaÃ§Ãµes da cÃ©lula e seus membros
    const cellDoc = await db.collection('cells').doc(cellId).get();
    if (!cellDoc.exists) {
      console.error('[GC Bot] CÃ©lula nÃ£o encontrada:', cellId);
      throw new Error('CÃ©lula nÃ£o encontrada.');
    }
    const cellData = cellDoc.data()!;
    const liderId = cellData.liderId || '';

    // OpÃ§Ã£o B: busca membros por hierarchy.celulaId â€” fonte Ãºnica de verdade.
    // TODO (OpÃ§Ã£o C): substituir por query na coleÃ§Ã£o /memberships quando migrar para multi-igreja.
    const usersSnap = await db.collection('users')
      .where('hierarchy.celulaId', '==', cellId)
      .get();

    const membersList: { id: string; name: string }[] = [];
    usersSnap.forEach(snap => {
      if (snap.exists) {
        const role = snap.data().hierarchy?.role;
        // Exclude visitantes from members list â€” they get their own poll
        if (role !== 'visitante') {
          membersList.push({ id: snap.id, name: snap.data().name || 'Membro' });
        }
      }
    });
    membersList.sort((a, b) => a.name.localeCompare(b.name));

    // Load expected visitors:
    // 1. Portal-registered via /gc or /conectar (consolidationStatus not integrated)
    // 2. Manually flagged as isEsperado by the leader in the dashboard
    const expectedVisitorsList = (cellData.visitors || []).filter(
      (v: any) => v.consolidationStatus !== 'integrated' &&
        (v.origin?.includes('/conectar') || v.origin?.includes('/gc') || v.isEsperado === true)
    ).map((v: any) => ({ id: v.id, name: v.name, phone: v.phone || '' }));

    // 3. Resolver identificaÃ§Ã£o do responsÃ¡vel (SecretÃ¡rio ou LÃ­der)
    let respondentName = recipientInfo?.name || '';
    let respondentRole: 'secretario' | 'lider' = recipientInfo?.role || 'lider';
    let respondentId = recipientInfo?.userId || '';

    if (!respondentName) {
      const secId = cellData.secretariaId || (cellData as any).secretarioId;
      if (secId) {
        const secDoc = await db.collection('users').doc(secId).get();
        if (secDoc.exists) {
          const secData = secDoc.data() || {};
          const secPhone = secData.phone || secData.phoneNumber;
          if (secPhone && recipientPhone.includes(String(secPhone).replace(/\D/g, '').slice(-8))) {
            respondentName = secData.name || 'SecretÃ¡rio(a)';
            respondentRole = 'secretario';
            respondentId = secId;
          }
        }
      }

      if (!respondentName && liderId) {
        const liderDoc = await db.collection('users').doc(liderId).get();
        if (liderDoc.exists) {
          respondentName = liderDoc.data()!.name || 'LÃ­der';
          respondentRole = 'lider';
          respondentId = liderId;
        }
      }
    }

    const firstName = respondentName ? ` ${respondentName.split(' ')[0]}` : '';
    const roleLabel = respondentRole === 'secretario' ? 'secretÃ¡rio(a)' : 'lÃ­der';

    // 4. Enviar mensagem de boas-vindas com escolha de canal (WhatsApp simplificado vs Link completo)
    console.log(`[GC Bot] Enviando fluxo de relatÃ³rio para ${recipientPhone} (${roleLabel}: ${respondentName}, editando: ${!!editingLogId})...`);

    const greetingText = editingLogId
      ? `OlÃ¡, ${roleLabel}${firstName}! ðŸ‘‹\n\nðŸ”„ *Modo de EdiÃ§Ã£o de RelatÃ³rio*\nVamos revisar os dados da reuniÃ£o do GC *${cellData.nome || 'CÃ©lula'}*.\n\nComo vocÃª prefere preencher o relatÃ³rio?\n1ï¸âƒ£ *No WhatsApp* (simplificado)\n2ï¸âƒ£ *Pelo Link* (completo com tela de chamada)`
      : `OlÃ¡, ${roleLabel}${firstName}! ðŸ‘‹\nQue a paz do Senhor esteja com vocÃª!\n\nChegou a hora de registrar as bÃªnÃ§Ã£os da reuniÃ£o do GC *${cellData.nome || 'CÃ©lula'}* desta semana.\n\nComo vocÃª prefere responder o relatÃ³rio?\n1ï¸âƒ£ *No WhatsApp* (simplificado)\n2ï¸âƒ£ *Pelo Link* (completo com lista de presenÃ§a na tela)`;

    // 4. Salvar estado da sessÃ£o na coleÃ§Ã£o `gc_report_sessions`
    const now = new Date();
    const newSession: GcReportSession = {
      id: recipientPhone,
      cellId,
      liderId,
      respondentId: respondentId || liderId,
      respondentName: respondentName || undefined,
      respondentRole,
      editingLogId: editingLogId || undefined,
      step: 'CHOOSE_CHANNEL',
      members: membersList,
      expectedVisitors: expectedVisitorsList,
      attendancePage: 0,
      attendanceAccumulated: [],
      careMembersQueue: [],
      currentCareIndex: 0,
      attendance: {},
      thermometers: {},
      metrics: {
        licao: '',
        visitantes: '',
        conversoes: 0
      },
      feedback: '',
      isTestData,
      createdAt: now,
      updatedAt: now
    };

    await sessionRef.set(newSession);

    // 5. Enviar mensagem de boas-vindas com escolha de canal (WhatsApp simplificado vs Link completo)
    try {
      await sendButton(
        recipientPhone,
        greetingText,
        [
          { id: 'channel_whatsapp', text: 'ðŸ’¬ No WhatsApp' },
          { id: 'channel_link', text: 'ðŸ”— Pelo Link' }
        ],
        editingLogId ? 'EdiÃ§Ã£o de RelatÃ³rio' : 'RelatÃ³rio Semanal de GC'
      );
      console.log(`[GC Bot] Mensagem inicial enviada com sucesso para ${recipientPhone} (cÃ©lula: ${cellData.nome})`);
      return true;
    } catch (sendErr: any) {
      console.error(`[GC Bot] Falha ao enviar mensagem WhatsApp para ${recipientPhone}:`, sendErr.message || sendErr);
      // Limpar sessÃ£o para nÃ£o ficar travada se o envio do WhatsApp falhou
      await sessionRef.delete().catch(() => {});
      throw sendErr;
    }
  } catch (error) {
    console.error('[GC Bot] Erro ao iniciar sessÃ£o:', error);
    return false;
  }
}

/**
 * Localiza a cÃ©lula do remetente e o Ãºltimo relatÃ³rio para permitir ediÃ§Ã£o.
 */
export async function startGcReportEditSession(fromPhone: string): Promise<boolean> {
  const db = getAdminDb();
  const digits = fromPhone.replace(/\D/g, '');
  const last8 = digits.slice(-8);

  if (!last8) return false;

  try {
    // 1. Localizar usuÃ¡rio pelo telefone
    const usersSnap = await db.collection('users').get();
    let foundUser: any = null;
    for (const doc of usersSnap.docs) {
      const data = doc.data();
      const phone = String(data.phone || data.phoneNumber || '').replace(/\D/g, '');
      if (phone && (phone.endsWith(last8) || digits.endsWith(phone.slice(-8)))) {
        foundUser = { id: doc.id, ...data };
        break;
      }
    }

    if (!foundUser) {
      await sendText(fromPhone, 'âš ï¸ NÃ£o encontramos um cadastro de lÃ­der ou secretÃ¡rio associado ao seu nÃºmero de WhatsApp.');
      return false;
    }

    // 2. Localizar a cÃ©lula do usuÃ¡rio
    const cellsSnap = await db.collection('cells').get();
    let foundCell: any = null;
    for (const doc of cellsSnap.docs) {
      const data = doc.data();
      const isLeader = data.liderId === foundUser.id || data.liderCasalId === foundUser.id;
      const isSec = data.secretariaId === foundUser.id || (data as any).secretarioId === foundUser.id;
      const isCoLider = Array.isArray(data.coLiderIds) && data.coLiderIds.includes(foundUser.id);
      if (isLeader || isSec || isCoLider) {
        foundCell = { id: doc.id, ...data };
        break;
      }
    }

    if (!foundCell) {
      await sendText(fromPhone, `âš ï¸ OlÃ¡, ${foundUser.name || 'irmÃ£o(Ã£)'}! NÃ£o encontramos nenhum GC vinculado Ã  sua lideranÃ§a no sistema.`);
      return false;
    }

    // 3. Localizar o Ãºltimo relatÃ³rio da reuniÃ£o em reuniao_logs
    const logsSnap = await db.collection('reuniao_logs')
      .where('cellId', '==', foundCell.id)
      .get();

    if (logsSnap.empty) {
      await sendText(fromPhone, `âš ï¸ O GC *${foundCell.nome || 'CÃ©lula'}* ainda nÃ£o possui nenhum relatÃ³rio registrado para ser editado.`);
      return false;
    }

    // Ordenar em memÃ³ria para garantir o mais recente sem depender de Ã­ndice composto no Firestore
    const sortedLogs = logsSnap.docs.sort((a, b) => {
      const timeA = a.data().createdAt?.toMillis?.() || new Date(a.data().date || 0).getTime();
      const timeB = b.data().createdAt?.toMillis?.() || new Date(b.data().date || 0).getTime();
      return timeB - timeA;
    });
    const lastLogDoc = sortedLogs[0];
    const lastLog = lastLogDoc.data();

    // Notificar e iniciar
    await sendText(
      fromPhone,
      `ðŸ”„ *Editando Ãšltimo RelatÃ³rio*\n\nLocalizamos o relatÃ³rio registrado em *${lastLog.date || 'data recente'}* do GC *${foundCell.nome || 'CÃ©lula'}*.\n\nVamos refazer o lanÃ§amento. As novas respostas substituirÃ£o o relatÃ³rio anterior!`
    );

    await new Promise(r => setTimeout(r, 1500));

    return startGcReportSession(
      foundCell.id,
      fromPhone,
      false,
      { userId: foundUser.id, name: foundUser.name, role: foundCell.secretariaId === foundUser.id ? 'secretario' : 'lider' },
      lastLogDoc.id
    );
  } catch (err: any) {
    console.error('[GC Bot] Erro ao iniciar ediÃ§Ã£o de relatÃ³rio:', err);
    await sendText(fromPhone, 'âš ï¸ Ocorreu um erro ao buscar o Ãºltimo relatÃ³rio para ediÃ§Ã£o. Tente novamente mais tarde.');
    return false;
  }
}

/**
 * Handler principal para processar mensagens recebidas no Webhook vinculadas a sessÃµes ativas.
 * Usa respostas por TEXTO em vez de botÃµes interativos para mÃ¡xima compatibilidade.
 */
export async function handleGcReportIncomingMessage(
  fromPhone: string,
  messageText: string,
  type: 'text' | 'button' | 'poll',
  payload?: any
) {
  const db = getAdminDb();
  const sessionRef = db.collection('gc_report_sessions').doc(fromPhone);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) return false;

  const session = sessionDoc.data() as GcReportSession;
  const now = new Date();
  const msg = messageText.trim().toLowerCase();

  // Comandos globais de controle
  if (type === 'text' && msg === '/reiniciar') {
    await sessionRef.delete();
    await startGcReportSession(session.cellId, fromPhone, session.isTestData);
    return true;
  }

  if (type === 'text' && (msg === '/editar' || msg === 'editar reuniao' || msg === 'editar reuniÃ£o' || msg === 'editar relatorio' || msg === 'editar relatÃ³rio')) {
    await sessionRef.delete();
    await startGcReportEditSession(fromPhone);
    return true;
  }

  if (type === 'text' && (msg === '/whatsapp' || msg === 'whatsapp')) {
    await sessionRef.update({
      step: 'CHECK_MEETING',
      updatedAt: now
    });
    await sendButton(
      fromPhone,
      'Perfeito! Vamos responder aqui pelo WhatsApp. ðŸ’¬\n\nâ“ *Aconteceu a reuniÃ£o do GC esta semana?*',
      [
        { id: 'meeting_yes', text: 'Sim' },
        { id: 'meeting_no', text: 'NÃ£o' }
      ],
      'Status da ReuniÃ£o'
    );
    return true;
  }

  // Helper: detecta palavras de avanÃ§o
  const isAdvanceCommand = (t: string) => [
    'ok', 'pronto', 'avanÃ§ar', 'avancar', 'proximo', 'prÃ³ximo', 'concluir', 'done', 'sim',
    'finalizar lanÃ§amento de presenÃ§a', 'finalizar lanÃ§amento de presenca', 'finalizar chamada'
  ].includes(t.toLowerCase().trim());

  // Helper: delay entre mensagens
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    switch (session.step) {
      case 'START':
        // Se por algum motivo chegou aqui, avanÃ§ar automaticamente
        if (type === 'text') {
          await sessionRef.delete();
          await startGcReportSession(session.cellId, fromPhone, session.isTestData);
        }
        break;

      case 'CHOOSE_CHANNEL': {
        const isWhatsapp = payload?.buttonId === 'channel_whatsapp' ||
          msg.includes('whatsapp') ||
          msg.includes('zap') ||
          msg === '1' ||
          msg.includes('simplificado');
        const isLink = payload?.buttonId === 'channel_link' ||
          msg.includes('link') ||
          msg.includes('site') ||
          msg === '2' ||
          msg.includes('completo') ||
          msg.includes('pagin') ||
          msg.includes('pÃ¡gina');

        if (isWhatsapp) {
          await sessionRef.update({
            step: 'CHECK_MEETING',
            updatedAt: now
          });
          await sendButton(
            fromPhone,
            'Perfeito! Vamos responder aqui pelo WhatsApp. ðŸ’¬\n\nâ“ *Aconteceu a reuniÃ£o do GC esta semana?*',
            [
              { id: 'meeting_yes', text: 'Sim' },
              { id: 'meeting_no', text: 'NÃ£o' }
            ],
            'Status da ReuniÃ£o'
          );
        } else if (isLink) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ibmanha.com.br';
          const link = `${baseUrl}/public/gc-report?cellId=${session.cellId}&phone=${fromPhone}`;

          await sendText(
            fromPhone,
            `Perfeito! ðŸŒŸ\n\nClique no link abaixo para preencher o relatÃ³rio completo com lista de presenÃ§a na tela:\n\nðŸ‘‰ ${link}\n\nðŸ’¡ Basta confirmar seu e-mail para abrir a chamada do seu GC.\n\n_(Se preferir responder pelo WhatsApp a qualquer momento, digite /whatsapp)_`
          );

          await sessionRef.update({
            step: 'CHOOSE_CHANNEL',
            updatedAt: now
          });
        } else {
          await sendButton(
            fromPhone,
            'Por favor, escolha como deseja responder o relatÃ³rio do seu GC:',
            [
              { id: 'channel_whatsapp', text: 'ðŸ’¬ No WhatsApp' },
              { id: 'channel_link', text: 'ðŸ”— Pelo Link' }
            ]
          );
        }
        break;
      }

      case 'CHECK_MEETING': {
        const isYes = payload?.buttonId === 'meeting_yes' || ['sim', 's', '1', 'teve', 'aconteceu', 'meeting_yes'].includes(msg);
        const isNo = payload?.buttonId === 'meeting_no' || ['nÃ£o', 'nao', 'n', '2', 'nÃ£o teve', 'nao teve', 'meeting_no'].includes(msg);

        if (isYes) {
          await sessionRef.update({
            meetingOccurred: true,
            step: 'ATTENDANCE',
            updatedAt: now
          });
          await sendText(
            fromPhone,
            'ðŸ“‹ *Etapa 1: Chamada*\n\nResponda na enquete/lista abaixo quem esteve *PRESENTE* na reuniÃ£o.'
          );
          // Aguardar antes das enquetes para o texto chegar primeiro
          await new Promise(resolve => setTimeout(resolve, 2000));
          await sendMembersListAsPoll(fromPhone, session.members, false);
        } else if (isNo) {
          await sessionRef.update({
            meetingOccurred: false,
            step: 'MEETING_STATUS_CHOICE',
            updatedAt: now
          });
          await sendButton(
            fromPhone,
            'Compreendido. A reuniÃ£o foi *Adiada* para outro dia ou foi *Cancelada* nesta semana?',
            [
              { id: 'status_postponed', text: 'Adiada' },
              { id: 'status_cancelled', text: 'Cancelada' }
            ],
            'Status da ReuniÃ£o'
          );
        } else {
          await sendButton(
            fromPhone,
            'Por favor, escolha uma das opÃ§Ãµes abaixo:\n\nAconteceu a reuniÃ£o do GC esta semana?',
            [
              { id: 'meeting_yes', text: 'Sim' },
              { id: 'meeting_no', text: 'NÃ£o' }
            ]
          );
        }
        break;
      }

      case 'MEETING_STATUS_CHOICE': {
        const isPostponed = payload?.buttonId === 'status_postponed' || ['adiada', 'adiado', '1', 'status_postponed'].includes(msg);
        const isCancelled = payload?.buttonId === 'status_cancelled' || ['cancelada', 'cancelado', '2', 'status_cancelled'].includes(msg);

        if (isPostponed) {
          await sessionRef.update({
            meetingStatus: 'postponed',
            step: 'POSTPONED_DATE',
            updatedAt: now
          });
          await sendText(
            fromPhone,
            'ðŸ“… *Para qual dia a reuniÃ£o foi adiada?*\n\nDigite a nova data ou dia da semana (ex: *Sexta-feira 25/07* ou *28/07*).'
          );
        } else if (isCancelled) {
          await sessionRef.update({
            meetingStatus: 'cancelled',
            step: 'CANCELLED_REASON',
            updatedAt: now
          });
          await sendText(
            fromPhone,
            'âŒ *Qual foi o motivo do cancelamento da reuniÃ£o?*\n\n(ex: *Feriado*, *Encontro de Casais*, *Imprevisto no local*...)'
          );
        } else {
          await sendButton(
            fromPhone,
            'Por favor, informe se a reuniÃ£o foi Adiada ou Cancelada:',
            [
              { id: 'status_postponed', text: 'Adiada' },
              { id: 'status_cancelled', text: 'Cancelada' }
            ]
          );
        }
        break;
      }

      case 'POSTPONED_DATE': {
        if (type === 'text') {
          const newDateText = messageText.trim();
          const reportDate = new Date().toISOString().split('T')[0];

          let cellData: any = {};
          try {
            const cellSnap = await db.collection('cells').doc(session.cellId).get();
            if (cellSnap.exists) cellData = cellSnap.data() || {};
          } catch (err) {
            console.error('[GC Bot] Erro ao buscar cÃ©lula para adiamento:', err);
          }

          // Salva log de reuniÃ£o adiada no Firestore oficial (reuniao_logs)
          const logRef = db.collection('reuniao_logs').doc();
          await logRef.set({
            cellId: session.cellId,
            cellNome: cellData.nome || cellData.name || 'CÃ©lula',
            date: reportDate,
            liderId: session.liderId,
            supervisorId: cellData.supervisorId || cellData.areaId || null,
            statusReuniao: 'postponed',
            novaData: newDateText,
            metricas: {
              totalMembrosAtivos: session.members?.length || 0,
              presentes: 0,
              ausentesJustificados: 0,
              ausentesSemJustificativa: 0,
              visitantes: 0,
              conversoes: 0,
              oferta: 0
            },
            feedbackAoSupervisor: `ReuniÃ£o remarcada/adiada para: ${newDateText}`,
            isTestData: !!session.isTestData,
            createdAt: now
          });

          // MantÃ©m tambÃ©m em gc_reuniao_logs para compatibilidade
          await db.collection('gc_reuniao_logs').doc(logRef.id).set({
            cellId: session.cellId,
            date: reportDate,
            liderId: session.liderId,
            statusReuniao: 'postponed',
            novaData: newDateText,
            isTestData: !!session.isTestData,
            createdAt: now
          });

          // Agendar nova tentativa de coleta de relatÃ³rio no dia seguinte Ã  nova data
          // Tentamos interpretar a data informada pelo lÃ­der
          const scheduleRef = db.collection('gc_report_schedules').doc();
          await scheduleRef.set({
            cellId: session.cellId,
            liderId: session.liderId,
            liderPhone: fromPhone,
            novaData: newDateText,          // data informada pelo lÃ­der (texto livre)
            status: 'pending',
            createdAt: now,
            // O trigger-reports vai checar esse campo para saber se jÃ¡ passou do dia seguinte
            triggerAfter: newDateText       // referencia textual â€” o trigger vai comparar com data atual
          });

          await sendText(
            fromPhone,
            `ðŸ‘ Entendido! A reuniÃ£o foi reagendada para *${newDateText}*.\n\nVou te enviar o formulÃ¡rio de relatÃ³rio automaticamente no dia seguinte. Bom trabalho na lideranÃ§a! ðŸ™`
          );

          await sessionRef.delete();
        }
        break;
      }

      case 'CANCELLED_REASON': {
        if (type === 'text') {
          const reasonText = messageText.trim();
          const reportDate = new Date().toISOString().split('T')[0];

          let cellData: any = {};
          try {
            const cellSnap = await db.collection('cells').doc(session.cellId).get();
            if (cellSnap.exists) cellData = cellSnap.data() || {};
          } catch (err) {
            console.error('[GC Bot] Erro ao buscar cÃ©lula para cancelamento:', err);
          }
          
          // Salva log de reuniÃ£o cancelada no Firestore oficial (reuniao_logs)
          const logRef = db.collection('reuniao_logs').doc();
          await logRef.set({
            cellId: session.cellId,
            cellNome: cellData.nome || cellData.name || 'CÃ©lula',
            date: reportDate,
            liderId: session.liderId,
            supervisorId: cellData.supervisorId || cellData.areaId || null,
            statusReuniao: 'cancelled',
            motivoCancelamento: reasonText,
            metricas: {
              totalMembrosAtivos: session.members?.length || 0,
              presentes: 0,
              ausentesJustificados: 0,
              ausentesSemJustificativa: 0,
              visitantes: 0,
              conversoes: 0,
              oferta: 0
            },
            feedbackAoSupervisor: `ReuniÃ£o cancelada: ${reasonText}`,
            isTestData: !!session.isTestData,
            createdAt: now
          });

          // MantÃ©m tambÃ©m em gc_reuniao_logs para compatibilidade
          await db.collection('gc_reuniao_logs').doc(logRef.id).set({
            cellId: session.cellId,
            date: reportDate,
            liderId: session.liderId,
            statusReuniao: 'cancelled',
            motivoCancelamento: reasonText,
            isTestData: !!session.isTestData,
            createdAt: now
          });

          await sendText(
            fromPhone,
            `ðŸ“Œ Registrado! O motivo do cancelamento (*"${reasonText}"*) foi enviado ao seu supervisor.\n\nDesejamos uma abenÃ§oada semana e nos falamos na prÃ³xima! ðŸ™Œ`
          );

          await sessionRef.delete();
        }
        break;
      }

      case 'ATTENDANCE': {
        const latestDoc = await sessionRef.get();
        const latest = latestDoc.data() as GcReportSession;

        if (type === 'poll' && payload?.selectedOptions) {
          const options = payload.selectedOptions as string[];
          const pollOptionsMap = new Map();
          session.members.forEach((m, i) => {
            pollOptionsMap.set(m.name.substring(0, 50), m.id);
          });
          
           console.log('[GC Bot DEBUG] Poll received options:', JSON.stringify(options));
          console.log('[GC Bot DEBUG] pollOptionsMap keys:', JSON.stringify(Array.from(pollOptionsMap.keys())));

          const selectedMemberIds: string[] = [];
          options.forEach((opt: string) => {
             const cleanOpt = opt.trim().toLowerCase();
             // 1. Procurar por match exato (case-insensitive)
             let id: string | null = null;
             for (const [key, val] of pollOptionsMap.entries()) {
               if (key.trim().toLowerCase() === cleanOpt) {
                 id = val;
                 break;
               }
             }
             // 2. Fallback de aproximaÃ§Ã£o, mas APENAS se o nome for longo (> 5 chars) para evitar falsos positivos
             if (!id && cleanOpt.length > 5) {
               for (const [key, val] of pollOptionsMap.entries()) {
                 const cleanKey = key.trim().toLowerCase();
                 if (cleanKey.length > 5 && (cleanOpt.includes(cleanKey) || cleanKey.includes(cleanOpt))) {
                   id = val;
                   break;
                 }
               }
             }
             if (id) selectedMemberIds.push(id);
          });
          
          console.log('[GC Bot DEBUG] Matched selectedMemberIds:', selectedMemberIds);
          
          let pollSelections: any = latest.pollSelections || {};
          const pollKey = payload.pollId || payload.pollName || 'poll';
          pollSelections[pollKey] = selectedMemberIds;

          await sessionRef.update({
            pollSelections,
            updatedAt: now
          });
          return true; // Aguarda o usuÃ¡rio responder OK
         } else if ((type === 'button' && payload?.buttonId === 'attendance_done') || (type === 'text' && isAdvanceCommand(msg))) {
           // Enviar aviso de sincronizaÃ§Ã£o
           await sendText(fromPhone, 'â³ _Aguardando sincronizaÃ§Ã£o final com o WhatsApp (5 segundos)..._');
           await wait(5000);

           // Computar presentes/ausentes pÃ³s-sincronizaÃ§Ã£o
          let freshDoc = await sessionRef.get();
          let freshSession = freshDoc.data() as GcReportSession;
          let pollSelections: any = freshSession?.pollSelections || {};
          let presentIds: string[] = [];
          
          // Helper para extrair presentes do objeto de seleÃ§Ã£o
          const extractPresentIds = (selections: any) => {
            const ids: string[] = [];
            Object.keys(selections).forEach((key) => {
              const val = selections[key];
              if (Array.isArray(val)) {
                ids.push(...val);
              }
            });
            return [...new Set(ids)];
          };

          presentIds = extractPresentIds(pollSelections);
 
          const attendanceMap: { [memberId: string]: 'presente' | 'ausente' } = {};
          session.members.forEach(member => {
            attendanceMap[member.id] = presentIds.includes(member.id) ? 'presente' : 'ausente';
          });

          const presentCount = presentIds.length;
          const absentCount = session.members.length - presentCount;

          const presentNames = session.members.filter(m => presentIds.includes(m.id)).map(m => m.name);
          const absentNames = session.members.filter(m => !presentIds.includes(m.id)).map(m => m.name);
          
          await sessionRef.update({
            attendance: attendanceMap,
            attendanceAccumulated: presentIds,
            step: 'ATTENDANCE_CONFIRM',
            updatedAt: now
          });
          
          const summaryAttendanceText = `ðŸ“‹ *Resumo da Chamada:*\n\n` +
            `âœ… *Presentes (${presentCount}):*\n${presentNames.length > 0 ? presentNames.map(n => `â€¢ ${n}`).join('\n') : '_Nenhum_'}\n\n` +
            `âŒ *Ausentes (${absentCount}):*\n${absentNames.length > 0 ? absentNames.map(n => `â€¢ ${n}`).join('\n') : '_Nenhum_'}\n\n` +
            `Deseja avanÃ§ar ou refazer a chamada?\n` +
            `*1* ou *AvanÃ§ar* âž¡ï¸ Prosseguir para a LiÃ§Ã£o\n` +
            `*2* ou *Refazer* ðŸ”„ Refazer marcaÃ§Ãµes`;

          await sendButton(
            fromPhone,
            summaryAttendanceText,
            [
              { id: 'attendance_advance', text: 'AvanÃ§ar âž¡ï¸' },
              { id: 'attendance_retry', text: 'Refazer Chamada ðŸ”„' }
            ],
            'ConfirmaÃ§Ã£o da Chamada'
          );
        } else if (type === 'button') {
           const memberId = payload.buttonId;
           let pollSelections: any = latest.pollSelections || {};
           pollSelections['buttons'] = (pollSelections['buttons'] || []);
           
           if (!pollSelections['buttons'].includes(memberId)) {
               pollSelections['buttons'].push(memberId);
               await sessionRef.update({ pollSelections, updatedAt: now });
               
               const clickedMember = session.members.find(m => m.id === memberId);
               if (clickedMember) {
                   await sendText(fromPhone, `âœ… ${clickedMember.name} marcado(a)!`);
               }
           } else {
               await sendText(fromPhone, `âš ï¸ Esse membro jÃ¡ foi marcado.`);
           }
           return true;
        } else if (type === 'text') {
           if (msg === 'ok' || msg === 'pronto' || msg === '0' || msg === 'nenhum' || msg === 'ninguem') {
             return handleGcReportIncomingMessage(fromPhone, '', 'button', { buttonId: 'attendance_done' });
           } else if (/^[\d\s,.\-e]+$/.test(msg)) {
             // Aceita: "1, 2, 3" ou "1 2 3" ou "1 e 2"
             const nums = msg.replace(/e/g, ',').split(/[,.\-\s]+/).map(n => parseInt(n.trim())).filter(n => !isNaN(n));
             const selectedMemberIds: string[] = [];
             nums.forEach(num => {
                if (num > 0 && num <= session.members.length) {
                   selectedMemberIds.push(session.members[num - 1].id);
                }
             });
             
             if (selectedMemberIds.length > 0) {
               let pollSelections: any = latest.pollSelections || {};
               pollSelections['text_input'] = (pollSelections['text_input'] || []).concat(selectedMemberIds);
               await sessionRef.update({
                 pollSelections,
                 updatedAt: now
               });
               await sendText(fromPhone, `ðŸ‘ SeleÃ§Ã£o registrada! Se tiver mais alguÃ©m, envie o nÃºmero, senÃ£o, envie *OK* para avanÃ§ar.`);
             }
           }
        }
        break;
      }

      case 'ATTENDANCE_CONFIRM': {
        const isAdvance = payload?.buttonId === 'attendance_advance' || ['1', 'avancar', 'avanÃ§ar', 'proximo', 'prÃ³ximo', 'ok', 'sim', 'attendance_advance'].includes(msg);
        const isRetry = payload?.buttonId === 'attendance_retry' || ['2', 'refazer', 'corrigir', 'voltar', 'nÃ£o', 'nao', 'attendance_retry'].includes(msg);

        if (isAdvance) {
          await sessionRef.update({
            step: 'METRICS_LESSON',
            updatedAt: now
          });
          await sendText(
            fromPhone,
            'ðŸ“– *Etapa 2: Tema da LiÃ§Ã£o*\n\nQual foi o tema ou tÃ­tulo da liÃ§Ã£o ministrada no GC esta semana?\n\n_Envie o tÃ­tulo por mensagem de texto._'
          );
        } else if (isRetry) {
          await sessionRef.update({
            step: 'ATTENDANCE',
            attendance: {},
            attendanceAccumulated: [],
            pollSelections: {},
            updatedAt: now
          });
          await sendText(
            fromPhone,
            'ðŸ”„ *Refazendo a Chamada*\n\nMarque novamente na enquete abaixo quem esteve *PRESENTE*:'
          );
          await wait(1500);
          await sendMembersListAsPoll(fromPhone, session.members, false);
        } else {
          await sendButton(
            fromPhone,
            'Por favor, escolha se deseja avanÃ§ar para a liÃ§Ã£o ou refazer a chamada:',
            [
              { id: 'attendance_advance', text: 'AvanÃ§ar âž¡ï¸' },
              { id: 'attendance_retry', text: 'Refazer Chamada ðŸ”„' }
            ]
          );
        }
        break;
      }

      case 'METRICS_LESSON':
        if (type === 'text') {
          const licao = messageText.trim();

          // If there are expected visitors, go to a poll step first
          const hasExpected = (session.expectedVisitors || []).length > 0;
          const nextStep = hasExpected ? 'EXPECTED_VISITORS_POLL' : 'METRICS_VISITORS';

          await sessionRef.update({
            'metrics.licao': licao,
            step: nextStep,
            updatedAt: now
          });
          await wait(1000);

          if (hasExpected) {
            await sendText(
              fromPhone,
              'â­ *Visitantes Esperados*\n\nEsses visitantes se inscreveram para este GC pelo site. Marque na enquete os que estiveram presentes hoje:'
            );
            
            const visitorNames = (session.expectedVisitors || []).map((v: any) => v.name.substring(0, 50));
            await sendPoll(fromPhone, 'ðŸ“‹ Visitantes Esperados â€” Quem veio?', visitorNames, visitorNames.length);
          } else {
            await sendText(
              fromPhone,
              'ðŸ‘¥ *Etapa 3: Visitantes*\n\nDigite o nome dos visitantes que estiveram presentes (separados por vÃ­rgula).\n\n*Caso nÃ£o tenha havido nenhum visitante, envie 0.*'
            );
          }
        }
        break;

      case 'EXPECTED_VISITORS_POLL':
        if (type === 'poll' || type === 'text') {
          let presentVisitorIds: string[] = [];

          if (type === 'poll') {
            const options = payload.selectedOptions as string[];
            const visitorMap = new Map<string, string>();
            (session.expectedVisitors || []).forEach((v: any) => {
              visitorMap.set(v.name.substring(0, 50), v.id);
            });
            options.forEach(opt => {
              const id = visitorMap.get(opt);
              if (id) presentVisitorIds.push(id);
            });
          }

          const presentExpectedNames = (session.expectedVisitors || [])
            .filter((v: any) => presentVisitorIds.includes(v.id))
            .map((v: any) => v.name);

          await sessionRef.update({
            'metrics.visitantesPreRegistrados': (session.expectedVisitors || []).map((v: any) => ({
              ...v,
              presente: presentVisitorIds.includes(v.id)
            })),
            'metrics.visitantesPreRegistradosNomes': presentExpectedNames,
            step: 'METRICS_VISITORS',
            updatedAt: now
          });
          await wait(1000);
          await sendText(
            fromPhone,
            `ðŸ‘¥ *Outros visitantes?*\n\nAlÃ©m dos cadastrados, veio algum visitante novo?\n\nDigite os nomes (separados por vÃ­rgula) ou envie *0* caso nÃ£o tenha.`
          );
        }
        break;

      case 'METRICS_VISITORS':
        if (type === 'text') {
          const visitantes = messageText.trim() === '0' ? '' : messageText.trim();
          await sessionRef.update({
            'metrics.visitantes': visitantes,
            step: 'METRICS_CONVERSIONS',
            updatedAt: now
          });
          await wait(1000);
          await sendText(
            fromPhone,
            'ðŸ™ *Etapa 4: ConversÃµes*\n\nQuantas decisÃµes por Cristo ou reconciliaÃ§Ãµes aconteceram na reuniÃ£o?\n\nEnvie o nÃºmero (ex: *0*, *1*, *2*...)'
          );
        }
        break;

      case 'METRICS_CONVERSIONS':
        if (type === 'text') {
          const num = parseInt(messageText.trim(), 10);
          if (isNaN(num) || num < 0) {
            await sendText(fromPhone, 'Por favor, digite um nÃºmero vÃ¡lido (ex: 0, 1, 2...)');
            return true;
          }
          await sessionRef.update({
            'metrics.conversoes': num,
            step: 'FEEDBACK',
            updatedAt: now
          });
          await sendButton(
            fromPhone,
            'Quer deixar alguma mensagem, observaÃ§Ã£o de cuidado ou feedback para o seu supervisor?\n\nDigite sua mensagem ou clique no botÃ£o para finalizar.',
            [{ id: 'feed_skip', text: 'Pular Feedback' }],
            'ðŸ’¬ *Etapa 5: Feedback*'
          );
        }
        // Aceitar botÃ£o legado
        if (type === 'button') {
          if (payload?.buttonId === 'conv_0') return handleGcReportIncomingMessage(fromPhone, '0', 'text');
          if (payload?.buttonId === 'conv_1') return handleGcReportIncomingMessage(fromPhone, '1', 'text');
        }
        break;

      case 'FEEDBACK': {
        let feedbackContent = '';
        if (type === 'text') {
          feedbackContent = (msg === '0' || msg === 'pular' || msg === '-') ? '' : messageText.trim();
        } else if (type === 'button' && payload?.buttonId === 'feed_skip') {
          feedbackContent = '';
        } else {
          break;
        }

        const latestDoc = await sessionRef.get();
        const latest = latestDoc.data() as GcReportSession;

        await sessionRef.update({
          pendingFeedback: feedbackContent,
          step: 'SUMMARY_CONFIRM',
          updatedAt: now
        });

        // Buscar dados da cÃ©lula para resumo
        let cellNome = 'CÃ©lula';
        try {
          const cellSnap = await db.collection('cells').doc(latest.cellId).get();
          if (cellSnap.exists) cellNome = cellSnap.data()?.nome || 'CÃ©lula';
        } catch (_) {}

        const presentCount = (latest.attendanceAccumulated || []).length;
        const totalMembers = (latest.members || []).length;
        const absentCount = totalMembers - presentCount;
        const visitors = latest.metrics?.visitantes?.trim() || 'Nenhum';
        const conversions = latest.metrics?.conversoes || 0;
        const lesson = latest.metrics?.licao || 'NÃ£o informada';
        const fbDisplay = feedbackContent || 'Nenhum';

        const summaryGeneral = `ðŸ“Š *Resumo Geral do RelatÃ³rio - ${cellNome}*\n\n` +
          `ðŸ‘¥ *Chamada:* ${presentCount} presentes / ${absentCount} ausentes\n` +
          `ðŸ“– *LiÃ§Ã£o:* ${lesson}\n` +
          `ðŸ¤ *Visitantes:* ${visitors}\n` +
          `ðŸŽ¯ *DecisÃµes:* ${conversions}\n` +
          `ðŸ’¬ *Feedback:* ${fbDisplay}\n\n` +
          `Deseja confirmar e enviar o relatÃ³rio?\n` +
          `*1* ou *Confirmar* âœ… Enviar relatÃ³rio\n` +
          `*2* ou *Refazer* ðŸ”„ RecomeÃ§ar do inÃ­cio`;

        await sendButton(
          fromPhone,
          summaryGeneral,
          [
            { id: 'summary_confirm', text: 'Confirmar e Enviar âœ…' },
            { id: 'summary_retry', text: 'RecomeÃ§ar ðŸ”„' }
          ],
          'ConfirmaÃ§Ã£o Final'
        );
        break;
      }

      case 'SUMMARY_CONFIRM': {
        const isConfirm = payload?.buttonId === 'summary_confirm' || ['1', 'sim', 'confirmar', 'enviar', 'ok', 'summary_confirm'].includes(msg);
        const isRetry = payload?.buttonId === 'summary_retry' || ['2', 'refazer', 'recomecar', 'recomeÃ§ar', 'summary_retry'].includes(msg);

        if (isConfirm) {
          const latestDoc = await sessionRef.get();
          const latest = latestDoc.data() as GcReportSession;
          const success = await finalizeAndSubmitReport(latest, latest.pendingFeedback || '');
          if (success) {
            const isEdit = !!latest.editingLogId;
            const successMsg = isEdit
              ? 'ðŸŽ‰ *RelatÃ³rio Atualizado com Sucesso!*\n\nAs alteraÃ§Ãµes da reuniÃ£o foram salvas e sincronizadas com a lideranÃ§a. Obrigado pela atenÃ§Ã£o e cuidado! ðŸš€'
              : 'ðŸŽ‰ *RelatÃ³rio Enviado com Sucesso!*\n\nMuito obrigado pelo seu relatÃ³rio e pela dedicaÃ§Ã£o na lideranÃ§a do seu GC! Que Deus continue abenÃ§oando vocÃªs. ðŸš€';
            await sendText(fromPhone, successMsg);
            await sessionRef.delete();
          } else {
            await sendText(
              fromPhone,
              'âš ï¸ Desculpe, ocorreu um erro ao salvar o seu relatÃ³rio. Por favor, tente enviar novamente ou use o comando /reiniciar.'
            );
          }
        } else if (isRetry) {
          const latestDoc = await sessionRef.get();
          const latest = latestDoc.data() as GcReportSession;
          await sessionRef.delete();
          await startGcReportSession(latest.cellId, fromPhone, latest.isTestData, undefined, latest.editingLogId);
        } else {
          await sendButton(
            fromPhone,
            'Por favor, escolha se deseja confirmar o envio ou recomeÃ§ar o preenchimento:',
            [
              { id: 'summary_confirm', text: 'Confirmar e Enviar âœ…' },
              { id: 'summary_retry', text: 'RecomeÃ§ar ðŸ”„' }
            ]
          );
        }
        break;
      }
    }
    return true;
  } catch (error) {
    console.error('[GC Bot] Erro ao processar mensagem do estado:', error);
    await sendText(fromPhone, 'Ocorreu um erro interno ao processar a resposta. Digite /reiniciar se desejar recomeÃ§ar.');
    return true;
  }
}

/**
 * Re-envia a instruÃ§Ã£o ou mensagem correspondente ao passo atual da sessÃ£o.
 */
async function resendCurrentStepMessage(to: string, session: GcReportSession) {
  switch (session.step) {
    case 'START':
      await startGcReportSession(session.cellId, to, session.isTestData);
      break;
    case 'CHOOSE_CHANNEL':
      await sendButton(
        to,
        'Como vocÃª prefere responder o relatÃ³rio do GC esta semana?',
        [
          { id: 'channel_whatsapp', text: 'ðŸ’¬ No WhatsApp' },
          { id: 'channel_link', text: 'ðŸ”— Pelo Link' }
        ]
      );
      break;
    case 'ATTENDANCE':
      await sendText(
        to,
        `ðŸ“‹ *Etapa 1: Chamada*\nMarque na enquete abaixo quem esteve *PRESENTE* na reuniÃ£o.`
      );
      await sendMembersListAsPoll(to, session.members, false);
      break;
    case 'METRICS_LESSON':
      await sendText(to, 'ðŸ“– *Etapa 2: Tema da LiÃ§Ã£o*\n\nQual foi o tema ou tÃ­tulo da liÃ§Ã£o ministrada no GC esta semana?');
      break;
    case 'METRICS_VISITORS':
      await sendText(to, 'ðŸ‘¥ *Etapa 3: Visitantes*\n\nDigite os nomes separados por vÃ­rgula ou envie 0.');
      break;
    case 'METRICS_CONVERSIONS':
      await sendText(to, 'ðŸŽ¯ *Etapa 4: ConversÃµes*\n\nQuantas decisÃµes por Cristo ou reconciliaÃ§Ãµes aconteceram na reuniÃ£o?\n\nEnvie o nÃºmero (ex: *0*, *1*, *2*...)');
      break;
    case 'FEEDBACK':
      await sendButton(
        to,
        'Quer deixar alguma mensagem, observaÃ§Ã£o de cuidado ou feedback para o seu supervisor?\n\nDigite sua mensagem ou clique no botÃ£o para finalizar.',
        [{ id: 'feed_skip', text: 'Pular Feedback' }],
        'ðŸ’¬ *Etapa 5: Feedback*'
      );
      break;
    case 'ATTENDANCE_CONFIRM':
      await sendButton(
        to,
        'VocÃª deseja avanÃ§ar para a liÃ§Ã£o ou refazer a chamada?',
        [
          { id: 'attendance_advance', text: 'AvanÃ§ar âž¡ï¸' },
          { id: 'attendance_retry', text: 'Refazer Chamada ðŸ”„' }
        ]
      );
      break;
    case 'SUMMARY_CONFIRM':
      await sendButton(
        to,
        'VocÃª deseja confirmar e enviar o relatÃ³rio ou recomeÃ§ar o preenchimento?',
        [
          { id: 'summary_confirm', text: 'Confirmar e Enviar âœ…' },
          { id: 'summary_retry', text: 'RecomeÃ§ar ðŸ”„' }
        ]
      );
      break;
  }
}

/**
 * Compila e salva o relatÃ³rio nas coleÃ§Ãµes reuniao_logs e presencas_historico do Firestore.
 */
async function finalizeAndSubmitReport(session: GcReportSession, feedback: string): Promise<boolean> {
  const db = getAdminDb();
  const now = new Date();
  const batch = db.batch();

  try {
    const cellSnap = await db.collection('cells').doc(session.cellId).get();
    if (!cellSnap.exists) throw new Error('CÃ©lula de destino nÃ£o encontrada.');
    const cellData = cellSnap.data()!;

    const reportDate = new Date().toISOString().split('T')[0];

    let presentes = 0;
    let ausentesSemJust = 0;
    const finalAttendance = { ...session.attendance };

    session.members.forEach(member => {
      if (!finalAttendance[member.id]) {
        finalAttendance[member.id] = 'ausente_sem_justificativa';
      }
      if (finalAttendance[member.id] === 'presente') {
        presentes++;
      } else {
        ausentesSemJust++;
      }
    });

    const visitantesCount = (session.metrics?.visitantes || '')
      .split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0).length;

    // Se estiver editando, sobrescreve o documento existente
    const logRef = session.editingLogId
      ? db.collection('reuniao_logs').doc(session.editingLogId)
      : db.collection('reuniao_logs').doc();

    if (session.editingLogId) {
      try {
        const oldPresSnap = await db.collection('presencas_historico')
          .where('reuniaoLogId', '==', session.editingLogId)
          .get();
        oldPresSnap.forEach(pDoc => {
          batch.delete(pDoc.ref);
        });
      } catch (err) {
        console.warn('[GC Bot] Erro ao limpar presenÃ§as do relatÃ³rio editado:', err);
      }
    }

    const logData: any = {
      cellId: session.cellId,
      cellNome: cellData.nome || 'CÃ©lula',
      date: reportDate,
      liderId: session.liderId,
      supervisorId: cellData.supervisorId || null,
      metricas: {
        totalMembrosAtivos: session.members.length,
        presentes,
        ausentesJustificados: 0,
        ausentesSemJustificativa: ausentesSemJust,
        visitantes: visitantesCount,
        conversoes: session.metrics.conversoes,
        oferta: 0
      },
      licaoMinistrada: session.metrics.licao || '',
      visitantesNomes: session.metrics.visitantes || '',
      visitantesPreRegistrados: (session.metrics as any).visitantesPreRegistrados || [],
      feedbackAoSupervisor: feedback || '',
      isTestData: !!session.isTestData,
      updatedAt: now,
      ...(session.editingLogId ? { editadoEm: now } : { createdAt: now })
    };

    batch.set(logRef, logData, { merge: true });

    // Registros individuais em presencas_historico
    session.members.forEach(member => {
      const presRef = db.collection('presencas_historico').doc();
      const careInfo = session.thermometers?.[member.id] || null;
      
      batch.set(presRef, {
        reuniaoLogId: logRef.id,
        cellId: session.cellId,
        membroId: member.id,
        membroNome: member.name,
        date: reportDate,
        status: finalAttendance[member.id] || 'ausente_sem_justificativa',
        termometro: careInfo ? careInfo.termometro : null,
        pedidoOracao: careInfo ? careInfo.pedidoOracao : null,
        observacaoCuidado: careInfo ? careInfo.pedidoOracao : null,
        isTestData: !!session.isTestData,
        createdAt: now
      });
    });

    await batch.commit();

    // AutomaÃ§Ã£o Kanban: AvanÃ§ar visitantes no Funil de Engajamento
    try {
      const checkProcessos = session.members.map(async (member) => {
        if (finalAttendance[member.id] === 'presente') {
          const processosSnap = await db.collection('users').doc(member.id).collection('processos')
            .where('processType', '==', 'GC')
            .where('status', '==', 'ACTIVE')
            .get();
            
          if (!processosSnap.empty) {
            const procDoc = processosSnap.docs[0];
            const procData = procDoc.data();
            let newStage = null;

            if (procData.currentStage === 'AGUARDANDO_CONTATO') {
              newStage = 'EM_VISITA'; // Visitante ReuniÃµes
            } else if (procData.currentStage === 'EM_VISITA') {
              const histSnap = await db.collection('presencas_historico')
                .where('membroId', '==', member.id)
                .where('cellId', '==', session.cellId)
                .where('status', '==', 'presente')
                .get();
                
              if (histSnap.size >= 4) {
                newStage = 'INTEGRADO_GC'; // Frequente no GC
              }
            }
            
            if (newStage) {
              await procDoc.ref.update({ 
                currentStage: newStage, 
                updatedAt: now 
              });
            }
          }
        }
      });
      await Promise.all(checkProcessos);

      // Kanban for pre-registered expected visitors marked as present
      const preRegistered = (session.metrics as any)?.visitantesPreRegistrados || [];
      const presentPreRegistered = preRegistered.filter((v: any) => v.presente === true);
      if (presentPreRegistered.length > 0) {
        // Buscar a célula para atualizar o attendedDates dos visitantes
        const cellDocForVisitors = await db.collection('cells').doc(session.cellId).get();
        const cellVisitors: any[] = cellDocForVisitors.exists ? (cellDocForVisitors.data()?.visitors || []) : [];
        let updatedCellVisitors = [...cellVisitors];

        const checkExpected = presentPreRegistered.map(async (visitor: any) => {
          if (!visitor.id) return;

          // 1. Atualizar attendedDates no array cell.visitors para rastrear as visitas individuais
          updatedCellVisitors = updatedCellVisitors.map((v: any) => {
            if (v.id === visitor.id) {
              const attended = v.attendedDates || [];
              if (!attended.includes(reportDate)) {
                return { ...v, attendedDates: [...attended, reportDate] };
              }
            }
            return v;
          });

          // 2. Verificar se chegou a 4 visitas — promover automaticamente para membro
          const visitorInCell = updatedCellVisitors.find((v: any) => v.id === visitor.id);
          if (visitorInCell && (visitorInCell.attendedDates || []).length >= 4) {
            const userSnap = await db.collection('users').doc(visitor.id).get();
            if (userSnap.exists) {
              const userData = userSnap.data()!;
              if (userData.hierarchy?.role === 'visitante') {
                await db.collection('users').doc(visitor.id).update({
                  'hierarchy.role': 'membro',
                  updatedAt: now
                });
                console.log(`[GC Bot] Visitante ${visitor.name} promovido a membro após 4ª visita.`);
              }
            }
          }

          // 3. Kanban: avançar estágio do processo GC
          const processosSnap = await db.collection('users').doc(visitor.id).collection('processos')
            .where('processType', '==', 'GC')
            .where('status', '==', 'ACTIVE')
            .get();
          if (!processosSnap.empty) {
            const procDoc = processosSnap.docs[0];
            const procData = procDoc.data();
            let newStage = null;
            if (procData.currentStage === 'AGUARDANDO_CONTATO') {
              newStage = 'EM_VISITA';
            } else if (procData.currentStage === 'EM_VISITA') {
              const attendedCount = (visitorInCell?.attendedDates || []).length;
              if (attendedCount >= 4) {
                newStage = 'INTEGRADO_GC';
              }
            }
            if (newStage) {
              await procDoc.ref.update({ currentStage: newStage, updatedAt: now });
            }
          }
        });
        await Promise.all(checkExpected);

        // Salvar visitors atualizados na célula (com attendedDates)
        await db.collection('cells').doc(session.cellId).update({ visitors: updatedCellVisitors });
      }

    } catch(e) {
      console.error('[GC Bot] Erro na automaÃ§Ã£o Kanban:', e);
    }

    return true;
  } catch (error) {
    console.error('[GC Bot] Erro ao gravar relatÃ³rio no Firestore:', error);
    return false;
  }
}


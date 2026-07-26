import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getWhatsAppClient } from '@/lib/whatsapp';

export interface GcReportSession {
  id: string; // Telefone do líder formatado (ex: 5521999998888)
  cellId: string;
  liderId: string;
  step: 'START' | 'CHECK_MEETING' | 'MEETING_STATUS_CHOICE' | 'POSTPONED_DATE' | 'CANCELLED_REASON' | 'ATTENDANCE' | 'CARE_CHOICE' | 'CARE_SELECT' | 'CARE_MEMBER_THERMOMETER' | 'CARE_MEMBER_PRAYER' | 'METRICS_LESSON' | 'METRICS_VISITORS' | 'METRICS_CONVERSIONS' | 'FEEDBACK';
  members: { id: string; name: string }[];
  
  // Controle de reunião (Adiada ou Cancelada)
  meetingOccurred?: boolean;
  meetingStatus?: 'postponed' | 'cancelled';
  postponedDate?: string;
  cancelledReason?: string;
  
  // Controle da Chamada
  attendancePage?: number;
  attendanceAccumulated?: string[]; // IDs dos membros marcados como presentes
  pollSelections?: any; // Mapeamento de seleções das enquetes
  
  // Controle de Cuidado
  careMembersQueue?: string[];      // IDs dos membros que precisam de cuidado
  currentCareIndex?: number;        // Índice na fila de cuidado
  careSelections?: any; // Mapeamento de seleções de cuidado
  
  attendance: { [memberId: string]: 'presente' | 'ausente_sem_justificativa' };
  thermometers?: { [memberId: string]: { termometro: number; pedidoOracao: string } };
  
  metrics: {
    licao: string;
    visitantes: string;
    conversoes: number;
  };
  feedback: string;
  isTestData?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Envia uma mensagem com botões interativos.
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
 * Envia um botão interativo via WAME.
 * Quando o usuário clica, o Evolution recebe a resposta como buttonsResponseMessage.
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
 * Envia uma enquete de múltipla escolha.
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
    await sendText(to, 'Nenhum membro encontrado na célula.');
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
  
  // Delay adicional antes do botão de concluir para chegar DEPOIS das enquetes
  await new Promise(resolve => setTimeout(resolve, 1500));

  const buttonId = isCare ? 'care_done' : 'attendance_done';
  const buttonText = isCare ? 'Concluir Seleção' : 'Concluir Chamada';
  await sendButton(
    to,
    '👉 Quando terminar de marcar na(s) enquete(s) acima, clique no botão abaixo para avançarmos.',
    [{ id: buttonId, text: buttonText }],
    'Igreja Batista da Manhã',
    'Opções do Relatório'
  );

}

/**
 * Inicializa a sessão do relatório de GC para um líder.
 */
export async function startGcReportSession(cellId: string, liderPhone: string, isTestData = false): Promise<boolean> {
  const db = getAdminDb();
  const sessionRef = db.collection('gc_report_sessions').doc(liderPhone);

  try {
    // 1. Limpar sessão antiga se existir
    const existingSession = await sessionRef.get();
    if (existingSession.exists) {
      console.log(`[GC Bot] Sessão anterior encontrada para ${liderPhone}. Deletando...`);
      await sessionRef.delete();
    }

    // 2. Buscar informações da célula e seus membros
    const cellDoc = await db.collection('cells').doc(cellId).get();
    if (!cellDoc.exists) {
      console.error('[GC Bot] Célula não encontrada:', cellId);
      throw new Error('Célula não encontrada.');
    }
    const cellData = cellDoc.data()!;
    const liderId = cellData.liderId || '';

    // Opção B: busca membros por hierarchy.celulaId — fonte única de verdade.
    // TODO (Opção C): substituir por query na coleção /memberships quando migrar para multi-igreja.
    const usersSnap = await db.collection('users')
      .where('hierarchy.celulaId', '==', cellId)
      .get();

    const membersList: { id: string; name: string }[] = [];
    usersSnap.forEach(snap => {
      if (snap.exists) {
        membersList.push({ id: snap.id, name: snap.data().name || 'Membro' });
      }
    });
    membersList.sort((a, b) => a.name.localeCompare(b.name));


    // 3. Enviar mensagem de boas-vindas primeiro
    console.log(`[GC Bot] Enviando fluxo de relatório para ${liderPhone}...`);
    
    // Buscar nome do líder para saudação personalizada
    let liderName = '';
    if (liderId) {
      const liderDoc = await db.collection('users').doc(liderId).get();
      if (liderDoc.exists) {
        liderName = ` ${liderDoc.data()!.name?.split(' ')[0]}`;
      }
    }

    // Saudação + pergunta em UMA ÚNICA mensagem de botão para evitar race condition de ordem
    await sendButton(
      liderPhone,
      `Olá, líder${liderName}! 👋\nQue a paz do Senhor esteja com você!\n\nChegou a hora de registrar as bençãos da reunião do GC *${cellData.nome || 'Célula'}* desta semana.\n\n❓ *Aconteceu a reunião do GC esta semana?*`,
      [
        { id: 'meeting_yes', text: 'Sim' },
        { id: 'meeting_no', text: 'Não' }
      ],
      'Relatório Semanal de Célula'
    );

    // 4. Salvar estado da sessão na coleção `gc_report_sessions`
    const newSession: GcReportSession = {
      id: liderPhone,
      cellId,
      liderId,
      step: 'CHECK_MEETING',
      members: membersList,
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
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    await sessionRef.set(newSession);
    console.log('[GC Bot] Sessão criada com sucesso (step: CHECK_MEETING) para', liderPhone);

    return true;
  } catch (error) {
    console.error('[GC Bot] Erro ao iniciar sessão:', error);
    return false;
  }
}

/**
 * Handler principal para processar mensagens recebidas no Webhook vinculadas a sessões ativas.
 * Usa respostas por TEXTO em vez de botões interativos para máxima compatibilidade.
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
  const now = Timestamp.now();
  const msg = messageText.trim().toLowerCase();

  // Comando global de reset
  if (type === 'text' && msg === '/reiniciar') {
    await sessionRef.delete();
    await startGcReportSession(session.cellId, fromPhone, session.isTestData);
    return true;
  }

  // Helper: detecta palavras de avanço
  const isAdvanceCommand = (t: string) => [
    'ok', 'pronto', 'avançar', 'avancar', 'proximo', 'próximo', 'concluir', 'done', 'sim',
    'finalizar lançamento de presença', 'finalizar lançamento de presenca', 'finalizar chamada'
  ].includes(t.toLowerCase().trim());

  // Helper: delay entre mensagens
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    switch (session.step) {
      case 'START':
        // Se por algum motivo chegou aqui, avançar automaticamente
        if (type === 'text') {
          await sessionRef.delete();
          await startGcReportSession(session.cellId, fromPhone, session.isTestData);
        }
        break;

      case 'CHECK_MEETING': {
        const isYes = payload?.buttonId === 'meeting_yes' || ['sim', 's', '1', 'teve', 'aconteceu', 'meeting_yes'].includes(msg);
        const isNo = payload?.buttonId === 'meeting_no' || ['não', 'nao', 'n', '2', 'não teve', 'nao teve', 'meeting_no'].includes(msg);

        if (isYes) {
          await sessionRef.update({
            meetingOccurred: true,
            step: 'ATTENDANCE',
            updatedAt: now
          });
          await sendText(
            fromPhone,
            '📋 *Etapa 1: Chamada*\n\nResponda na enquete/lista abaixo quem esteve *PRESENTE* na reunião.'
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
            'Compreendido. A reunião foi *Adiada* para outro dia ou foi *Cancelada* nesta semana?',
            [
              { id: 'status_postponed', text: 'Adiada' },
              { id: 'status_cancelled', text: 'Cancelada' }
            ],
            'Status da Reunião'
          );
        } else {
          await sendButton(
            fromPhone,
            'Por favor, escolha uma das opções abaixo:\n\nAconteceu a reunião do GC esta semana?',
            [
              { id: 'meeting_yes', text: 'Sim' },
              { id: 'meeting_no', text: 'Não' }
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
            '📅 *Para qual dia a reunião foi adiada?*\n\nDigite a nova data ou dia da semana (ex: *Sexta-feira 25/07* ou *28/07*).'
          );
        } else if (isCancelled) {
          await sessionRef.update({
            meetingStatus: 'cancelled',
            step: 'CANCELLED_REASON',
            updatedAt: now
          });
          await sendText(
            fromPhone,
            '❌ *Qual foi o motivo do cancelamento da reunião?*\n\n(ex: *Feriado*, *Encontro de Casais*, *Imprevisto no local*...)'
          );
        } else {
          await sendButton(
            fromPhone,
            'Por favor, informe se a reunião foi Adiada ou Cancelada:',
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

          // Salva log de reunião adiada no Firestore
          const logRef = db.collection('gc_reuniao_logs').doc();
          await logRef.set({
            cellId: session.cellId,
            date: new Date().toISOString().split('T')[0],
            liderId: session.liderId,
            statusReuniao: 'postponed',
            novaData: newDateText,
            isTestData: !!session.isTestData,
            createdAt: now
          });

          // Agendar nova tentativa de coleta de relatório no dia seguinte à nova data
          // Tentamos interpretar a data informada pelo líder
          const scheduleRef = db.collection('gc_report_schedules').doc();
          await scheduleRef.set({
            cellId: session.cellId,
            liderId: session.liderId,
            liderPhone: fromPhone,
            novaData: newDateText,          // data informada pelo líder (texto livre)
            status: 'pending',
            createdAt: now,
            // O trigger-reports vai checar esse campo para saber se já passou do dia seguinte
            triggerAfter: newDateText       // referencia textual — o trigger vai comparar com data atual
          });

          await sendText(
            fromPhone,
            `👍 Entendido! A reunião foi reagendada para *${newDateText}*.\n\nVou te enviar o formulário de relatório automaticamente no dia seguinte. Bom trabalho na liderança! 🙏`
          );

          await sessionRef.delete();
        }
        break;
      }

      case 'CANCELLED_REASON': {
        if (type === 'text') {
          const reasonText = messageText.trim();
          
          // Salva log de reunião cancelada no Firestore
          const logRef = db.collection('gc_reuniao_logs').doc();
          await logRef.set({
            cellId: session.cellId,
            date: new Date().toISOString().split('T')[0],
            liderId: session.liderId,
            statusReuniao: 'cancelled',
            motivoCancelamento: reasonText,
            isTestData: !!session.isTestData,
            createdAt: now
          });

          await sendText(
            fromPhone,
            `📌 Registrado! O motivo do cancelamento (*"${reasonText}"*) foi enviado ao seu supervisor.\n\nDesejamos uma abençoada semana e nos falamos na próxima! 🙌`
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
             // 2. Fallback de aproximação, mas APENAS se o nome for longo (> 5 chars) para evitar falsos positivos
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
          return true; // Aguarda o usuário responder OK
         } else if ((type === 'button' && payload?.buttonId === 'attendance_done') || (type === 'text' && isAdvanceCommand(msg))) {
           // Enviar aviso de sincronização
           await sendText(fromPhone, '⏳ _Aguardando sincronização final com o WhatsApp (5 segundos)..._');
           await wait(5000);

           // Computar presentes/ausentes pós-sincronização
          let freshDoc = await sessionRef.get();
          let freshSession = freshDoc.data() as GcReportSession;
          let pollSelections: any = freshSession?.pollSelections || {};
          let presentIds: string[] = [];
          
          // Helper para extrair presentes do objeto de seleção
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
          
          await sessionRef.update({
            attendance: attendanceMap,
            attendanceAccumulated: presentIds,
            step: 'METRICS_LESSON',
            updatedAt: now
          });
          
          await sendText(
            fromPhone,
            `✅ Chamada registrada! ${presentCount} presentes, ${absentCount} ausentes.`
          );
          
          await sendText(
            fromPhone,
            '📖 *Etapa 2: Tema da Lição*\n\nQual foi o tema ou título da lição ministrada no GC esta semana?\n\n_Envie o título por mensagem de texto._'
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
                   await sendText(fromPhone, `✅ ${clickedMember.name} marcado(a)!`);
               }
           } else {
               await sendText(fromPhone, `⚠️ Esse membro já foi marcado.`);
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
               await sendText(fromPhone, `👍 Seleção registrada! Se tiver mais alguém, envie o número, senão, envie *OK* para avançar.`);
             }
           }
        }
        break;
      }

      case 'METRICS_LESSON':
        if (type === 'text') {
          const licao = messageText.trim();
          await sessionRef.update({
            'metrics.licao': licao,
            step: 'METRICS_VISITORS',
            updatedAt: now
          });
          await wait(1000);
          await sendText(
            fromPhone,
            '👥 *Etapa 3: Visitantes*\n\nDigite o nome dos visitantes que estiveram presentes (separados por vírgula).\n\n*Caso não tenha havido nenhum visitante, envie 0.*'
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
            '🎯 *Etapa 4: Conversões*\n\nQuantas decisões por Cristo ou reconciliações aconteceram na reunião?\n\nEnvie o número (ex: *0*, *1*, *2*...)'
          );
        }
        break;

      case 'METRICS_CONVERSIONS':
        if (type === 'text') {
          const num = parseInt(messageText.trim(), 10);
          if (isNaN(num) || num < 0) {
            await sendText(fromPhone, 'Por favor, digite um número válido (ex: 0, 1, 2...)');
            return true;
          }
          await sessionRef.update({
            'metrics.conversoes': num,
            step: 'FEEDBACK',
            updatedAt: now
          });
          await sendButton(
            fromPhone,
            'Quer deixar alguma mensagem, observação de cuidado ou feedback para o seu supervisor?\n\nDigite sua mensagem ou clique no botão para finalizar.',
            [{ id: 'feed_skip', text: 'Pular Feedback' }],
            '💬 *Etapa 5: Feedback*'
          );
        }
        // Aceitar botão legado
        if (type === 'button') {
          if (payload?.buttonId === 'conv_0') return handleGcReportIncomingMessage(fromPhone, '0', 'text');
          if (payload?.buttonId === 'conv_1') return handleGcReportIncomingMessage(fromPhone, '1', 'text');
        }
        break;

      case 'FEEDBACK':
        if (type === 'text') {
          const feedbackContent = (msg === '0' || msg === 'pular' || msg === '-') ? '' : messageText.trim();
          
          const latestDoc = await sessionRef.get();
          const latest = latestDoc.data() as GcReportSession;
          const success = await finalizeAndSubmitReport(latest, feedbackContent);
          if (success) {
            await sendText(
              fromPhone,
              '🎉 *Relatório Enviado com Sucesso!*\n\nMuito obrigado pelo seu relatório e pela dedicação na liderança do seu GC! Que Deus continue abençoando vocês. 🚀'
            );
            await sessionRef.delete();
          } else {
            await sendText(
              fromPhone,
              '⚠️ Desculpe, ocorreu um erro ao salvar o seu relatório. Por favor, tente enviar novamente ou use o comando /reiniciar.'
            );
          }
        }
        // Aceitar botão legado
        if (type === 'button') {
          if (payload?.buttonId === 'feed_skip') return handleGcReportIncomingMessage(fromPhone, '0', 'text');
        }
        break;
    }
    return true;
  } catch (error) {
    console.error('[GC Bot] Erro ao processar mensagem do estado:', error);
    await sendText(fromPhone, 'Ocorreu um erro interno ao processar a resposta. Digite /reiniciar se desejar recomeçar.');
    return true;
  }
}

/**
 * Re-envia a instrução ou mensagem correspondente ao passo atual da sessão.
 */
async function resendCurrentStepMessage(to: string, session: GcReportSession) {
  switch (session.step) {
    case 'START':
      await startGcReportSession(session.cellId, to, session.isTestData);
      break;
    case 'ATTENDANCE':
      await sendText(
        to,
        `📋 *Etapa 1: Chamada*\nMarque na enquete abaixo quem esteve *PRESENTE* na reunião.`
      );
      await sendMembersListAsPoll(to, session.members, false);
      break;
    case 'METRICS_LESSON':
      await sendText(to, '📖 *Etapa 2: Tema da Lição*\n\nQual foi o tema ou título da lição ministrada no GC esta semana?');
      break;
    case 'METRICS_VISITORS':
      await sendText(to, '👥 *Etapa 3: Visitantes*\n\nDigite os nomes separados por vírgula ou envie 0.');
      break;
    case 'METRICS_CONVERSIONS':
      await sendText(to, '🎯 *Etapa 4: Conversões*\n\nQuantas decisões por Cristo ou reconciliações aconteceram na reunião?\n\nEnvie o número (ex: *0*, *1*, *2*...)');
      break;
    case 'FEEDBACK':
      await sendButton(
        to,
        'Quer deixar alguma mensagem, observação de cuidado ou feedback para o seu supervisor?\n\nDigite sua mensagem ou clique no botão para finalizar.',
        [{ id: 'feed_skip', text: 'Pular Feedback' }],
        '💬 *Etapa 5: Feedback*'
      );
      break;
  }
}

/**
 * Compila e salva o relatório nas coleções reuniao_logs e presencas_historico do Firestore.
 */
async function finalizeAndSubmitReport(session: GcReportSession, feedback: string): Promise<boolean> {
  const db = getAdminDb();
  const now = Timestamp.now();
  const batch = db.batch();

  try {
    const cellSnap = await db.collection('cells').doc(session.cellId).get();
    if (!cellSnap.exists) throw new Error('Célula de destino não encontrada.');
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

    const visitantesCount = session.metrics.visitantes
      .split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0).length;

    // Documento principal da reunião
    const logRef = db.collection('reuniao_logs').doc();
    batch.set(logRef, {
      cellId: session.cellId,
      cellNome: cellData.nome || 'Célula',
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
      licaoMinistrada: session.metrics.licao,
      visitantesNomes: session.metrics.visitantes,
      feedbackAoSupervisor: feedback,
      isTestData: !!session.isTestData,
      createdAt: now
    });

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
    return true;
  } catch (error) {
    console.error('[GC Bot] Erro ao gravar relatório no Firestore:', error);
    return false;
  }
}

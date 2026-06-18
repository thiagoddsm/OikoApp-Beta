import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getWhatsAppClient } from '@/lib/whatsapp';

export interface GcReportSession {
  id: string; // Telefone do líder formatado (ex: 5521999998888)
  cellId: string;
  liderId: string;
  step: 'START' | 'ATTENDANCE' | 'CARE_CHOICE' | 'CARE_SELECT' | 'CARE_MEMBER_THERMOMETER' | 'CARE_MEMBER_PRAYER' | 'METRICS_LESSON' | 'METRICS_VISITORS' | 'METRICS_CONVERSIONS' | 'FEEDBACK';
  members: { id: string; name: string }[];
  
  // Controle da Chamada
  attendancePage?: number;
  attendanceAccumulated?: string[]; // IDs dos membros marcados como presentes
  
  // Controle de Cuidado
  careMembersQueue?: string[];      // IDs dos membros que precisam de cuidado
  currentCareIndex?: number;        // Índice na fila de cuidado
  
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
 * Envia uma mensagem com botões interativos (Quick Replies).
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

/**
 * Envia enquetes de múltipla escolha paginadas (max 12 opções) e um botão de concluir.
 */
async function sendMembersPolls(to: string, membersList: { id: string; name: string }[], isCare = false) {
  const options = membersList.map((m, i) => `${i + 1}. ${m.name.substring(0, 20)}`);
  const chunkSize = 12;
  const numPages = Math.ceil(options.length / chunkSize);
  const title = isCare ? 'Quem precisa de cuidado?' : 'Quem estava PRESENTE?';
  
  if (options.length === 0) {
    await sendText(to, isCare ? 'Nenhum membro cadastrado.' : 'Nenhum membro cadastrado.');
  } else {
    for (let i = 0; i < numPages; i++) {
      const chunk = options.slice(i * chunkSize, (i + 1) * chunkSize);
      const pageTitle = numPages > 1 ? `${title} (Pág ${i + 1}/${numPages})` : title;
      await sendPoll(to, pageTitle, chunk, chunk.length);
    }
  }

  // Enviar instrução de conclusão por texto em vez de botão
  await sendText(
    to,
    '👉 Quando terminar de marcar na enquete, responda com *OK* para continuarmos.'
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
    const membersIds = (cellData.membros || []) as string[];
    const liderId = cellData.liderId || '';

    const membersList: { id: string; name: string }[] = [];
    if (membersIds.length > 0) {
      const userRefs = membersIds.map(id => db.collection('users').doc(id));
      const userSnaps = await db.getAll(...userRefs);
      userSnaps.forEach(snap => {
        if (snap.exists) {
          membersList.push({ id: snap.id, name: snap.data()!.name || 'Membro' });
        }
      });
    }
    membersList.sort((a, b) => a.name.localeCompare(b.name));

    // 3. Enviar mensagens no WhatsApp: boas-vindas + Lista de Chamada
    console.log(`[GC Bot] Enviando fluxo de relatório para ${liderPhone}...`);
    
    // Buscar nome do líder para saudação personalizada
    let liderName = '';
    if (liderId) {
      const liderDoc = await db.collection('users').doc(liderId).get();
      if (liderDoc.exists) {
        liderName = ` ${liderDoc.data()!.name?.split(' ')[0]}`;
      }
    }

    // Mensagem de boas-vindas
    await sendText(
      liderPhone,
      `Olá, líder${liderName}! 👋\nVamos preencher o relatório semanal do GC *${cellData.nome || 'Célula'}*? É rapidinho!\n\n📋 *Etapa 1: Chamada*\nMarque na enquete abaixo quem esteve *PRESENTE* na reunião.`
    );
    
    await sendMembersPolls(liderPhone, membersList, false);

    // 4. Salvar estado da sessão na coleção `gc_report_sessions`
    const newSession: GcReportSession = {
      id: liderPhone,
      cellId,
      liderId,
      step: 'ATTENDANCE',
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
    console.log('[GC Bot] Sessão criada com sucesso (step: ATTENDANCE) para', liderPhone);

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
  const isAdvanceCommand = (t: string) => ['ok', 'pronto', 'avançar', 'avancar', 'proximo', 'próximo', 'concluir', 'done', 'sim'].includes(t.toLowerCase().trim());

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

      case 'ATTENDANCE': {
        const latestDoc = await sessionRef.get();
        const latest = latestDoc.data() as GcReportSession;

        if (type === 'poll' && payload?.selectedOptions) {
          const options = payload.selectedOptions as string[];
          const pollOptionsMap = new Map();
          session.members.forEach((m, i) => {
            pollOptionsMap.set(`${i + 1}. ${m.name.substring(0, 20)}`, m.id);
          });
          
          const selectedMemberIds: string[] = [];
          options.forEach((opt: string) => {
             const id = pollOptionsMap.get(opt);
             if (id) selectedMemberIds.push(id);
          });
          
          let pollSelections: any = latest.pollSelections || {};
          pollSelections[payload.pollName || 'poll'] = selectedMemberIds;

          await sessionRef.update({
            pollSelections,
            updatedAt: now
          });
          return true; // Aguarda o usuário responder OK
        } else if ((type === 'button' && payload?.buttonId === 'attendance_done') || (type === 'text' && isAdvanceCommand(msg))) {
          const pollSelections: any = latest.pollSelections || {};
          let presentIds: string[] = [];
          Object.values(pollSelections).forEach((ids: any) => presentIds.push(...ids));
          
          // Remove duplicatas (caso raro)
          presentIds = [...new Set(presentIds)];

          const attendanceMap: { [memberId: string]: 'presente' | 'ausente_sem_justificativa' } = {};
          session.members.forEach(member => {
            attendanceMap[member.id] = presentIds.includes(member.id) ? 'presente' : 'ausente_sem_justificativa';
          });

          const presentCount = presentIds.length;
          const absentCount = session.members.length - presentCount;

          await sessionRef.update({
            attendance: attendanceMap,
            attendanceAccumulated: presentIds,
            step: 'CARE_CHOICE',
            updatedAt: now
          });
          
          await sendText(
            fromPhone,
            `✅ Chamada registrada! ${presentCount} presentes, ${absentCount} ausentes.\n\n❤️ *Etapa de Cuidado*\n\nAlgum membro do GC precisa de atenção ou cuidado especial esta semana?`
          );
          await wait(1000);
          await sendPoll(fromPhone, 'Algum membro precisa de cuidado?', ['Sim', 'Não'], 1);
        } else if (type === 'text') {
           // Aceitar fallback em texto ("ok" ou número se preencher na mão)
           if (msg === 'ok' || msg === 'pronto' || msg === '0') {
             // Simular botão done
             return handleGcReportIncomingMessage(fromPhone, '', 'button', { buttonId: 'attendance_done' });
           }
        }
        break;

      case 'CARE_CHOICE': {
        // Detectar resposta via enquete (Sim/Não) ou texto
        let careAnswer: 'sim' | 'nao' | null = null;
        
        if (type === 'poll' && payload?.selectedOptions) {
          const options = (payload.selectedOptions as string[]).map((o: string) => o.toLowerCase());
          if (options.some((o: string) => o.includes('sim'))) careAnswer = 'sim';
          else if (options.some((o: string) => o.includes('não') || o.includes('nao'))) careAnswer = 'nao';
        } else if (type === 'text') {
          if (msg === 'sim' || msg === 's') careAnswer = 'sim';
          else if (msg === 'não' || msg === 'nao' || msg === 'n') careAnswer = 'nao';
        } else if (type === 'button') {
          if (payload?.buttonId === 'care_yes') careAnswer = 'sim';
          if (payload?.buttonId === 'care_no') careAnswer = 'nao';
        }
        
        if (careAnswer === 'sim') {
          const presentMembers = session.members.filter(m => session.attendance[m.id] === 'presente');
          
          if (presentMembers.length === 0) {
            await sendText(fromPhone, 'Nenhum membro foi marcado como presente. Avançando para a lição...');
            await sessionRef.update({ step: 'METRICS_LESSON', updatedAt: now });
            await sendText(fromPhone, '📖 *Etapa 2: Tema da Lição*\n\nQual foi o tema ou título da lição ministrada no GC esta semana?\n\n_Envie o título por mensagem de texto._');
          } else {
            await sessionRef.update({ step: 'CARE_SELECT', updatedAt: now });
            await sendText(fromPhone, 'Marque na enquete abaixo quem precisa de atenção especial nesta semana.');
            await sendMembersPolls(fromPhone, presentMembers, true);
          }
        } else if (careAnswer === 'nao') {
          await sessionRef.update({ step: 'METRICS_LESSON', updatedAt: now });
          await sendText(fromPhone, '📖 *Etapa 2: Tema da Lição*\n\nQual foi o tema ou título da lição ministrada no GC esta semana?\n\n_Envie o título por mensagem de texto._');
        } else if (type === 'text') {
          await sendText(fromPhone, 'Vote na enquete acima: *Sim* se algum membro precisa de cuidado, ou *Não* para avançar.');
        }
        break;
      }

      case 'CARE_SELECT': {
        const latestDocCare = await sessionRef.get();
        const latestCare = latestDocCare.data() as GcReportSession;

        if (type === 'poll' && payload?.selectedOptions) {
          const options = payload.selectedOptions as string[];
          
          const pollOptionsMap = new Map();
          session.members.forEach((m, i) => {
            pollOptionsMap.set(`${i + 1}. ${m.name.substring(0, 20)}`, m.id);
          });
          
          const selectedMemberIds: string[] = [];
          options.forEach((opt: string) => {
             const id = pollOptionsMap.get(opt);
             if (id) selectedMemberIds.push(id);
          });
          
          let careSelections: any = latestCare.careSelections || {};
          careSelections[payload.pollName || 'poll'] = selectedMemberIds;

          await sessionRef.update({
            careSelections,
            updatedAt: now
          });
          return true; // Aguarda o usuário responder OK
        } else if ((type === 'button' && payload?.buttonId === 'care_done') || (type === 'text' && isAdvanceCommand(msg))) {
          const careSelections: any = latestCare.careSelections || {};
          let careQueue: string[] = [];
          Object.values(careSelections).forEach((ids: any) => careQueue.push(...ids));
          
          // Remove duplicatas
          careQueue = [...new Set(careQueue)];
          
          if (careQueue.length === 0) {
            await sendText(fromPhone, 'Nenhum membro foi selecionado para cuidado. Avançando para a lição...');
            await sessionRef.update({ step: 'METRICS_LESSON', updatedAt: now });
            await sendText(fromPhone, '📖 *Etapa 2: Tema da Lição*\n\nQual foi o tema ou título da lição ministrada no GC esta semana?\n\n_Envie o título por mensagem de texto._');
          } else {
            await sessionRef.update({
              careMembersQueue: careQueue,
              step: 'CARE_MEMBER_THERMOMETER',
              currentCareIndex: 0,
              updatedAt: now
            });
            
            const firstMemberId = careQueue[0];
            const firstMember = session.members.find(m => m.id === firstMemberId);
            await sendText(
              fromPhone,
              `🌡️ *Termômetro: ${firstMember?.name} (1/${careQueue.length})*\n\nComo você avalia o momento atual dele(a)?\n👉 *Responda com uma nota de 1 a 10* (1 = muita ajuda, 10 = excelente).`
            );
          }
        } else if (type === 'text') {
           if (msg === 'ok' || msg === 'pronto' || msg === '0') {
             return handleGcReportIncomingMessage(fromPhone, '', 'button', { buttonId: 'care_done' });
           } else {
             await sendText(fromPhone, '👉 Quando terminar de marcar na enquete acima, responda com *OK* para continuarmos.');
           }
        }
        break;
      }

      case 'CARE_MEMBER_THERMOMETER':
        if (type === 'text' || type === 'button') {
          const ratingText = type === 'button' ? payload?.buttonId : messageText.trim();
          const rating = parseInt(ratingText || '', 10);
          
          if (isNaN(rating) || rating < 1 || rating > 10) {
            await sendText(fromPhone, 'Por favor, envie um número de *1 a 10* para o termômetro espiritual.');
            return true;
          }
          
          const latestDoc = await sessionRef.get();
          const latest = latestDoc.data() as GcReportSession;
          const careQueue = latest.careMembersQueue || [];
          const idx = latest.currentCareIndex || 0;
          const memberId = careQueue[idx];
          
          const thermometers = latest.thermometers || {};
          thermometers[memberId] = { termometro: rating, pedidoOracao: '' };
          
          await sessionRef.update({
            thermometers,
            step: 'CARE_MEMBER_PRAYER',
            updatedAt: now
          });
          
          const member = session.members.find(m => m.id === memberId);
          await sendText(
            fromPhone,
            `🙏 *Pedido de Oração: ${member?.name || 'Membro'}*\n\nQual é o pedido de oração ou situação de cuidado dele(a)?\n\n_(Envie o pedido ou digite *pular* se não houver)_`
          );
        }
        break;

      case 'CARE_MEMBER_PRAYER':
        if (type === 'text') {
          const prayer = (msg === 'pular' || msg === '-') ? '' : messageText.trim();
          
          const latestDoc = await sessionRef.get();
          const latest = latestDoc.data() as GcReportSession;
          const careQueue = latest.careMembersQueue || [];
          const idx = latest.currentCareIndex || 0;
          const memberId = careQueue[idx];
          
          const thermometers = latest.thermometers || {};
          if (thermometers[memberId]) {
            thermometers[memberId].pedidoOracao = prayer;
          } else {
            thermometers[memberId] = { termometro: 5, pedidoOracao: prayer };
          }
          
          const nextIdx = idx + 1;
          if (nextIdx < careQueue.length) {
            await sessionRef.update({
              thermometers,
              currentCareIndex: nextIdx,
              step: 'CARE_MEMBER_THERMOMETER',
              updatedAt: now
            });
            
            const nextMemberId = careQueue[nextIdx];
            const nextMember = session.members.find(m => m.id === nextMemberId);
            await sendText(
              fromPhone,
              `🌡️ *Termômetro: ${nextMember?.name} (${nextIdx + 1}/${careQueue.length})*\n\nComo você avalia o momento atual dele(a)?\n👉 *Responda com uma nota de 1 a 10* (1 = muita ajuda, 10 = excelente).`
            );
          } else {
            await sessionRef.update({
              thermometers,
              step: 'METRICS_LESSON',
              updatedAt: now
            });
            await sendText(
              fromPhone,
              '📖 *Etapa 2: Tema da Lição*\n\nQual foi o tema ou título da lição ministrada no GC esta semana?'
            );
          }
        }
        break;

      case 'METRICS_LESSON':
        if (type === 'text') {
          const licao = messageText.trim();
          await sessionRef.update({
            'metrics.licao': licao,
            step: 'METRICS_VISITORS',
            updatedAt: now
          });
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
          await sendText(
            fromPhone,
            '💬 *Etapa 5: Feedback ao Supervisor*\n\nQuer deixar alguma mensagem, observação de cuidado ou feedback para o seu supervisor?\n\nDigite sua mensagem ou envie *0* para concluir sem feedback.'
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
      await sendMembersPolls(to, session.members, false);
      break;
    case 'CARE_CHOICE':
      await sendButton(
        to,
        'Algum membro do GC precisa de atenção ou cuidado especial esta semana?',
        [
          { id: 'care_yes', text: 'Sim' },
          { id: 'care_no', text: 'Não' }
        ],
        '❤️ Etapa de Cuidado'
      );
      break;
    case 'CARE_SELECT':
      const presentMembers = session.members.filter(m => session.attendance[m.id] === 'presente');
      await sendText(to, 'Marque na enquete abaixo quem precisa de atenção especial nesta semana.');
      await sendMembersPolls(to, presentMembers, true);
      break;
    case 'CARE_MEMBER_THERMOMETER':
      const careQueueT = session.careMembersQueue || [];
      const idxT = session.currentCareIndex || 0;
      const mIdT = careQueueT[idxT];
      const memberT = session.members.find(m => m.id === mIdT);
      await sendList(
        to,
        'Como você avalia o momento atual dele(a)?',
        'Ver Notas',
        [
          {
            title: 'Notas (1 a 10)',
            rows: [
              { rowId: '1', title: '1 - Precisando de muita ajuda' },
              { rowId: '2', title: '2' },
              { rowId: '3', title: '3' },
              { rowId: '4', title: '4' },
              { rowId: '5', title: '5' },
              { rowId: '6', title: '6' },
              { rowId: '7', title: '7' },
              { rowId: '8', title: '8' },
              { rowId: '9', title: '9' },
              { rowId: '10', title: '10 - Excelente' }
            ]
          }
        ],
        `🌡️ Termômetro: ${memberT?.name} (${idxT + 1}/${careQueueT.length})`
      );
      break;
    case 'CARE_MEMBER_PRAYER':
      const careQueueP = session.careMembersQueue || [];
      const idxP = session.currentCareIndex || 0;
      const mIdP = careQueueP[idxP];
      const memberP = session.members.find(m => m.id === mIdP);
      await sendText(to, `🙏 *Pedido de Oração: ${memberP?.name || 'Membro'}*\n\nQual é o pedido de oração ou situação de cuidado dele(a)?`);
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
      await sendText(to, '💬 *Etapa 5: Feedback ao Supervisor*\n\nQuer deixar alguma mensagem, observação de cuidado ou feedback para o seu supervisor?\n\nDigite sua mensagem ou envie *0* para concluir sem feedback.');
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

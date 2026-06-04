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

/**
 * Envia uma enquete (Poll).
 */
async function sendSurvey(to: string, name: string, options: string[]) {
  const whatsapp = await getWhatsAppClient();
  await whatsapp.sendMessage({
    type: 'survey',
    body: {
      to,
      name,
      options
    }
  });
}

/**
 * Envia uma mensagem de texto simples.
 */
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
 * Inicializa a sessão do relatório de GC para um líder.
 */
export async function startGcReportSession(cellId: string, liderPhone: string, isTestData = false): Promise<boolean> {
  const db = getAdminDb();
  const sessionRef = db.collection('gc_report_sessions').doc(liderPhone);

  try {
    return await db.runTransaction(async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);

      // Se já houver sessão ativa criada nas últimas 24h, evita sobrescrever
      if (sessionDoc.exists) {
        const data = sessionDoc.data();
        const updatedAt = data?.updatedAt?.toMillis() || 0;
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (updatedAt > oneDayAgo) {
          console.log(`[GC Bot] Sessão ativa já existente para o líder ${liderPhone}`);
          return false;
        }
      }

      // Buscar informações da célula e seus membros
      const cellDoc = await transaction.get(db.collection('cells').doc(cellId));
      if (!cellDoc.exists) {
        throw new Error('Célula não encontrada.');
      }
      const cellData = cellDoc.data()!;
      const membersIds = (cellData.membros || []) as string[];
      const liderId = cellData.liderId || '';

      const membersList: { id: string; name: string }[] = [];
      if (membersIds.length > 0) {
        const userRefs = membersIds.map(id => db.collection('users').doc(id));
        const userSnaps = await transaction.getAll(...userRefs);
        userSnaps.forEach(snap => {
          if (snap.exists) {
            membersList.push({ id: snap.id, name: snap.data()!.name || 'Membro' });
          }
        });
      }

      // Ordenar membros alfabeticamente para a chamada
      membersList.sort((a, b) => a.name.localeCompare(b.name));

      const newSession: GcReportSession = {
        id: liderPhone,
        cellId,
        liderId,
        step: 'START',
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

      transaction.set(sessionRef, newSession);

      // Disparar o convite no WhatsApp
      await sendButtons(
        liderPhone,
        `Olá, líder! 👋\nA reunião do seu GC *${cellData.nome || 'Célula'}* foi recentemente. Vamos preencher o relatório semanal por aqui? É rapidinho!`,
        [
          { id: 'start_yes', text: 'Sim, iniciar!' },
          { id: 'start_no', text: 'Mais tarde' }
        ],
        'Relatório de GC'
      );

      return true;
    });
  } catch (error) {
    console.error('[GC Bot] Erro ao iniciar sessão:', error);
    return false;
  }
}

/**
 * Handler principal para processar mensagens recebidas no Webhook vinculadas a sessões ativas.
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

  // Tratamento do comando global de reset com confirmação UX
  if (type === 'text' && messageText.trim().toLowerCase() === '/reiniciar') {
    await sendButtons(
      fromPhone,
      '⚠️ Você deseja reiniciar o preenchimento do relatório e apagar o progresso atual?',
      [
        { id: 'reset_confirm', text: 'Sim, reiniciar' },
        { id: 'reset_cancel', text: 'Não, continuar' }
      ]
    );
    return true;
  }

  // Confirmação de Reinício
  if (type === 'button' && payload?.buttonId === 'reset_confirm') {
    await sessionRef.delete();
    await startGcReportSession(session.cellId, fromPhone, session.isTestData);
    return true;
  }
  if (type === 'button' && payload?.buttonId === 'reset_cancel') {
    await sendText(fromPhone, 'Entendido. Continuando de onde paramos...');
    await resendCurrentStepMessage(fromPhone, session);
    return true;
  }

  try {
    switch (session.step) {
      case 'START':
        if (type === 'button') {
          if (payload?.buttonId === 'start_yes') {
            await sessionRef.update({ step: 'ATTENDANCE', attendancePage: 0, attendanceAccumulated: [], updatedAt: now });
            
            const total = session.members.length;
            await sendText(
              fromPhone,
              '📋 *Etapa 1: Chamada*\n\nPor favor, vote na enquete abaixo marcando todos os membros que estiveram *PRESENTES* na reunião.'
            );
            
            if (total <= 11) {
              const memberNames = session.members.map(m => m.name);
              await sendSurvey(
                fromPhone,
                'Quem esteve PRESENTE no GC?',
                memberNames.length > 0 ? memberNames : ['Sem membros cadastrados']
              );
              await sendButtons(
                fromPhone,
                'Após marcar todos os presentes na enquete acima, clique no botão abaixo para avançar.',
                [{ id: 'attendance_done', text: 'Concluir Chamada ➡️' }]
              );
            } else {
              // Primeira página de enquetes (máximo 10)
              const firstPageMembers = session.members.slice(0, 10);
              const memberNames = firstPageMembers.map(m => m.name);
              await sendSurvey(
                fromPhone,
                'Quem esteve PRESENTE no GC? (Pág. 1)',
                memberNames
              );
              await sendButtons(
                fromPhone,
                'Após marcar os presentes desta página, clique abaixo para avançar.',
                [{ id: 'attendance_next', text: 'Avançar ➡️' }]
              );
            }
          } else {
            await sendText(fromPhone, 'Tudo bem! Se quiser responder depois, eu te lembrarei ou você pode iniciar pelo app. Deus abençoe! 🙏');
            await sessionRef.delete();
          }
        }
        break;

      case 'ATTENDANCE':
        // Guardar as respostas acumuladas
        if (type === 'poll' && payload?.selectedOptions) {
          const selectedNames = payload.selectedOptions as string[];
          const accumulated = [...(session.attendanceAccumulated || [])];
          
          const pageIndex = session.attendancePage || 0;
          const pageMembers = session.members.slice(pageIndex * 10, (pageIndex * 10) + 10);
          
          pageMembers.forEach(member => {
            const isSelected = selectedNames.includes(member.name);
            const existsInAccumulated = accumulated.includes(member.id);
            if (isSelected && !existsInAccumulated) {
              accumulated.push(member.id);
            } else if (!isSelected && existsInAccumulated) {
              const idx = accumulated.indexOf(member.id);
              if (idx > -1) accumulated.splice(idx, 1);
            }
          });
          
          await sessionRef.update({ attendanceAccumulated: accumulated, updatedAt: now });
        }

        // Avançar para a próxima página de chamada
        if (type === 'button' && payload?.buttonId === 'attendance_next') {
          const nextPage = (session.attendancePage || 0) + 1;
          const total = session.members.length;
          const startIndex = nextPage * 10;
          const pageMembers = session.members.slice(startIndex, startIndex + 10);
          const memberNames = pageMembers.map(m => m.name);
          
          await sessionRef.update({ attendancePage: nextPage, updatedAt: now });
          
          await sendSurvey(
            fromPhone,
            `Quem esteve PRESENTE no GC? (Pág. ${nextPage + 1})`,
            memberNames
          );
          
          const isLastPage = (startIndex + 10) >= total;
          if (isLastPage) {
            await sendButtons(
              fromPhone,
              'Após marcar os presentes desta página, clique no botão abaixo para concluir a chamada.',
              [{ id: 'attendance_done', text: 'Concluir Chamada ➡️' }]
            );
          } else {
            await sendButtons(
              fromPhone,
              'Após marcar os presentes desta página, clique no botão abaixo para avançar.',
              [{ id: 'attendance_next', text: 'Avançar ➡️' }]
            );
          }
        }

        // Concluir a chamada
        if (type === 'button' && payload?.buttonId === 'attendance_done') {
          const attendanceMap: { [memberId: string]: 'presente' | 'ausente_sem_justificativa' } = {};
          
          // Buscar as respostas mais recentes direto do Firestore atualizado
          const latestSessionDoc = await sessionRef.get();
          const latestSession = latestSessionDoc.data() as GcReportSession;
          const accumulated = latestSession.attendanceAccumulated || [];
          
          session.members.forEach(member => {
            if (accumulated.includes(member.id)) {
              attendanceMap[member.id] = 'presente';
            } else {
              attendanceMap[member.id] = 'ausente_sem_justificativa';
            }
          });
          
          await sessionRef.update({
            attendance: attendanceMap,
            step: 'CARE_CHOICE',
            updatedAt: now
          });
          
          await sendButtons(
            fromPhone,
            '❤️ *Etapa de Cuidado*\n\nAlgum membro do GC precisa de atenção ou cuidado especial esta semana?',
            [
              { id: 'care_yes', text: 'Sim, selecionar' },
              { id: 'care_no', text: 'Não, avançar' }
            ]
          );
        }
        break;

      case 'CARE_CHOICE':
        if (type === 'button') {
          if (payload?.buttonId === 'care_yes') {
            const presentMembers = session.members.filter(m => session.attendance[m.id] === 'presente');
            
            if (presentMembers.length === 0) {
              await sendText(fromPhone, 'Nenhum membro foi marcado como presente. Avançando para a lição...');
              await sessionRef.update({ step: 'METRICS_LESSON', updatedAt: now });
              await sendText(
                fromPhone,
                '📖 *Etapa 2: Tema da Lição*\n\nQual foi o tema ou título da lição ministrada no GC esta semana?'
              );
            } else {
              await sessionRef.update({ step: 'CARE_SELECT', updatedAt: now });
              const presentNames = presentMembers.map(m => m.name);
              
              await sendSurvey(
                fromPhone,
                'Quem precisa de atenção especial?',
                presentNames.slice(0, 11) // Limita a 11 opções na enquete
              );
              
              await sendButtons(
                fromPhone,
                'Após marcar na enquete acima quem precisa de atenção, clique no botão abaixo para prosseguir.',
                [{ id: 'care_select_done', text: 'Concluir Seleção ➡️' }]
              );
            }
          } else if (payload?.buttonId === 'care_no') {
            await sessionRef.update({ step: 'METRICS_LESSON', updatedAt: now });
            await sendText(
              fromPhone,
              '📖 *Etapa 2: Tema da Lição*\n\nQual foi o tema ou título da lição ministrada no GC esta semana?'
            );
          }
        }
        break;

      case 'CARE_SELECT':
        if (type === 'poll' && payload?.selectedOptions) {
          const selectedNames = payload.selectedOptions as string[];
          const careQueue: string[] = [];
          
          session.members.forEach(member => {
            if (selectedNames.includes(member.name)) {
              careQueue.push(member.id);
            }
          });
          
          await sessionRef.update({ careMembersQueue: careQueue, updatedAt: now });
        }
        
        if (type === 'button' && payload?.buttonId === 'care_select_done') {
          const latestDoc = await sessionRef.get();
          const latest = latestDoc.data() as GcReportSession;
          const careQueue = latest.careMembersQueue || [];
          
          if (careQueue.length === 0) {
            await sendText(fromPhone, 'Nenhum membro foi selecionado. Avançando para a lição...');
            await sessionRef.update({ step: 'METRICS_LESSON', updatedAt: now });
            await sendText(
              fromPhone,
              '📖 *Etapa 2: Tema da Lição*\n\nQual foi o tema ou título da lição ministrada no GC esta semana?'
            );
          } else {
            await sessionRef.update({
              step: 'CARE_MEMBER_THERMOMETER',
              currentCareIndex: 0,
              updatedAt: now
            });
            
            const firstMemberId = careQueue[0];
            const firstMember = session.members.find(m => m.id === firstMemberId);
            await sendText(
              fromPhone,
              `🌡️ *Cuidado: ${firstMember?.name || 'Membro'} (1/${careQueue.length})*\n\nDe 1 a 10, qual o termômetro espiritual dele(a) no momento?`
            );
          }
        }
        break;

      case 'CARE_MEMBER_THERMOMETER':
        if (type === 'text') {
          const ratingText = messageText.trim();
          const rating = parseInt(ratingText, 10);
          const val = (!isNaN(rating) && rating >= 1 && rating <= 10) ? rating : 5;
          
          const latestDoc = await sessionRef.get();
          const latest = latestDoc.data() as GcReportSession;
          const careQueue = latest.careMembersQueue || [];
          const idx = latest.currentCareIndex || 0;
          const memberId = careQueue[idx];
          
          const thermometers = latest.thermometers || {};
          thermometers[memberId] = { termometro: val, pedidoOracao: '' };
          
          await sessionRef.update({
            thermometers,
            step: 'CARE_MEMBER_PRAYER',
            updatedAt: now
          });
          
          const member = session.members.find(m => m.id === memberId);
          await sendText(
            fromPhone,
            `🙏 *Pedido de Oração: ${member?.name || 'Membro'}*\n\nQual é o pedido de oração ou situação de cuidado dele(a)?`
          );
        }
        break;

      case 'CARE_MEMBER_PRAYER':
        if (type === 'text') {
          const prayer = messageText.trim();
          
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
              `🌡️ *Cuidado: ${nextMember?.name || 'Membro'} (${nextIdx + 1}/${careQueue.length})*\n\nDe 1 a 10, qual o termômetro espiritual dele(a) no momento?`
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
            '👥 *Etapa 3: Visitantes*\n\nDigite o nome dos visitantes que estiveram presentes (separados por vírgula).\n\n*Caso não tenha havido nenhum visitante, envie apenas o número 0.*'
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
          await sendButtons(
            fromPhone,
            '🎯 *Etapa 4: Conversões*\n\nHouve alguma decisão por Cristo ou reconciliação na reunião?',
            [
              { id: 'conv_0', text: 'Não (0)' },
              { id: 'conv_1', text: 'Sim (1)' },
              { id: 'conv_more', text: 'Mais de 1' }
            ]
          );
        }
        break;

      case 'METRICS_CONVERSIONS':
        let conversoes = 0;
        let advanced = false;

        if (type === 'button') {
          if (payload?.buttonId === 'conv_0') {
            conversoes = 0;
            advanced = true;
          } else if (payload?.buttonId === 'conv_1') {
            conversoes = 1;
            advanced = true;
          } else if (payload?.buttonId === 'conv_more') {
            await sendText(fromPhone, 'Digite a quantidade exata de conversões/decisões ocorridas:');
            return true;
          }
        } else if (type === 'text') {
          const num = parseInt(messageText.trim(), 10);
          if (!isNaN(num) && num >= 0) {
            conversoes = num;
            advanced = true;
          } else {
            await sendText(fromPhone, 'Por favor, digite um número inteiro válido para a quantidade de conversões.');
            return true;
          }
        }

        if (advanced) {
          await sessionRef.update({
            'metrics.conversoes': conversoes,
            step: 'FEEDBACK',
            updatedAt: now
          });
          await sendButtons(
            fromPhone,
            '💬 *Etapa 5: Feedback ao Supervisor*\n\nQuer deixar alguma mensagem, observação de cuidado ou feedback para o seu supervisor?',
            [
              { id: 'feed_skip', text: 'Não, concluir' },
              { id: 'feed_write', text: 'Sim, escrever' }
            ]
          );
        }
        break;

      case 'FEEDBACK':
        let feedbackText = '';
        let submitReport = false;

        if (type === 'button') {
          if (payload?.buttonId === 'feed_skip') {
            feedbackText = '';
            submitReport = true;
          } else if (payload?.buttonId === 'feed_write') {
            await sendText(fromPhone, 'Digite a sua mensagem para o supervisor:');
            return true;
          }
        } else if (type === 'text') {
          feedbackText = messageText.trim();
          submitReport = true;
        }

        if (submitReport) {
          const latestDoc = await sessionRef.get();
          const latest = latestDoc.data() as GcReportSession;
          const success = await finalizeAndSubmitReport(latest, feedbackText);
          if (success) {
            await sendText(
              fromPhone,
              '🎉 *Relatório Enviado com Sucesso!*\n\nMuito obrigado pelo seu relatório e pela dedicação na liderança do seu GC! Que Deus continue abençoando vocês. 🚀'
            );
            await sessionRef.delete();
          } else {
            await sendText(
              fromPhone,
              '⚠️ Desculpe, ocorreu um erro ao salvar o seu relatório. Por favor, tente enviar novamente digitando seu feedback ou use o comando /reiniciar.'
            );
          }
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
      const total = session.members.length;
      const pageIndex = session.attendancePage || 0;
      if (total <= 11) {
        const memberNames = session.members.map(m => m.name);
        await sendSurvey(to, 'Quem esteve PRESENTE no GC?', memberNames);
        await sendButtons(to, 'Clique abaixo para concluir a chamada.', [{ id: 'attendance_done', text: 'Concluir Chamada ➡️' }]);
      } else {
        const pageMembers = session.members.slice(pageIndex * 10, (pageIndex * 10) + 10);
        const memberNames = pageMembers.map(m => m.name);
        await sendSurvey(to, `Quem esteve PRESENTE no GC? (Pág. ${pageIndex + 1})`, memberNames);
        const isLastPage = (pageIndex * 10 + 10) >= total;
        if (isLastPage) {
          await sendButtons(to, 'Clique abaixo para concluir a chamada.', [{ id: 'attendance_done', text: 'Concluir Chamada ➡️' }]);
        } else {
          await sendButtons(to, 'Clique abaixo para avançar.', [{ id: 'attendance_next', text: 'Avançar ➡️' }]);
        }
      }
      break;
    case 'CARE_CHOICE':
      await sendButtons(to, 'Algum membro do GC precisa de atenção especial?', [
        { id: 'care_yes', text: 'Sim, selecionar' },
        { id: 'care_no', text: 'Não, avançar' }
      ]);
      break;
    case 'CARE_SELECT':
      const presentMembers = session.members.filter(m => session.attendance[m.id] === 'presente');
      await sendSurvey(to, 'Quem precisa de atenção especial?', presentMembers.map(m => m.name).slice(0, 11));
      await sendButtons(to, 'Clique abaixo para concluir a seleção.', [{ id: 'care_select_done', text: 'Concluir Seleção ➡️' }]);
      break;
    case 'CARE_MEMBER_THERMOMETER':
      const careQueueT = session.careMembersQueue || [];
      const idxT = session.currentCareIndex || 0;
      const mIdT = careQueueT[idxT];
      const memberT = session.members.find(m => m.id === mIdT);
      await sendText(to, `🌡️ *Cuidado: ${memberT?.name || 'Membro'}*\n\nDe 1 a 10, qual o termômetro espiritual dele(a) no momento?`);
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
      await sendButtons(to, '🎯 *Etapa 4: Conversões*\n\nHouve decisões na reunião?', [
        { id: 'conv_0', text: 'Não (0)' },
        { id: 'conv_1', text: 'Sim (1)' },
        { id: 'conv_more', text: 'Mais de 1' }
      ]);
      break;
    case 'FEEDBACK':
      await sendButtons(to, '💬 *Etapa 5: Feedback*\n\nQuer deixar feedback ao seu supervisor?', [
        { id: 'feed_skip', text: 'Não, concluir' },
        { id: 'feed_write', text: 'Sim, escrever' }
      ]);
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

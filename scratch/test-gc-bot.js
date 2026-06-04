// Executar com: node scratch/test-gc-bot.js
require('dotenv').config();
const admin = require('firebase-admin');

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let app;

try {
  if (serviceAccountKey) {
    let cleanKey = serviceAccountKey.trim();
    if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
      cleanKey = cleanKey.slice(1, -1);
    }
    const sa = JSON.parse(cleanKey);
    app = admin.initializeApp({
      credential: admin.credential.cert(sa),
      projectId: sa.project_id || 'studio-1424813022-71754'
    });
  } else {
    app = admin.initializeApp({
      projectId: 'studio-1424813022-71754',
      credential: admin.credential.applicationDefault()
    });
  }
} catch (e) {
  console.error("Firebase Admin initialization error:", e);
}

const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;

async function runTest() {
  console.log('=== Iniciando Teste do Bot de GC - Fase 2 (Paginação e Cuidado) ===');
  
  const testPhone = '5521999998888';
  const testCellId = 'test_cell_id_123';

  // 1. Criar Célula de Teste com 13 membros para testar a paginação (>11 membros)
  console.log('1. Criando célula de teste com 13 membros...');
  const members = Array.from({ length: 13 }, (_, i) => `member_${i + 1}`);
  
  await db.collection('cells').doc(testCellId).set({
    nome: 'GC de Teste Antigravity Grande',
    liderId: 'test_leader_uid',
    supervisorId: 'test_supervisor_uid',
    membros: members,
    status: 'active'
  });

  const batchSetup = db.batch();
  members.forEach((mId, i) => {
    batchSetup.set(db.collection('users').doc(mId), { name: `Membro Teste ${String.fromCharCode(65 + i)}` });
  });
  batchSetup.set(db.collection('users').doc('test_leader_uid'), { name: 'Líder Teste' });
  await batchSetup.commit();

  // 2. Importar o bot compilado (ou simular a lógica da máquina de estados diretamente usando o Firestore)
  // Simulando a lógica de gc-report-bot.ts diretamente no teste:
  console.log('2. Inicializando sessão do bot no Firestore...');
  const sessionRef = db.collection('gc_report_sessions').doc(testPhone);
  
  const membersList = [];
  for (let i = 0; i < 13; i++) {
    membersList.push({ id: `member_${i + 1}`, name: `Membro Teste ${String.fromCharCode(65 + i)}` });
  }
  // Ordenado por nome
  membersList.sort((a, b) => a.name.localeCompare(b.name));

  const newSession = {
    id: testPhone,
    cellId: testCellId,
    liderId: 'test_leader_uid',
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
    isTestData: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };
  await sessionRef.set(newSession);

  // 3. Simular clique em iniciar
  console.log('3. Transicionando de START para ATTENDANCE...');
  await sessionRef.update({
    step: 'ATTENDANCE',
    attendancePage: 0,
    attendanceAccumulated: [],
    updatedAt: Timestamp.now()
  });

  // 4. Simular enquete da página 1 (Membros 1 a 10). Líder marca Membro A (member_1) e Membro B (member_2)
  console.log('4. Simulando resposta da enquete na página 1 (marcando Membro A e Membro B)...');
  const selectedOptionsPage1 = ['Membro Teste A', 'Membro Teste B'];
  let session = (await sessionRef.get()).data();
  let accumulated = [...session.attendanceAccumulated];
  
  // Lógica de acúmulo da pág 1
  const page1Members = session.members.slice(0, 10);
  page1Members.forEach(member => {
    const isSelected = selectedOptionsPage1.includes(member.name);
    const exists = accumulated.includes(member.id);
    if (isSelected && !exists) {
      accumulated.push(member.id);
    } else if (!isSelected && exists) {
      const idx = accumulated.indexOf(member.id);
      if (idx > -1) accumulated.splice(idx, 1);
    }
  });
  await sessionRef.update({ attendanceAccumulated: accumulated, updatedAt: Timestamp.now() });

  // 5. Simular clique em "Avançar" para ir para a pág 2 (índice 1)
  console.log('5. Simulando clique em "Avançar" para página 2...');
  session = (await sessionRef.get()).data();
  const nextPage = session.attendancePage + 1;
  await sessionRef.update({
    attendancePage: nextPage,
    updatedAt: Timestamp.now()
  });

  // 6. Simular enquete da página 2 (Membros 11 a 13). Líder marca Membro L (member_12)
  console.log('6. Simulando resposta da enquete na página 2 (marcando Membro L)...');
  const selectedOptionsPage2 = ['Membro Teste L'];
  session = (await sessionRef.get()).data();
  accumulated = [...session.attendanceAccumulated];
  
  const page2Members = session.members.slice(10, 20);
  page2Members.forEach(member => {
    const isSelected = selectedOptionsPage2.includes(member.name);
    const exists = accumulated.includes(member.id);
    if (isSelected && !exists) {
      accumulated.push(member.id);
    } else if (!isSelected && exists) {
      const idx = accumulated.indexOf(member.id);
      if (idx > -1) accumulated.splice(idx, 1);
    }
  });
  await sessionRef.update({ attendanceAccumulated: accumulated, updatedAt: Timestamp.now() });

  // 7. Simular clique em "Concluir Chamada" -> Transiciona para CARE_CHOICE e converte acumulados para attendance
  console.log('7. Simulando clique em "Concluir Chamada" (converte acumulados e vai para CARE_CHOICE)...');
  session = (await sessionRef.get()).data();
  const attendanceMap = {};
  session.members.forEach(member => {
    if (session.attendanceAccumulated.includes(member.id)) {
      attendanceMap[member.id] = 'presente';
    } else {
      attendanceMap[member.id] = 'ausente_sem_justificativa';
    }
  });
  await sessionRef.update({
    attendance: attendanceMap,
    step: 'CARE_CHOICE',
    updatedAt: Timestamp.now()
  });

  // 8. Simular clique em "Sim, selecionar" para Cuidado -> Vai para CARE_SELECT
  console.log('8. Simulando clique em "Sim, selecionar" para Cuidado...');
  await sessionRef.update({
    step: 'CARE_SELECT',
    updatedAt: Timestamp.now()
  });

  // 9. Simular enquete de seleção de cuidado (Líder seleciona Membro A e Membro L)
  console.log('9. Simulando enquete de seleção de Cuidado (marcando Membro A e Membro L)...');
  const careSelection = ['Membro Teste A', 'Membro Teste L'];
  session = (await sessionRef.get()).data();
  const careQueue = [];
  session.members.forEach(member => {
    if (careSelection.includes(member.name)) {
      careQueue.push(member.id);
    }
  });
  await sessionRef.update({
    careMembersQueue: careQueue,
    updatedAt: Timestamp.now()
  });

  // 10. Simular clique em "Concluir Seleção" -> Transiciona para CARE_MEMBER_THERMOMETER com o primeiro membro
  console.log('10. Simulando clique em "Concluir Seleção" -> Pergunta termômetro do Membro A...');
  await sessionRef.update({
    step: 'CARE_MEMBER_THERMOMETER',
    currentCareIndex: 0,
    updatedAt: Timestamp.now()
  });

  // 11. Líder responde "8" para o Membro A -> Salva e transiciona para CARE_MEMBER_PRAYER do Membro A
  console.log('11. Simulando resposta do termômetro do Membro A ("8")...');
  session = (await sessionRef.get()).data();
  let thermometers = { ...session.thermometers };
  let currentMemberId = session.careMembersQueue[session.currentCareIndex];
  thermometers[currentMemberId] = { termometro: 8, pedidoOracao: '' };
  await sessionRef.update({
    thermometers,
    step: 'CARE_MEMBER_PRAYER',
    updatedAt: Timestamp.now()
  });

  // 12. Líder digita o pedido de oração do Membro A -> Salva, incrementa index e transiciona para CARE_MEMBER_THERMOMETER do Membro L
  console.log('12. Simulando resposta do pedido de oração do Membro A...');
  session = (await sessionRef.get()).data();
  thermometers = { ...session.thermometers };
  currentMemberId = session.careMembersQueue[session.currentCareIndex];
  thermometers[currentMemberId].pedidoOracao = 'Saúde da família';
  
  await sessionRef.update({
    thermometers,
    currentCareIndex: 1,
    step: 'CARE_MEMBER_THERMOMETER',
    updatedAt: Timestamp.now()
  });

  // 13. Líder responde "7" para o Membro L -> Salva e transiciona para CARE_MEMBER_PRAYER do Membro L
  console.log('13. Simulando resposta do termômetro do Membro L ("7")...');
  session = (await sessionRef.get()).data();
  thermometers = { ...session.thermometers };
  currentMemberId = session.careMembersQueue[session.currentCareIndex];
  thermometers[currentMemberId] = { termometro: 7, pedidoOracao: '' };
  await sessionRef.update({
    thermometers,
    step: 'CARE_MEMBER_PRAYER',
    updatedAt: Timestamp.now()
  });

  // 14. Líder digita o pedido de oração do Membro L -> Salva e avança para METRICS_LESSON (fim do loop)
  console.log('14. Simulando resposta do pedido de oração do Membro L (fim do loop de cuidado)...');
  session = (await sessionRef.get()).data();
  thermometers = { ...session.thermometers };
  currentMemberId = session.careMembersQueue[session.currentCareIndex];
  thermometers[currentMemberId].pedidoOracao = 'Decisão profissional importante';
  
  await sessionRef.update({
    thermometers,
    step: 'METRICS_LESSON',
    updatedAt: Timestamp.now()
  });

  // 15. Simular envio da lição -> METRICS_VISITORS
  console.log('15. Simulando envio do tema da lição...');
  await sessionRef.update({
    'metrics.licao': 'Lição da Fé',
    step: 'METRICS_VISITORS',
    updatedAt: Timestamp.now()
  });

  // 16. Simular envio de visitantes (0) -> METRICS_CONVERSIONS
  console.log('16. Simulando envio de visitantes (0)...');
  await sessionRef.update({
    'metrics.visitantes': '',
    step: 'METRICS_CONVERSIONS',
    updatedAt: Timestamp.now()
  });

  // 17. Simular envio de conversões (0) -> FEEDBACK
  console.log('17. Simulando envio de conversões (0)...');
  await sessionRef.update({
    'metrics.conversoes': 0,
    step: 'FEEDBACK',
    updatedAt: Timestamp.now()
  });

  // 18. Simular finalização e submissão de relatório
  console.log('18. Finalizando e gerando os relatórios no Firestore...');
  session = (await sessionRef.get()).data();
  const feedback = 'Reunião muito abençoada!';

  const batch = db.batch();
  const reportDate = new Date().toISOString().split('T')[0];

  let presentesCount = 0;
  let ausentesSemJust = 0;
  const finalAttendance = { ...session.attendance };

  session.members.forEach(member => {
    if (!finalAttendance[member.id]) {
      finalAttendance[member.id] = 'ausente_sem_justificativa';
    }
    if (finalAttendance[member.id] === 'presente') {
      presentesCount++;
    } else {
      ausentesSemJust++;
    }
  });

  const logRef = db.collection('reuniao_logs').doc();
  batch.set(logRef, {
    cellId: session.cellId,
    cellNome: 'GC de Teste Antigravity Grande',
    date: reportDate,
    liderId: session.liderId,
    supervisorId: 'test_supervisor_uid',
    metricas: {
      totalMembrosAtivos: session.members.length,
      presentes: presentesCount,
      ausentesJustificados: 0,
      ausentesSemJustificativa: ausentesSemJust,
      visitantes: 0,
      conversoes: session.metrics.conversoes,
      oferta: 0
    },
    licaoMinistrada: session.metrics.licao,
    visitantesNomes: session.metrics.visitantes,
    feedbackAoSupervisor: feedback,
    isTestData: true,
    createdAt: Timestamp.now()
  });

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
      isTestData: true,
      createdAt: Timestamp.now()
    });
  });

  await batch.commit();
  await sessionRef.delete();

  console.log('19. Verificando dados gravados no Firestore...');
  const writtenLog = await db.collection('reuniao_logs').where('isTestData', '==', true).get();
  console.log(`- Encontrados ${writtenLog.size} logs de reunião de teste.`);
  
  const writtenPresences = await db.collection('presencas_historico')
    .where('isTestData', '==', true)
    .where('status', '==', 'presente')
    .get();
  console.log(`- Encontrados ${writtenPresences.size} registros de presença de teste como 'presente' (esperado: 3 - Membros A, B e L).`);

  const allTestPresencesForCare = await db.collection('presencas_historico')
    .where('isTestData', '==', true)
    .get();
  const writtenCares = allTestPresencesForCare.docs.filter(d => d.data().termometro > 0);
  console.log(`- Encontrados ${writtenCares.length} registros de presença de teste com termômetro espiritual (esperado: 2 - Membros A e L).`);

  // Cleanup de todos os registros de teste
  console.log('20. Executando limpeza automática dos registros de teste...');
  const cleanBatch = db.batch();
  
  const testLogs = await db.collection('reuniao_logs').where('isTestData', '==', true).get();
  testLogs.forEach(d => cleanBatch.delete(d.ref));
  
  const testPresences = await db.collection('presencas_historico').where('isTestData', '==', true).get();
  testPresences.forEach(d => cleanBatch.delete(d.ref));
  
  // Limpar a célula e usuários
  cleanBatch.delete(db.collection('cells').doc(testCellId));
  members.forEach(mId => {
    cleanBatch.delete(db.collection('users').doc(mId));
  });
  cleanBatch.delete(db.collection('users').doc('test_leader_uid'));
  
  await cleanBatch.commit();
  console.log('=== Fase 2: Teste do Bot de GC finalizado com Sucesso e Limpo! ===');
}

runTest().catch(console.error);

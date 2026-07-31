'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { formatName } from '@/lib/utils';
import { SituacaoCaminhada } from '@/types/person';

export interface ConectarConfig {
  intentRedirects?: {
    ATUALIZACAO?: string; // ex: '/public/cadastro'
    MEMBRESIA?: string;   // ex: '/public/enrollment'
    BATISMO?: string;     // ex: '/public/enrollment'
    GC?: string;
    VOLUNTARIADO?: string;
    ACONSELHAMENTO?: string;
  };
}

export async function getConectarConfig(): Promise<ConectarConfig> {
  try {
    const db = getAdminDb();
    const doc = await db.collection('settings').doc('conectar').get();
    if (doc.exists) {
      return doc.data() as ConectarConfig;
    }
  } catch (e) {
    console.error("Error fetching conectar config:", e);
  }
  return {
    intentRedirects: {
      ATUALIZACAO: '/public/cadastro',
      MEMBRESIA: '/public/enrollment',
      BATISMO: '/public/enrollment',
    }
  };
}

export async function saveConectarConfig(config: ConectarConfig) {
  try {
    const db = getAdminDb();
    await db.collection('settings').doc('conectar').set(config, { merge: true });
    return { success: true };
  } catch (e: any) {
    console.error("Error saving conectar config:", e);
    return { success: false, error: e.message };
  }
}

export async function getConectarOptions() {
  try {
    const db = getAdminDb();

    const cellsSnap = await db.collection('cells').get();
    const usersSnap = await db.collection('users').get();
    
    const usersMap = new Map<string, string>();
    usersSnap.forEach(uDoc => {
      usersMap.set(uDoc.id, uDoc.data().name || '');
    });

    const cells = cellsSnap.docs.map(doc => {
      const data = doc.data();
      let leaderName = data.leaderName || data.liderNome || '';
      const liderId = data.liderId || data.leaderId;
      
      if (!leaderName && liderId) {
        leaderName = usersMap.get(liderId) || '';
      }

      return {
        id: doc.id,
        nome: data.nome || data.name || 'Célula sem nome',
        leaderName: leaderName ? formatName(leaderName) : ''
      };
    }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    const areasSnap = await db.collection('areas_of_service').get();
    const areas = areasSnap.docs
      .map(doc => ({ id: doc.id, name: doc.data().name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    const config = await getConectarConfig();

    return { cells, areas, config };
  } catch (e) {
    console.error("Error fetching conectar options:", e);
    return { cells: [], areas: [], config: {} };
  }
}

export async function identifyPerson(identifier: string) {
  try {
    const db = getAdminDb();
    const cleanId = identifier.trim().toLowerCase();
    const digitsOnly = identifier.replace(/\D/g, '');

    // 1. Tentar por E-mail
    if (cleanId.includes('@')) {
      const snap = await db.collection('users').where('email', '==', cleanId).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        return { found: true, userId: doc.id, userData: extractUserData(doc.data()) };
      }
    }

    // 2. Tentar por WhatsApp / Telefone
    if (digitsOnly.length >= 8) {
      const snap = await db.collection('users').get();
      for (const uDoc of snap.docs) {
        const uData = uDoc.data();
        const userPhoneDigits = (uData.phone || uData.contacts?.cellPhone || uData.contacts?.phone || '').replace(/\D/g, '');
        if (userPhoneDigits && (userPhoneDigits.endsWith(digitsOnly) || digitsOnly.endsWith(userPhoneDigits))) {
          return { found: true, userId: uDoc.id, userData: extractUserData(uData) };
        }
      }
    }

    return { found: false };
  } catch (e) {
    console.error("Error identifying person in /conectar:", e);
    return { error: "Falha ao buscar cadastro." };
  }
}

function extractUserData(data: any) {
  return {
    name: data.name || '',
    phone: data.phone || data.contacts?.cellPhone || '',
    email: data.email || data.contacts?.email || '',
    cpf: data.cpf || '',
    dataNascimento: data.dataNascimento || '',
    estadoCivil: data.estadoCivil || '',
    conjuge: data.conjuge || '',
    situacaoCaminhada: data.situacaoCaminhada || data.integrationStatus || 'VISITANTE',
    addressStreet: data.address?.street || '',
    addressCep: data.address?.cep || '',
  };
}

export async function submitSolicitacao(data: {
  userId?: string;
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  dataNascimento?: string;
  estadoCivil?: string;
  conjuge?: string;
  addressStreet?: string;
  addressCep?: string;
  intentType: 'VISITANDO' | 'GC' | 'BATISMO' | 'MEMBRESIA' | 'VOLUNTARIADO' | 'ACONSELHAMENTO' | 'ATUALIZACAO';
  intentDetails?: Record<string, any>;
  entryPoint?: string;
}) {
  try {
    const db = getAdminDb();
    const now = Timestamp.now();
    const cleanEmail = (data.email || '').toLowerCase().trim();
    const cleanPhone = (data.phone || '').trim();

    let targetUserId = data.userId;
    let existingData: any = {};

    // 1. Localizar ou Criar Perfil da Pessoa
    if (targetUserId) {
      const docRef = db.collection('users').doc(targetUserId);
      const snap = await docRef.get();
      if (snap.exists) {
        existingData = snap.data() || {};
      }
    } else if (cleanEmail) {
      const snap = await db.collection('users').where('email', '==', cleanEmail).get();
      if (!snap.empty) {
        targetUserId = snap.docs[0].id;
        existingData = snap.docs[0].data();
      }
    }

    // Determinar situacaoCaminhada inicial
    let newSituacao: SituacaoCaminhada = existingData.situacaoCaminhada || 'VISITANTE';
    if (data.intentType === 'VISITANDO') {
      newSituacao = existingData.situacaoCaminhada || 'VISITANTE';
    } else if (data.intentType === 'MEMBRESIA') {
      newSituacao = existingData.situacaoCaminhada === 'MEMBRO' ? 'MEMBRO' : 'EM_INTEGRACAO';
    }

    const updatedProfile: any = {
      ...existingData,
      name: formatName(data.name || existingData.name || ''),
      phone: cleanPhone || existingData.phone || '',
      email: cleanEmail || existingData.email || '',
      cpf: data.cpf || existingData.cpf || '',
      dataNascimento: data.dataNascimento || existingData.dataNascimento || '',
      estadoCivil: data.estadoCivil || existingData.estadoCivil || '',
      conjuge: data.conjuge ? formatName(data.conjuge) : (existingData.conjuge || ''),
      address: {
        street: data.addressStreet || existingData.address?.street || '',
        cep: data.addressCep || existingData.address?.cep || '',
      },
      situacaoCaminhada: newSituacao,
      integrationStatus: newSituacao.toLowerCase(),
      updatedAt: now,
    };

    if (!updatedProfile.createdAt) {
      updatedProfile.createdAt = now;
    }

    if (targetUserId) {
      await db.collection('users').doc(targetUserId).set(updatedProfile, { merge: true });
    } else {
      const newDoc = await db.collection('users').add(updatedProfile);
      targetUserId = newDoc.id;
    }

    // 2. Gravar o Registro de Solicitação na coleção "solicitacoes"
    const solicitacaoData = {
      personId: targetUserId,
      intentType: data.intentType,
      entryPoint: data.entryPoint || 'PUBLIC_LINK',
      details: data.intentDetails || {},
      status: 'RECEBIDA',
      createdAt: now,
    };
    const solicitacaoRef = await db.collection('solicitacoes').add(solicitacaoData);

    // 3. Criar / Atualizar o Processo Ativo correspondente na sub-coleção "users/{userId}/processos"
    const processMapping: Record<string, { type: 'GC' | 'BATISMO' | 'VOLUNTARIADO' | 'MEMBRESIA' | 'ACONSELHAMENTO' | 'GERAL', title: string, initialStage: string }> = {
      'VISITANDO': { type: 'GERAL', title: 'Acolhimento de Visitante', initialStage: 'PRIMEIRA_VISITA' },
      'GC': { type: 'GC', title: 'Integração em Célula/GC', initialStage: 'AGUARDANDO_CONTATO' },
      'BATISMO': { type: 'BATISMO', title: 'Processo de Batismo nas Águas', initialStage: 'INTERESSE_REGISTRADO' },
      'MEMBRESIA': { type: 'MEMBRESIA', title: 'Curso e Integração de Membresia', initialStage: 'INSCRITO' },
      'VOLUNTARIADO': { type: 'VOLUNTARIADO', title: 'Integração Ministerial / Voluntariado', initialStage: 'EM_TRIAGEM' },
      'ACONSELHAMENTO': { type: 'ACONSELHAMENTO', title: 'Atendimento Pastoral e Aconselhamento', initialStage: 'SOLICITADO' },
      'ATUALIZACAO': { type: 'GERAL', title: 'Atualização Cadastral', initialStage: 'CONCLUIDO' },
    };

    const processInfo = processMapping[data.intentType] || { type: 'GERAL', title: 'Acompanhamento Geral', initialStage: 'EM_ANDAMENTO' };

    const processoData = {
      personId: targetUserId,
      solicitacaoId: solicitacaoRef.id,
      processType: processInfo.type,
      title: processInfo.title,
      currentStage: processInfo.initialStage,
      status: 'ACTIVE',
      details: data.intentDetails || {},
      startedAt: now,
      updatedAt: now,
    };

    await db.collection('users').doc(targetUserId).collection('processos').add(processoData);

    // 4. Criar Tarefa Pastoral Automática para a liderança (SLA de 48h)
    const dueDate = Timestamp.fromDate(new Date(Date.now() + 48 * 60 * 60 * 1000));
    const taskTitle = `Acompanhar ${processInfo.title} - ${formatName(data.name || 'Novo Contato')}`;
    const taskDesc = `Solicitação recebida via Portal /conectar.\nWhatsApp: ${cleanPhone}\nE-mail: ${cleanEmail}\nObservações/Detalhes: ${JSON.stringify(data.intentDetails || {})}`;

    await db.collection('pastoral_tasks').add({
      personId: targetUserId,
      personName: formatName(data.name || 'Novo Contato'),
      personPhone: cleanPhone,
      solicitacaoId: solicitacaoRef.id,
      title: taskTitle,
      description: taskDesc,
      category: data.intentType,
      status: 'PENDENTE',
      priority: 'ALTA',
      dueDate: dueDate,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      userId: targetUserId,
      intentType: data.intentType,
      message: 'Solicitação registrada com sucesso!'
    };
  } catch (e: any) {
    console.error("Error submitting solicitacao in /conectar:", e);
    return { success: false, error: e.message || 'Erro ao registrar solicitação.' };
  }
}

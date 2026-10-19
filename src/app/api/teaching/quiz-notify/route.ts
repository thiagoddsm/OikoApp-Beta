import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getWhatsAppClient, formatWhatsAppNumber } from '@/lib/whatsapp';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

interface QuizNotifyBody {
  courseId?: string;
  classId?: string;
  lessonNumber?: number | string;
  sessionDate?: string;
  studentName?: string;
  rede?: string;
  studentPhone?: string;
  xp?: number;
  correctCount?: number;
  totalMultiple?: number;
  discursiveAnswers?: Record<string, string>;
  summaryText?: string;
  submissionId?: string;
}

interface Recipient {
  id?: string;
  name: string;
  phone: string;
  role: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as QuizNotifyBody;
    const {
      courseId,
      classId,
      lessonNumber = 1,
      studentName,
      rede = 'Rede Geral',
      studentPhone = '',
      xp = 0,
      correctCount = 0,
      totalMultiple = 6,
      discursiveAnswers = {},
      summaryText,
      submissionId
    } = body;

    if (!studentName || !studentName.trim()) {
      return NextResponse.json(
        { error: 'Nome do aluno é obrigatório para envio de notificação.' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const lessonNum = Number(lessonNumber) || 1;

    // 1. Identificar a Turma (Class)
    let classData: any = null;
    let resolvedTeacherId = '';
    let resolvedCourseId = courseId || '';

    if (classId && classId !== 'aula-1') {
      try {
        const classDoc = await db.collection('classes').doc(classId).get();
        if (classDoc.exists) {
          classData = classDoc.data();
          resolvedTeacherId = classData?.teacherId || '';
          if (!resolvedCourseId && classData?.courseId) {
            resolvedCourseId = classData.courseId;
          }

          // Verifica se há professor substituto nas sobreposições (scheduleOverrides)
          if (classData?.scheduleOverrides && typeof classData.scheduleOverrides === 'object') {
            const overrideEntries = Object.values(classData.scheduleOverrides) as any[];
            const matchingOverride = overrideEntries.find(o => 
              o?.teacherId && (o?.syllabusId?.includes(`aula-${lessonNum}`) || o?.notes?.includes(`Aula ${lessonNum}`))
            );
            if (matchingOverride?.teacherId) {
              resolvedTeacherId = matchingOverride.teacherId;
            }
          }
        }
      } catch (err) {
        console.warn('[Quiz Notify] Erro ao buscar turma no Firestore:', err);
      }
    }

    // 2. Identificar o Curso (Course)
    let courseData: any = null;
    let resolvedCourseName = 'Curso Presencial';
    let resolvedResponsibleId = '';
    const supportTeamIds: string[] = [];

    if (resolvedCourseId && resolvedCourseId !== 'curso-apoiar') {
      try {
        const courseDoc = await db.collection('courses').doc(resolvedCourseId).get();
        if (courseDoc.exists) {
          courseData = courseDoc.data();
          resolvedCourseName = courseData?.name || resolvedCourseName;
          resolvedResponsibleId = courseData?.responsibleId || '';
          if (Array.isArray(courseData?.supportTeam)) {
            supportTeamIds.push(...courseData.supportTeam);
          }
        }
      } catch (err) {
        console.warn('[Quiz Notify] Erro ao buscar curso por ID:', err);
      }
    }

    // Se ainda não encontrou o curso ou se é o Apoiar legado
    const isApoiar = !courseData && (
      !resolvedCourseId ||
      resolvedCourseId === 'curso-apoiar' ||
      resolvedCourseId.includes('apoiar') ||
      resolvedCourseName.toLowerCase().includes('apoiar')
    );

    if (isApoiar) {
      try {
        // Tenta achar o curso 'Apoiar' oficial na base
        const apoiarSnap = await db.collection('courses').where('name', '==', 'Apoiar').limit(1).get();
        if (!apoiarSnap.empty) {
          const doc = apoiarSnap.docs[0];
          courseData = doc.data();
          resolvedCourseId = doc.id;
          resolvedCourseName = courseData.name || 'Curso Apoiar';
          resolvedResponsibleId = courseData.responsibleId || '';
          if (Array.isArray(courseData.supportTeam)) {
            supportTeamIds.push(...courseData.supportTeam);
          }
        }
      } catch (err) {
        console.warn('[Quiz Notify] Erro ao buscar curso Apoiar:', err);
      }
    }

    // 3. Montar lista de destinatários potenciais (Professor + Secretário/Coordenação)
    const candidates: Recipient[] = [];

    // 3a. Busca dados do Professor
    if (resolvedTeacherId) {
      try {
        const teacherDoc = await db.collection('users').doc(resolvedTeacherId).get();
        if (teacherDoc.exists) {
          const tData = teacherDoc.data();
          if (tData?.phone) {
            candidates.push({
              id: resolvedTeacherId,
              name: tData.name || 'Professor(a)',
              phone: tData.phone,
              role: 'Professor(a) da Turma'
            });
          }
        }
      } catch (err) {
        console.warn('[Quiz Notify] Erro ao buscar professor:', err);
      }
    }

    // Fallback especial do Curso Apoiar: Pastor Hugo
    const isCourseApoiar = (resolvedCourseName.toLowerCase().includes('apoiar') || resolvedCourseId === 'curso-apoiar');
    if (candidates.length === 0 && isCourseApoiar) {
      try {
        // Pastor Hugo Campos de Souza (ID do Firestore ou busca por nome)
        const hugoDoc = await db.collection('users').doc('rY6oQ2ATDsTFWdt7WhboHI7Lehq2').get();
        if (hugoDoc.exists && hugoDoc.data()?.phone) {
          const hData = hugoDoc.data()!;
          candidates.push({
            id: hugoDoc.id,
            name: hData.name || 'Pr. Hugo Campos de Souza',
            phone: hData.phone,
            role: 'Pastor / Professor do Curso Apoiar'
          });
        } else {
          // Fallback de segurança com o telefone cadastrado do Pr. Hugo
          candidates.push({
            name: 'Pr. Hugo Campos de Souza',
            phone: '(21) 99524-7838',
            role: 'Pastor / Professor do Curso Apoiar'
          });
        }
      } catch (err) {
        console.warn('[Quiz Notify] Erro ao buscar Pr. Hugo:', err);
      }
    }

    // 3b. Busca dados do Responsável / Coordenador do Curso
    if (resolvedResponsibleId) {
      try {
        const respDoc = await db.collection('users').doc(resolvedResponsibleId).get();
        if (respDoc.exists) {
          const rData = respDoc.data();
          if (rData?.phone) {
            candidates.push({
              id: resolvedResponsibleId,
              name: rData.name || 'Coordenador(a)',
              phone: rData.phone,
              role: 'Coordenação do Curso'
            });
          }
        }
      } catch (err) {
        console.warn('[Quiz Notify] Erro ao buscar responsável do curso:', err);
      }
    }

    // 3c. Busca Equipe de Apoio / Secretaria vinculada ao Curso
    for (const supId of supportTeamIds) {
      try {
        const supDoc = await db.collection('users').doc(supId).get();
        if (supDoc.exists) {
          const sData = supDoc.data();
          if (sData?.phone) {
            candidates.push({
              id: supId,
              name: sData.name || 'Secretaria',
              phone: sData.phone,
              role: 'Secretaria / Equipe de Ensino'
            });
          }
        }
      } catch (err) {
        console.warn('[Quiz Notify] Erro ao buscar suporte:', err);
      }
    }

    // 3d. Adiciona a Coordenação Geral de Ensino se ainda não houver secretário
    const hasSecretary = candidates.some(c => c.role.includes('Coordenação') || c.role.includes('Secretaria'));
    if (!hasSecretary) {
      try {
        // Marcos Alexandre (Coordenador do Trilho / Ensino)
        const marcosDoc = await db.collection('users').doc('LujfNyDpBLhW6i9I3fpWNDYUJwz2').get();
        if (marcosDoc.exists && marcosDoc.data()?.phone) {
          const mData = marcosDoc.data()!;
          candidates.push({
            id: marcosDoc.id,
            name: mData.name || 'Marcos Alexandre',
            phone: mData.phone,
            role: 'Coordenação Geral de Ensino'
          });
        }
      } catch (err) {
        console.warn('[Quiz Notify] Erro ao buscar coordenação de ensino:', err);
      }
    }

    // 4. Normalizar e desduplicar destinatários por número de WhatsApp limpo
    const uniqueRecipients = new Map<string, Recipient>();
    for (const cand of candidates) {
      const clean = cand.phone.replace(/\D/g, '');
      if (clean && clean.length >= 8) {
        // Se já existe, preserva o primeiro ou mescla cargo
        if (!uniqueRecipients.has(clean)) {
          uniqueRecipients.set(clean, cand);
        } else {
          const existing = uniqueRecipients.get(clean)!;
          if (!existing.role.includes(cand.role)) {
            existing.role = `${existing.role} & ${cand.role}`;
          }
        }
      }
    }

    const recipientsList = Array.from(uniqueRecipients.values());

    if (recipientsList.length === 0) {
      console.log('[Quiz Notify] Nenhum destinatário com telefone válido encontrado.');
      return NextResponse.json({
        success: false,
        skipped: true,
        message: 'Nenhum telefone de professor ou secretário encontrado para envio automático.',
        recipientsSent: 0
      });
    }

    // 5. Construir o Texto Pastoral da Mensagem
    let finalMessage = summaryText;

    if (!finalMessage) {
      const courseTitle = resolvedCourseName.toUpperCase();
      const timestamp = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      let discursiveSection = '*RESOLUÇÕES PASTORAIS REGISTRADAS:*\n';
      const discEntries = Object.entries(discursiveAnswers).filter(([_, v]) => Boolean(v && v.trim()));

      if (discEntries.length > 0) {
        discEntries.forEach(([k, v]) => {
          const num = k.replace(/\D/g, '');
          discursiveSection += `💬 *Desafio ${num || k}:*\n"${v}"\n\n`;
        });
      }

      finalMessage =
        `*${courseTitle} • RELATÓRIO DA AULA ${lessonNum}*\n` +
        `------------------------------------------\n` +
        `👤 *Aluno:* ${studentName}\n` +
        `🌐 *Rede:* ${rede}\n` +
        (studentPhone ? `📱 *Telefone:* ${studentPhone}\n` : '') +
        `📅 *Data/Hora:* ${timestamp}\n` +
        `⚡ *Pontuação:* ${xp} XP\n` +
        `🎯 *Acertos Múltiplos:* ${correctCount} / ${totalMultiple}\n` +
        `🛡️ *Status de Presença:* ✅ Presença Confirmada (Via Questionário)\n\n` +
        discursiveSection +
        `*COMPROMISSO DE HONRA:*\n` +
        `"Não exercerei autoridade por cobrança nem por vaidade. Colocarei meus ombros sob as cargas dos meus líderes para que ninguém seja esmagado pelo peso da batalha."\n` +
        `------------------------------------------\n` +
        `_Oiko Comunidade • Trilho do Discipulado_`;
    }

    // 6. Envio via Cliente WhatsApp Oiko
    const whatsapp = await getWhatsAppClient();
    const dispatchResults: Array<{ name: string; phone: string; role: string; success: boolean; error?: string }> = [];

    for (const recipient of recipientsList) {
      const formattedNumber = formatWhatsAppNumber(recipient.phone);
      try {
        await whatsapp.sendMessage({
          type: 'text',
          body: {
            to: formattedNumber,
            text: finalMessage
          }
        });

        dispatchResults.push({
          name: recipient.name,
          phone: recipient.phone,
          role: recipient.role,
          success: true
        });
        console.log(`[Quiz Notify] ✅ Enviado com sucesso para ${recipient.name} (${recipient.role}): ${recipient.phone}`);
      } catch (err: any) {
        console.error(`[Quiz Notify] ❌ Falha ao enviar para ${recipient.name}:`, err);
        dispatchResults.push({
          name: recipient.name,
          phone: recipient.phone,
          role: recipient.role,
          success: false,
          error: err.message || 'Erro desconhecido'
        });
      }
    }

    const successfulDispatches = dispatchResults.filter(r => r.success);

    // 7. Auditoria no Firestore
    try {
      await db.collection('quiz_notifications_log').add({
        courseId: resolvedCourseId || 'curso-apoiar',
        courseName: resolvedCourseName,
        classId: classId || 'aula-1',
        lessonNumber: lessonNum,
        studentName,
        rede,
        xp,
        submissionId: submissionId || null,
        dispatches: dispatchResults,
        createdAt: Timestamp.now()
      });

      // Se houver ID de submissão na plataforma, marca status de notificado
      if (submissionId) {
        const subRef = db.collection('course_quiz_submissions').doc(submissionId);
        const subDoc = await subRef.get();
        if (subDoc.exists) {
          await subRef.update({
            notifiedWhatsApp: true,
            notifiedAt: Timestamp.now(),
            notifiedRecipients: successfulDispatches.map(s => `${s.name} (${s.role})`)
          });
        }
      }
    } catch (err) {
      console.warn('[Quiz Notify] Erro ao registrar log de notificação:', err);
    }

    return NextResponse.json({
      success: successfulDispatches.length > 0,
      recipientsSent: successfulDispatches.length,
      recipientNames: successfulDispatches.map(r => `${r.name} (${r.role})`),
      results: dispatchResults
    });
  } catch (error: any) {
    console.error('[Quiz Notify] Erro fatal no processamento:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar notificação automática do questionário.' },
      { status: 500 }
    );
  }
}

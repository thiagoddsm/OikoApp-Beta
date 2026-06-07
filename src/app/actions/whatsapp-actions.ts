'use server';

import { getWhatsAppClient, TypeMessage, formatWhatsAppNumber } from '@/lib/whatsapp';
import { initializeFirebase } from '@/firebase';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Sends a test WhatsApp message.
 */
export async function sendTestWhatsAppMessage(phone: string, message: string, configOverride?: { serverUrl?: string, instanceKey?: string }) {
    try {
        const formattedPhone = formatWhatsAppNumber(phone);
        
        // Passamos os overrides para o cliente se existirem
        const whatsapp = await getWhatsAppClient({
            server: configOverride?.serverUrl,
            key: configOverride?.instanceKey
        });

        const response = await whatsapp.sendMessage({
            type: "TEXT",
            body: {
                to: formattedPhone,
                text: message || 'Esta é uma mensagem de teste do sistema Oiko Studio! 🚀'
            }
        });

        console.log('WhatsApp test send response:', response);
        return { success: true, response };
    } catch (error: any) {
        console.error('WhatsApp Test Error:', error);
        return { 
            success: false, 
            error: error.message || 'Falha ao enviar mensagem de teste. Verifique suas credenciais.' 
        };
    }
}

import { getAdminDb } from '@/lib/firebase-admin';

/**
 * Fetches the current WhatsApp configuration from Firestore using Admin SDK.
 */
export async function getWhatsAppConfig() {
    try {
        const db = getAdminDb();
        const configDoc = await db.collection('config').doc('notifications').get();
        
        if (configDoc.exists) {
            return configDoc.data();
        }
        
        // Fallback to env variables if not in Firestore
        return {
            serverUrl: process.env.WHATSAPP_SERVER_URL || '',
            instanceKey: process.env.WHATSAPP_INSTANCE_KEY || '',
            enabled: true
        };
    } catch (error) {
        console.error('Error fetching WhatsApp config:', error);
        return null;
    }
}
/**
 * Sends a welcome message to a new member.
 */
export async function sendWelcomeMessage(userName: string, phone: string, configOverride?: any) {
    try {
        const config = configOverride || await getWhatsAppConfig();
        if (!config || !config.enabled || !config.notifyWelcome) {
            return { success: false, error: 'Automação de boas-vindas desativada.' };
        }

        const whatsapp = await getWhatsAppClient({
            server: config?.serverUrl,
            key: config?.instanceKey
        });
        const formattedPhone = formatWhatsAppNumber(phone);
        
        const message = `Olá *${userName}*! Seja muito bem-vindo(a) à nossa comunidade! 🌟 Ficamos muito felizes com sua chegada. Se precisar de qualquer coisa, estamos à disposição por aqui. Deus te abençoe!`;

        const response = await whatsapp.sendMessage({
            type: "TEXT",
            body: {
                to: formattedPhone,
                text: message
            }
        });

        return { success: true, response };
    } catch (error: any) {
        console.error('Welcome Message Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Sends a message when a student is enrolled in a class.
 */
export async function sendEnrollmentMessage(
    userName: string, 
    phone: string, 
    courseName: string, 
    className: string, 
    configOverride?: any,
    courseId?: string,
    userId?: string
) {
    try {
        const config = configOverride || await getWhatsAppConfig();
        if (!config || !config.enabled || !config.notifyEnrollment) return { success: false };

        const db = getAdminDb();
        let userDocRef = null;

        // Se passarmos o userId, podemos obter o documento do usuário
        if (userId) {
            userDocRef = db.collection('users').doc(userId);
        } else if (phone) {
            // Tenta achar pelo telefone caso não tenha userId
            const formattedPhone = formatWhatsAppNumber(phone);
            const querySnapshot = await db.collection('users').where('phone', '==', phone).limit(1).get();
            if (!querySnapshot.empty) {
                userDocRef = querySnapshot.docs[0].ref;
            }
        }

        // Se localizou o usuário, checa se a notificação para este curso já foi enviada
        if (userDocRef && courseId) {
            const docSnap = await userDocRef.get();
            if (docSnap.exists) {
                const userData = docSnap.data();
                const notified = userData?.journey?.notifiedEnrollments || [];
                if (notified.includes(courseId)) {
                    console.log(`[sendEnrollmentMessage] Notificação ignorada: usuário ${userName} já notificado para o curso ${courseId}.`);
                    return { success: false, reason: 'Already notified' };
                }
            }
        }

        const whatsapp = await getWhatsAppClient({
            server: config?.serverUrl,
            key: config?.instanceKey
        });
        const formattedPhone = formatWhatsAppNumber(phone);
        
        // Formatar o nome para primeiro nome capitalizado
        const firstName = userName
            ? (userName.trim().split(' ')[0].charAt(0).toUpperCase() + userName.trim().split(' ')[0].slice(1).toLowerCase())
            : 'Membro';

        let classInfo = className ? ` na turma *${className}*` : '';
        const message = `Olá *${firstName}*! Sua inscrição no curso *${courseName}*${classInfo} foi confirmada! 📚 Prepare seu coração para este tempo de aprendizado! Em breve passaremos mais informações.`;

        const response = await whatsapp.sendMessage({
            type: "TEXT",
            body: { to: formattedPhone, text: message }
        });

        // Registrar o envio para evitar duplicação no futuro
        if (userDocRef && courseId) {
            const docSnap = await userDocRef.get();
            const notified = docSnap.exists ? (docSnap.data()?.journey?.notifiedEnrollments || []) : [];
            if (!notified.includes(courseId)) {
                await userDocRef.update({
                    'journey.notifiedEnrollments': [...notified, courseId]
                });
            }
        }

        return { success: true, response };
    } catch (error: any) {
        console.error('Enrollment Message Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Sends a message when a member advances in the journey.
 */
export async function sendJourneyAdvanceMessage(userName: string, phone: string, newStage: string, configOverride?: any) {
    try {
        const config = configOverride || await getWhatsAppConfig();
        if (!config || !config.enabled || !config.notifyJourney) return { success: false };

        const whatsapp = await getWhatsAppClient({
            server: config?.serverUrl,
            key: config?.instanceKey
        });
        const formattedPhone = formatWhatsAppNumber(phone);
        
        const message = `Parabéns, *${userName}*! 🎉 Você avançou para a fase *${newStage}* na sua jornada! Estamos muito orgulhosos do seu crescimento. Continue firme! ✨`;

        const response = await whatsapp.sendMessage({
            type: "TEXT",
            body: { to: formattedPhone, text: message }
        });

        return { success: true, response };
    } catch (error: any) {
        console.error('Journey Advance Message Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Sends a notification for finance request updates.
 */
export async function sendFinanceNotification(
    requesterName: string, 
    phone: string, 
    amount: number, 
    objective: 'reembolso' | 'pagamento' | 'prestacao_contas',
    status: 'approved' | 'rejected' | 'paid',
    configOverride?: any
) {
    try {
        const config = configOverride || await getWhatsAppConfig();
        if (config && config.enabled === false) return { success: false, error: 'Notificações desativadas.' };

        const whatsapp = await getWhatsAppClient({
            server: config?.serverUrl,
            key: config?.instanceKey
        });
        const formattedPhone = formatWhatsAppNumber(phone);
        
        const objectiveLabels = { reembolso: 'Reembolso', pagamento: 'Pagamento', prestacao_contas: 'Prestação de Contas' };
        
        let messageText = '';
        if (status === 'approved') {
          messageText = `Olá ${requesterName}!\nSua solicitação financeira (${objectiveLabels[objective]}) de *R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}* foi *APROVADA* e está aguardando pagamento.`;
        } else if (status === 'rejected') {
          messageText = `Olá ${requesterName}!\nSua solicitação financeira (${objectiveLabels[objective]}) de *R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}* infelizmente foi *REJEITADA*. Por favor, entre em contato com a tesouraria para mais detalhes.`;
        } else if (status === 'paid') {
          messageText = `Olá ${requesterName}!\nO pagamento da sua solicitação financeira (${objectiveLabels[objective]}) de *R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}* acabou de ser *REALIZADO*!`;
        }

        const response = await whatsapp.sendMessage({
            type: "TEXT",
            body: { to: formattedPhone, text: messageText }
        });

        return { success: true, response };
    } catch (error: any) {
        console.error('Finance Notification Error:', error);
        return { success: false, error: error.message };
    }
}

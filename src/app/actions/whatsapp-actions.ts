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

/**
 * Fetches the current WhatsApp configuration from Firestore.
 */
export async function getWhatsAppConfig() {
    try {
        const { firestore } = initializeFirebase();
        const configDoc = await getDoc(doc(firestore, 'config', 'notifications'));
        
        if (configDoc.exists()) {
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
export async function sendWelcomeMessage(userName: string, phone: string) {
    try {
        const config = await getWhatsAppConfig();
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
export async function sendEnrollmentMessage(userName: string, phone: string, className: string) {
    try {
        const config = await getWhatsAppConfig();
        if (!config || !config.enabled || !config.notifyEnrollment) return { success: false };

        const whatsapp = await getWhatsAppClient({
            server: config?.serverUrl,
            key: config?.instanceKey
        });
        const formattedPhone = formatWhatsAppNumber(phone);
        
        const message = `Olá *${userName}*! Você foi matriculado(a) na turma *${className}*. 📚 Prepare seu coração para este tempo de aprendizado! Em breve passaremos mais informações.`;

        const response = await whatsapp.sendMessage({
            type: "TEXT",
            body: { to: formattedPhone, text: message }
        });

        return { success: true, response };
    } catch (error: any) {
        console.error('Enrollment Message Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Sends a message when a member advances in the journey.
 */
export async function sendJourneyAdvanceMessage(userName: string, phone: string, newStage: string) {
    try {
        const config = await getWhatsAppConfig();
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

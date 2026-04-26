import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * WhatsApp Client to handle different message types based on API documentation.
 */
export class OikoWhatsAppClient {
    private server: string;
    private key: string;

    constructor(config: { server: string, key: string }) {
        this.server = config.server.replace(/\/$/, '');
        this.key = config.key;
    }

    async sendMessage(payload: { type: string, body: any }) {
        const { type, body } = payload;
        let endpoint = 'message/send-text';
        let data = body;

        // Map types to specific endpoints and payload structures
        switch (type) {
            case 'button':
                endpoint = 'message/button';
                // Payload: { to, title, footer, buttons: [{id, text}] }
                break;
            case 'survey':
                endpoint = 'message/survey';
                // Payload: { to, name, options: [string] }
                data = {
                    to: body.to,
                    name: body.name || body.text, // API calls it 'name' for surveys
                    options: body.options
                };
                break;
            case 'image':
            case 'media':
                endpoint = 'message/image';
                // Payload: { to, caption, image }
                break;
            default:
                endpoint = 'message/send-text';
                // Payload: { to, text }
        }

        const url = `${this.server}/${this.key}/${endpoint}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error(`WhatsApp API Error (${type}):`, error);
            throw error;
        }
    }
}

/**
 * Gets a configured WhatsApp client instance.
 * Prioritizes passed credentials, then Firestore, then environment variables.
 */
export async function getWhatsAppClient(overrideConfig?: { server?: string, key?: string }) {
    let server = overrideConfig?.server;
    let key = overrideConfig?.key;

    if (!server || !key) {
        try {
            const { firestore } = initializeFirebase();
            const configDoc = await getDoc(doc(firestore, 'config', 'notifications'));
            
            if (configDoc.exists()) {
                const data = configDoc.data();
                server = server || data?.serverUrl;
                key = key || data?.instanceKey;
            }
        } catch (error) {
            console.warn('Failed to fetch WhatsApp config from Firestore:', error);
        }
    }

    return new OikoWhatsAppClient({
        server: server || process.env.WHATSAPP_SERVER_URL || 'https://us.api-wa.me',
        key: key || process.env.WHATSAPP_INSTANCE_KEY || ''
    });
}

/**
 * Utility to format phone numbers to the format required by the API (DDIDDDNumber)
 * Example: (21) 99999-9999 -> 5521999999999
 */
export function formatWhatsAppNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return `55${cleaned}`;
    }
    if (cleaned.length === 10) {
        return `55${cleaned.substring(0, 2)}9${cleaned.substring(2)}`;
    }
    return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
}

export enum TypeMessage {
    TEXT = 'text',
    BUTTON = 'button',
    SURVEY = 'survey',
    IMAGE = 'image',
    MEDIA = 'media'
}

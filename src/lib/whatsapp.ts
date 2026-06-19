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
        let endpoint = 'message/text';
        let data = body;

        // Map types to specific endpoints and payload structures
        switch (type) {
            case 'button':
                endpoint = 'message/button_reply';
                data = {
                    to: body.to,
                    text: body.text || ' ', 
                    header: { title: body.title || 'Opções' },
                    footer: body.footer || ' ',
                    buttons: (body.buttons || []).map((b: any) => ({
                        type: 'quick_reply',
                        id: b.id || Math.random().toString(36).substring(7),
                        text: b.text
                    }))
                };
                break;
            case 'survey':
            case 'poll':
                endpoint = 'message/poll';
                data = {
                    to: body.to,
                    name: body.name || body.text,
                    values: body.options, // API requires 'values' for message/poll
                    selectableCount: body.selectableCount || (body.multiple === false ? 1 : body.options.length)
                };
                break;
            case 'list':
                endpoint = 'message/list';
                data = {
                    to: body.to,
                    buttonText: body.buttonText || 'Ver Menu',
                    text: body.text || 'Escolha uma opção',
                    title: body.title || 'Opções',
                    description: body.description || '',
                    footer: body.footer || '',
                    sections: body.sections || []
                };
                break;
            case 'image':
            case 'media':
                if (body.url && body.url.startsWith('data:')) {
                    const mimeType = body.url.substring(5, body.url.indexOf(';'));
                    const base64Str = body.url.split(',')[1];
                    if (mimeType.includes('audio')) {
                        endpoint = 'message/base64/audio';
                        data = { to: body.to, base64: base64Str };
                    } else if (mimeType.includes('pdf') || mimeType.includes('application')) {
                        endpoint = 'message/base64/document';
                        data = { to: body.to, base64: base64Str, mimetype: mimeType, fileName: 'arquivo', caption: body.caption || ' ' };
                    } else if (mimeType.includes('video')) {
                        endpoint = 'message/base64/video';
                        data = { to: body.to, base64: base64Str, caption: body.caption || ' ' };
                    } else {
                        endpoint = 'message/base64/image';
                        data = { to: body.to, base64: base64Str, caption: body.caption || ' ' };
                    }
                } else {
                    endpoint = 'message/image';
                    data = { to: body.to, url: body.url, caption: body.caption || ' ' };
                }
                break;
            default:
                endpoint = 'message/text';
                // Payload: { to, text }
        }

        const url = `${this.server}/${this.key}/${endpoint}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const responseText = await response.text();
            let responseJson;
            try {
                responseJson = JSON.parse(responseText);
            } catch (e) {
                responseJson = responseText;
            }
            if (!response.ok) {
                console.error(`[WhatsApp API Error] HTTP ${response.status} for ${url}:`, responseJson);
            } else {
                console.log(`[WhatsApp API Success] ${url}:`, responseJson);
            }
            return responseJson;
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
            let data: any = null;
            if (typeof window === 'undefined') {
                const { getAdminDb } = await import('@/lib/firebase-admin');
                const db = getAdminDb();
                const configDoc = await db.collection('config').doc('notifications').get();
                if (configDoc.exists) {
                    data = configDoc.data();
                }
            } else {
                const { initializeFirebase } = await import('@/firebase');
                const { doc, getDoc } = await import('firebase/firestore');
                const { firestore } = initializeFirebase();
                const configDoc = await getDoc(doc(firestore, 'config', 'notifications'));
                if (configDoc.exists()) {
                    data = configDoc.data();
                }
            }
            
            if (data) {
                server = server || data.serverUrl;
                key = key || data.instanceKey;
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

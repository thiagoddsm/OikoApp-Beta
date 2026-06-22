import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * WhatsApp Client with hybrid routing:
 * - Polls (enquetes): sent via Evolution API (only Evolution can receive poll vote webhooks)
 * - Everything else (text, button, list, image, contact): sent via WAME
 */
export class OikoWhatsAppClient {
    private server: string;  // WAME server URL
    private key: string;     // WAME instance key
    private evUrl: string;   // Evolution API URL
    private evInstance: string;
    private evKey: string;

    constructor(config: { server: string, key: string, evolutionUrl?: string, evolutionInstance?: string, evolutionKey?: string }) {
        this.server = config.server.replace(/\/$/, '');
        this.key = config.key;
        this.evUrl = config.evolutionUrl ? config.evolutionUrl.replace(/\/$/, '') : 'https://api.ibmanha.com.br';
        this.evInstance = config.evolutionInstance || 'IBM';
        this.evKey = config.evolutionKey || '554C767EA3D2-4221-AB6A-C126C68A657E';
    }

    async sendMessage(payload: { type: string, body: any }) {
        const { type, body } = payload;

        // --- POLLS: obrigatoriamente pela Evolution ---
        // (só a Evolution consegue entregar as respostas das enquetes via webhook)
        if (type === 'poll' || type === 'survey') {
            const evUrl = `${this.evUrl}/message/sendPoll/${this.evInstance}`;
            const evData = {
                number: (body.to || '').replace(/\D/g, ''),
                name: body.name || body.text || 'Enquete',
                selectableCount: body.selectableCount || (body.multiple === false ? 1 : (body.options || []).length),
                values: body.options && body.options.length > 0 ? body.options : ['Sim', 'Não']
            };
            try {
                const res = await fetch(evUrl, {
                    method: 'POST',
                    headers: { 'apikey': this.evKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify(evData)
                });
                const json = await res.json();
                if (!res.ok) {
                    console.error(`[Evolution API Error] HTTP ${res.status} for ${evUrl}:`, json);
                } else {
                    console.log(`[Evolution API Success] ${evUrl}:`, json);
                }
                return json;
            } catch (e) {
                console.error(`[Evolution API Error] (poll):`, e);
                throw e;
            }
        }

        // --- TUDO MAIS: pelo WAME ---
        let endpoint = 'message/text';
        let data: any = body;

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

            case 'contact':
                endpoint = 'message/contact';
                data = {
                    to: body.to,
                    name: body.name || 'Contato',
                    vcardPhone: body.vcardPhone || ''
                };
                break;

            default: // 'text'
                endpoint = 'message/text';
                data = { to: body.to, text: body.text || '' };
                break;
        }

        const url = `${this.server}/${this.key}/${endpoint}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const responseText = await response.text();
            let responseJson: any;
            try { responseJson = JSON.parse(responseText); } catch { responseJson = responseText; }

            if (!response.ok) {
                console.error(`[WAME API Error] HTTP ${response.status} for ${url}:`, responseJson);
            } else {
                console.log(`[WAME API Success] ${url}:`, responseJson);
            }
            return responseJson;
        } catch (error) {
            console.error(`[WAME API Error] (${type}):`, error);
            throw error;
        }
    }
}

/**
 * Gets a configured WhatsApp client instance.
 * Reads credentials from Firestore first, then falls back to env vars.
 */
export async function getWhatsAppClient(overrideConfig?: { server?: string, key?: string, evolutionUrl?: string, evolutionInstance?: string, evolutionKey?: string }) {
    let server = overrideConfig?.server;
    let key = overrideConfig?.key;
    let evolutionUrl = overrideConfig?.evolutionUrl;
    let evolutionInstance = overrideConfig?.evolutionInstance;
    let evolutionKey = overrideConfig?.evolutionKey;

    if (!server || !key) {
        try {
            let data: any = null;
            if (typeof window === 'undefined') {
                const { getAdminDb } = await import('@/lib/firebase-admin');
                const db = getAdminDb();
                const configDoc = await db.collection('config').doc('notifications').get();
                if (configDoc.exists) data = configDoc.data();
            } else {
                const { initializeFirebase } = await import('@/firebase');
                const { doc, getDoc } = await import('firebase/firestore');
                const { firestore } = initializeFirebase();
                const configDoc = await getDoc(doc(firestore, 'config', 'notifications'));
                if (configDoc.exists()) data = configDoc.data();
            }
            if (data) {
                server = server || data.serverUrl;
                key = key || data.instanceKey;
                evolutionUrl = evolutionUrl || data.evolutionUrl;
                evolutionInstance = evolutionInstance || data.evolutionInstance;
                evolutionKey = evolutionKey || data.evolutionKey;
            }
        } catch (error) {
            console.warn('Failed to fetch WhatsApp config from Firestore:', error);
        }
    }

    return new OikoWhatsAppClient({
        server: server || process.env.WHATSAPP_SERVER_URL || 'https://us.api-wa.me',
        key: key || process.env.WHATSAPP_INSTANCE_KEY || '',
        evolutionUrl: evolutionUrl || 'https://api.ibmanha.com.br',
        evolutionInstance: evolutionInstance || 'IBM',
        evolutionKey: evolutionKey || '554C767EA3D2-4221-AB6A-C126C68A657E'
    });
}

/**
 * Utility to format phone numbers to DDIDDDNumber format.
 * Example: (21) 99999-9999 -> 5521999999999
 */
export function formatWhatsAppNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) return `55${cleaned}`;
    if (cleaned.length === 10) return `55${cleaned.substring(0, 2)}9${cleaned.substring(2)}`;
    return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
}

export enum TypeMessage {
    TEXT = 'text',
    BUTTON = 'button',
    SURVEY = 'survey',
    IMAGE = 'image',
    MEDIA = 'media'
}

'use server';

import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

const CONTA_AZUL_BASE = 'https://api.contaazul.com';
const CONTA_AZUL_AUTH_BASE = 'https://auth.contaazul.com';

let refreshPromise: Promise<string> | null = null;

/**
 * Recupera o token de acesso válido, renovando-o se necessário.
 */
export async function getValidContaAzulToken(): Promise<string> {
    const { firestore } = initializeFirebase();
    const configRef = doc(firestore, 'config', 'conta_azul');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
        throw new Error('Configuração Conta Azul não encontrada.');
    }

    const config = configSnap.data();
    const now = Date.now();

    if (config.accessToken && config.expiresAt && now < (config.expiresAt - 60000)) {
        return config.accessToken;
    }

    if (refreshPromise) return refreshPromise;

    if (config.refreshToken && config.clientId && config.clientSecret) {
        refreshPromise = (async () => {
            try {
                const authHeader = Buffer.from(`${config.clientId.trim()}:${config.clientSecret.trim()}`).toString('base64');
                const params = new URLSearchParams();
                params.append('grant_type', 'refresh_token');
                params.append('refresh_token', config.refreshToken);

                const response = await fetch(`${CONTA_AZUL_AUTH_BASE}/oauth2/token`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${authHeader}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: params.toString()
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error_description || 'Falha ao renovar token');
                }

                const newExpiresAt = Date.now() + (data.expires_in * 1000);
                
                await updateDoc(configRef, {
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                    expiresAt: newExpiresAt,
                    updatedAt: Timestamp.now()
                });

                return data.access_token;
            } finally {
                refreshPromise = null;
            }
        })();
        return refreshPromise;
    }

    throw new Error('Necessário reautorizar Conta Azul.');
}

/**
 * Chamada genérica à API da Conta Azul.
 */
export async function callContaAzulApi(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const token = await getValidContaAzulToken();
    const url = `${CONTA_AZUL_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const response = await fetch(url, {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store'
    });

    if (response.status === 204) return { success: true };

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const errorDetail = data.message || data.error_description || JSON.stringify(data);
        throw new Error(`Conta Azul (${response.status}): ${errorDetail}`);
    }

    return data;
}

/**
 * Busca ou cria um cliente no Conta Azul.
 */
export async function findOrCreateContaAzulCustomer(member: { name: string; email?: string; phone?: string }) {
    const response = await callContaAzulApi(`/v1/customers?name=${encodeURIComponent(member.name)}`);
    const list = response.items || response.itens || (Array.isArray(response) ? response : []);
    
    const exactMatch = list.find((c: any) => c.name.toLowerCase() === member.name.toLowerCase());
    if (exactMatch) return exactMatch.id;

    const newCustomer = await callContaAzulApi('/v1/customers', 'POST', {
        name: member.name,
        email: member.email || '',
        mobile_phone: member.phone || '',
        person_type: 'NATURAL'
    });

    return newCustomer.id;
}

/**
 * Cria um lançamento de contas a receber (V1 Financeiro).
 */
export async function createContaAzulReceivable(data: { customer_id: string; valor: number; descricao: string; data_vencimento: string }) {
    return await callContaAzulApi('/v1/financeiro/contas-a-receber', 'POST', {
        customer_id: data.customer_id,
        valor: data.valor,
        descricao: `[OikoApp] ${data.descricao}`,
        data_vencimento: data.data_vencimento,
        categoria_id: "categoria_id_padrao", // Deve ser mapeado no futuro
        conta_corrente_id: "conta_id_padrao" // Deve ser mapeado no futuro
    });
}

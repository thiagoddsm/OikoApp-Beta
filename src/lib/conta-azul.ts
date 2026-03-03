
'use server';

import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

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
        throw new Error('Configuração Conta Azul não encontrada no banco de dados.');
    }

    const config = configSnap.data();
    const now = Date.now();

    // Se o token manual estiver preenchido e não houver meio de refresh, usa ele (fallback)
    if (config.accessToken && !config.refreshToken) {
        return config.accessToken;
    }

    // Verifica validade (folga de 60 segundos)
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

                if (response.ok) {
                    const newExpiresAt = Date.now() + (data.expires_in * 1000);
                    await updateDoc(configRef, {
                        accessToken: data.access_token,
                        refreshToken: data.refresh_token,
                        expiresAt: newExpiresAt,
                        updatedAt: new Date().toISOString()
                    });
                    return data.access_token;
                } else {
                    const errMsg = data.error_description || data.message || 'Falha no refresh token';
                    throw new Error(errMsg);
                }
            } finally {
                refreshPromise = null;
            }
        })();

        return refreshPromise;
    }

    throw new Error('Nenhum token válido ou meio de renovação disponível. Por favor, autorize novamente.');
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

    if (response.status === 204 || response.status === 202) {
        return { success: true };
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const errorMsg = data.message || data.error_description || data.error || `Erro HTTP ${response.status}`;
        throw new Error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
    }

    return data;
}

export async function findOrCreateContaAzulCustomer(member: { name: string; email?: string; phone?: string }) {
    const response = await callContaAzulApi(`/v1/customers?name=${encodeURIComponent(member.name)}`);
    const list = Array.isArray(response) ? response : (response.itens || response.items || []);
    
    if (list.length > 0) return list[0].id;

    const newCustomer = await callContaAzulApi('/v1/customers', 'POST', {
        name: member.name,
        email: member.email || '',
        mobile_phone: member.phone || '',
        person_type: 'NATURAL'
    });

    return newCustomer.id;
}

export async function createContaAzulReceivable(data: any) {
    // API V1 Financeiro usa nomes em português: descricao, valor, data_vencimento
    return callContaAzulApi('/v1/financeiro/contas-a-receber', 'POST', data);
}

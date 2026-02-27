'use server';

import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const CONTA_AZUL_AUTH_BASE = 'https://auth.contaazul.com';

// Cache em memória para evitar loops de refresh na mesma requisição
let memoryToken: string | null = null;

/**
 * Recupera o token de acesso válido, renovando-o se necessário.
 */
export async function getValidContaAzulToken(forceRefresh = false) {
    if (!forceRefresh && memoryToken) return memoryToken;

    const { firestore } = initializeFirebase();
    const configRef = doc(firestore, 'config', 'conta_azul');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
        throw new Error('Configuração não encontrada no banco.');
    }

    const config = configSnap.data();
    
    // 1. Prioridade para o Token Manual (se preenchido no painel)
    if (!forceRefresh && config.accessToken && !config.refreshToken) {
        memoryToken = config.accessToken;
        return config.accessToken;
    }

    const now = Date.now();
    // 2. Se o token ainda é válido (com folga de 2 minutos)
    if (!forceRefresh && config.accessToken && config.expiresAt && now < (config.expiresAt - 120000)) {
        memoryToken = config.accessToken;
        return config.accessToken;
    }

    // 3. Tenta renovar via Refresh Token
    if (config.refreshToken && config.clientId && config.clientSecret) {
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
                
                // Salva o novo token
                await updateDoc(configRef, {
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                    expiresAt: newExpiresAt,
                    updatedAt: new Date().toISOString(),
                    lastError: 'Token renovado automaticamente.'
                });

                memoryToken = data.access_token;
                return data.access_token;
            } else {
                const msg = data.error_description || data.message || 'Falha no Refresh Token.';
                await updateDoc(configRef, { lastError: `ERRO REFRESH: ${msg}`, lastErrorAt: new Date().toISOString() });
                throw new Error(`Conta Azul Auth: ${msg}`);
            }
        } catch (e: any) {
            throw new Error(`Erro de autenticação: ${e.message}`);
        }
    }

    if (config.accessToken) return config.accessToken;
    throw new Error('Nenhum token disponível. Autorize o acesso no painel.');
}

/**
 * Chamada genérica à API com Auto-Retry em caso de 401.
 */
export async function callContaAzulApi(endpoint: string, method: string = 'GET', body?: any, retryCount = 0): Promise<any> {
    try {
        const token = await getValidContaAzulToken(retryCount > 0);
        
        // Host selection logic (V2 por padrão para finanças)
        let host = 'https://api-v2.contaazul.com';
        if (endpoint.startsWith('/v1/customers')) {
            host = 'https://api.contaazul.com';
        }

        const url = `${host}${endpoint}`;
        
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
            // Auto-Retry em caso de 401
            if (response.status === 401 && retryCount === 0) {
                return callContaAzulApi(endpoint, method, body, 1);
            }
            
            const errorMsg = data.message || data.error_description || `Erro HTTP ${response.status}`;
            throw new Error(errorMsg);
        }

        return data;
    } catch (e: any) {
        throw new Error(e.message || 'Erro na comunicação com a API.');
    }
}

export async function findOrCreateContaAzulCustomer(member: { name: string; email?: string; phone?: string }) {
    try {
        const customers = await callContaAzulApi(`/v1/customers?name=${encodeURIComponent(member.name)}`);
        const list = Array.isArray(customers) ? customers : (customers.itens || customers.items || []);
        
        if (list.length > 0) return list[0].id;

        const newCustomer = await callContaAzulApi('/v1/customers', 'POST', {
            name: member.name,
            email: member.email || '',
            mobile_phone: member.phone || '',
            person_type: 'NATURAL'
        });

        return newCustomer.id;
    } catch (e: any) {
        throw new Error(`Gerenciamento de Cliente: ${e.message}`);
    }
}

export async function createContaAzulReceivable(data: any) {
    return callContaAzulApi('/v1/financeiro/eventos-financeiros/contas-a-receber', 'POST', data);
}
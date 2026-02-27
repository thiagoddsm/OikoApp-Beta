
'use server';

import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Host V2 Unificado conforme Documentação Técnica.
 * A Conta Azul recomenda o uso do api-v2 para novos recursos e tokens.
 */
const CONTA_AZUL_API_BASE = 'https://api-v2.contaazul.com';
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
    
    // Prioridade absoluta para o Token Manual inserido no painel
    if (config.accessToken && !config.refreshToken && !forceRefresh) {
        memoryToken = config.accessToken;
        return config.accessToken;
    }

    const now = Date.now();
    // Se o token ainda é válido (com margem de segurança de 5 minutos)
    if (!forceRefresh && config.accessToken && config.expiresAt && now < (config.expiresAt - 300000)) {
        memoryToken = config.accessToken;
        return config.accessToken;
    }

    // Renovação automática via Refresh Token
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
                
                // Gravação atômica no banco de dados
                await updateDoc(configRef, {
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                    expiresAt: newExpiresAt,
                    updatedAt: new Date().toISOString(),
                    lastError: 'SUCESSO: Token renovado automaticamente.'
                });

                memoryToken = data.access_token;
                return data.access_token;
            } else {
                const msg = data.error_description || data.message || 'Falha crítica no refresh token.';
                await updateDoc(configRef, { 
                    lastError: `FALHA NO REFRESH: ${msg}`, 
                    lastErrorAt: new Date().toISOString() 
                });
                throw new Error(msg);
            }
        } catch (e: any) {
            throw new Error(`Autenticação: ${e.message}`);
        }
    }

    if (config.accessToken) return config.accessToken;
    throw new Error('Nenhum token disponível. Realize a autorização no painel.');
}

/**
 * Chamada genérica à API com Auto-Retry em caso de 401 (Unauthorized).
 */
export async function callContaAzulApi(endpoint: string, method: string = 'GET', body?: any, retryCount = 0): Promise<any> {
    try {
        // Obtém token (renovando se o tempo expirou)
        const token = await getValidContaAzulToken(retryCount > 0);
        const url = `${CONTA_AZUL_API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
        
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined,
            cache: 'no-store'
        });

        // Casos de sucesso sem corpo
        if (response.status === 204 || response.status === 202) {
            return { success: true, status: response.status };
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            // Se o token for considerado inválido pelo servidor (401), tentamos o refresh UMA VEZ
            if (response.status === 401 && retryCount === 0) {
                memoryToken = null; // Limpa cache de memória
                return callContaAzulApi(endpoint, method, body, 1);
            }
            
            const errorMsg = data.message || data.error_description || data.error || `Erro HTTP ${response.status}`;
            throw new Error(errorMsg);
        }

        return data;
    } catch (e: any) {
        throw new Error(e.message || 'Falha na comunicação com a API Conta Azul.');
    }
}

/**
 * Busca ou cria um cliente no Conta Azul.
 */
export async function findOrCreateContaAzulCustomer(member: { name: string; email?: string; phone?: string }) {
    try {
        // Busca textual por nome
        const response = await callContaAzulApi(`/v1/customers?name=${encodeURIComponent(member.name)}`);
        const list = Array.isArray(response) ? response : (response.itens || response.items || []);
        
        if (list.length > 0) return list[0].id;

        // Se não existir, cria
        const newCustomer = await callContaAzulApi('/v1/customers', 'POST', {
            name: member.name,
            email: member.email || '',
            mobile_phone: member.phone || '',
            person_type: 'NATURAL'
        });

        return newCustomer.id;
    } catch (e: any) {
        throw new Error(`Erro ao gerenciar cliente: ${e.message}`);
    }
}

/**
 * Cria um recebível (Contas a Receber) para permitir geração de cobrança posterior.
 */
export async function createContaAzulReceivable(data: any) {
    return callContaAzulApi('/v1/financeiro/eventos-financeiros/contas-a-receber', 'POST', data);
}

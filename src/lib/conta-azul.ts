'use server';

import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const CONTA_AZUL_AUTH_BASE = 'https://auth.contaazul.com';

// Cache simples para evitar múltiplas leituras/refresh no mesmo ciclo de requisição do servidor
let currentRequestToken: string | null = null;

/**
 * Recupera o token de acesso válido, renovando-o se necessário.
 */
export async function getValidContaAzulToken(forceRefresh = false) {
    if (!forceRefresh && currentRequestToken) {
        return currentRequestToken;
    }

    const { firestore } = initializeFirebase();
    const configRef = doc(firestore, 'config', 'conta_azul');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
        throw new Error('Configuração da Conta Azul não encontrada no banco de dados.');
    }

    const config = configSnap.data();
    const { clientId, clientSecret, accessToken, refreshToken, expiresAt } = config;

    // Prioridade para token manual (sem refresh token)
    if (!forceRefresh && accessToken && !refreshToken) {
        currentRequestToken = accessToken;
        return accessToken;
    }

    const now = Date.now();
    // Se o token ainda é válido (com folga de 1 minuto)
    if (!forceRefresh && accessToken && expiresAt && now < (expiresAt - 60000)) {
        currentRequestToken = accessToken;
        return accessToken;
    }

    // Tenta renovar via refresh_token se disponível
    if (refreshToken && clientId && clientSecret) {
        try {
            const authHeader = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');
            const params = new URLSearchParams();
            params.append('grant_type', 'refresh_token');
            params.append('refresh_token', refreshToken);

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
                
                // CRITICAL: AWAIT the update to ensure subsequent calls see the new token
                await updateDoc(configRef, {
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                    expiresAt: newExpiresAt,
                    updatedAt: new Date().toISOString(),
                    lastError: 'Token renovado com sucesso via Refresh Token.'
                });

                currentRequestToken = data.access_token;
                return data.access_token;
            } else {
                const msg = data.error_description || data.message || 'Falha na renovação do token.';
                await updateDoc(configRef, { 
                    lastError: `ERRO REFRESH: ${msg}`, 
                    lastErrorAt: new Date().toISOString() 
                });
                throw new Error(`Conta Azul: ${msg}`);
            }
        } catch (e: any) {
            throw new Error(`Erro na renovação do token: ${e.message}`);
        }
    }

    if (accessToken) return accessToken;
    throw new Error('Nenhum token disponível. Por favor, realize a autorização no painel.');
}

/**
 * Chamada genérica à API com suporte a Auto-Retry em caso de 401.
 */
export async function callContaAzulApi(endpoint: string, method: string = 'GET', body?: any, retryCount = 0): Promise<any> {
    try {
        const token = await getValidContaAzulToken(retryCount > 0);
        
        // Host selection logic based on endpoint
        let host = 'https://api.contaazul.com';
        if (endpoint.startsWith('/v1/financeiro') || 
            endpoint.startsWith('/v1/conta-financeira') || 
            endpoint.startsWith('/v1/centro-de-custo') ||
            endpoint.startsWith('/v1/categorias') ||
            endpoint.startsWith('/v1/contratos')) {
            host = 'https://api-v2.contaazul.com';
        }

        const url = `${host}${endpoint}`;
        
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined
        });

        if (response.status === 204) return { success: true };

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            // Se for 401 (Não Autorizado) e for a primeira tentativa, renova o token e tenta de novo
            if (response.status === 401 && retryCount === 0) {
                return callContaAzulApi(endpoint, method, body, 1);
            }
            
            const errorMsg = data.message || data.error_description || `Erro HTTP ${response.status}`;
            throw new Error(errorMsg);
        }

        return data;
    } catch (e: any) {
        throw new Error(e.message || 'Erro na comunicação com a Conta Azul.');
    }
}

export async function findOrCreateContaAzulCustomer(member: { name: string; email?: string; phone?: string }) {
    try {
        // Correção de rota de busca conforme documentação
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
        throw new Error(`Erro ao gerenciar cliente: ${e.message}`);
    }
}

export async function createContaAzulReceivable(data: any) {
    return callContaAzulApi('/v1/financeiro/eventos-financeiros/contas-a-receber', 'POST', data);
}

export async function createContaAzulCharge(data: any) {
    return callContaAzulApi('/v1/financeiro/eventos-financeiros/contas-a-receber/gerar-cobranca', 'POST', data);
}
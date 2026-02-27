
'use server';

import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Hosts da Conta Azul conforme Documentação Técnica.
 * V1: Clientes, Produtos, Vendas Legadas.
 * V2: Financeiro, Contratos, Cobranças.
 */
const CONTA_AZUL_V1_HOST = 'https://api.contaazul.com';
const CONTA_AZUL_V2_HOST = 'https://api-v2.contaazul.com';
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
        throw new Error('Configuração não encontrada no banco (config/conta_azul).');
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
                
                await updateDoc(configRef, {
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                    expiresAt: newExpiresAt,
                    updatedAt: new Date().toISOString(),
                    lastError: 'SUCESSO: Token renovado e pronto para uso.'
                });

                memoryToken = data.access_token;
                return data.access_token;
            } else {
                const msg = data.error_description || data.message || JSON.stringify(data);
                await updateDoc(configRef, { 
                    lastError: `FALHA NO REFRESH: ${msg}`, 
                    lastErrorAt: new Date().toISOString() 
                });
                throw new Error(msg);
            }
        } catch (e: any) {
            throw new Error(`Erro na Autenticação: ${e.message}`);
        }
    }

    if (config.accessToken) return config.accessToken;
    throw new Error('Nenhum token disponível. Realize a autorização no painel ou insira um token manual.');
}

/**
 * Chamada genérica à API com seleção inteligente de host e Auto-Retry.
 */
export async function callContaAzulApi(endpoint: string, method: string = 'GET', body?: any, retryCount = 0): Promise<any> {
    try {
        const token = await getValidContaAzulToken(retryCount > 0);
        
        // Seleção de Host baseada no recurso
        // Clientes (customers) estão no host V1. Financeiro no V2.
        const isV1Resource = endpoint.includes('/customers') || endpoint.includes('/products') || endpoint.includes('/sales');
        const host = isV1Resource ? CONTA_AZUL_V1_HOST : CONTA_AZUL_V2_HOST;
        
        const url = `${host}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
        
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
            return { success: true, status: response.status };
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            // Se 401 (Unauthorized), tenta renovar o token UMA vez
            if (response.status === 401 && retryCount === 0) {
                memoryToken = null;
                return callContaAzulApi(endpoint, method, body, 1);
            }
            
            let errorDetail = '';
            if (typeof data === 'string') {
                errorDetail = data;
            } else if (data && typeof data === 'object') {
                const rawMsg = data.message || data.error_description || data.error || data.msg;
                errorDetail = typeof rawMsg === 'object' ? JSON.stringify(rawMsg) : (rawMsg || JSON.stringify(data));
            } else {
                errorDetail = `Erro HTTP ${response.status}`;
            }
            
            throw new Error(errorDetail);
        }

        return data;
    } catch (e: any) {
        throw new Error(e.message || 'Falha na comunicação com a API Conta Azul.');
    }
}

/**
 * Busca ou cria um cliente no Conta Azul (Host V1).
 */
export async function findOrCreateContaAzulCustomer(member: { name: string; email?: string; phone?: string }) {
    try {
        // Busca usando Host V1
        const response = await callContaAzulApi(`/v1/customers?name=${encodeURIComponent(member.name)}`);
        const list = Array.isArray(response) ? response : (response.itens || response.items || []);
        
        if (list.length > 0) return list[0].id;

        // Criação usando Host V1
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
 * Cria um recebível (Contas a Receber) para permitir geração de cobrança posterior (Host V2).
 */
export async function createContaAzulReceivable(data: any) {
    return callContaAzulApi('/v1/financeiro/eventos-financeiros/contas-a-receber', 'POST', data);
}

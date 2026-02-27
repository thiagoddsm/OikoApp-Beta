
'use server';

import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Hosts da Conta Azul conforme Documentação Técnica.
 * api.contaazul.com (V1): Clientes, Produtos, Vendas.
 * api-v2.contaazul.com (V2): Financeiro, Cobranças, Contratos.
 */
const CONTA_AZUL_V1_HOST = 'https://api.contaazul.com';
const CONTA_AZUL_V2_HOST = 'https://api-v2.contaazul.com';
const CONTA_AZUL_AUTH_BASE = 'https://auth.contaazul.com';

// Mutex para evitar múltiplas renovações simultâneas
let refreshPromise: Promise<string> | null = null;

/**
 * Recupera o token de acesso válido, renovando-o se necessário.
 */
export async function getValidContaAzulToken(forceRefresh = false): Promise<string> {
    const { firestore } = initializeFirebase();
    const configRef = doc(firestore, 'config', 'conta_azul');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
        throw new Error('Configuração não encontrada no banco (config/conta_azul).');
    }

    const config = configSnap.data();
    
    // Prioridade para o Token Manual (útil para debug rápido)
    if (config.accessToken && !config.refreshToken && !forceRefresh) {
        return config.accessToken;
    }

    const now = Date.now();
    // Se não for forçado e o token estiver válido (com margem de 5 min)
    if (!forceRefresh && config.accessToken && config.expiresAt && now < (config.expiresAt - 300000)) {
        return config.accessToken;
    }

    // Lógica de Renovação (Refresh Token)
    if (config.refreshToken && config.clientId && config.clientSecret) {
        if (refreshPromise && !forceRefresh) return refreshPromise;

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
                        updatedAt: new Date().toISOString(),
                        lastError: 'SUCESSO: Token renovado e pronto para uso.'
                    });
                    return data.access_token;
                } else {
                    const msg = data.error_description || data.message || JSON.stringify(data);
                    await updateDoc(configRef, { lastError: `FALHA NO REFRESH: ${msg}`, lastErrorAt: new Date().toISOString() });
                    throw new Error(msg);
                }
            } finally {
                refreshPromise = null;
            }
        })();

        return refreshPromise;
    }

    if (config.accessToken) return config.accessToken;
    throw new Error('Nenhum token disponível. Realize a autorização no painel.');
}

/**
 * Chamada genérica com roteamento inteligente de host.
 */
export async function callContaAzulApi(endpoint: string, method: string = 'GET', body?: any, retryCount = 0): Promise<any> {
    try {
        const token = await getValidContaAzulToken(retryCount > 0);
        
        // REGRAS DE ROTEAMENTO (CRÍTICO conforme doc)
        // Recursos de pessoas/clientes/produtos ficam no Host V1
        const normalizedEndpoint = endpoint.toLowerCase();
        const isV1Resource = 
            normalizedEndpoint.includes('/customers') || 
            normalizedEndpoint.includes('/clientes') || 
            normalizedEndpoint.includes('/pessoas') ||
            normalizedEndpoint.includes('/products') ||
            normalizedEndpoint.includes('/produtos');

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

        // 204 No Content ou 202 Accepted
        if (response.status === 204 || response.status === 202) {
            return { success: true, status: response.status };
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            // Se 401, tenta renovar uma única vez
            if (response.status === 401 && retryCount === 0) {
                return callContaAzulApi(endpoint, method, body, 1);
            }
            
            const rawMsg = data.message || data.error_description || data.error || data.msg || data;
            const errorDetail = typeof rawMsg === 'object' ? JSON.stringify(rawMsg) : (rawMsg || `Erro HTTP ${response.status}`);
            throw new Error(errorDetail);
        }

        return data;
    } catch (e: any) {
        throw new Error(e.message || 'Falha na comunicação com a API.');
    }
}

export async function findOrCreateContaAzulCustomer(member: { name: string; email?: string; phone?: string }) {
    try {
        // Busca sempre no V1
        const response = await callContaAzulApi(`/v1/customers?name=${encodeURIComponent(member.name)}`);
        const list = Array.isArray(response) ? response : (response.itens || response.items || []);
        
        if (list.length > 0) return list[0].id;

        // Criação no V1
        const newCustomer = await callContaAzulApi('/v1/customers', 'POST', {
            name: member.name,
            email: member.email || '',
            mobile_phone: member.phone || '',
            person_type: 'NATURAL'
        });

        return newCustomer.id;
    } catch (e: any) {
        // Garantir que o erro seja uma string limpa para o log
        const errorMsg = e.message || 'Erro desconhecido ao gerenciar cliente';
        throw new Error(`Erro ao gerenciar cliente: ${errorMsg}`);
    }
}

export async function createContaAzulReceivable(data: any) {
    // Financeiro deve ir para o Host V2
    return callContaAzulApi('/v1/financeiro/eventos-financeiros/contas-a-receber', 'POST', data);
}

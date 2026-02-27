
'use server';

import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const CONTA_AZUL_AUTH_BASE = 'https://auth.contaazul.com';

/**
 * Recupera o token de acesso válido, renovando-o se necessário.
 * Prioriza o token manual inserido pelo usuário no painel.
 */
export async function getValidContaAzulToken(forceRefresh = false) {
    const { firestore } = initializeFirebase();
    const configRef = doc(firestore, 'config', 'conta_azul');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
        throw new Error('Configuração não encontrada.');
    }

    const config = configSnap.data();
    const { clientId, clientSecret, accessToken, refreshToken, expiresAt } = config;

    // Se houver um token manual e não for refresh forçado, use-o
    // No Studio, o usuário pode colar o token direto do portal da CA
    if (!forceRefresh && accessToken && !refreshToken) {
        return accessToken;
    }

    const now = Date.now();
    // Se o token ainda é válido (com folga de 30s)
    if (!forceRefresh && accessToken && expiresAt && now < (expiresAt - 30000)) {
        return accessToken;
    }

    // Tenta renovar via refresh_token
    if (refreshToken && clientId && clientSecret) {
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
            await updateDoc(configRef, {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: newExpiresAt,
                updatedAt: new Date().toISOString(),
                lastError: 'SERVIDOR: SUCESSO: Token renovado e pronto para uso.'
            });
            return data.access_token;
        } else {
            const msg = data.error_description || data.message || 'Falha no refresh token.';
            await updateDoc(configRef, { 
                lastError: `SERVIDOR: ERRO REFRESH: ${msg}`, 
                lastErrorAt: new Date().toISOString() 
            });
            throw new Error(msg);
        }
    }

    if (accessToken) return accessToken;
    throw new Error('Nenhum token disponível. Realize a autorização ou insira um token manual.');
}

/**
 * Chamada genérica à API com suporte a Auto-Retry em caso de 401.
 * Gerencia automaticamente a alternância entre hosts api.contaazul.com e api-v2.contaazul.com
 */
export async function callContaAzulApi(endpoint: string, method: string = 'GET', body?: any, retryCount = 0): Promise<any> {
    try {
        const token = await getValidContaAzulToken(retryCount > 0);
        
        // Regra de Host conforme Documentação:
        // api-v2.contaazul.com -> Financeiro, Contratos, Vendas, Baixas
        // api.contaazul.com -> Clientes (Pessoas) e outros legados
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

        // Se for 204 No Content
        if (response.status === 204) return { success: true };

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            // Se for 401 e for a primeira tentativa, tenta renovar e repetir
            if (response.status === 401 && retryCount === 0) {
                return callContaAzulApi(endpoint, method, body, 1);
            }
            
            const errorMsg = data.message || data.error_description || `Erro ${response.status}`;
            throw new Error(errorMsg);
        }

        return data;
    } catch (e: any) {
        throw new Error(e.message || 'Falha na comunicação com Conta Azul.');
    }
}

export async function findOrCreateContaAzulCustomer(member: { name: string; email?: string; phone?: string }) {
    const customers = await callContaAzulApi(`/v1/customers?name=${encodeURIComponent(member.name)}`);
    const list = Array.isArray(customers) ? customers : (customers.items || []);
    
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
    return callContaAzulApi('/v1/financeiro/eventos-financeiros/contas-a-receber', 'POST', data);
}

export async function createContaAzulCharge(data: any) {
    return callContaAzulApi('/v1/financeiro/eventos-financeiros/contas-a-receber/gerar-cobranca', 'POST', data);
}

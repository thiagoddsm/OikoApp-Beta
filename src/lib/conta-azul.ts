
'use server';

import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const CONTA_AZUL_AUTH_BASE = 'https://auth.contaazul.com';
const CONTA_AZUL_API_V1_BASE = 'https://api.contaazul.com';
const CONTA_AZUL_API_V2_BASE = 'https://api-v2.contaazul.com';

/**
 * Recupera o token de acesso válido, renovando-o se necessário.
 */
export async function getValidContaAzulToken() {
    const { firestore } = initializeFirebase();
    const configRef = doc(firestore, 'config', 'conta_azul');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
        throw new Error('Configuração da Conta Azul não encontrada no Firestore.');
    }

    const config = configSnap.data();
    const { clientId, clientSecret, accessToken, refreshToken, expiresAt } = config;

    const now = Date.now();
    // Se o token existe e ainda é válido por pelo menos 1 minuto, usamos ele.
    if (accessToken && expiresAt && now < (expiresAt - 60000)) {
        return accessToken;
    }

    // Se não há token ou está perto de expirar, renovamos
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

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const errorMsg = data.error_description || data.message || 'Falha na renovação do token.';
            await updateDoc(configRef, { 
                lastError: `FALHA NO REFRESH: ${errorMsg}`,
                lastErrorAt: new Date().toISOString()
            }).catch(() => {});
            throw new Error(errorMsg);
        }

        const newExpiresAt = Date.now() + (data.expires_in * 1000);
        
        await updateDoc(configRef, {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: newExpiresAt,
            updatedAt: new Date().toISOString()
        });

        return data.access_token;
    }

    throw new Error('Aplicação não autorizada ou sem refresh token disponível.');
}

/**
 * Realiza uma chamada à API da Conta Azul.
 * Suporta v1 e v2 alternando o host conforme o endpoint.
 */
export async function callContaAzulApi(endpoint: string, method: string = 'GET', body?: any, retryCount = 0): Promise<any> {
    try {
        const token = await getValidContaAzulToken();
        
        // Define o host correto: v2 para endpoints de cobrança, v1 para o resto.
        const isV2Endpoint = endpoint.includes('/financeiro/eventos-financeiros');
        const baseUrl = isV2Endpoint ? CONTA_AZUL_API_V2_BASE : CONTA_AZUL_API_V1_BASE;
        
        const url = `${baseUrl}${endpoint}`;
        
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            // Se o erro for 401 (token inválido/expirado), tentamos forçar um refresh e repetir UMA vez.
            if (response.status === 401 && retryCount === 0) {
                const { firestore } = initializeFirebase();
                await updateDoc(doc(firestore, 'config', 'conta_azul'), { expiresAt: 0 });
                return callContaAzulApi(endpoint, method, body, 1);
            }

            const errorText = data.message || data.error_description || (typeof data === 'string' ? data : JSON.stringify(data));
            throw new Error(`Falha na rota ${endpoint}: ${errorText}`);
        }

        return data;
    } catch (e: any) {
        throw new Error(e.message || 'Erro de conexão com a API.');
    }
}

export async function findOrCreateContaAzulCustomer(member: { name: string; email?: string; phone?: string }) {
    // Busca por nome exato na v1
    const customers = await callContaAzulApi(`/v1/customers?name=${encodeURIComponent(member.name)}`);
    const customerList = Array.isArray(customers) ? customers : (customers.items || []);
    
    if (customerList.length > 0) return customerList[0].id;

    // Cria novo cliente na v1
    const newCustomer = await callContaAzulApi('/v1/customers', 'POST', {
        name: member.name,
        email: member.email || '',
        mobile_phone: member.phone || '',
        person_type: 'NATURAL'
    });

    return newCustomer.id;
}

export async function createContaAzulCharge(data: {
    bankAccountId: string;
    description: string;
    parcelId: string;
    dueDate: string;
    type: 'LINK_PAGAMENTO' | 'PIX_COBRANCA' | 'BOLETO';
}) {
    // Chamada obrigatória na V2 conforme documentação
    return callContaAzulApi('/v1/financeiro/eventos-financeiros/contas-a-receber/gerar-cobranca', 'POST', {
        conta_bancaria: data.bankAccountId,
        descricao_fatura: data.description,
        id_parcela: data.parcelId,
        data_vencimento: data.dueDate,
        tipo: data.type
    });
}

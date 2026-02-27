'use server';

import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const CONTA_AZUL_AUTH_BASE = 'https://auth.contaazul.com';
const CONTA_AZUL_API_V1_BASE = 'https://api.contaazul.com';
const CONTA_AZUL_API_V2_BASE = 'https://api-v2.contaazul.com';

/**
 * Recupera o token de acesso válido, renovando-o se necessário.
 * @param forceRefresh Se verdadeiro, ignora o token atual e tenta o refresh_token.
 */
export async function getValidContaAzulToken(forceRefresh = false) {
    const { firestore } = initializeFirebase();
    const configRef = doc(firestore, 'config', 'conta_azul');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
        throw new Error('Configuração da Conta Azul não encontrada no Firestore.');
    }

    const config = configSnap.data();
    const { clientId, clientSecret, accessToken, refreshToken, expiresAt } = config;

    const now = Date.now();
    
    // 1. Se não for forçado e temos um token que parece válido (ou manual sem expiração definida)
    if (!forceRefresh && accessToken) {
        // Se não tem expiração registrada (token manual) ou se ainda está no prazo de validade
        if (!expiresAt || now < (expiresAt - 30000)) {
            return accessToken;
        }
    }

    // 2. Se chegamos aqui e temos dados de refresh, tentamos renovar
    if (refreshToken && clientId && clientSecret) {
        console.log("Iniciando renovação automática de token Conta Azul...");
        
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
            const errorMsg = data.error_description || data.message || 'Falha na renovação via refresh_token.';
            await updateDoc(configRef, { 
                lastError: `FALHA NO REFRESH: ${errorMsg}`,
                lastErrorAt: new Date().toISOString()
            }).catch(() => {});
            
            // Se o refresh falhou mas ainda temos um token manual, tenta usá-lo como última esperança
            if (accessToken && !forceRefresh) return accessToken;
            
            throw new Error(`Erro na renovação (OAuth): ${errorMsg}`);
        }
    }

    // 3. Fallback: se nada funcionou mas o token existe, tenta ele (pode ser um token manual)
    if (accessToken) return accessToken;

    throw new Error('Aplicação não conectada. Por favor, realize a autorização da Conta Azul nas configurações.');
}

/**
 * Realiza uma chamada à API da Conta Azul com tratamento de retry automático em caso de 401.
 */
export async function callContaAzulApi(endpoint: string, method: string = 'GET', body?: any, retryCount = 0): Promise<any> {
    try {
        const token = await getValidContaAzulToken(retryCount > 0);
        
        // Cobranças e Contratos usam api-v2. Clientes e Bancos usam v1 estável.
        const isV2Path = endpoint.includes('/gerar-cobranca') || endpoint.includes('/contratos');
        const baseUrl = isV2Path ? CONTA_AZUL_API_V2_BASE : CONTA_AZUL_API_V1_BASE;
        
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
            // Se o erro for 401 (Unauthorized), força uma renovação e tenta de novo UMA vez
            if (response.status === 401 && retryCount === 0) {
                console.warn(`Token rejeitado pela Conta Azul em ${endpoint}. Tentando renovação forçada...`);
                return callContaAzulApi(endpoint, method, body, 1);
            }

            const errorText = data.message || data.error_description || JSON.stringify(data);
            throw new Error(`Falha na rota ${endpoint}: ${errorText}`);
        }

        return data;
    } catch (e: any) {
        throw new Error(e.message || 'Falha na comunicação com o servidor da Conta Azul.');
    }
}

export async function findOrCreateContaAzulCustomer(member: { name: string; email?: string; phone?: string }) {
    try {
        // Busca por nome na v1
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
    } catch (e: any) {
        throw new Error(`Erro ao gerenciar cliente no Conta Azul: ${e.message}`);
    }
}

export async function createContaAzulReceivable(data: {
    description: string;
    value: number;
    due_date: string;
    customer_id: string;
    category_id: string;
    bank_account_id: string;
}) {
    // Cria um lançamento financeiro v1
    return callContaAzulApi('/v1/financeiro/eventos-financeiros/contas-a-receber', 'POST', {
        data_competencia: data.due_date,
        valor: data.value,
        descricao: data.description,
        contato: data.customer_id,
        conta_financeira: data.bank_account_id,
        rateio: [{ id_categoria: data.category_id, valor: data.value }],
        condicao_pagamento: {
            parcelas: [{
                descricao: data.description,
                data_vencimento: data.due_date,
                conta_financeira: data.bank_account_id,
                detalhe_valor: { valor_bruto: data.value }
            }]
        }
    });
}

export async function createContaAzulCharge(data: {
    bankAccountId: string;
    description: string;
    parcelId: string;
    dueDate: string;
    type: 'LINK_PAGAMENTO' | 'PIX_COBRANCA' | 'BOLETO';
}) {
    // Chamada na API V2 para gerar cobrança (seguindo documentação enviada)
    return callContaAzulApi('/v1/financeiro/eventos-financeiros/contas-a-receber/gerar-cobranca', 'POST', {
        conta_bancaria: data.bankAccountId,
        descricao_fatura: data.description,
        id_parcela: data.parcelId,
        data_vencimento: data.dueDate,
        tipo: data.type
    });
}


'use server';

import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const CONTA_AZUL_AUTH_BASE = 'https://auth.contaazul.com';
const CONTA_AZUL_API_BASE = 'https://api.contaazul.com'; // URL padrão estável para recursos v1

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
    // Se o token expira em menos de 5 minutos, renovamos.
    if (accessToken && expiresAt && now < (expiresAt - 300000)) {
        return accessToken;
    }

    if (refreshToken && clientId && clientSecret) {
        const authHeader = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');
        
        try {
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
                const errorMsg = data.error_description || data.message || JSON.stringify(data);
                await updateDoc(configRef, { 
                    lastError: `RENOVAÇÃO FALHOU: ${errorMsg}`,
                    lastErrorAt: new Date().toISOString()
                }).catch(() => {});
                throw new Error(errorMsg);
            }

            const newExpiresAt = Date.now() + (data.expires_in * 1000);
            
            await updateDoc(configRef, {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: newExpiresAt,
                updatedAt: new Date().toISOString(),
                lastError: 'SUCESSO: Token renovado automaticamente.'
            });

            return data.access_token;
        } catch (error: any) {
            console.error('Erro na renovação do token Conta Azul:', error);
            throw error;
        }
    }

    throw new Error('Aplicação não autorizada ou credenciais inválidas.');
}

/**
 * Realiza uma chamada genérica à API da Conta Azul
 */
export async function callContaAzulApi(endpoint: string, method: string = 'GET', body?: any) {
    const token = await getValidContaAzulToken();
    const url = `${CONTA_AZUL_API_BASE}${endpoint}`;
    
    try {
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
            const errorMsg = data.message || data.error_description || JSON.stringify(data);
            throw new Error(`Falha na rota ${endpoint}: ${errorMsg}`);
        }

        return data;
    } catch (e: any) {
        throw new Error(e.message || 'Erro de conexão com a API.');
    }
}

/**
 * Busca ou cria um cliente no Conta Azul
 */
export async function findOrCreateContaAzulCustomer(member: { name: string; email?: string; phone?: string }) {
    try {
        const customers = await callContaAzulApi(`/v1/customers?name=${encodeURIComponent(member.name)}`);
        let customerList = Array.isArray(customers) ? customers : (customers.items || []);
        
        if (customerList.length > 0) return customerList[0].id;

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
 * Lança um recebimento
 */
export async function createContaAzulReceivable(data: {
    description: string;
    value: number;
    due_date: string;
    customer_id: string;
    category_id?: string;
    bank_account_id?: string;
}) {
    return callContaAzulApi('/v1/receivables', 'POST', {
        description: data.description,
        value: data.value,
        due_date: data.due_date,
        customer_id: data.customer_id,
        category_id: data.category_id,
        bank_account_id: data.bank_account_id,
        status: 'PAID',
        received_at: data.due_date
    });
}

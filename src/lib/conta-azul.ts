
'use server';

import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const CONTA_AZUL_AUTH_BASE = 'https://api.contaazul.com';
const CONTA_AZUL_API_BASE = 'https://api-v2.contaazul.com';

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

    // Verificar se o token ainda é válido (com margem de segurança de 5 minutos)
    const now = Date.now();
    if (accessToken && expiresAt && now < (expiresAt - 300000)) {
        return accessToken;
    }

    // Se expirou ou não existe, mas temos o refresh token, vamos renovar
    if (refreshToken && clientId && clientSecret) {
        const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        
        try {
            const response = await fetch(`${CONTA_AZUL_AUTH_BASE}/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${authHeader}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error_description || 'Falha ao renovar token.');
            }

            const newExpiresAt = Date.now() + (data.expires_in * 1000);
            
            await updateDoc(configRef, {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: newExpiresAt,
                updatedAt: new Date().toISOString()
            });

            return data.access_token;
        } catch (error) {
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
    
    const response = await fetch(`${CONTA_AZUL_API_BASE}${endpoint}`, {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro na API Conta Azul: ${response.status}`);
    }

    return response.json();
}

/**
 * Busca ou cria um cliente (membro) no Conta Azul
 */
export async function findOrCreateContaAzulCustomer(member: { name: string; email?: string; phone?: string }) {
    try {
        // 1. Tentar buscar por nome exato (simplificado)
        const customers = await callContaAzulApi(`/v1/customers?name=${encodeURIComponent(member.name)}`);
        
        if (customers && customers.length > 0) {
            return customers[0].id;
        }

        // 2. Se não achou, criar novo
        const newCustomer = await callContaAzulApi('/v1/customers', 'POST', {
            name: member.name,
            email: member.email || '',
            mobile_phone: member.phone || '',
            person_type: 'NATURAL'
        });

        return newCustomer.id;
    } catch (e) {
        console.error("Erro ao gerenciar cliente no Conta Azul:", e);
        return null;
    }
}

/**
 * Lança um recebimento (Dízimo/Oferta) no financeiro do Conta Azul
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
        status: 'PAID', // Já entra como pago
        received_at: data.due_date
    });
}

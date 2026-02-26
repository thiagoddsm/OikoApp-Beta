
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
        console.log('Renovando token da Conta Azul...');
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

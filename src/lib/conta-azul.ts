// Cliente HTTP centralizado para a API do Conta Azul v2
import dotenv from 'dotenv';
import path from 'path';

// Carrega .env explicitamente se rodando em Node.js (backend)
if (typeof window === 'undefined') {
  // Caminhos de busca redundantes para garantir o carregamento sob Turbopack / Webpack
  const pathsToTry = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../.env')
  ];
  
  for (const envPath of pathsToTry) {
    dotenv.config({ path: envPath });
    if (process.env.CONTA_AZUL_CLIENT_ID) {
      break;
    }
  }
}

import { Timestamp } from 'firebase/firestore';
import { getAdminDb } from '@/lib/firebase-admin';

export interface ContaAzulToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // timestamp em ms
}

export interface ContaAzulEntry {
  id: string;
  type: 'RECEIVABLE' | 'PAYABLE';
  description: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  category?: string;
  contactName?: string;
  paymentDate?: string;
}

export async function getContaAzulCredentials() {
  try {
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  } catch (e) {
    // ignore
  }

  try {
    const db = getAdminDb();
    const snap = await db.collection('system_settings').doc('finance').get();
    
    if (snap.exists) {
      const data = snap.data()!;
      if (data.contaAzulClientId) {
        return {
          clientId: data.contaAzulClientId,
          clientSecret: data.contaAzulClientSecret || '',
          redirectUri: data.contaAzulRedirectUri || 'https://ibmanha.com.br/api/finance/conta-azul/callback',
          baseUrl: data.contaAzulBaseUrl || 'https://api-v2.contaazul.com'
        };
      }
    }
  } catch (error) {
    console.warn('[Conta Azul Config] Não foi possível ler credenciais do Firestore. Tentando fallback para .env.', error);
  }

  const clientId = process.env.CONTA_AZUL_CLIENT_ID;
  const clientSecret = process.env.CONTA_AZUL_CLIENT_SECRET;
  const redirectUri = process.env.CONTA_AZUL_REDIRECT_URI || 'http://localhost:3000/api/finance/conta-azul/callback';
  const baseUrl = process.env.CONTA_AZUL_BASE_URL || 'https://api-v2.contaazul.com';

  if (!clientId || !clientSecret) {
    throw new Error('Credenciais da Conta Azul ausentes nas variáveis de ambiente do servidor.');
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    baseUrl
  };
}

export async function getAuthorizationUrl(customState?: string): Promise<string> {
  const { clientId, redirectUri } = await getContaAzulCredentials();
  const encodedRedirectUri = encodeURIComponent(redirectUri);
  const state = customState || `ca_state_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  return `https://auth.contaazul.com/login?response_type=code&client_id=${clientId}&redirect_uri=${encodedRedirectUri}&state=${state}&scope=openid+profile+aws.cognito.signin.user.admin`;
}

export async function exchangeCodeForToken(code: string): Promise<ContaAzulToken> {
  const { clientId, clientSecret, redirectUri } = await getContaAzulCredentials();

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://auth.contaazul.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao obter token Conta Azul: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  // Conta Azul expira em data.expires_in segundos (geralmente 3600s = 1h)
  const expiresAt = Date.now() + (data.expires_in * 1000);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<ContaAzulToken> {
  const { clientId, clientSecret } = await getContaAzulCredentials();

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://auth.contaazul.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao renovar token Conta Azul: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const expiresAt = Date.now() + (data.expires_in * 1000);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
  };
}

export async function contaAzulRequest(path: string, accessToken: string, method = 'GET', body?: any) {
  const { baseUrl } = await getContaAzulCredentials();
  const url = `${baseUrl}${path}`;

  const headers: HeadersInit = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'OikoStudio/1.0',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Conta Azul API Error [${method} ${path}]: ${response.status} - ${errText}`);
  }

  return response.json();
}

function normalizeStatus(status: string): 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' {
  if (!status) return 'PENDING';
  const s = status.toUpperCase();
  if (s === 'BAIXADO' || s === 'PAID' || s === 'PAGO' || s === 'RECEBIDO') return 'PAID';
  if (s === 'ATRASADO' || s === 'OVERDUE' || s === 'VENCIDO') return 'OVERDUE';
  if (s === 'CANCELADO' || s === 'CANCELLED') return 'CANCELLED';
  return 'PENDING';
}

export async function getFinancialEntries(
  accessToken: string,
  params: { startDate: string; endDate: string; page?: number }
): Promise<any[]> {
  const { startDate, endDate, page = 0 } = params;
  
  // O Conta Azul usa paginação de base 1
  const apiPage = typeof page === 'number' ? (page < 1 ? page + 1 : page) : 1;
  
  try {
    const receivables = await contaAzulRequest(
      `/v1/receitas?data_vencimento_de=${startDate}&data_vencimento_ate=${endDate}&pagina=${apiPage}&tamanho_pagina=100`,
      accessToken
    );
    const payables = await contaAzulRequest(
      `/v1/despesas?data_vencimento_de=${startDate}&data_vencimento_ate=${endDate}&pagina=${apiPage}&tamanho_pagina=100`,
      accessToken
    );
    
    const receivablesData = Array.isArray(receivables)
      ? receivables
      : (receivables?.itens || receivables?.items || []);

    const normalizedReceivables = receivablesData.map((r: any) => {
      const id = r.id;
      const type = 'RECEIVABLE';
      const description = r.descricao || r.description || '';
      const amount = typeof r.valor === 'number' ? r.valor : (typeof r.value === 'number' ? r.value : 0);
      const dueDate = r.data_vencimento || r.due_date || '';
      const status = normalizeStatus(r.situacao || r.status);
      const category = r.categoria?.nome || r.category_name || r.category || '';
      const contactName = r.cliente?.nome || r.customer_name || r.contact_name || '';
      const paymentDate = r.data_pagamento || r.payment_date || null;
      
      return { id, type, description, amount, dueDate, status, category, contactName, paymentDate };
    });

    const payablesData = Array.isArray(payables)
      ? payables
      : (payables?.itens || payables?.items || []);

    const normalizedPayables = payablesData.map((p: any) => {
      const id = p.id;
      const type = 'PAYABLE';
      const description = p.descricao || p.description || '';
      const amount = typeof p.valor === 'number' ? p.valor : (typeof p.value === 'number' ? p.value : 0);
      const dueDate = p.data_vencimento || p.due_date || '';
      const status = normalizeStatus(p.situacao || p.status);
      const category = p.categoria?.nome || p.category_name || p.category || '';
      const contactName = p.fornecedor?.nome || p.supplier_name || p.contact_name || '';
      const paymentDate = p.data_pagamento || p.payment_date || null;
      
      return { id, type, description, amount, dueDate, status, category, contactName, paymentDate };
    });

    return [...normalizedReceivables, ...normalizedPayables];
  } catch (error) {
    console.error('Erro ao buscar lançamentos Conta Azul:', error);
    throw error;
  }
}

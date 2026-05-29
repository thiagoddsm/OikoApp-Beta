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

export function getAuthorizationUrl(): string {
  const clientId = process.env.CONTA_AZUL_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.CONTA_AZUL_REDIRECT_URI || '');
  const state = 'oiko-auth-state'; // Pode ser gerado randomicamente
  return `https://auth.contaazul.com/login?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=openid+profile+aws.cognito.signin.user.admin`;
}

export async function exchangeCodeForToken(code: string): Promise<ContaAzulToken> {
  const clientId = process.env.CONTA_AZUL_CLIENT_ID;
  const clientSecret = process.env.CONTA_AZUL_CLIENT_SECRET;
  const redirectUri = process.env.CONTA_AZUL_REDIRECT_URI || '';

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://auth.contaazul.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
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
  const clientId = process.env.CONTA_AZUL_CLIENT_ID;
  const clientSecret = process.env.CONTA_AZUL_CLIENT_SECRET;

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://auth.contaazul.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
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
  const baseUrl = process.env.CONTA_AZUL_BASE_URL || 'https://api-v2.contaazul.com';
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

export async function getFinancialEntries(
  accessToken: string,
  params: { startDate: string; endDate: string; page?: number }
): Promise<any[]> {
  const { startDate, endDate, page = 1 } = params;
  // Endpoint de lançamentos financeiros
  // Documentação v2: GET /v1/financial-receivables e GET /v1/financial-payables
  // Nota: A API v2 unifica e simplifica alguns endpoints, mas mantemos buscas estruturadas.
  // Vamos buscar contas a receber e contas a pagar.
  
  try {
    const receivables = await contaAzulRequest(`/v1/financial-receivables?start_date=${startDate}&end_date=${endDate}&page=${page}`, accessToken);
    const payables = await contaAzulRequest(`/v1/financial-payables?start_date=${startDate}&end_date=${endDate}&page=${page}`, accessToken);
    
    const normalizedReceivables = (receivables || []).map((r: any) => ({
      id: r.id,
      type: 'RECEIVABLE',
      description: r.description,
      amount: r.value,
      dueDate: r.due_date,
      status: r.status, // PENDING, PAID, OVERDUE, CANCELLED
      category: r.category_name,
      contactName: r.customer_name,
      paymentDate: r.payment_date || null
    }));

    const normalizedPayables = (payables || []).map((p: any) => ({
      id: p.id,
      type: 'PAYABLE',
      description: p.description,
      amount: p.value,
      dueDate: p.due_date,
      status: p.status,
      category: p.category_name,
      contactName: p.supplier_name,
      paymentDate: p.payment_date || null
    }));

    return [...normalizedReceivables, ...normalizedPayables];
  } catch (error) {
    console.error('Erro ao buscar lançamentos Conta Azul:', error);
    throw error;
  }
}

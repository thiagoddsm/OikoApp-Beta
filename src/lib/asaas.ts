// Cliente HTTP centralizado para a API do Asaas
import { getAdminDb } from '@/lib/firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

export interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  externalReference?: string;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED';
  value: number;
  dueDate: string;
  status: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  description?: string;
  externalReference?: string;
  pixQrCode?: AsaasPixQrCode;
}

export interface AsaasPixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

interface AsaasListResponse<T> {
  object: string;
  hasMore: boolean;
  totalCount: number;
  limit: number;
  offset: number;
  data: T[];
}

/**
 * Obtém as credenciais do Asaas dinamicamente de 3 fontes redundantes.
 */
async function getAsaasCredentials(): Promise<{ apiKey: string; baseUrl: string }> {
  // 1. Forçar carregamento do .env do projeto
  try {
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  } catch (e) {
    // ignore
  }

  // 2. Tentar ler do Firestore
  try {
    const db = getAdminDb();
    const snap = await db.collection('system_settings').doc('finance').get();
    
    if (snap.exists) {
      const data = snap.data()!;
      if (data.asaasApiKey) {
        return {
          apiKey: data.asaasApiKey,
          baseUrl: data.asaasBaseUrl || 'https://api.asaas.com/v3'
        };
      }
    }
  } catch (error) {
    console.warn('[Asaas Config] Não foi possível ler credenciais do Firestore. Tentando fallback para .env.', error);
  }

  // 3. Fallback para variáveis de ambiente locais
  const envKey = process.env.ASAAS_API_KEY || '';
  const envUrl = process.env.ASAAS_BASE_URL || 'https://api.asaas.com/v3';

  return {
    apiKey: envKey,
    baseUrl: envUrl
  };
}

async function asaasRequest<T = unknown>(
  path: string,
  method: 'GET' | 'POST' | 'DELETE' | 'PUT' = 'GET',
  body?: object
): Promise<T> {
  const { apiKey, baseUrl } = await getAsaasCredentials();

  // Se mesmo com os fallbacks a chave estiver em branco, vamos avisar de forma detalhada
  if (!apiKey || apiKey.includes('COLE_AQUI')) {
    throw new Error('Chave de API do Asaas não configurada. Salve-a na aba financeira de configurações ou no .env');
  }

  const url = `${baseUrl}${path}`;
  const headers: HeadersInit = {
    'access_token': apiKey,
    'Content-Type': 'application/json',
    'User-Agent': 'OikoStudio/1.0',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET' && method !== 'DELETE') {
    options.body = JSON.stringify(body);
  }

  // Desativa cache nativo do Next.js para garantir chamadas dinâmicas
  if (options.headers) {
    (options as any).next = { revalidate: 0 };
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    let errorBody = '';
    try {
      errorBody = await response.text();
    } catch {
      // ignore
    }
    throw new Error(
      `Asaas API error: ${response.status} ${response.statusText} — ${errorBody}`
    );
  }

  if (method === 'DELETE') {
    try {
      return (await response.json()) as T;
    } catch {
      return {} as T;
    }
  }

  return response.json() as Promise<T>;
}

export async function findOrCreateCustomer(data: {
  name: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  externalReference: string;
}): Promise<AsaasCustomer> {
  // O Asaas exige CPF/CNPJ limpo (apenas números) para a busca
  const cleanCpfCnpj = data.cpfCnpj ? data.cpfCnpj.replace(/\D/g, '') : '';
  
  if (cleanCpfCnpj) {
    const searchResult = await asaasRequest<AsaasListResponse<AsaasCustomer>>(
      `/customers?cpfCnpj=${cleanCpfCnpj}&limit=1`
    );
    if (searchResult.data && searchResult.data.length > 0) {
      return searchResult.data[0];
    }
  }

  // Busca secundária por externalReference
  const searchResultRef = await asaasRequest<AsaasListResponse<AsaasCustomer>>(
    `/customers?externalReference=${encodeURIComponent(data.externalReference)}&limit=1`
  );

  if (searchResultRef.data && searchResultRef.data.length > 0) {
    return searchResultRef.data[0];
  }

  // Não encontrado — cria novo cliente
  const customer = await asaasRequest<AsaasCustomer>('/customers', 'POST', {
    name: data.name,
    cpfCnpj: cleanCpfCnpj || undefined,
    email: data.email || undefined,
    phone: data.phone || undefined,
    externalReference: data.externalReference,
  });

  return customer;
}

export async function createPayment(data: {
  customerId: string;
  billingType: string;
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
}): Promise<AsaasPayment> {
  // Asaas espera o campo 'customer' com o ID do cliente
  return asaasRequest<AsaasPayment>('/payments', 'POST', {
    customer: data.customerId,
    billingType: data.billingType,
    value: data.value,
    dueDate: data.dueDate,
    description: data.description,
    externalReference: data.externalReference,
    installmentCount: data.installmentCount,
    installmentValue: data.installmentValue,
  });
}

export async function getPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasRequest<AsaasPayment>(`/payments/${paymentId}`);
}

export async function getPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
  return asaasRequest<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`);
}

export async function listPayments(
  externalReference: string
): Promise<AsaasListResponse<AsaasPayment>> {
  return asaasRequest<AsaasListResponse<AsaasPayment>>(
    `/payments?externalReference=${encodeURIComponent(externalReference)}`
  );
}

export async function cancelPayment(paymentId: string): Promise<{ deleted: boolean }> {
  return asaasRequest<{ deleted: boolean }>(`/payments/${paymentId}`, 'DELETE');
}

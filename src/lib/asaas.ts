// Cliente HTTP centralizado para a API do Asaas
import { getAdminDb } from '@/lib/firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { decrypt } from '@/lib/encryption';

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
 * Prioridade: 1) Tenant (Igreja local) 2) System_settings (Oiko Root) 3) .env
 */
async function getAsaasCredentials(tenantId?: string): Promise<{ apiKey: string; baseUrl: string }> {
  try {
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  } catch (e) {
    // ignore
  }

  try {
    const db = getAdminDb();
    
    // 1. Tenta buscar a API Key específica da Igreja (Tenant)
    if (tenantId) {
      const tenantSnap = await db.collection('tenants').doc(tenantId).get();
      if (tenantSnap.exists) {
        const tenantData = tenantSnap.data();
        if (tenantData?.asaasApiKey) {
          const decryptedKey = decrypt(tenantData.asaasApiKey);
          const isProd = decryptedKey.startsWith('$aact_prod_');
          return {
            apiKey: decryptedKey,
            baseUrl: isProd ? 'https://api.asaas.com/v3' : (tenantData.asaasBaseUrl || (tenantData.asaasEnv === 'sandbox' ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3'))
          };
        }
      }
    }

    // 2. Fallback para configuração global (legado/root)
    const snap = await db.collection('system_settings').doc('finance').get();
    
    if (snap.exists) {
      const data = snap.data()!;
      if (data.asaasApiKey) {
        const decryptedKey = decrypt(data.asaasApiKey);
        const isProd = decryptedKey.startsWith('$aact_prod_');
        return {
          apiKey: decryptedKey,
          baseUrl: isProd ? 'https://api.asaas.com/v3' : (data.asaasBaseUrl || 'https://api.asaas.com/v3')
        };
      }
    }
  } catch (error) {
    console.warn('[Asaas Config] Não foi possível ler credenciais do Firestore. Tentando fallback para .env.', error);
  }

  const envKey = process.env.ASAAS_API_KEY || '';
  const isProd = envKey.startsWith('$aact_prod_');
  const envUrl = isProd ? 'https://api.asaas.com/v3' : (process.env.ASAAS_BASE_URL || 'https://api.asaas.com/v3');

  return {
    apiKey: envKey,
    baseUrl: envUrl
  };
}

async function asaasRequest<T = unknown>(
  path: string,
  method: 'GET' | 'POST' | 'DELETE' | 'PUT' = 'GET',
  body?: object,
  tenantId?: string
): Promise<T> {
  const { apiKey, baseUrl } = await getAsaasCredentials(tenantId);

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
  externalReference?: string;
  tenantId?: string;
}): Promise<AsaasCustomer> {
  const cleanCpfCnpj = data.cpfCnpj ? data.cpfCnpj.replace(/\D/g, '') : '';
  
  if (cleanCpfCnpj) {
    const searchResult = await asaasRequest<AsaasListResponse<AsaasCustomer>>(
      `/customers?cpfCnpj=${cleanCpfCnpj}&limit=1`,
      'GET',
      undefined,
      data.tenantId // Bug fix: passar tenantId para usar a API key correta do tenant
    );
    if (searchResult.data && searchResult.data.length > 0) {
      return searchResult.data[0];
    }
  }

  const hasValidRef = data.externalReference && data.externalReference !== 'anonymous';

  if (hasValidRef) {
    const searchResultRef = await asaasRequest<AsaasListResponse<AsaasCustomer>>(
      `/customers?externalReference=${encodeURIComponent(data.externalReference!)}&limit=1`,
      'GET',
      undefined,
      data.tenantId // Bug fix: passar tenantId para usar a API key correta do tenant
    );

    if (searchResultRef.data && searchResultRef.data.length > 0) {
      return searchResultRef.data[0];
    }
  }

  const customer = await asaasRequest<AsaasCustomer>('/customers', 'POST', {
    name: data.name,
    cpfCnpj: cleanCpfCnpj || undefined,
    email: data.email || undefined,
    phone: data.phone || undefined,
    externalReference: hasValidRef ? data.externalReference : undefined,
  }, data.tenantId);

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
  tenantId?: string;
}): Promise<AsaasPayment> {
  const payload: any = {
    customer: data.customerId,
    billingType: data.billingType,
    dueDate: data.dueDate,
    description: data.description,
    externalReference: data.externalReference,
  };

  // REGRA DO ASAAS: Se for parcelado, não pode enviar o campo 'value'
  // Deve enviar 'totalValue' e 'installmentCount'
  if (data.installmentCount && data.installmentCount > 1) {
    payload.totalValue = data.value;
    payload.installmentCount = data.installmentCount;
  } else {
    payload.value = data.value;
  }

  return asaasRequest<AsaasPayment>('/payments', 'POST', payload, data.tenantId);
}

export async function getPayment(paymentId: string, tenantId?: string): Promise<AsaasPayment> {
  return asaasRequest<AsaasPayment>(`/payments/${paymentId}`, 'GET', undefined, tenantId);
}

export async function getPixQrCode(paymentId: string, tenantId?: string): Promise<AsaasPixQrCode> {
  return asaasRequest<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`, 'GET', undefined, tenantId);
}

export async function listPayments(
  externalReference: string,
  tenantId?: string
): Promise<AsaasListResponse<AsaasPayment>> {
  return asaasRequest<AsaasListResponse<AsaasPayment>>(
    `/payments?externalReference=${encodeURIComponent(externalReference)}`,
    'GET', undefined, tenantId
  );
}

export async function cancelPayment(paymentId: string, tenantId?: string): Promise<{ deleted: boolean }> {
  return asaasRequest<{ deleted: boolean }>(`/payments/${paymentId}`, 'DELETE', undefined, tenantId);
}

/**
 * Cria uma nova Assinatura recorrente no Asaas.
 */
export async function createSubscription(data: {
  customerId: string;
  billingType: string;
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  cycle?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  tenantId?: string;
}): Promise<any> {
  return asaasRequest<any>('/subscriptions', 'POST', {
    customer: data.customerId,
    billingType: data.billingType,
    value: data.value,
    nextDueDate: data.dueDate,
    cycle: data.cycle || 'MONTHLY',
    description: data.description,
    externalReference: data.externalReference,
  }, data.tenantId);
}


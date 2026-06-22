export type Tenant = {
  id: string;
  name: string;
  domain?: string;
  asaasApiKey?: string;
  asaasWalletId?: string;
  asaasWebhookToken?: string;
  asaasBaseUrl?: string;
  asaasEnv?: 'sandbox' | 'production';
  createdAt: Date;
  status: 'active' | 'inactive' | 'suspended';
  config?: {
    features?: string[];
    maxMembers?: number;
  };
};

export type TenantMembership = {
  userId: string;
  tenantId: string;
  role: 'owner' | 'admin' | 'pastor' | 'leader' | 'member';
  joinedAt: Date;
};

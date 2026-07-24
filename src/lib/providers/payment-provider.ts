export interface CreateChargeRequest {
  tenantId: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  cpfCnpj?: string;
  amount: number;
  dueDate: string;
  description: string;
  idempotencyKey?: string;
}

export interface ChargeResult {
  chargeId: string;
  status: 'PENDING' | 'RECEIVED' | 'OVERDUE' | 'FAILED';
  invoiceUrl?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
}

/**
 * Domain PaymentProvider Abstraction Interface.
 * Decouples core payment rules from specific gateways (Asaas, Stripe, Pagar.me).
 */
export interface PaymentProvider {
  createCharge(request: CreateChargeRequest): Promise<ChargeResult>;
  cancelCharge(tenantId: string, chargeId: string): Promise<boolean>;
  getChargeStatus(tenantId: string, chargeId: string): Promise<ChargeResult>;
}

export interface FinancialPlan {
  id: string;
  tenantId?: string;
  programId?: string;
  courseId?: string;
  name: string; // Ex: "Plano Padrão DIS 2026 - R$85/mês"
  amount: number;
  installments: number; // 6 parcelas
  dueDay: number; // dia 10
  allowedPaymentMethods: ('pix' | 'boleto' | 'cartao' | 'dinheiro')[];
  lateFeePercent?: number;
  createdAt?: string;
}

export interface TuitionFee {
  id: string;
  tenantId?: string;
  enrollmentId?: string;
  financialPlanId?: string;
  studentId?: string;
  studentName: string;
  courseName: string;
  amount: number;
  competence: string; // "2026-08"
  dueDate: string;
  status: 'pago' | 'em_aberto' | 'isento' | 'bolsa' | 'cancelado';
  paymentMethod?: string;
  paidAt?: string;
  asaasPaymentId?: string;
}

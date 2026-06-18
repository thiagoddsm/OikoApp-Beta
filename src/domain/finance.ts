import { Timestamp } from 'firebase/firestore';

export type FinanceRequest = {
  id: string;
  requesterName: string;
  email: string;
  phone?: string;
  category: string;
  description: string;
  amount: number;
  objective: 'reembolso' | 'pagamento' | 'prestacao_contas';
  pixKey?: string;
  dueDate?: string;
  purchaseLink?: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  rejectionReason?: string;
  createdAt: Timestamp;
  attachmentUrl?: string;
  tenantId?: string;
};

export type FinancialTransaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: Timestamp;
  description: string;
  status: 'paid' | 'pending';
  memberId?: string;
  paymentMethod?: string;
  tenantId?: string;
};

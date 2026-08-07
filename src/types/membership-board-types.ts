export type FilterCategory =
  | 'membresia'
  | 'eventos'
  | 'ensino'
  | 'pequenos_grupos'
  | 'ministerios'
  | 'financeiro'
  | 'discipulado';

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'between_dates'
  | 'is_active';

export interface FilterRuleBlock {
  id: string;
  category: FilterCategory;
  field: string;
  operator: FilterOperator;
  value: any;
  logicalOperator: 'AND' | 'OR';
  isNegated?: boolean; // Se verdadeiro, EXCLUI/DESCONSIDERA as pessoas que atenderem a essa regra
}

export interface MembershipBoardConfig {
  id: string;
  tenantId?: string;
  title: string;
  description?: string;
  backgroundColor: string; // Cor do corpo do cartão (hex, tailwind ou preset)
  footerColor: string;     // Cor do rodapé do cartão (hex, tailwind ou preset)
  textColor: string;       // Cor do texto principal (hex)
  footerTextColor: string; // Cor do texto do rodapé (hex)
  icon: string;            // Nome do ícone Lucide (ex: 'Users', 'GraduationCap', etc.)
  order: number;
  isVisibleInDashboard: boolean;
  isVisibleInApp: boolean;
  rules: FilterRuleBlock[];
  cachedTotalCount?: number;
  lastCalculatedAt?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface FilterFieldOption {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select';
  options?: { label: string; value: string }[];
}

export const CATEGORY_LABELS: Record<FilterCategory, { label: string; color: string; icon: string }> = {
  membresia: { label: 'Membresia & Cadastro', color: 'bg-blue-500', icon: 'Users' },
  eventos: { label: 'Eventos & Inscrições', color: 'bg-amber-500', icon: 'Calendar' },
  ensino: { label: 'Ensino & Cursos', color: 'bg-indigo-500', icon: 'GraduationCap' },
  pequenos_grupos: { label: 'Pequenos Grupos (GCs)', color: 'bg-emerald-500', icon: 'Home' },
  ministerios: { label: 'Ministérios & Voluntariado', color: 'bg-rose-500', icon: 'Heart' },
  financeiro: { label: 'Financeiro & Contribuições', color: 'bg-teal-500', icon: 'DollarSign' },
  discipulado: { label: 'Discipulado & Trilhos', color: 'bg-purple-500', icon: 'Flame' },
};

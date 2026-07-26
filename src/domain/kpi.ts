export type KpiCategory = 'ensino' | 'gc' | 'culto' | 'crescimento' | 'lideranca' | 'custom';

export type KpiDataSourceType =
  | 'collection_count'  // Contagem de documentos
  | 'field_sum'          // Soma de um campo numérico
  | 'course_completion'  // Aprovados em um curso específico
  | 'user_role'          // Usuários com role(s) específica(s)
  | 'user_field'         // Usuários com campo igual a valor
  | 'attendance_avg'     // Média de frequência de cultos
  | 'manual';            // Entrada manual

export interface KpiDataSource {
  type: KpiDataSourceType;
  collectionName?: string;
  field?: string;
  value?: any;
  courseId?: string;
  courseName?: string; // Busca por nome/slug (fuzzy)
  roles?: string[];
  horario?: string;
}

export interface KpiTemplate {
  id: string;
  name: string;
  description?: string;
  iconName: string;
  category: KpiCategory;
  defaultDataSource: KpiDataSource;
  isSystemDefault?: boolean;
}

export interface KpiDefinition {
  id: string;
  tenantId?: string;
  templateId?: string | null;
  name: string;
  description?: string;
  iconName: string;
  category: KpiCategory;
  dataSource: KpiDataSource;
  active: boolean;
  order?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface Goal {
  id: string;
  tenantId?: string;
  kpiId: string;
  year: number;
  target: number;
  monthlyTargets?: number[];
  monthlyActuals?: number[];
  updatedAt?: any;
}

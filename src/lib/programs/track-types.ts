export type ProgressionModel = 'sequential' | 'free' | 'cohort' | 'independent';

export interface TeachingTrack {
  id: string;
  tenantId?: string;
  programId: string;
  academicCycleId?: string;
  name: string; // Ex: "Trilho Teológico", "Trilho Bíblico", "Formação em Libras"
  description?: string;
  progressionModel: ProgressionModel;
  certificateTemplateId?: string;
  order?: number;
}

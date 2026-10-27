export interface JourneyStage {
  id: string;
  tenantId: string; // Pode ser 'default' para fallback
  name: string;
  order: number;
  color: string;
  automationsEnabled: boolean;
  description?: string;
  profile?: string;
  characteristic?: string;
  steps?: string[];
  stepLinks?: Record<number, string>;
}

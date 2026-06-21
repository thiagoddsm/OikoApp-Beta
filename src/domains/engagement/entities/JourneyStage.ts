export interface JourneyStage {
  id: string;
  tenantId: string; // Pode ser 'default' para fallback
  name: string;
  order: number;
  color: string;
  automationsEnabled: boolean;
}

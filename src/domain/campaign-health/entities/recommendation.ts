export type RecommendationSeverity = 'info' | 'warning' | 'critical';

export type ActionType = 
  | 'split_batches' 
  | 'generate_versions' 
  | 'increase_delays' 
  | 'set_mode_conservative'
  | 'remove_links'
  | 'reduce_cold_contacts';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  severity: RecommendationSeverity;
  canAutoApply: boolean;
  actionType: ActionType;
  payload?: any;
}

export type AutomationActionType = 'CREATE_TASK' | 'SEND_WHATSAPP' | 'MOVE_STAGE' | 'NOTIFY_LEADER';

export interface AutomationCondition {
  field: string; // ex: 'metadata.visitCount'
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

export interface AutomationRule {
  id: string;
  tenantId: string;
  name: string;
  triggerEvent: string; // IF (ex: 'member_visited_church')
  conditions?: AutomationCondition[]; // AND
  actionType: AutomationActionType; // THEN
  actionPayload: Record<string, any>; // ex: { taskTitle: 'Ligar para visitante', assignToRole: 'GC_LEADER' }
  isActive: boolean;
  createdAt: string;
}

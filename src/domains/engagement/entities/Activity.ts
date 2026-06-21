export type ActivitySource = 'system' | 'manual' | 'automation' | 'external_api' | 'education' | 'finance' | 'gc' | 'events' | 'people';

export interface ActivityContext {
  [key: string]: any;
}

export interface ActivityActor {
  type: 'system' | 'user' | 'member' | 'teacher' | 'leader';
  id: string;
  name?: string;
}

export interface Activity {
  id: string;
  tenantId: string;
  memberId: string;
  type: string; // Ex: 'member_visited_church', 'member_joined_cell', 'course_completed', 'payment_approved', 'stage_changed'
  source: ActivitySource;
  context?: ActivityContext; // Ex: { courseId: '...', cellId: '...', eventId: '...' }
  actor: ActivityActor;
  metadata?: Record<string, any>; // Ex: { score: 9.4, oldStage: 'visitor', newStage: 'member' }
  createdAt: string;
}

export type AttendanceMode = 'none' | 'manual' | 'electronic' | 'automatic';

export type CapabilityId = 
  | 'electronic_point'
  | 'replacement_queue'
  | 'financial'
  | 'room_allocation'
  | 'quizzes'
  | 'streaming'
  | 'certificates'
  | 'grading'
  | 'materials';

export interface CapabilityMetadata {
  id: CapabilityId;
  label: string;
  description: string;
  category: 'attendance' | 'academic' | 'financial' | 'media';
  premium?: boolean;
}

export interface TeachingProgram {
  id: string;
  module: 'teaching';
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  capabilities: CapabilityId[];
  attendanceMode: AttendanceMode;
  order: number;
  archived?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface CourseBillingConfig {
  enabled: boolean;
  model: 'free' | 'monthly' | 'one_time' | 'subscription';
  price: number;
  enrollmentFee?: number;
  currency: string;
  gateway?: string;
}

export interface EffectiveCapabilities {
  capabilities: CapabilityId[];
  attendanceMode: AttendanceMode;
}

export * from './academic-cycle-types';
export * from './track-types';
export * from './enrollment-types';
export * from './learning-session-types';
export * from '../finance/financial-plan-types';

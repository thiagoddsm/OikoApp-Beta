export type AcademicEventType = 'ENROLLED' | 'PROMOTED' | 'RETAINED' | 'DROPPED' | 'TRANSFERRED' | 'REOPENED' | 'COMPLETED';

export interface AcademicEvent {
  id: string;
  eventType: AcademicEventType;
  fromClassId?: string;
  toClassId?: string;
  date: string;
  byUserId: string;
  byUserName?: string;
  observation?: string;
}

export interface AcademicEnrollment {
  id: string;
  tenantId?: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  programId: string;
  academicCycleId?: string;
  trackId?: string;
  courseId: string;
  classId: string;
  status: 'ativa' | 'trancada' | 'concluida' | 'promovida' | 'cancelada';
  enrolledAt: string;
  completedAt?: string;
  
  // Consolidations
  financial?: {
    financialPlanId?: string;
    tuitionValue: number;
    discountPercent: number;
    scholarship: boolean;
    paymentDay: number;
  };
  attendance?: {
    totalClasses: number;
    attendedClasses: number;
    percentage: number;
  };
  grades?: Record<string, number>;
  certificateUrl?: string;

  // Event Log
  events: AcademicEvent[];
}

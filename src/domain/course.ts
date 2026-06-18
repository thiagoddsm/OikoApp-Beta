export type Course = {
  id: string;
  name: string;
  description: string;
  ministryName: string;
  responsibleId?: string;
  type?: 'trilho' | 'eletivo';
  ebdTrack?: 'teologico' | 'biblico' | 'discipulado';
  linkedTheoflixId?: string;
  minAttendanceApproval?: number;
  syllabus?: { id: string; title: string; description: string; theoflixCourseId?: string }[];
  requiresMemberStatus?: boolean;
  requiresBaptism?: boolean;
  prerequisiteCourseId?: string;
  simultaneousClasses?: boolean;
  tenantId?: string;
};

export type Class = {
  id: string;
  courseId: string;
  name: string;
  teacherId: string;
  students: string[];
  maxStudents?: number;
  frequency: 'pontual' | 'semanal' | 'quinzenal' | 'mensal';
  startDate: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  dayOfWeek?: string;
  weekOfMonth?: '1' | '2' | '3' | '4' | 'last';
  locationId?: string;
  holidayDates?: string[];
  extraDates?: string[]; // Mantido para retrocompatibilidade
  cycle?: string; // Ciclo ou Edição da Turma
  extraSessions?: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    syllabusId?: string;
    isRepositionOnly?: boolean;
  }[];
  registrationDeadline?: string;
  attendance?: { 
    date: string; 
    presentStudentIds: string[]; 
    onlineStudentIds?: string[];
    repositions?: { studentId: string; date: string; dateStr?: string }[];
    isRepositionOnly?: boolean;
    lessonNotes?: string;
  }[];
  grades?: { studentId: string; assessmentName: string; grade: number }[];
  materials?: { title: string; url: string; description?: string }[];
  status?: 'active' | 'completed';
  scheduleOverrides?: Record<string, {
    syllabusId?: string;
    teacherId?: string;
    isCancelled?: boolean;
    notes?: string;
    originalDate?: string;
  }>;
  dailySlots?: {
    startTime: string;
    endTime: string;
  }[];
  tenantId?: string;
};

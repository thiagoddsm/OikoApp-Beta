export type SessionStatus = 'scheduled' | 'in_progress' | 'finished' | 'cancelled';

export type AttendanceStatus = 'present' | 'student_absent' | 'teacher_absent' | 'rescheduled' | 'pending';

export type AttachmentType = 'youtube' | 'pdf' | 'audio' | 'image' | 'drive' | 'midi' | 'link';

export interface SessionAttachment {
  id?: string;
  type: AttachmentType;
  url: string;
  title: string;
  mime?: string;
}

export interface HomeworkConfig {
  title?: string;
  description?: string;
  attachments?: SessionAttachment[];
}

export interface SessionDiary {
  content?: string;
  exercises?: string;
  notes?: string;
  nextActivity?: string;
  homework?: HomeworkConfig;
  updatedAt?: string;
}

export interface SessionAttendance {
  status: AttendanceStatus;
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface LearningSession {
  id: string;
  programId: string; // e.g. 'wave', 'dis', 'libras'
  courseId: string;
  classId?: string;
  teacherId: string;
  studentId?: string; // Para aulas individuais (Wave)
  studentIds?: string[]; // Para aulas em grupo
  title?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string; // HH:mm
  
  // Status operacional da aula
  status: SessionStatus;
  startedAt?: string; // ISO String (server timestamp)
  endedAt?: string;   // ISO String (server timestamp)
  durationMinutes?: number;

  // Diário e Presença Embutidos
  attendance?: SessionAttendance;
  diary?: SessionDiary;

  // Indicadores de Alertas e Pendências
  diaryCompleted?: boolean;
  attendanceCompleted?: boolean;
  hasHomework?: boolean;
  hasMakeup?: boolean;

  createdAt?: any;
  updatedAt?: any;
}

export interface WaveMakeupClass {
  id: string;
  originalSessionId: string;
  studentId: string;
  teacherId: string;
  reason: 'student_absent' | 'teacher_absent' | 'manual';
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  scheduledDate?: string;
  scheduledTime?: string;
  notes?: string;
  createdAt: any;
  updatedAt?: any;
}

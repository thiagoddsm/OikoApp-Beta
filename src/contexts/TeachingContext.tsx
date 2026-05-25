'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase, useDoc, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, addDoc, Timestamp, writeBatch, limit } from 'firebase/firestore';
import { parseISO, format, addWeeks, addMonths } from 'date-fns';

export interface Course {
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
}

export interface Class {
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
  extraDates?: string[];
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
    repositions?: { studentId: string; date: string }[];
    isRepositionOnly?: boolean;
    lessonNotes?: Record<string, string>;
  }[];
  grades?: { studentId: string; assessmentName: string; grade: number }[];
  materials?: { title: string; url: string; description?: string }[];
  scheduleOverrides?: Record<string, {
    syllabusId?: string;
    teacherId?: string;
    isCancelled?: boolean;
    notes?: string;
    originalDate?: string;
  }>;
}

export interface EnrollmentRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  courseId: string;
  classId?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
}

export interface PedagogicalLog {
  id: string;
  classId: string;
  date: Timestamp;
  content_taught: string;
  student_performance: number;
  observations: string;
  dateStr?: string;
  teacherId?: string;
  content?: string;
  createdAt?: Timestamp;
}

export interface WavePayment {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  month: string;
  status: 'paid' | 'pending' | 'overdue';
  splits?: { teacher: number; wave: number; ibm: number; admin: number };
}
export interface DisPayment {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  month: string;
  status: 'paid' | 'pending' | 'overdue';
  contaAzulInvoiceId?: string;
}
export interface WavePlan { id: string; name: string; price: number; }
export interface DisPlan { id: string; name: string; price: number; }
export interface WaveExpense { id: string; description: string; amount: number; date: Timestamp; receiptUrl?: string; }
export interface TheoflixCourse { id: string; title: string; description: string; totalEpisodes: number; }

export interface TeachingContextType {
  courses: Course[];
  classes: Class[];
  enrollmentRequests: EnrollmentRequest[];
  pedagogicalLogs: PedagogicalLog[];
  wavePayments: WavePayment[];
  disPayments: DisPayment[];
  wavePlans: WavePlan[];
  disPlans: DisPlan[];
  waveExpenses: WaveExpense[];
  theoflixCourses: TheoflixCourse[];
  isLoading: boolean;

  addCourse: (data: any) => Promise<void>;
  addClass: (data: any) => Promise<void>;
  updateClass: (id: string, data: any) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  enrollStudent: (studentId: string, courseId: string, classId?: string) => Promise<void>;
  addPedagogicalLog: (data: any) => Promise<void>;
  addWavePayment: (data: any) => Promise<void>;
  updateWavePayment: (id: string, data: any) => Promise<void>;
  deleteWavePayment: (id: string) => Promise<void>;
  addDisPayment: (data: any) => Promise<void>;
  updateDisPayment: (id: string, data: any) => Promise<void>;
  deleteDisPayment: (id: string) => Promise<void>;
  addWavePlan: (data: any) => Promise<void>;
  updateWavePlan: (id: string, data: any) => Promise<void>;
  deleteWavePlan: (id: string) => Promise<void>;
  addDisPlan: (data: any) => Promise<void>;
  updateDisPlan: (id: string, data: any) => Promise<void>;
  deleteDisPlan: (id: string) => Promise<void>;
  addWaveExpense: (data: any) => Promise<void>;
  updateWaveExpense: (id: string, data: any) => Promise<void>;
  deleteWaveExpense: (id: string) => Promise<void>;
  addEnrollmentRequest: (data: any) => Promise<void>;
  approveEnrollmentRequest: (requestId: string, classId: string) => Promise<void>;
  updateEnrollmentRequest: (requestId: string, data: any) => Promise<void>;
  deleteEnrollmentRequest: (requestId: string) => Promise<void>;
  markAttendanceByTheoflix: (userId: string, courseId: string, episodeIndex: number, lessonNotes?: string) => Promise<void>;
}

const TeachingContext = createContext<TeachingContextType | undefined>(undefined);

export function TeachingProvider({ children }: { children: ReactNode }) {
  const { firestore, user } = useFirebase();

  // Obter tenant, perfil e permissões
  const { data: userTenant } = useDoc<any>(user ? `userTenants/${user.uid}` : null);
  const tenantId = userTenant?.tenantId || 'ibm';
  const role = userTenant?.role || 'member';
  const isAdmin = role === 'admin' || role === 'pastor_senior';

  const { data: accessProfile } = useDoc<any>(user && role ? `access_profiles/${role}` : null);
  const permissions = accessProfile?.permissions || {};
  
  const can = (permId: string, action = 'view') => isAdmin || !!permissions?.[permId]?.[action];
  const roleResolved = !!userTenant;

  // Consultas do Firestore
  const coursesQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
  const classesQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'classes')) : null, [firestore]);
  
  const enrollmentRequestsQ = useMemoFirebase(() => 
    (firestore && user && roleResolved && can('teaching_courses')) ? query(collection(firestore, 'enrollment_requests')) : null, 
    [firestore, user, roleResolved, isAdmin, permissions]
  );
  
  const pedagogicalLogsQ = useMemoFirebase(() => {
    if (!firestore || !user || !roleResolved) return null;
    if (can('teaching_courses')) return query(collection(firestore, 'pedagogical_logs'));
    return query(collection(firestore, 'pedagogical_logs'), limit(20)); // Limita se não for admin
  }, [firestore, user, roleResolved, isAdmin, permissions]);

  const wavePlansQ = useMemoFirebase(() => (firestore && user && roleResolved) ? query(collection(firestore, 'wave_plans')) : null, [firestore, user, roleResolved]);
  const disPlansQ = useMemoFirebase(() => (firestore && user && roleResolved) ? query(collection(firestore, 'dis_plans')) : null, [firestore, user, roleResolved]);
  const wavePaymentsQ = useMemoFirebase(() => (firestore && user && roleResolved && can('teaching_wave', 'view_finance')) ? query(collection(firestore, 'wave_payments')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const disPaymentsQ = useMemoFirebase(() => (firestore && user && roleResolved && can('teaching_dis', 'view_finance')) ? query(collection(firestore, 'dis_payments')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const waveExpensesQ = useMemoFirebase(() => (firestore && user && roleResolved && can('teaching_wave', 'view_finance')) ? query(collection(firestore, 'wave_expenses')) : null, [firestore, user, roleResolved, isAdmin, permissions]);
  const theoflixCoursesQ = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'theoflix_courses')) : null, [firestore, user]);

  const { data: courses, isLoading: lc } = useCollection<Course>(coursesQ);
  const { data: classes, isLoading: lcls } = useCollection<Class>(classesQ);
  const { data: enrollmentRequests, isLoading: ler } = useCollection<EnrollmentRequest>(enrollmentRequestsQ);
  const { data: pedagogicalLogs, isLoading: lpl } = useCollection<PedagogicalLog>(pedagogicalLogsQ);
  const { data: wavePlans, isLoading: lwp } = useCollection<WavePlan>(wavePlansQ);
  const { data: disPlans, isLoading: ldp } = useCollection<DisPlan>(disPlansQ);
  const { data: wavePayments, isLoading: lwpm } = useCollection<WavePayment>(wavePaymentsQ);
  const { data: disPayments, isLoading: ldpm } = useCollection<DisPayment>(disPaymentsQ);
  const { data: waveExpenses, isLoading: lwe } = useCollection<WaveExpense>(waveExpensesQ);
  const { data: theoflixCourses, isLoading: ltfl } = useCollection<TheoflixCourse>(theoflixCoursesQ);

  const isLoading = lc || lcls || ler || lpl || lwp || ldp || lwpm || ldpm || lwe || ltfl;

  const actions = useMemo(() => ({
    addCourse: async (data: any) => { await addDoc(collection(firestore!, 'courses'), data); },
    addClass: async (data: any) => {
      const res = await addDoc(collection(firestore!, 'classes'), data);
      
      // Cria a reserva de sala correspondente caso tenha sala associada
      if (data.locationId && data.locationId !== 'the_school' && data.locationId !== 'null') {
        const roomsQ = query(collection(firestore!, 'rooms'));
        // Em vez de importar o VolunteerContext e criar dependência circular, lemos diretamente do firestore
        // Apenas adicionamos a reserva
        await addDoc(collection(firestore!, 'room_reservations'), {
          eventName: `Aulas: ${data.name}`,
          rooms: ['Sala'], // Fallback legível
          startDateTime: Timestamp.fromDate(new Date(`${data.startDate}T${data.startTime}`)),
          endDateTime: Timestamp.fromDate(new Date(`${data.startDate}T${data.endTime}`)),
          recurrenceEndDate: data.endDate ? Timestamp.fromDate(new Date(`${data.endDate}T23:59:59`)) : null,
          frequency: data.frequency,
          dayOfWeek: data.dayOfWeek,
          weekOfMonth: data.weekOfMonth,
          status: 'approved',
          requesterId: 'system',
          id: `class_res_${res.id}`,
          createdAt: Timestamp.now()
        });
      }
    },
    updateClass: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'classes', id), data); },
    deleteClass: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'classes', id)); },
    enrollStudent: async (studentId: string, courseId: string, classId?: string) => {
      if (classId) {
        const classRef = doc(firestore!, 'classes', classId);
        const cls = (classes || []).find(c => c.id === classId);
        if (cls && !cls.students.includes(studentId)) {
          await updateDocumentNonBlocking(classRef, { students: [...cls.students, studentId] });
        }
      } else {
        const relevantClasses = (classes || []).filter(c => c.courseId === courseId);
        if (relevantClasses.length === 1) {
          const cls = relevantClasses[0];
          if (!cls.students.includes(studentId)) {
            await updateDocumentNonBlocking(doc(firestore!, 'classes', cls.id), { students: [...cls.students, studentId] });
          }
        }
      }
    },
    addPedagogicalLog: async (data: any) => { await addDoc(collection(firestore!, 'pedagogical_logs'), data); },
    addWavePayment: async (data: any) => { await addDoc(collection(firestore!, 'wave_payments'), data); },
    updateWavePayment: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'wave_payments', id), data); },
    deleteWavePayment: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'wave_payments', id)); },
    addDisPayment: async (data: any) => { await addDoc(collection(firestore!, 'dis_payments'), data); },
    updateDisPayment: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'dis_payments', id), data); },
    deleteDisPayment: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'dis_payments', id)); },
    addWavePlan: async (data: any) => { await addDoc(collection(firestore!, 'wave_plans'), data); },
    updateWavePlan: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'wave_plans', id), data); },
    deleteWavePlan: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'wave_plans', id)); },
    addDisPlan: async (data: any) => { await addDoc(collection(firestore!, 'dis_plans'), data); },
    updateDisPlan: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'dis_plans', id), data); },
    deleteDisPlan: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'dis_plans', id)); },
    addWaveExpense: async (data: any) => { await addDoc(collection(firestore!, 'wave_expenses'), data); },
    updateWaveExpense: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'wave_expenses', id), data); },
    deleteWaveExpense: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'wave_expenses', id)); },
    addEnrollmentRequest: async (data: any) => { await addDoc(collection(firestore!, 'enrollment_requests'), data); },
    approveEnrollmentRequest: async (requestId: string, classId: string) => {
      const req = (enrollmentRequests || []).find(r => r.id === requestId);
      if (!req) return;
      const targetClass = (classes || []).find(c => c.id === classId);
      if (!targetClass) return;

      // Primeiro, tenta encontrar o usuário no Firestore legado
      // (Isso busca no Firestore que também reflete o SaaS)
      const usersSnap = await addDoc(collection(firestore!, 'users'), {
        name: req.name,
        email: req.email,
        phone: req.phone,
        integrationStatus: 'nao_alcancado',
        createdAt: Timestamp.now()
      });
      const studentId = usersSnap.id;

      // Cria a estrutura multi-tenant para o novo estudante
      const batch = writeBatch(firestore!);
      
      const userTenantData = {
        tenantId: tenantId,
        slug: tenantId,
        role: 'member',
        email: req.email,
        updatedAt: Timestamp.now()
      };
      batch.set(doc(firestore!, 'userTenants', studentId), userTenantData);

      const tenantUserData = {
        email: req.email,
        role: 'member',
        permissions: [],
        status: 'active',
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      batch.set(doc(firestore!, 'tenants', tenantId, 'users', studentId), tenantUserData);

      const nameParts = req.name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      const memberData = {
        id: studentId,
        tenantId: tenantId,
        basic: {
          firstName: firstName,
          lastName: lastName,
          cpf: '',
          sexo: '',
          dataNascimento: '',
          avatar: '',
          photoURL: '',
        },
        contact: {
          phone: req.phone,
          email: req.email
        },
        ministerial: {
          batizado: 'nao',
          integrationStatus: 'nao_alcancado',
        },
        services: {
          serviceStatus: 'not_serving',
        },
        family: {
          familyMembers: [],
        },
        journey: {},
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      batch.set(doc(firestore!, 'tenants', tenantId, 'members', studentId), memberData);

      await batch.commit();

      // Matricula
      await updateDocumentNonBlocking(doc(firestore!, 'classes', classId), { students: [...targetClass.students, studentId] });
      await updateDocumentNonBlocking(doc(firestore!, 'enrollment_requests', requestId), { status: 'approved' });
    },
    updateEnrollmentRequest: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'enrollment_requests', id), data); },
    deleteEnrollmentRequest: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'enrollment_requests', id)); },
    markAttendanceByTheoflix: async (userId: string, theoflixCourseId: string, episodeIndex: number, lessonNotes?: string) => {
      const episodeKey = episodeIndex.toString();

      // Helper: project the class schedule to find which calendar date corresponds to a given syllabus index
      const projectLessonDate = (cls: Class, syllabusIndex: number): string | null => {
        if (!cls.startDate) return null;

        const overrides = cls.scheduleOverrides || {};
        const holidaySet = new Set(cls.holidayDates || []);
        const start = parseISO(cls.startDate);
        const end = cls.endDate ? parseISO(cls.endDate) : addMonths(start, 6);

        // First check extra sessions for this specific syllabus module
        const syllabusId = (courses || []).find(c => c.id === cls.courseId)?.syllabus?.[syllabusIndex]?.id;
        if (syllabusId) {
          const extra = (cls.extraSessions || []).find(s => s.syllabusId === syllabusId);
          if (extra) return extra.date;
        }

        // Check schedule overrides for a date that points to this syllabus item
        if (syllabusId) {
          const overrideEntry = Object.entries(overrides).find(([, ov]: [string, any]) => ov.syllabusId === syllabusId && !ov.isCancelled);
          if (overrideEntry) return overrideEntry[0];
        }

        // Walk the weekly schedule to find the nth valid lesson date
        if (cls.frequency && cls.frequency !== 'pontual') {
          let current = start;
          let currentIndex = 0;
          let safe = 0;
          while (safe++ < 300) {
            if (current > end) break;
            const dStr = format(current, 'yyyy-MM-dd');
            const ov = overrides[dStr];

            // Skip holidays without override
            if (holidaySet.has(dStr) && !ov) {
              current = addWeeks(current, cls.frequency === 'quinzenal' ? 2 : 1);
              continue;
            }
            // Skip cancelled sessions
            if (ov?.isCancelled) {
              current = addWeeks(current, cls.frequency === 'quinzenal' ? 2 : 1);
              continue;
            }

            // If this date has an override pointing to a different syllabus, adjust expected index
            const effectiveIndex = ov?.syllabusId
              ? (courses || []).find(c => c.id === cls.courseId)?.syllabus?.findIndex((s: any) => s.id === ov.syllabusId) ?? currentIndex
              : currentIndex;

            if (effectiveIndex === syllabusIndex) return dStr;

            currentIndex++;
            current = addWeeks(current, cls.frequency === 'quinzenal' ? 2 : 1);
          }
        } else {
          // Pontual: only first session
          return syllabusIndex === 0 ? format(start, 'yyyy-MM-dd') : null;
        }

        return null;
      };

      const linkedCourses = (courses || []).filter(c =>
        c.id === theoflixCourseId ||
        c.linkedTheoflixId === theoflixCourseId ||
        c.syllabus?.some((s: any) => s.theoflixCourseId === theoflixCourseId)
      );
      const linkedCourseIds = linkedCourses.map(c => c.id);

      const relevantClasses = (classes || []).filter(c =>
        linkedCourseIds.includes(c.courseId) && c.students?.includes(userId)
      );

      for (const cls of relevantClasses) {
        const physicalCourse = linkedCourses.find(c => c.id === cls.courseId);
        const syllabus: any[] = physicalCourse?.syllabus || [];

        // Find the correct syllabus module: the one that lists this episode index in theoflixRequiredVideoIds
        let lessonIndex = syllabus.findIndex((s: any) =>
          s.theoflixCourseId === theoflixCourseId &&
          Array.isArray(s.theoflixRequiredVideoIds) &&
          s.theoflixRequiredVideoIds.includes(episodeKey)
        );

        // Fallback: if no specific mapping, use episode index directly (for direct-ID linked courses)
        if (lessonIndex === -1 && (physicalCourse?.id === theoflixCourseId || physicalCourse?.linkedTheoflixId === theoflixCourseId)) {
          lessonIndex = episodeIndex;
        }

        if (lessonIndex === -1) continue;

        // Project the calendar date for this lesson index
        const lessonDate = projectLessonDate(cls, lessonIndex);
        if (!lessonDate) continue;

        const classRef = doc(firestore!, 'classes', cls.id);
        const attendance = cls.attendance || [];
        const existingRecordIndex = attendance.findIndex((r: any) => r.date === lessonDate);
        const newAttendance = [...attendance];

        if (existingRecordIndex !== -1) {
          const record = newAttendance[existingRecordIndex];
          const online = record.onlineStudentIds || [];
          if (!online.includes(userId)) {
            newAttendance[existingRecordIndex] = {
              ...record,
              onlineStudentIds: [...online, userId],
              lessonNotes: {
                ...(record.lessonNotes || {}),
                [userId]: lessonNotes || 'Presença computada via TheoFlix'
              }
            };
          }
        } else {
          newAttendance.push({
            date: lessonDate,
            presentStudentIds: [],
            onlineStudentIds: [userId],
            lessonNotes: {
              [userId]: lessonNotes || 'Presença computada via TheoFlix'
            }
          });
        }

        await updateDocumentNonBlocking(classRef, { attendance: newAttendance });
      }
    }
  }), [firestore, courses, classes, enrollmentRequests, tenantId]);

  const value = useMemo(() => ({
    courses: courses || [],
    classes: classes || [],
    enrollmentRequests: enrollmentRequests || [],
    pedagogicalLogs: pedagogicalLogs || [],
    wavePayments: wavePayments || [],
    disPayments: disPayments || [],
    wavePlans: wavePlans || [],
    disPlans: disPlans || [],
    waveExpenses: waveExpenses || [],
    theoflixCourses: theoflixCourses || [],
    isLoading,
    ...actions
  }), [courses, classes, enrollmentRequests, pedagogicalLogs, wavePayments, disPayments, wavePlans, disPlans, waveExpenses, theoflixCourses, isLoading, actions]);

  return React.createElement(TeachingContext.Provider, { value }, children);
}

export function useTeaching() {
  const context = useContext(TeachingContext);
  if (context === undefined) {
    throw new Error('useTeaching must be used within a TeachingProvider');
  }
  return context;
}

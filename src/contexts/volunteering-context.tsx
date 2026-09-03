
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { format, addWeeks, addMonths, parseISO } from 'date-fns';
import { useFirebase, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, doc, Timestamp, addDoc, where, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { useTenant } from '@/contexts/tenant-context';

export type User = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  integrationStatus?: string;
  cpf?: string;
  sexo?: string;
  escolaridade?: string;
  profissao?: string;
  dataNascimento?: string;
  estadoCivil?: string;
  address?: {
    street?: string;
    cep?: string;
    location?: any;
  };
  hierarchy?: {
    role?: string;
    celulaId?: string;
    supervisorId?: string;
  };
  serviceStatus?: 'serving' | 'not_serving';
  serviceAreaId?: string;
  serviceAreaIds?: string[];
  serviceTeamId?: string;
  eligibleEventIds?: string[];
  blockedDates?: string[];
  lastServedDate?: Timestamp;
  isTeacher?: boolean;
  taughtCourseIds?: string[];
  financialStatus?: string;
  batizado?: 'sim' | 'nao';
  dataBatismo?: string;
  gcId?: string;
  igrejaBatismo?: string;
  membroAntigo?: 'sim' | 'nao';
  igrejaAntiga?: string;
  decisao?: string[];
  initialStatus?: string;
  dataDecisao?: string;
  absenceCount?: number;
  familyMembers?: { name: string; relation: string; userId?: string }[];
  journey?: {
    stageProgress?: Record<string, any>;
    memberCourseProgress?: Record<string, boolean>;
    theoflixProgress?: Record<string, Record<string, boolean>>;
    courseStatus?: Record<string, 'pending' | 'approved' | 'rejected'>;
  };
  worshipRoles?: string[];
  worshipAreaId?: string;
};

export type ServiceScheduleMode = 'unified' | 'individual' | 'grouped' | 'fixed_monthly';
export type AreaType = 'regular' | 'worship';

export type ServiceGroup = {
  name: string;
  eventIds: string[];
};

export type FifthWeekRotationItem = {
  id: string;
  label: string; // Ex: "1º Rodízio (Março / Abril)"
  months?: number[]; // [2, 3] etc. (0-indexed)
  slots: Record<string, string>; // eventId -> userId
};

export type FixedMonthlyPattern = {
  weeks: {
    1?: Record<string, string>; // eventId -> userId
    2?: Record<string, string>;
    3?: Record<string, string>;
    4?: Record<string, string>;
  };
  fifthWeekRotation?: FifthWeekRotationItem[];
};

export type AreaOfService = {
  id: string;
  name: string;
  areaType?: AreaType;
  leaderId?: string;
  leaderContact?: string;
  scheduleMode?: ServiceScheduleMode;
  serviceGroups?: ServiceGroup[];
  fixedMonthlyPattern?: FixedMonthlyPattern;
  roles?: string[];
  tenantId?: string;
  unifiedCelebrations?: boolean;
  unifiedGroups?: { name: string; eventNames: string[] }[];
};

export type Team = {
  id: string;
  name: string;
  areaId?: string;
  leaderId?: string;
  leaderContact?: string;
};

export type VolunteeringEvent = {
  id: string;
  name: string;
  time: string;
  date?: string;
  frequency?: 'semanal' | 'pontual' | 'quinzenal' | 'mensal';
  dayOfWeek?: string;
  weekOfMonth?: string;
  requiredAreas?: { areaId: string; quantity: number }[];
  room?: string;
};

export type ReservationCategory = {
  id: string;
  name: string;
};

export type Room = {
  id: string;
  name: string;
};

export type RoomReservation = {
  id: string;
  eventName: string;
  requesterId: string;
  rooms: string[];
  startDateTime: Timestamp;
  endDateTime: Timestamp;
  recurrenceEndDate?: Timestamp;
  notes?: string;
  equipmentNotes?: string;
  kitchenUsage?: boolean;
  requiredPatrimonyIds?: string[];
  status: 'pending' | 'approved' | 'rejected';
  frequency?: 'pontual' | 'semanal' | 'quinzenal' | 'mensal' | 'multiplas';
  dayOfWeek?: string;
  weekOfMonth?: '1' | '2' | '3' | '4' | 'last';
  createdAt?: Timestamp;
  categoryId?: string;
  specificDates?: string[];
};

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
  attendancePolicy?: CourseAttendancePolicy;
  syllabus?: { id: string; title: string; description: string; theoflixCourseId?: string }[];
  requiresMemberStatus?: boolean;
  requiresBaptism?: boolean;
  prerequisiteCourseId?: string;
  simultaneousClasses?: boolean;
  billingMethod?: 'manual' | 'asaas';
};

export type AttendanceModePolicy = 'in_person_only' | 'online_only' | 'hybrid' | 'flexible';

export interface CourseAttendancePolicy {
  mode: AttendanceModePolicy;
  online?: {
    minPercentage?: number;
    maxPercentage?: number;
  };
  inPerson?: {
    minPercentage?: number;
    maxPercentage?: number;
  };
  allowExceptions?: boolean;
}

export interface OnlineException {
  studentId: string;
  classId: string;
  courseId: string;
  reason: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  requestedBy: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
}

export type SavedSchedule = {
  id: string;
  areaId: string;
  month: string;
  schedule: {
    date: string;
    eventName: string;
    areaId: string;
    teamId: string | null;
    teamName: string | null;
    memberIds: string[];
  }[];
  confirmations?: Record<string, {
    status: 'pending' | 'confirmed' | 'declined';
    phone: string;
    updatedAt: Timestamp;
  }>;
  notificationSentAt?: Timestamp;
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
    repositions?: { studentId: string; date: string; dateStr?: string; type?: 'in_person' | 'online' }[];
    isRepositionOnly?: boolean;
    lessonNotes?: string;
  }[];
  grades?: { studentId: string; assessmentName: string; grade: number }[];
  materials?: { title: string; url: string; description?: string }[];
  status?: 'active' | 'completed';
  whatsappGroupId?: string;
  attendancePolicyOverride?: CourseAttendancePolicy;
  onlineExceptions?: Record<string, OnlineException>;
  scheduleOverrides?: Record<string, {
    syllabusId?: string;
    teacherId?: string;
    isCancelled?: boolean;
    notes?: string;
    originalDate?: string;
    startTime?: string;
    endTime?: string;
  }>;
  dailySlots?: {
    startTime: string;
    endTime: string;
  }[];
};

export type Area = { id: string; nome: string; liderId: string; redeId: string; };
export type Cell = { id: string; nome: string; liderId: string; areaId: string; redeId: string; membros: string[] };
export type Rede = { id: string; nome: string; liderId: string; pastorId: string; };

export const weekDayMap: Record<string, number> = {
    'domingo': 0,
    'segunda': 1,
    'terca': 2,
    'quarta': 3,
    'quinta': 4,
    'sexta': 5,
    'sabado': 6
};

// Helper: encontra o N-ésimo dia da semana de um mês (para frequência mensal)
// weekday: 0=domingo, 6=sábado. nthWeek: '1','2','3','4','5','last'
export function getNthWeekdayOfMonth(year: number, month: number, weekday: number, nthWeek: string): Date | null {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    if (nthWeek === 'last') {
        // Encontrar o último dia da semana desejado no mês
        let d = lastDay;
        while (d.getDay() !== weekday) {
            d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
        }
        return d;
    }

    const nth = parseInt(nthWeek, 10);
    if (isNaN(nth) || nth < 1 || nth > 5) return null;

    // Encontrar o primeiro dia da semana desejado no mês
    let d = firstDay;
    while (d.getDay() !== weekday) {
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    }

    // Avançar para a N-ésima ocorrência
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (nth - 1) * 7);
    
    // Verificar se ainda está no mesmo mês
    if (target.getMonth() !== month) return null;
    return target;
}

// Helper: gera todas as datas mensais de recorrência entre start e end
export function getMonthlyOccurrences(startDate: Date, endDate: Date, weekday: number, nthWeek: string): Date[] {
    const dates: Date[] = [];
    let year = startDate.getFullYear();
    let month = startDate.getMonth();

    for (let safe = 0; safe < 60; safe++) {
        const d = getNthWeekdayOfMonth(year, month, weekday, nthWeek);
        if (d && d >= startDate && d <= endDate) {
            dates.push(d);
        }
        month++;
        if (month > 11) { month = 0; year++; }
        if (new Date(year, month, 1) > endDate) break;
    }
    return dates;
}

// Helper: retorna o número de slots por ocorrência da turma
export function getSlotsPerOccurrence(classData: any): { startTime: string; endTime: string }[] {
    if (classData.dailySlots && classData.dailySlots.length > 1) {
        return classData.dailySlots;
    }
    return [{ startTime: classData.startTime, endTime: classData.endTime }];
}

export function getModuleIndexForDate(dateStr: string, classData: any, syllabus: any[] = []): number {
    if (!classData || !classData.startDate || !dateStr) return -1;
    
    // Normalizar dateStr para apenas YYYY-MM-DD para comparação de calendário regular
    const dateOnly = dateStr.split('T')[0];
    const timeOnly = dateStr.includes('T') ? dateStr.split('T')[1] : null;

    // 1. Verificar se é uma aula extra (novo modelo)
    // Tentar match exato com data e hora primeiro
    let extraSession = classData.extraSessions?.find((s: any) => `${s.date}T${s.startTime}` === dateStr);
    
    // Se não achou, tentar match por data se houver exatamente 1 extraSession ou se timeOnly bater com startTime
    if (!extraSession) {
        const sessionsOnDate = classData.extraSessions?.filter((s: any) => s.date === dateOnly);
        if (sessionsOnDate && sessionsOnDate.length === 1) {
            extraSession = sessionsOnDate[0];
        } else if (sessionsOnDate && sessionsOnDate.length > 1 && timeOnly) {
            extraSession = sessionsOnDate.find((s: any) => s.startTime === timeOnly);
        }
    }

    if (extraSession?.syllabusId) {
        return syllabus.findIndex((s: any) => s.id === extraSession.syllabusId);
    }

    // 2. Verificar se existe override para esta data específica (tentar com hora e sem hora)
    const overrides = classData.scheduleOverrides || {};
    const overrideKey = overrides[dateStr] ? dateStr : overrides[dateOnly] ? dateOnly : null;
    if (overrideKey) {
        const ov = overrides[overrideKey];
        if (ov.isCancelled) return -1;
        if (ov.syllabusId) {
            return syllabus.findIndex((s: any) => s.id === ov.syllabusId);
        }
    }

    const slots = getSlotsPerOccurrence(classData);
    const slotsPerDay = slots.length;

    // 3. Lógica de recorrência
    const start = parseISO(classData.startDate);
    const end = classData.endDate ? parseISO(classData.endDate) : addMonths(start, 12);
    const holidaySet = new Set(classData.holidayDates || []);

    if (classData.frequency === 'pontual') {
        // Pontual: verificar slots do dia único
        if (dateOnly !== format(start, 'yyyy-MM-dd')) return -1;
        if (slotsPerDay > 1 && timeOnly) {
            const slotIdx = slots.findIndex(s => s.startTime === timeOnly);
            return slotIdx >= 0 ? slotIdx : 0;
        }
        return 0;
    }

    // Gerar todas as datas de ocorrência
    let occurrenceDates: Date[] = [];

    if (classData.frequency === 'mensal' && classData.weekOfMonth && classData.dayOfWeek) {
        // Frequência mensal: usar helper
        const dayName = classData.dayOfWeek.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace('-feira', '');
        const weekday = weekDayMap[dayName] ?? 0;
        occurrenceDates = getMonthlyOccurrences(start, end, weekday, classData.weekOfMonth);
    } else {
        // Frequência semanal/quinzenal
        let current = start;
        let safe = 0;
        const step = classData.frequency === 'quinzenal' ? 2 : 1;
        while (safe++ < 300 && current <= end) {
            occurrenceDates.push(new Date(current));
            current = addWeeks(current, step);
        }
    }

    // Iterar sobre as ocorrências para encontrar o módulo
    let currentIndex = 0;
    for (const occDate of occurrenceDates) {
        const dStr = format(occDate, 'yyyy-MM-dd');

        // Pular feriado sem override
        if (holidaySet.has(dStr) && !overrides[dStr]) {
            continue;
        }

        // Verificar cancelamento
        if (overrides[dStr]?.isCancelled) {
            continue;
        }

        // Verificar cada slot do dia
        for (let slotIdx = 0; slotIdx < slotsPerDay; slotIdx++) {
            const slotKey = slotsPerDay > 1 ? `${dStr}T${slots[slotIdx].startTime}` : dStr;
            
            // Verificar override no nível do slot
            if (overrides[slotKey]?.isCancelled) {
                continue;
            }

            if (slotKey === dateStr || (slotsPerDay === 1 && dStr === dateOnly)) {
                // Override de syllabus no slot
                const slotOverride = overrides[slotKey];
                if (slotOverride?.syllabusId) {
                    return syllabus.findIndex((s: any) => s.id === slotOverride.syllabusId);
                }
                return currentIndex;
            }

            currentIndex++;
        }
    }

    return -1;
}

export function getResolvedSchedule(classData: any, courseData: any) {
    if (!classData) return [];
    
    const items: any[] = [];
    const startDateStr = classData.startDate || classData.createdAt || new Date().toISOString().split('T')[0];
    const start = parseISO(startDateStr);
    const holidaySet = new Set(classData.holidayDates || []);
    const overrides = classData.scheduleOverrides || {};
    const syllabus = courseData?.syllabus || [];
    const slots = getSlotsPerOccurrence(classData);
    const slotsPerDay = slots.length;

    // 1. Gerar todas as datas de ocorrência
    let occurrenceDates: Date[] = [];
    const end = classData.endDate ? parseISO(classData.endDate) : addMonths(start, 12);

    if (classData.frequency === 'pontual') {
        occurrenceDates = [start];
    } else if (classData.frequency === 'mensal' && classData.weekOfMonth && classData.dayOfWeek) {
        const dayName = classData.dayOfWeek.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace('-feira', '');
        const weekday = weekDayMap[dayName] ?? 0;
        occurrenceDates = getMonthlyOccurrences(start, end, weekday, classData.weekOfMonth);
    } else {
        // Semanal / Quinzenal
        let currentDate = start;
        let safeCounter = 0;
        const step = classData.frequency === 'quinzenal' ? 2 : 1;
        while (safeCounter++ < 300 && currentDate <= end) {
            occurrenceDates.push(new Date(currentDate));
            currentDate = addWeeks(currentDate, step);
        }
    }

    // 2. Gerar os itens do cronograma baseados nas ocorrências calculadas
    const targetCount = syllabus.length > 0 ? syllabus.length : 12;
    let syllabusIndex = 0;

    for (const occDate of occurrenceDates) {
        if (syllabusIndex >= targetCount) break;

        const dateStr = format(occDate, 'yyyy-MM-dd');
        
        // Pular se for feriado e não houver override forçando
        if (holidaySet.has(dateStr) && !overrides[dateStr]) {
            continue;
        }

        // Coletar overrides para este dia (principal e sufixados para aulas agrupadas, ex: YYYY-MM-DD, YYYY-MM-DD-1, YYYY-MM-DD-2)
        const dayOverridesForThisDate: { key: string; val: any }[] = [];
        if (overrides[dateStr]) {
            dayOverridesForThisDate.push({ key: dateStr, val: overrides[dateStr] });
        }
        let suffixIdx = 1;
        while (overrides[`${dateStr}-${suffixIdx}`]) {
            dayOverridesForThisDate.push({ key: `${dateStr}-${suffixIdx}`, val: overrides[`${dateStr}-${suffixIdx}`] });
            suffixIdx++;
        }

        // Se não houver overrides, usamos o comportamento padrão (aula regular)
        if (dayOverridesForThisDate.length === 0) {
            dayOverridesForThisDate.push({ key: dateStr, val: null });
        }

        for (const { key: activeKey, val: activeOverride } of dayOverridesForThisDate) {
            if (syllabusIndex >= targetCount) break;
            if (activeOverride?.isCancelled) {
                continue;
            }

            // Gerar entrada para cada slot do dia
            for (let slotIdx = 0; slotIdx < slotsPerDay; slotIdx++) {
                if (syllabusIndex >= targetCount) break;

                const slot = slots[slotIdx];
                const slotDateStr = slotsPerDay > 1 
                    ? (activeKey === dateStr ? `${dateStr}T${slot.startTime}` : `${activeKey}T${slot.startTime}`)
                    : activeKey;

                const syllabusItem = activeOverride?.syllabusId 
                    ? syllabus.find((s: any) => s.id === activeOverride.syllabusId) 
                    : syllabus[syllabusIndex];
                
                const originalIdx = activeOverride?.syllabusId
                    ? syllabus.findIndex((s: any) => s.id === activeOverride.syllabusId)
                    : syllabusIndex;

                items.push({
                    dateStr: slotDateStr,
                    date: occDate,
                    syllabusItem,
                    syllabusOriginalIndex: originalIdx,
                    isOverride: !!activeOverride,
                    startTime: activeOverride?.startTime || slot.startTime,
                    endTime: activeOverride?.endTime || slot.endTime,
                    slotIndex: slotsPerDay > 1 ? slotIdx : undefined,
                    slotsPerDay: slotsPerDay > 1 ? slotsPerDay : undefined
                });

                if (!activeOverride) {
                    syllabusIndex++;
                } else if (activeOverride.syllabusId) {
                    // Se coincidir com o item atual do syllabus regular, incrementamos
                    if (syllabus[syllabusIndex]?.id === activeOverride.syllabusId) {
                        syllabusIndex++;
                    }
                }
            }
        }
    }

    // 3. Adicionar overrides que caem em datas fora da recorrência
    Object.entries(overrides).forEach(([oDateStr, override]: [string, any]) => {
        if (!override || override.isCancelled) return;
        if (items.find(i => i.dateStr === oDateStr)) return;



        const syllabusItem = override.syllabusId 
            ? syllabus.find((s: any) => s.id === override.syllabusId) 
            : undefined;
        
        // Se o override não tiver ementa atrelada e for um resto de dados antigos, omitir
        if (!syllabusItem) return;

        const originalIdx = override.syllabusId
            ? syllabus.findIndex((s: any) => s.id === override.syllabusId)
            : -1;

        items.push({
            dateStr: oDateStr,
            date: parseISO(oDateStr.split('T')[0]),
            syllabusItem,
            syllabusOriginalIndex: originalIdx,
            isOverride: true
        });
    });

    // 4. Adicionar aulas extras (extraSessions)
    const extraSessions = classData.extraSessions || [];
    extraSessions.forEach((session: any) => {
        const uniqueDateStr = session.startTime ? `${session.date}T${session.startTime}` : `${session.date}-extra`;

        if (items.find(i => i.dateStr === uniqueDateStr)) return;

        const syllabusItem = session.syllabusId 
            ? syllabus.find((s: any) => s.id === session.syllabusId) 
            : undefined;
        
        const originalIdx = session.syllabusId
            ? syllabus.findIndex((s: any) => s.id === session.syllabusId)
            : -1;

        items.push({
            dateStr: uniqueDateStr,
            date: parseISO(session.date),
            syllabusItem,
            syllabusOriginalIndex: originalIdx,
            isOverride: true,
            isExtraSession: true,
            startTime: session.startTime
        });
    });

    return items.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}



export type EnrollmentRequest = {
  id: string;
  courseId: string;
  classId?: string;
  name: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  volunteerId?: string;
};

export type PedagogicalLog = {
  id: string;
  classId: string;
  date: Timestamp;
  dateStr?: string;
  content_taught: string;
  student_performance: number;
  observations: string;
};

export type WavePayment = {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  month: string;
  status: 'paid' | 'pending' | 'overdue';
  splits?: { teacher: number; wave: number; ibm: number; admin: number };
};

export type DisPayment = {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  month: string;
  status: 'paid' | 'pending' | 'overdue';
  contaAzulInvoiceId?: string;
};

export type WavePlan = { id: string; name: string; price: number };
export type DisPlan = { 
  id: string; 
  name: string; 
  price: number;
  dueDay?: number;
  dueDateDay?: number;
  discountPercent?: number;
  installments?: number;
  periodicityMonths?: number;
};
export type WaveExpense = { id: string; description: string; amount: number; date: Timestamp; receiptUrl?: string };

export type FinancialTransaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: Timestamp;
  description: string;
  status: 'paid' | 'pending';
  memberId?: string;
  paymentMethod?: string;
};

export type FinanceRequest = {
  id: string;
  requesterName: string;
  email: string;
  phone?: string;
  category: string;
  description: string;
  amount: number;
  objective: 'reembolso' | 'pagamento' | 'prestacao_contas';
  pixKey?: string;
  dueDate?: string;
  purchaseLink?: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  rejectionReason?: string;
  createdAt: Timestamp;
  attachmentUrl?: string;
};

interface VolunteeringContextType {
  users: User[];
  serviceAreas: AreaOfService[];
  teams: Team[];
  events: VolunteeringEvent[];
  rooms: Room[];
  reservations: RoomReservation[];
  strategicEvents: any[];
  courses: Course[];
  classes: Class[];
  enrollmentRequests: EnrollmentRequest[];
  pedagogicalLogs: PedagogicalLog[];
  wavePayments: WavePayment[];
  disPayments: DisPayment[];
  wavePlans: WavePlan[];
  disPlans: DisPlan[];
  waveExpenses: WaveExpense[];
  theoflixCourses: any[];
  financialTransactions: FinancialTransaction[];
  financeRequests: FinanceRequest[];
  savedSchedules: SavedSchedule[];
  reservationCategories: ReservationCategory[];
  cells: Cell[];
  areas: Area[];
  redes: Rede[];
  isLoading: boolean;
  addArea: (data: Omit<AreaOfService, 'id'>) => Promise<void>;
  updateArea: (id: string, data: Partial<AreaOfService>) => Promise<void>;
  deleteArea: (id: string) => Promise<void>;
  addTeam: (data: Omit<Team, 'id'>) => Promise<void>;
  updateTeam: (id: string, data: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  addEvent: (data: Omit<VolunteeringEvent, 'id'>) => Promise<void>;
  updateEvent: (id: string, data: Partial<VolunteeringEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  addRoom: (data: Omit<Room, 'id'>) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;
  addReservationCategory: (data: Omit<ReservationCategory, 'id'>) => Promise<void>;
  deleteReservationCategory: (id: string) => Promise<void>;
  addMinistry: (data: any) => Promise<void>;
  updateMinistry: (id: string, data: any) => Promise<void>;
  deleteMinistry: (id: string) => Promise<void>;
  addReservation: (data: Omit<RoomReservation, 'id'>) => Promise<void>;
  updateReservation: (id: string, data: Partial<RoomReservation>) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;
  updateVolunteer: (id: string, data: any) => Promise<void>;
  addUser: (data: any) => Promise<string>;
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
  addDisExpense: (data: any) => Promise<void>;
  updateDisExpense: (id: string, data: any) => Promise<void>;
  deleteDisExpense: (id: string) => Promise<void>;
  addFinancialTransaction: (data: any) => Promise<void>;
  updateFinancialTransaction: (id: string, data: any) => Promise<void>;
  deleteFinancialTransaction: (id: string) => Promise<void>;
  addFinanceRequest: (data: any) => Promise<void>;
  updateFinanceRequest: (id: string, data: any) => Promise<void>;
  deleteFinanceRequest: (id: string) => Promise<void>;
  approveEnrollmentRequest: (requestId: string, classId: string) => Promise<void>;
  updateEnrollmentRequest: (requestId: string, data: any) => Promise<void>;
  deleteEnrollmentRequest: (requestId: string) => Promise<void>;
  markAttendanceByTheoflix: (userId: string, courseId: string, episodeIndex: number, lessonNotes?: string, episodeYoutubeId?: string) => Promise<void>;
  saveSchedule: (data: any) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
}

const VolunteeringContext = createContext<VolunteeringContextType | undefined>(undefined);

export function VolunteeringProvider({ children }: { children: ReactNode }) {
  const { tenantId } = useTenant();
  const { firestore, user, auth, isUserLoading } = useFirebase();

  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.pathname.includes('/public/') || window.location.pathname.includes('/calendario')) && auth && !user && !isUserLoading) {
      const { initiateAnonymousSignIn } = require('@/firebase/non-blocking-login');
      initiateAnonymousSignIn(auth);
    }
  }, [auth, user, isUserLoading]);

  const { data: userData, isLoading: loadingRole } = useDoc<{ hierarchy?: { role?: string }; }>(user ? `users/${user.uid}` : null);

  // Wait until we actually know the role before running role-sensitive queries.
  // isAdmin defaults to false while loading which causes query flip-flop → Firestore assertion crash.
  const roleResolved = !loadingRole && (userData !== undefined || !user);
  const isAdmin = roleResolved && (userData?.hierarchy?.role === 'admin' || userData?.hierarchy?.role === 'pastor_senior');
  
  const roleId = userData?.hierarchy?.role;
  const { data: accessProfile, isLoading: loadingProfile } = useDoc<any>(user && roleId ? `access_profiles/${roleId}` : null);
  const permissions = useMemo(() => accessProfile?.permissions || {}, [accessProfile?.permissions]);

  // Helper to check permission
  const can = (permId: string, action = 'view') => isAdmin || !!permissions?.[permId]?.[action];

  const isAnonymous = user?.isAnonymous;
  const isPublicRoute = typeof window !== 'undefined' && (window.location.pathname.includes('/public/') || window.location.pathname.includes('/calendario'));
  const shouldLoadPublicData = isAnonymous || isPublicRoute;

  // As queries foram movidas para hooks em `useDomainData.ts` na Fase 7A para matar o God Context.
  // O contexto agora serve apenas como Service Locator para as funções de mutação.
  
  const users: User[] = [];
  const serviceAreas: AreaOfService[] = [];
  const teams: Team[] = [];
  const events: VolunteeringEvent[] = [];
  const rooms: Room[] = [];
  const reservations: RoomReservation[] = [];
  const strategicEvents: any[] = [];
  const courses: Course[] = [];
  const classes: Class[] = [];
  const enrollmentRequests: EnrollmentRequest[] = [];
  const pedagogicalLogs: PedagogicalLog[] = [];
  const wavePayments: WavePayment[] = [];
  const disPayments: DisPayment[] = [];
  const wavePlans: WavePlan[] = [];
  const disPlans: DisPlan[] = [];
  const waveExpenses: WaveExpense[] = [];
  const reservationCategories: ReservationCategory[] = [];
  const theoflixCourses: any[] = [];
  const financialTransactions: FinancialTransaction[] = [];
  const financeRequests: FinanceRequest[] = [];
  const savedSchedules: SavedSchedule[] = [];
  const cells: Cell[] = [];
  const areas: Area[] = [];
  const redes: Rede[] = [];
  
  const lu = false;
  const la = false;
  const lt = false;
  const le = false;
  const lr = false;
  const lres = false;
  const lse = false;
  const lco = false;
  const lcl = false;
  const ler = false;
  const lpl = false;
  const lwp = false;
  const ldp = false;
  const lwpn = false;
  const ldpn = false;
  const lwe = false;
  const loadingCategories = false;
  const loadingTheoflix = false;
  const lft = false;
  const lfr = false;
  const lss = false;
  const lce = false;
  const lga = false;
  const lre = false;

  const isLoading = loadingRole || loadingProfile || (user ? lu : false) || la || lt || le || (user ? lr : false) || lres || lse || lco || lcl || ler || lpl || lwp || ldp || lwpn || ldpn || lwe || loadingCategories || (user ? loadingTheoflix : false) || lft || lfr || lss || lce || lga || lre;

  // Enriquecimento dinâmico: A fonte da verdade para membros de uma célula
  // é exclusivamente a propriedade 'hierarchy.celulaId' no documento do usuário.
  const enrichedCells = useMemo(() => {
    if (!cells) return [];
    if (!users) return cells; // fallback if users not loaded
    return cells.map(c => ({
      ...c,
      membros: users.filter(u => u.hierarchy?.celulaId === c.id).map(u => u.id)
    }));
  }, [cells, users]);

  const value = useMemo(() => ({
    users: users || [],
    serviceAreas: serviceAreas || [],
    teams: teams || [],
    events: events || [],
    rooms: rooms || [],
    reservations: reservations || [],
    strategicEvents: strategicEvents || [],
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
    financialTransactions: financialTransactions || [],
    financeRequests: financeRequests || [],
    savedSchedules: savedSchedules || [],
    reservationCategories: reservationCategories || [],
    cells: enrichedCells,
    areas: areas || [],
    redes: redes || [],
    isLoading,
    addArea: async (data: any) => { await addDoc(collection(firestore!, 'areas_of_service'), data); },
    updateArea: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'areas_of_service', id), data); },
    deleteArea: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'areas_of_service', id)); },
    addTeam: async (data: any) => { await addDoc(collection(firestore!, 'teams'), data); },
    updateTeam: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'teams', id), data); },
    deleteTeam: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'teams', id)); },
    addEvent: async (data: any) => { await addDoc(collection(firestore!, 'volunteering_events'), data); },
    updateEvent: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'volunteering_events', id), data); },
    deleteEvent: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'volunteering_events', id)); },
    addRoom: async (data: any) => { await addDoc(collection(firestore!, 'rooms'), data); },
    deleteRoom: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'rooms', id)); },
    addReservationCategory: async (data: any) => { await addDoc(collection(firestore!, 'reservation_categories'), data); },
    deleteReservationCategory: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'reservation_categories', id)); },
    addMinistry: async (data: any) => { await addDoc(collection(firestore!, 'ministries'), data); },
    updateMinistry: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'ministries', id), data); },
    deleteMinistry: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'ministries', id)); },
    addReservation: async (data: any) => { await addDoc(collection(firestore!, 'room_reservations'), data); },
    updateReservation: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'room_reservations', id), data); },
    deleteReservation: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'room_reservations', id)); },
    updateVolunteer: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'users', id), data); },
    addUser: async (data: any) => {
      const payload = { ...data, createdAt: Timestamp.now() };
      if (tenantId && !payload.tenantId) payload.tenantId = tenantId;
      const res = await addDoc(collection(firestore!, 'users'), payload);
      return res.id;
    },
    addCourse: async (data: any) => { await addDoc(collection(firestore!, 'courses'), data); },
    addClass: async (data: any) => {
      const res = await addDoc(collection(firestore!, 'classes'), data);
      if (data.locationId && data.locationId !== 'the_school' && data.locationId !== 'null') {
        const roomObj = (rooms || []).find(r => r.id === data.locationId);
        await addDoc(collection(firestore!, 'room_reservations'), {
          eventName: `Aulas: ${data.name}`,
          rooms: [roomObj?.name || 'Sala'],
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
      let targetClassId = classId;
      let targetClassName = '';

      if (classId) {
        // Busca o documento da turma diretamente do Firestore (estado local pode estar vazio)
        const classRef = doc(firestore!, 'classes', classId);
        const classSnap = await getDoc(classRef);
        if (classSnap.exists()) {
          const classData = classSnap.data() as any;
          targetClassName = classData.name || '';
          const students: string[] = classData.students || [];
          if (!students.includes(studentId)) {
            await updateDocumentNonBlocking(classRef, { students: [...students, studentId] });
          }
        }
      } else {
        // Se não passou classId, busca todas as turmas do curso diretamente no Firestore
        const classesSnap = await getDocs(query(collection(firestore!, 'classes'), where('courseId', '==', courseId)));
        if (classesSnap.size === 1) {
          const clsDoc = classesSnap.docs[0];
          targetClassId = clsDoc.id;
          const clsData = clsDoc.data() as any;
          targetClassName = clsData.name || '';
          const students: string[] = clsData.students || [];
          if (!students.includes(studentId)) {
            await updateDocumentNonBlocking(doc(firestore!, 'classes', clsDoc.id), { students: [...students, studentId] });
          }
        }
      }

      // Se for um curso do DIS / Libras, gerar a cobrança automática em dis_payments
      try {
        const courseSnap = await getDoc(doc(firestore!, 'courses', courseId));
        if (courseSnap.exists()) {
          const cData = courseSnap.data() as any;
          const cName = (cData.name || '').toLowerCase();
          const cSchool = (cData.schoolId || '').toLowerCase();
          const cMin = (cData.ministryName || cData.ministry || '').toLowerCase();

          if (cSchool === 'dis' || cMin === 'dis' || cName.includes('libras')) {
            // Busca o nome do aluno
            let studentName = 'Aluno';
            const userSnap = await getDoc(doc(firestore!, 'users', studentId));
            if (userSnap.exists()) {
              studentName = (userSnap.data() as any).name || studentName;
            }

            // Busca valor do plano DIS
            let disPrice = 85;
            let dueDayNumber = 5;
            try {
              const plansSnap = await getDocs(collection(firestore!, 'dis_plans'));
              if (!plansSnap.empty) {
                const planData = plansSnap.docs[0].data();
                if (planData.price) disPrice = Number(planData.price);
                if (planData.dueDateDay) dueDayNumber = Number(planData.dueDateDay);
              }
            } catch (errP) {
              console.error('Erro ao ler dis_plans no enrollStudent:', errP);
            }

            const today = new Date();
            const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDayNumber);
            const year = nextMonthDate.getFullYear();
            const month = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
            const day = String(nextMonthDate.getDate()).padStart(2, '0');

            const competence = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            const dueDateStr = `${year}-${month}-${day}`;

            await addDoc(collection(firestore!, 'dis_payments'), {
              userId: studentId,
              studentName,
              courseId,
              courseName: cData.name || 'Curso de Libras',
              classId: targetClassId || '',
              className: targetClassName,
              amount: disPrice,
              competence,
              dueDate: dueDateStr,
              status: 'em_aberto',
              createdAt: Timestamp.now()
            });
          }
        }
      } catch (errDis) {
        console.error('Erro ao gerar cobrança automática do DIS no enrollStudent:', errDis);
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
    addDisExpense: async (data: any) => { await addDoc(collection(firestore!, 'dis_expenses'), data); },
    updateDisExpense: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'dis_expenses', id), data); },
    deleteDisExpense: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'dis_expenses', id)); },
    addFinancialTransaction: async (data: any) => { await addDoc(collection(firestore!, 'financial_transactions'), data); },
    updateFinancialTransaction: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'financial_transactions', id), data); },
    deleteFinancialTransaction: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'financial_transactions', id)); },
    addFinanceRequest: async (data: any) => { await addDoc(collection(firestore!, 'finance_requests'), data); },
    updateFinanceRequest: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'finance_requests', id), data); },
    deleteFinanceRequest: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'finance_requests', id)); },
    approveEnrollmentRequest: async (requestId: string, classId: string) => {
      // Busca o pedido e a turma diretamente do Firestore (estado local pode estar vazio)
      const reqSnap = await getDoc(doc(firestore!, 'enrollment_requests', requestId));
      if (!reqSnap.exists()) return;
      const req = reqSnap.data() as any;

      const classSnap = await getDoc(doc(firestore!, 'classes', classId));
      if (!classSnap.exists()) return;
      const targetClass = classSnap.data() as any;

      // Busca o usuário pelo email ou telefone
      let studentId: string | undefined;
      const byEmailSnap = req.email ? await getDocs(query(collection(firestore!, 'users'), where('email', '==', req.email))) : null;
      if (byEmailSnap && !byEmailSnap.empty) {
        studentId = byEmailSnap.docs[0].id;
      } else if (req.phone) {
        const byPhoneSnap = await getDocs(query(collection(firestore!, 'users'), where('phone', '==', req.phone)));
        if (!byPhoneSnap.empty) studentId = byPhoneSnap.docs[0].id;
      }

      if (!studentId) {
        const newUser = await addDoc(collection(firestore!, 'users'), {
          name: req.name, email: req.email, phone: req.phone, integrationStatus: 'nao_alcancado', createdAt: Timestamp.now()
        });
        studentId = newUser.id;
      }

      const currentStudents: string[] = targetClass.students || [];
      if (!currentStudents.includes(studentId)) {
        await updateDocumentNonBlocking(doc(firestore!, 'classes', classId), { students: [...currentStudents, studentId] });
      }
      await updateDocumentNonBlocking(doc(firestore!, 'enrollment_requests', requestId), { status: 'approved', classId });

      // Gera automaticamente o registro de mensalidade/cobrança no tuition_fees (e dis_payments se for DIS)
      try {
        const courseSnap = await getDoc(doc(firestore!, 'courses', req.courseId));
        if (courseSnap.exists()) {
          const cData = courseSnap.data() as any;
          const cName = (cData.name || '').toLowerCase();
          const cSchool = (cData.schoolId || '').toLowerCase();
          const cMin = (cData.ministryName || cData.ministry || '').toLowerCase();
          const isDisCourse = cSchool === 'dis' || cMin === 'dis' || cName.includes('libras');

          const finConfig = cData.financeConfig;
          const isPaid = finConfig?.isPaid ?? true;

          if (isPaid) {
            const totalAmount = finConfig?.totalAmount ? Number(finConfig.totalAmount) : (cData?.price ? Number(cData.price) : 0);
            // Se o aluno escolheu a qtd de parcelas na inscrição pública, usa a escolha do aluno. Senão usa o padrão do curso.
            const installments = req.installments ? Number(req.installments) : (finConfig?.installments ? Number(finConfig.installments) : 1);
            const dueDayNumber = finConfig?.dueDay ? Number(finConfig.dueDay) : 10;
            const installmentAmount = totalAmount / Math.max(installments, 1);
            const isAsaasCourse = cData?.billingMethod === 'asaas';

            let asaasCustomerId: string | null = null;
            let asaasPaymentData: any = null;

            // Se for faturado pelo Asaas, gera a fatura via API
            if (isAsaasCourse) {
              try {
                const token = await user?.getIdToken();
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const custRes = await fetch('/api/asaas/customers', {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({
                    name: req.name,
                    email: req.email,
                    phone: req.phone,
                    cpfCnpj: (req.cpf || req.cpfCnpj || '').replace(/\D/g, ''),
                    userId: studentId,
                    tenantId,
                  })
                });

                if (custRes.ok) {
                  const custJson = await custRes.json();
                  asaasCustomerId = custJson.customerId;

                  const now = new Date();
                  let targetYear = now.getFullYear();
                  let targetMonth = now.getMonth();
                  if (now.getDate() >= dueDayNumber) {
                    targetMonth += 1;
                    if (targetMonth > 11) {
                      targetMonth = 0;
                      targetYear += 1;
                    }
                  }
                  const firstDueDateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(dueDayNumber).padStart(2, '0')}`;

                  const payRes = await fetch('/api/asaas/payments', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                      customerId: asaasCustomerId,
                      billingType: finConfig?.paymentMethod === 'boleto' ? 'BOLETO' : 'PIX',
                      value: totalAmount,
                      dueDate: firstDueDateStr,
                      description: `Matrícula: ${cData.name || 'Curso'} - ${req.name}`,
                      externalReference: requestId,
                      installmentCount: installments > 1 ? installments : undefined,
                    })
                  });

                  if (payRes.ok) {
                    asaasPaymentData = await payRes.json();
                  }
                }
              } catch (asaasErr) {
                console.error('[Aprovação Asaas] Erro ao integrar com Asaas:', asaasErr);
              }
            }

            // Grava as parcelas universais na coleção tuition_fees
            for (let i = 1; i <= installments; i++) {
              const feeId = `fee_${requestId}_${i}`;
              const compDate = new Date();
              compDate.setMonth(compDate.getMonth() + (i - 1));
              const competence = `${compDate.getFullYear()}-${String(compDate.getMonth() + 1).padStart(2, '0')}`;
              
              const dueDateDate = new Date(compDate.getFullYear(), compDate.getMonth() + (isDisCourse ? 1 : 0), dueDayNumber);
              const dueDateStr = `${dueDateDate.getFullYear()}-${String(dueDateDate.getMonth() + 1).padStart(2, '0')}-${String(dueDayNumber).padStart(2, '0')}`;

              await setDoc(doc(firestore!, 'tuition_fees', feeId), {
                id: feeId,
                enrollmentId: requestId,
                courseId: req.courseId,
                studentId,
                studentName: req.name,
                courseName: cData.name || 'Curso',
                amount: installmentAmount,
                competence,
                dueDate: dueDateStr,
                status: 'em_aberto',
                createdAt: Timestamp.now(),
                ...(asaasCustomerId ? { asaasCustomerId } : {}),
                ...(asaasPaymentData?.id ? { asaasPaymentId: asaasPaymentData.id } : {}),
                ...(asaasPaymentData?.invoiceUrl ? { invoiceUrl: asaasPaymentData.invoiceUrl } : {}),
                ...(asaasPaymentData?.bankSlipUrl ? { bankSlipUrl: asaasPaymentData.bankSlipUrl } : {}),
              }, { merge: true });

              // Se for DIS, grava também no dis_payments legado
              if (isDisCourse && i === 1) {
                await addDoc(collection(firestore!, 'dis_payments'), {
                  userId: studentId,
                  studentName: req.name,
                  courseId: req.courseId,
                  courseName: cData.name || 'Curso de Libras',
                  classId,
                  className: targetClass.name || '',
                  amount: installmentAmount,
                  competence,
                  dueDate: dueDateStr,
                  status: 'em_aberto',
                  createdAt: Timestamp.now()
                });
              }
            }
          }
        }
      } catch (finErr) {
        console.error('Erro ao gerar mensalidade automática na aprovação:', finErr);
      }
    },
    updateEnrollmentRequest: async (id: string, data: any) => { await updateDocumentNonBlocking(doc(firestore!, 'enrollment_requests', id), data); },
    deleteEnrollmentRequest: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'enrollment_requests', id)); },
    markAttendanceByTheoflix: async (userId: string, theoflixCourseId: string, episodeIndex: number, lessonNotes?: string, episodeYoutubeId?: string) => {
      // 1. Gravar APENAS a evidencia do fato de baixo nivel (video assistido) no documento do usuario
      if (firestore && userId) {
        const userRef = doc(firestore, 'users', userId);
        await updateDocumentNonBlocking(userRef, {
          // Legado: índice numérico (mantido para compatibilidade com dados existentes)
          [`journey.theoflixAttendance.${theoflixCourseId}.${episodeIndex}`]: true,
          // Inconsistência #8 fix: theoflixProgress também deve ser gravado pois o motor de domínio
          // lê de AMBOS os campos (theoflixAttendance e theoflixProgress).
          [`journey.theoflixProgress.${theoflixCourseId}.${episodeIndex}`]: true,
          // Novo (Fase 1): chave estável por youtubeId — resistente a reordenações de episódios
          ...(episodeYoutubeId && {
            [`journey.theoflixAttendance.${theoflixCourseId}.${episodeYoutubeId}`]: true,
            [`journey.theoflixProgress.${theoflixCourseId}.${episodeYoutubeId}`]: true,
          }),
          // lumineProgress removido: campo morto não lido por nenhum avaliador
        });
      }

      // 2. Busca cursos e turmas diretamente do Firestore para turmas físicas/híbridas
      const allCoursesSnap = await getDocs(collection(firestore!, 'courses'));
      const allCourses = allCoursesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      // Find physical courses linked to this theoflixCourseId
      const linkedCourses = allCourses.filter((c: any) => 
         c.id === theoflixCourseId || 
         c.linkedTheoflixId === theoflixCourseId || 
         c.syllabus?.some((s: any) => s.theoflixCourseId === theoflixCourseId)
      );
      const linkedCourseIds = linkedCourses.map((c: any) => c.id);

      if (linkedCourseIds.length === 0) return;

      // Find classes where user is enrolled for these physical courses (busca no Firestore)
      const allClassesSnap = await getDocs(collection(firestore!, 'classes'));
      const relevantClasses = allClassesSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((c: any) => linkedCourseIds.includes(c.courseId) && c.students?.includes(userId)) as any[];

      for (const cls of relevantClasses) {
        const physicalCourse = linkedCourses.find(c => c.id === cls.courseId);
        const syllabus = physicalCourse?.syllabus || [];
        
        // Find which syllabus module explicitly requires this episode
        const episodeIdxStr = episodeIndex.toString();
        let targetSyllabusIndex = -1;
        
        const hybridIndex = syllabus.findIndex((mod: any) => 
            mod.theoflixCourseId === theoflixCourseId && (
              (episodeYoutubeId && mod.theoflixRequiredVideoIds?.includes(episodeYoutubeId)) ||
              mod.theoflixRequiredVideoIds?.includes(episodeIdxStr)
            )
        );

        if (hybridIndex !== -1) {
            targetSyllabusIndex = hybridIndex;
        }

        // DESACOPLAMENTO ARQUITETURAL: Se o video nao pertence explicitamente a um modulo hibrido com array theoflixRequiredVideoIds,
        // NAO executamos o fallback de 1 video = 1 modulo (targetSyllabusIndex = episodeIndex ELIMINADO).
        if (targetSyllabusIndex === -1) continue;
        // Build the projected schedule to accurately find the date for this episode
        const items: any[] = [];
        if (cls && cls.startDate) {
            const start = parseISO(cls.startDate);
            const holidaySet = new Set(cls.holidayDates || []);
            const overrides = cls.scheduleOverrides || {};
            
            let currentDate = start;
            let syllabusIndex = 0;
            let safeCounter = 0;
            const targetCount = syllabus.length > 0 ? syllabus.length : 12;

            while (items.length < targetCount && safeCounter < 200) {
                safeCounter++;
                const dateStr = format(currentDate, 'yyyy-MM-dd');
                
                if (holidaySet.has(dateStr) && !overrides[dateStr]) {
                    currentDate = addWeeks(currentDate, cls.frequency === 'quinzenal' ? 2 : 1);
                    continue;
                }

                const override = overrides[dateStr];
                if (override?.isCancelled) {
                    currentDate = addWeeks(currentDate, cls.frequency === 'quinzenal' ? 2 : 1);
                    continue;
                }

                const originalIdx = override?.syllabusId ? syllabus.findIndex((s: any) => s.id === override.syllabusId) : syllabusIndex;
                items.push({ dateStr, syllabusOriginalIndex: originalIdx });
                
                syllabusIndex++;
                currentDate = addWeeks(currentDate, cls.frequency === 'quinzenal' ? 2 : 1);
            }

            Object.entries(overrides).forEach(([dateStr, override]: [string, any]) => {
                if (override.isCancelled) return;
                if (items.find(i => i.dateStr === dateStr)) return;
                const originalIdx = override.syllabusId ? syllabus.findIndex((s: any) => s.id === override.syllabusId) : -1;
                items.push({ dateStr, syllabusOriginalIndex: originalIdx });
            });

            const extraSessions = cls.extraSessions || [];
            extraSessions.forEach((session: any) => {
                if (items.find(i => i.dateStr === session.date)) return;
                const originalIdx = session.syllabusId ? syllabus.findIndex((s: any) => s.id === session.syllabusId) : -1;
                items.push({ dateStr: session.date, syllabusOriginalIndex: originalIdx });
            });
            
            items.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
        }
        
        const matchedItem = items.find((i: any) => i.syllabusOriginalIndex === targetSyllabusIndex);
        const targetDate = matchedItem ? matchedItem.dateStr : (items[targetSyllabusIndex]?.dateStr || format(new Date(), 'yyyy-MM-dd'));
        const existingAttendance = cls.attendance || [];
        const recordIdx = existingAttendance.findIndex((a: any) => a.date === targetDate);
        const notes = lessonNotes?.trim();

        if (recordIdx > -1) {
          const record = existingAttendance[recordIdx];
          let changed = false;
          // Adiciona userId à lista online se ainda não estiver
          if (!record.onlineStudentIds?.includes(userId)) {
            record.onlineStudentIds = [...(record.onlineStudentIds || []), userId];
            changed = true;
          }
          // Salva/atualiza as anotações (sempre, para permitir edição)
          if (notes) {
            record.lessonNotes = { ...((record.lessonNotes || {}) as any), [userId]: notes };
            changed = true;
          }
          if (changed) {
            await updateDocumentNonBlocking(doc(firestore!, 'classes', cls.id), { attendance: existingAttendance });
          }
        } else {
          const newRecord: any = { date: targetDate, presentStudentIds: [], onlineStudentIds: [userId] };
          if (notes) newRecord.lessonNotes = { [userId]: notes };
          existingAttendance.push(newRecord);
          await updateDocumentNonBlocking(doc(firestore!, 'classes', cls.id), { attendance: existingAttendance });
        }
      }
    },
    saveSchedule: async (data: any) => {
      const id = `${data.areaId}_${data.month}`;
      await setDocumentNonBlocking(doc(firestore!, 'saved_schedules', id), data);
    },
    deleteSchedule: async (id: string) => { await deleteDocumentNonBlocking(doc(firestore!, 'saved_schedules', id)); },
  }), [users, serviceAreas, areas, enrichedCells, redes, teams, events, rooms, reservations, reservationCategories, courses, classes, enrollmentRequests, pedagogicalLogs, wavePayments, disPayments, wavePlans, disPlans, waveExpenses, theoflixCourses, financialTransactions, financeRequests, savedSchedules, isLoading, firestore]);

  return (
    <VolunteeringContext.Provider value={value}>
      {children}
    </VolunteeringContext.Provider>
  );
}

export function useVolunteering() {
  const context = useContext(VolunteeringContext);
  if (context === undefined) {
    throw new Error('useVolunteering must be used within a VolunteeringProvider');
  }
  return context;
}

import { useMemo, useState } from 'react';
import { collection, query, limit, orderBy, startAfter, where } from 'firebase/firestore';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { User, AreaOfService, Team, VolunteeringEvent, Room, RoomReservation, ReservationCategory, SavedSchedule } from '@/contexts/volunteering-context';
import { useGlobalUsers } from './useGlobalUsers';
import { Course, Class, EnrollmentRequest, PedagogicalLog, WavePayment, DisPayment, WavePlan, DisPlan, WaveExpense, FinancialTransaction, FinanceRequest } from '@/contexts/volunteering-context';
import { Cell, Area, Rede } from '@/contexts/volunteering-context';
import { JourneyStage } from '@/domains/engagement/entities/JourneyStage';
import { AutomationRule } from '@/domains/engagement/entities/Automation';
import { useTenant } from '@/contexts/tenant-context';

export function useMembersData(pageSize?: number) {
  const { firestore, user } = useFirebase();
  const { data: userData, isLoading: loadingRole } = useDoc<{ hierarchy?: { role?: string }; }>(user ? `users/${user.uid}` : null);
  const roleResolved = !loadingRole && (userData !== undefined || !user);
  
  const [lastDoc, setLastDoc] = useState<any>(null);

  // Paged queries for list views
  const pagedUsersQ = useMemoFirebase(() => {
    if (!firestore || !user || !roleResolved || pageSize === undefined) return null;
    let q = query(collection(firestore, 'users'), limit(pageSize));
    if (lastDoc) {
      q = query(collection(firestore, 'users'), startAfter(lastDoc), limit(pageSize));
    }
    return q;
  }, [firestore, user, roleResolved, lastDoc, pageSize]);

  const { data: pagedUsers, isLoading: pagedLoading } = useCollection<any>(pagedUsersQ);

  // Global cache for non-paged usage (Comboboxes, Selects, etc.)
  const globalUsers = useGlobalUsers(firestore, user, roleResolved);

  const loadMore = (lastVisibleDoc: any) => setLastDoc(lastVisibleDoc);

  if (pageSize !== undefined) {
    return { users: pagedUsers || [], isLoading: pagedLoading, loadMore };
  } else {
    return { users: globalUsers.users, isLoading: globalUsers.isLoading, loadMore };
  }
}

export function useEventsData() {
  const { firestore, user } = useFirebase();
  const { data: userData, isLoading: loadingRole } = useDoc<{ hierarchy?: { role?: string }; }>(user ? `users/${user.uid}` : null);
  const roleResolved = !loadingRole && (userData !== undefined || !user);

  const eventsQ = useMemoFirebase(() => (firestore && user && roleResolved) ? query(collection(firestore, 'volunteering_events'), limit(100)) : null, [firestore, user, roleResolved]);
  const reservationsQ = useMemoFirebase(() => (firestore && user && roleResolved) ? query(collection(firestore, 'room_reservations'), limit(100)) : null, [firestore, user, roleResolved]);
  const roomsQ = useMemoFirebase(() => (firestore && user && roleResolved) ? query(collection(firestore, 'rooms')) : null, [firestore, user, roleResolved]);
  const strategicEventsQ = useMemoFirebase(() => (firestore && user && roleResolved) ? query(collection(firestore, 'strategic_events')) : null, [firestore, user, roleResolved]);
  const reservationCategoriesQ = useMemoFirebase(() => (firestore && user && roleResolved) ? query(collection(firestore, 'reservation_categories')) : null, [firestore, user, roleResolved]);
  const ministriesQ = useMemoFirebase(() => (firestore && user && roleResolved) ? query(collection(firestore, 'ministries')) : null, [firestore, user, roleResolved]);

  const { data: events, isLoading: le } = useCollection<VolunteeringEvent>(eventsQ);
  const { data: reservations, isLoading: lres } = useCollection<RoomReservation>(reservationsQ);
  const { data: rooms, isLoading: lr } = useCollection<Room>(roomsQ);
  const { data: strategicEvents, isLoading: lse } = useCollection<any>(strategicEventsQ);
  const { data: reservationCategories, isLoading: lrc } = useCollection<ReservationCategory>(reservationCategoriesQ);
  const { data: ministries, isLoading: lm } = useCollection<any>(ministriesQ);

  return { 
    events: events || [], 
    reservations: reservations || [], 
    rooms: rooms || [], 
    strategicEvents: strategicEvents || [], 
    reservationCategories: reservationCategories || [],
    ministries: ministries || [],
    isLoading: le || lres || lr || lse || lrc || lm
  };
}

export function useCoursesData() {
  const { firestore, user } = useFirebase();
  const coursesQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'courses'), limit(200)) : null, [firestore, user]);
  const classesQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'classes'), limit(200)) : null, [firestore, user]);
  const enrollmentRequestsQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'enrollment_requests'), orderBy('createdAt', 'desc'), limit(300)) : null, [firestore, user]);
  const pedagogicalLogsQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'pedagogical_logs'), limit(200)) : null, [firestore, user]);
  const theoflixCoursesQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'theoflix_courses'), limit(200)) : null, [firestore, user]);

  const { data: courses, isLoading: lco } = useCollection<Course>(coursesQ);
  const { data: classes, isLoading: lcl } = useCollection<Class>(classesQ);
  const { data: enrollmentRequests, isLoading: ler } = useCollection<EnrollmentRequest>(enrollmentRequestsQ);
  const { data: pedagogicalLogs, isLoading: lpl } = useCollection<PedagogicalLog>(pedagogicalLogsQ);
  const { data: theoflixCourses, isLoading: ltc } = useCollection<any>(theoflixCoursesQ);

  return {
    courses: courses || [],
    classes: classes || [],
    enrollmentRequests: enrollmentRequests || [],
    pedagogicalLogs: pedagogicalLogs || [],
    theoflixCourses: theoflixCourses || [],
    isLoading: lco || lcl || ler || lpl || ltc
  };
}

export function useTeachingFinance() {
  const { firestore, user } = useFirebase();
  const wavePaymentsQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'wave_payments'), limit(100)) : null, [firestore, user]);
  const disPaymentsQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'dis_payments'), limit(100)) : null, [firestore, user]);
  const wavePlansQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'wave_plans')) : null, [firestore, user]);
  const disPlansQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'dis_plans')) : null, [firestore, user]);
  const waveExpensesQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'wave_expenses'), limit(100)) : null, [firestore, user]);
  const disExpensesQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'dis_expenses'), limit(100)) : null, [firestore, user]);

  const { data: wavePayments, isLoading: lwp } = useCollection<WavePayment>(wavePaymentsQ);
  const { data: disPayments, isLoading: ldp } = useCollection<DisPayment>(disPaymentsQ);
  const { data: wavePlans, isLoading: lwpn } = useCollection<WavePlan>(wavePlansQ);
  const { data: disPlans, isLoading: ldpn } = useCollection<DisPlan>(disPlansQ);
  const { data: waveExpenses, isLoading: lwe } = useCollection<WaveExpense>(waveExpensesQ);
  const { data: disExpenses, isLoading: lde } = useCollection<any>(disExpensesQ);

  return {
    wavePayments: wavePayments || [],
    disPayments: disPayments || [],
    wavePlans: wavePlans || [],
    disPlans: disPlans || [],
    waveExpenses: waveExpenses || [],
    disExpenses: disExpenses || [],
    isLoading: lwp || ldp || lwpn || ldpn || lwe || lde
  };
}

export function useMinisterialFinance() {
  const { firestore, user } = useFirebase();
  const financialTransactionsQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'financial_transactions'), limit(100)) : null, [firestore, user]);
  const financeRequestsQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'finance_requests'), limit(100)) : null, [firestore, user]);

  const { data: financialTransactions, isLoading: lft } = useCollection<FinancialTransaction>(financialTransactionsQ);
  const { data: financeRequests, isLoading: lfr } = useCollection<FinanceRequest>(financeRequestsQ);

  return {
    financialTransactions: financialTransactions || [],
    financeRequests: financeRequests || [],
    isLoading: lft || lfr
  };
}

export function useGCData() {
  const { firestore, user } = useFirebase();
  const cellsQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'cells'), limit(100)) : null, [firestore, user]);
  const areasQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'areas')) : null, [firestore, user]);
  const redesQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'redes')) : null, [firestore, user]);

  const { data: cells, isLoading: lc } = useCollection<Cell>(cellsQ);
  const { data: areas, isLoading: la } = useCollection<Area>(areasQ);
  const { data: redes, isLoading: lr } = useCollection<Rede>(redesQ);

  return {
    cells: cells || [],
    areas: areas || [],
    redes: redes || [],
    isLoading: lc || la || lr
  };
}

export function useVolunteeringServiceData() {
  const { firestore, user } = useFirebase();
  const serviceAreasQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'areas_of_service')) : null, [firestore, user]);
  const teamsQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'teams')) : null, [firestore, user]);
  const savedSchedulesQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'saved_schedules'), limit(200)) : null, [firestore, user]);

  const { data: serviceAreas, isLoading: lsa } = useCollection<AreaOfService>(serviceAreasQ);
  const { data: teams, isLoading: lt } = useCollection<Team>(teamsQ);
  const { data: savedSchedules, isLoading: lss } = useCollection<SavedSchedule>(savedSchedulesQ);

  return {
    serviceAreas: serviceAreas || [],
    teams: teams || [],
    savedSchedules: savedSchedules || [],
    isLoading: lsa || lt || lss
  };
}

export function useEngagementData() {
  const { firestore, user } = useFirebase();
  const { tenantId } = useTenant();
  
  const stagesQ = useMemoFirebase(() => {
    if (!firestore || !user || !tenantId) return null;
    return query(
      collection(firestore, 'journey_stages'), 
      where('tenantId', '==', tenantId),
      orderBy('order', 'asc')
    );
  }, [firestore, user, tenantId]);

  const { data: stages, isLoading: ls } = useCollection<JourneyStage>(stagesQ);

  return {
    journeyStages: stages || [],
    isLoading: ls
  };
}

export function useAutomationRules() {
  const { firestore, user } = useFirebase();
  const { tenantId } = useTenant();
  
  const rulesQ = useMemoFirebase(() => {
    if (!firestore || !user || !tenantId) return null;
    return query(
      collection(firestore, 'automation_rules'), 
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user, tenantId]);

  const { data: rules, isLoading } = useCollection<AutomationRule>(rulesQ);

  return {
    rules: rules || [],
    isLoading
  };
}

export function useLearningSessionsData(programId?: string) {
  const { firestore, user } = useFirebase();

  const sessionsQ = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    if (programId) {
      return query(collection(firestore, 'learning_sessions'), where('programId', '==', programId), limit(300));
    }
    return query(collection(firestore, 'learning_sessions'), limit(300));
  }, [firestore, user, programId]);

  const makeupsQ = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'wave_makeups'), limit(200));
  }, [firestore, user]);

  const { data: sessions, isLoading: ls } = useCollection<any>(sessionsQ);
  const { data: makeups, isLoading: lm } = useCollection<any>(makeupsQ);

  return {
    sessions: sessions || [],
    makeups: makeups || [],
    isLoading: ls || lm
  };
}

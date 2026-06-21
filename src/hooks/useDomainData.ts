import { useMemo, useState } from 'react';
import { collection, query, limit, orderBy, startAfter, where } from 'firebase/firestore';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { User, AreaOfService, Team, VolunteeringEvent, Room, RoomReservation, ReservationCategory, SavedSchedule } from '@/contexts/volunteering-context';
import { Course, Class, EnrollmentRequest, PedagogicalLog, WavePayment, DisPayment, WavePlan, DisPlan, WaveExpense, FinancialTransaction, FinanceRequest } from '@/contexts/volunteering-context';
import { Cell, Area, Rede } from '@/contexts/volunteering-context';
import { JourneyStage } from '@/domains/engagement/entities/JourneyStage';
import { AutomationRule } from '@/domains/engagement/entities/Automation';
import { useTenant } from '@/contexts/tenant-context';

export function useMembersData(pageSize = 30) {
  const { firestore, user } = useFirebase();
  const { data: userData, isLoading: loadingRole } = useDoc<{ hierarchy?: { role?: string }; }>(user ? `users/${user.uid}` : null);
  const roleResolved = !loadingRole && (userData !== undefined || !user);
  
  const [lastDoc, setLastDoc] = useState<any>(null);

  const usersQ = useMemoFirebase(() => {
    if (!firestore || !user || !roleResolved) return null;
    let q = query(collection(firestore, 'users'), limit(pageSize));
    if (lastDoc) {
       q = query(collection(firestore, 'users'), startAfter(lastDoc), limit(pageSize));
    }
    return q;
  }, [firestore, user, roleResolved, lastDoc, pageSize]);

  const { data: users, isLoading: lu } = useCollection<any>(usersQ); // Pode ser Member ou User, mantemos any por segurança

  const loadMore = (lastVisibleDoc: any) => setLastDoc(lastVisibleDoc);

  return { users: users || [], isLoading: lu, loadMore };
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

  const { data: events, isLoading: le } = useCollection<VolunteeringEvent>(eventsQ);
  const { data: reservations, isLoading: lres } = useCollection<RoomReservation>(reservationsQ);
  const { data: rooms, isLoading: lr } = useCollection<Room>(roomsQ);
  const { data: strategicEvents, isLoading: lse } = useCollection<any>(strategicEventsQ);
  const { data: reservationCategories, isLoading: lrc } = useCollection<ReservationCategory>(reservationCategoriesQ);

  return { 
    events: events || [], 
    reservations: reservations || [], 
    rooms: rooms || [], 
    strategicEvents: strategicEvents || [], 
    reservationCategories: reservationCategories || [],
    isLoading: le || lres || lr || lse || lrc 
  };
}

export function useCoursesData() {
  const { firestore, user } = useFirebase();
  const coursesQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses'), limit(50)) : null, [firestore]);
  const classesQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'classes'), limit(50)) : null, [firestore]);
  const enrollmentRequestsQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'enrollment_requests'), limit(50)) : null, [firestore, user]);
  const pedagogicalLogsQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'pedagogical_logs'), limit(50)) : null, [firestore, user]);
  const theoflixCoursesQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'theoflix_courses'), limit(50)) : null, [firestore, user]);

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

  const { data: wavePayments, isLoading: lwp } = useCollection<WavePayment>(wavePaymentsQ);
  const { data: disPayments, isLoading: ldp } = useCollection<DisPayment>(disPaymentsQ);
  const { data: wavePlans, isLoading: lwpn } = useCollection<WavePlan>(wavePlansQ);
  const { data: disPlans, isLoading: ldpn } = useCollection<DisPlan>(disPlansQ);
  const { data: waveExpenses, isLoading: lwe } = useCollection<WaveExpense>(waveExpensesQ);

  return {
    wavePayments: wavePayments || [],
    disPayments: disPayments || [],
    wavePlans: wavePlans || [],
    disPlans: disPlans || [],
    waveExpenses: waveExpenses || [],
    isLoading: lwp || ldp || lwpn || ldpn || lwe
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
  const savedSchedulesQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'saved_schedules'), limit(50)) : null, [firestore, user]);

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
